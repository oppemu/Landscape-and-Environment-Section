/**
 * Parser for the verified Thai waste-bank HTML table export (often named .xls).
 * Pure local code: no DOM, network, spreadsheet evaluation, or third-party code.
 * Amounts and quantities are decimal strings. Arithmetic uses integer hundredths.
 */
export const PARSER_VERSION = 'waste-bank-monthly-summary/v1';
export const MAX_FILE_BYTES = 1024 * 1024;
export const MAX_CATEGORY_ROWS = 1000;

const TITLE = 'ปริมาณและจำนวนขยะแต่ละวันทำการของธนาคารขยะรีไซเคิล';
const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const UNITS = ['กิโลกรัม', 'ลัง'];
const TAG_ATTRIBUTES = Object.freeze({
  table: ['width', 'border', 'cellspacing', 'cellpadding', 'align'],
  tr: [],
  td: ['width', 'rowspan', 'colspan', 'align', 'valign'],
  div: ['id', 'style'],
  span: ['style'],
  strong: [],
  br: [],
});
const CHILD_TAGS = Object.freeze({
  root: ['table', 'br'], table: ['tr'], tr: ['td'],
  td: ['div', 'span', 'strong', 'br'], div: ['span', 'strong', 'br'],
  span: ['strong', 'br'], strong: ['span', 'br'], br: [],
});

export class BankReportError extends Error {
  constructor(code, message, location = null) {
    super(message);
    this.name = 'BankReportError';
    this.code = code;
    this.location = location;
  }
}

function fail(code, message, location) {
  throw new BankReportError(code, message, location);
}

function inputBytes(input) {
  let bytes;
  if (typeof input === 'string') {
    if (input.length > MAX_FILE_BYTES) fail('FILE_SIZE', 'File exceeds the 1 MiB limit.');
    // TextEncoder silently repairs invalid surrogate pairs; reject instead.
    for (let i = 0; i < input.length; i++) {
      const n = input.charCodeAt(i);
      if (n >= 0xd800 && n <= 0xdbff) {
        const next = input.charCodeAt(++i);
        if (!(next >= 0xdc00 && next <= 0xdfff)) fail('ENCODING', 'Invalid Unicode text.');
      } else if (n >= 0xdc00 && n <= 0xdfff) fail('ENCODING', 'Invalid Unicode text.');
    }
    bytes = new TextEncoder().encode(input);
  } else if (input instanceof ArrayBuffer) {
    if (input.byteLength > MAX_FILE_BYTES) fail('FILE_SIZE', 'File exceeds the 1 MiB limit.');
    bytes = new Uint8Array(input.slice(0));
  } else if (ArrayBuffer.isView(input)) {
    if (input.byteLength > MAX_FILE_BYTES) fail('FILE_SIZE', 'File exceeds the 1 MiB limit.');
    bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength).slice();
  } else {
    fail('INPUT_TYPE', 'Pass UTF-8 text, an ArrayBuffer, or a typed byte view.');
  }
  if (bytes.length < 512 || bytes.length > MAX_FILE_BYTES) {
    fail('FILE_SIZE', 'Expected an HTML report between 512 bytes and 1 MiB.');
  }
  if ((bytes[0] === 0xd0 && bytes[1] === 0xcf) ||
      (bytes[0] === 0x50 && bytes[1] === 0x4b)) {
    fail('UNSUPPORTED_FORMAT', 'Binary XLS and XLSX/ZIP files are not supported by this parser.');
  }
  if ((bytes[0] === 0xff && bytes[1] === 0xfe) ||
      (bytes[0] === 0xfe && bytes[1] === 0xff)) {
    fail('ENCODING', 'Only the verified UTF-8 HTML export is supported.');
  }
  return bytes;
}

function decodeUtf8(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail('ENCODING', 'File is not valid UTF-8.');
  }
}

function checkText(text) {
  // Reject invisible control/bidi characters, rather than letting them disguise values.
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u.test(text)) {
    fail('UNSAFE_TEXT', 'Unsupported control or invisible character.');
  }
  return text;
}

function decodeEntities(text) {
  const named = { nbsp: '\u00a0', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  let out = '';
  for (let pos = 0; pos < text.length;) {
    const start = text.indexOf('&', pos);
    if (start < 0) { out += text.slice(pos); break; }
    out += text.slice(pos, start);
    const match = /^&(#x[0-9a-fA-F]{1,6}|#[0-9]{1,7}|nbsp|amp|lt|gt|quot|apos);/.exec(text.slice(start));
    if (!match) fail('HTML_ENTITY', 'Unsupported or malformed HTML entity.');
    let value;
    if (match[1][0] === '#') {
      const hex = match[1][1] === 'x';
      const code = Number.parseInt(match[1].slice(hex ? 2 : 1), hex ? 16 : 10);
      if (code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
        fail('HTML_ENTITY', 'Invalid Unicode entity.');
      }
      value = String.fromCodePoint(code);
    } else value = named[match[1]];
    out += value;
    pos = start + match[0].length;
  }
  return checkText(out);
}

function validateStyle(value) {
  const rules = value.split(';');
  const seen = new Set();
  for (const rule of rules) {
    if (!rule.trim()) continue;
    const match = /^\s*(text-align|font-weight|padding)\s*:\s*([a-z0-9]+)\s*$/i.exec(rule);
    if (!match) fail('UNSAFE_MARKUP', 'Unsupported CSS; resource URLs and active content are forbidden.');
    const property = match[1].toLowerCase();
    const val = match[2].toLowerCase();
    const safe = { 'text-align': ['left', 'right', 'center'], 'font-weight': ['bold'], padding: ['0', '0px', '5px'] };
    if (seen.has(property) || !safe[property].includes(val)) fail('UNSAFE_MARKUP', 'Unsupported CSS declaration.');
    seen.add(property);
  }
}

function parseAttributes(raw, tag) {
  const attrs = Object.create(null);
  let pos = 0;
  while (pos < raw.length) {
    if (/^\s*$/.test(raw.slice(pos))) break;
    const match = /^\s+([a-z][a-z0-9-]*)\s*=\s*(?:"([^"<>]*)"|'([^'<>]*)')/i.exec(raw.slice(pos));
    if (!match) fail('HTML_SYNTAX', 'Attributes must be quoted and well formed.');
    const name = match[1].toLowerCase();
    if (!TAG_ATTRIBUTES[tag].includes(name) || Object.hasOwn(attrs, name)) {
      fail('UNSAFE_MARKUP', 'Unsupported or duplicate HTML attribute.');
    }
    const val = decodeEntities(match[2] ?? match[3]);
    if (name === 'style') validateStyle(val);
    else if (name === 'id') {
      if (val !== 'top_report_all_week_quantity_pdf') fail('UNSAFE_MARKUP', 'Unsupported element identifier.');
    } else if (name === 'align') {
      if (!['left', 'right', 'center'].includes(val)) fail('HTML_SYNTAX', 'Unsupported alignment.');
    } else if (name === 'valign') {
      if (val !== 'middle') fail('HTML_SYNTAX', 'Unsupported vertical alignment.');
    } else if (!/^(0|[1-9][0-9]{0,3})$/.test(val)) {
      fail('HTML_SYNTAX', 'Unsupported numeric HTML attribute.');
    }
    attrs[name] = val;
    pos += match[0].length;
  }
  return attrs;
}

function parseInertHtml(html) {
  checkText(html);
  const root = { tag: 'root', attrs: Object.create(null), children: [] };
  const stack = [root];
  let pos = 0;
  let tokens = 0;
  while (pos < html.length) {
    if (++tokens > 120000) fail('HTML_LIMIT', 'Too many HTML tokens.');
    if (html[pos] !== '<') {
      let end = html.indexOf('<', pos);
      if (end < 0) end = html.length;
      const value = decodeEntities(html.slice(pos, end));
      const parent = stack[stack.length - 1];
      if (['root', 'table', 'tr'].includes(parent.tag) && value.trim()) {
        fail('HTML_STRUCTURE', 'Unexpected text outside a report cell.');
      }
      parent.children.push(value);
      pos = end;
      continue;
    }
    const token = /^<(\/?)([a-z][a-z0-9]*)([^<>]*?)(\/?)>/i.exec(html.slice(pos));
    if (!token) fail('UNSUPPORTED_FORMAT', 'Only the verified HTML table export is supported.');
    const closing = token[1] === '/';
    const tag = token[2].toLowerCase();
    if (!Object.hasOwn(TAG_ATTRIBUTES, tag)) fail('UNSAFE_MARKUP', 'Unsupported HTML element or active content.');
    if (closing) {
      if (token[3].trim() || token[4] || tag === 'br' || stack[stack.length - 1].tag !== tag) {
        fail('HTML_SYNTAX', 'Mismatched HTML closing tag.');
      }
      stack.pop();
    } else {
      const parent = stack[stack.length - 1];
      if (!CHILD_TAGS[parent.tag].includes(tag)) fail('HTML_STRUCTURE', 'Unexpected HTML nesting.');
      if (token[4] && tag !== 'br') fail('HTML_SYNTAX', 'Only line breaks may be self-closing.');
      const node = { tag, attrs: parseAttributes(token[3], tag), children: [] };
      parent.children.push(node);
      if (tag !== 'br') stack.push(node);
      if (stack.length > 12) fail('HTML_LIMIT', 'HTML nesting is too deep.');
    }
    pos += token[0].length;
  }
  if (stack.length !== 1) fail('HTML_SYNTAX', 'HTML contains an unclosed tag.');
  return root;
}

function nodes(node) { return node.children.filter(child => typeof child !== 'string'); }
function textOf(node) {
  const gather = n => typeof n === 'string' ? n : n.tag === 'br' ? ' ' : n.children.map(gather).join('');
  return gather(node).normalize('NFC').replace(/[\s\u00a0]+/gu, ' ').trim();
}
function requireText(node, expected, location) {
  if (textOf(node) !== expected) fail('HEADERS', 'Unexpected report title, header, or footer label.', location);
}
function requireSpan(node, columns, rows, location) {
  if ((node.attrs.colspan ?? '1') !== String(columns) || (node.attrs.rowspan ?? '1') !== String(rows)) {
    fail('TABLE_STRUCTURE', 'Unexpected merged-cell structure.', location);
  }
}
function cells(row, count, location) {
  const result = nodes(row);
  if (result.length !== count || result.some(cell => cell.tag !== 'td')) {
    fail('TABLE_STRUCTURE', 'Unexpected number or type of cells.', location);
  }
  return result;
}

function parsePeriod(value) {
  const match = /^ระหว่างวันที่ ([1-9][0-9]?) ([^ ]+) ([0-9]{4}) ถึง ([1-9][0-9]?) ([^ ]+) ([0-9]{4})$/.exec(value);
  if (!match) fail('PERIOD', 'Expected a complete Thai-language monthly date range.');
  const [, startDay, startMonth, startYear, endDay, endMonth, endYear] = match;
  const monthIndex = MONTHS.indexOf(startMonth);
  const gregorianYear = Number(startYear) - 543;
  if (monthIndex < 0 || startMonth !== endMonth || startYear !== endYear ||
      startDay !== '1' || gregorianYear < 1900 || gregorianYear > 2199) {
    fail('PERIOD', 'Report must cover one full calendar month, using a Buddhist year from 2443 to 2742.');
  }
  const lastDay = new Date(Date.UTC(gregorianYear, monthIndex + 1, 0)).getUTCDate();
  if (Number(endDay) !== lastDay) fail('PERIOD', 'Report does not cover the full calendar month.');
  const month = `${gregorianYear}-${String(monthIndex + 1).padStart(2, '0')}`;
  return { month, startDate: `${month}-01`, endDate: `${month}-${lastDay}` };
}

// Exact signed integer strings: compatible with Apps Script V8 without BigInt.
// Money and quantities are hundredths throughout; never use floating point to reconcile.
function integerString(value) {
  const negative = value[0] === '-';
  const digits = (negative ? value.slice(1) : value).replace(/^0+(?=\d)/, '');
  return digits === '0' ? '0' : (negative ? '-' : '') + digits;
}
function addUnsigned(a, b) {
  let i = a.length - 1, j = b.length - 1, carry = 0, result = '';
  while (i >= 0 || j >= 0 || carry) {
    const sum = (i >= 0 ? a.charCodeAt(i--) - 48 : 0) + (j >= 0 ? b.charCodeAt(j--) - 48 : 0) + carry;
    result = String(sum % 10) + result; carry = Math.floor(sum / 10);
  }
  return result || '0';
}
function subtractUnsigned(a, b) {
  let i = a.length - 1, j = b.length - 1, borrow = 0, result = '';
  while (i >= 0) {
    let digit = a.charCodeAt(i--) - 48 - borrow - (j >= 0 ? b.charCodeAt(j--) - 48 : 0);
    borrow = digit < 0 ? 1 : 0; if (borrow) digit += 10;
    result = String(digit) + result;
  }
  return integerString(result);
}
function addInteger(a, b) {
  const an = a[0] === '-', bn = b[0] === '-';
  const aa = an ? a.slice(1) : a, bb = bn ? b.slice(1) : b;
  if (an === bn) return integerString((an ? '-' : '') + addUnsigned(aa, bb));
  const comparison = aa.length === bb.length ? (aa === bb ? 0 : aa > bb ? 1 : -1) : aa.length > bb.length ? 1 : -1;
  if (comparison === 0) return '0';
  return integerString((comparison > 0 ? an : bn ? true : false) ?
    '-' + (comparison > 0 ? subtractUnsigned(aa, bb) : subtractUnsigned(bb, aa)) :
    (comparison > 0 ? subtractUnsigned(aa, bb) : subtractUnsigned(bb, aa)));
}
function subtractInteger(a, b) { return addInteger(a, b === '0' ? '0' : b[0] === '-' ? b.slice(1) : '-' + b); }
function decimal(value, signed, location, maxIntegerDigits = 12) {
  const pattern = signed
    ? /^-?(?:0|[1-9][0-9]{0,14}|[1-9][0-9]{0,2}(?:,[0-9]{3}){1,4})\.[0-9]{2}$/
    : /^(?:0|[1-9][0-9]{0,14}|[1-9][0-9]{0,2}(?:,[0-9]{3}){1,4})\.[0-9]{2}$/;
  if (!pattern.test(value) || value.split(',').join('').replace('-', '').split('.')[0].length > maxIntegerDigits) {
    fail('NUMBER', 'Expected a valid amount within the supported size, with exactly two decimal places.', location);
  }
  const amount = integerString(value.split(',').join('').replace('.', ''));
  if (value.startsWith('-') && amount === '0') fail('NUMBER', 'Negative zero is not a valid report amount.', location);
  return amount;
}
function formatDecimal(n) {
  const negative = n[0] === '-';
  const digits = (negative ? n.slice(1) : n).padStart(3, '0');
  return `${negative ? '-' : ''}${digits.slice(0, -2)}.${digits.slice(-2)}`;
}
function reconcile(actual, expected, location) {
  if (actual !== expected) fail('RECONCILIATION', 'Row or footer totals do not reconcile exactly.', location);
}

function parseBytes(bytes) {
  const root = parseInertHtml(decodeUtf8(bytes));
  const tables = nodes(root).filter(node => node.tag === 'table');
  if (tables.length !== 2) fail('TABLE_STRUCTURE', 'Expected exactly one title table and one data table.');
  const titleRows = nodes(tables[0]);
  if (titleRows.length !== 1) fail('TABLE_STRUCTURE', 'Expected a single title row.');
  const titleCell = cells(titleRows[0], 1, 'title')[0];
  requireSpan(titleCell, 7, 1, 'title');
  const titleText = textOf(titleCell);
  if (!titleText.startsWith(`${TITLE} `)) fail('HEADERS', 'Unrecognized report title.');
  const periodText = titleText.slice(TITLE.length + 1);
  const period = parsePeriod(periodText);

  const tableRows = nodes(tables[1]);
  const dataRowCount = tableRows.length - 3;
  if (dataRowCount < 1 || dataRowCount > MAX_CATEGORY_ROWS) {
    fail('ROW_COUNT', `Expected between 1 and ${MAX_CATEGORY_ROWS} category rows.`);
  }
  const h1 = cells(tableRows[0], 4, 'header.1');
  ['รหัส', 'รายการ', periodText, 'กำไรจากการขาย'].forEach((value, i) => requireText(h1[i], value, `header.1.${i + 1}`));
  [[1, 2], [1, 2], [4, 1], [1, 2]].forEach(([cols, rows], i) => requireSpan(h1[i], cols, rows, `header.1.${i + 1}`));
  const h2 = cells(tableRows[1], 4, 'header.2');
  ['หน่วยนับ', 'ปริมาณ', 'ยอดรับซื้อ (บาท)', 'ยอดขาย (บาท)'].forEach((value, i) => {
    requireText(h2[i], value, `header.2.${i + 1}`);
    requireSpan(h2[i], 1, 1, `header.2.${i + 1}`);
  });

  const codes = new Set();
  const unitTotals = new Map();
  let quantitySum = '0';
  let purchaseSum = '0';
  let saleSum = '0';
  let profitSum = '0';
  const rows = tableRows.slice(2, -1).map((row, index) => {
    const location = `rows.${index + 1}`;
    const rowCells = cells(row, 7, location);
    rowCells.forEach((cell, i) => requireSpan(cell, 1, 1, `${location}.${i + 1}`));
    const [categoryCode, categoryName, unit, quantityText, purchaseText, saleText, profitText] = rowCells.map(textOf);
    if (!/^[1-9][0-9]{0,8}$/.test(categoryCode)) fail('CATEGORY_CODE', 'Category code must be a positive integer of at most nine digits.', location);
    if (codes.has(categoryCode)) fail('DUPLICATE_CODE', 'Category codes must be unique within a report.', location);
    codes.add(categoryCode);
    if (!categoryName || categoryName.length > 250 || /^[=+@-]/.test(categoryName) || /[<>]/.test(categoryName)) {
      fail('CATEGORY_NAME', 'Missing, unsafe, or excessively long category name.', location);
    }
    if (!UNITS.includes(unit)) fail('UNIT', 'Only กิโลกรัม and ลัง are supported.', location);
    const quantity = decimal(quantityText, false, `${location}.quantity`);
    const purchase = decimal(purchaseText, false, `${location}.purchase`);
    const sale = decimal(saleText, false, `${location}.sale`);
    const profit = decimal(profitText, true, `${location}.profit`);
    reconcile(profit, subtractInteger(sale, purchase), `${location}.profit`);
    quantitySum = addInteger(quantitySum, quantity);
    purchaseSum = addInteger(purchaseSum, purchase);
    saleSum = addInteger(saleSum, sale);
    profitSum = addInteger(profitSum, profit);
    unitTotals.set(unit, addInteger(unitTotals.get(unit) || '0', quantity));
    return { categoryCode, categoryName, unit, quantity: formatDecimal(quantity),
      purchaseAmount: formatDecimal(purchase), saleAmount: formatDecimal(sale), profitAmount: formatDecimal(profit),
      quantityHundredths: quantity.toString(), purchaseSatang: purchase.toString(), saleSatang: sale.toString(), profitSatang: profit.toString() };
  });
  rows.sort((a, b) => Number(a.categoryCode) - Number(b.categoryCode));

  const footer = cells(tableRows[tableRows.length - 1], 5, 'footer');
  requireText(footer[0], 'รวมทั้งสิ้น', 'footer.label');
  requireSpan(footer[0], 3, 1, 'footer.label');
  footer.slice(1).forEach((cell, i) => requireSpan(cell, 1, 1, `footer.${i + 1}`));
  const sums = [quantitySum, purchaseSum, saleSum, profitSum];
  footer.slice(1).forEach((cell, i) => reconcile(decimal(textOf(cell), i === 3, `footer.${i + 1}`, 15), sums[i], `footer.${i + 1}`));
  reconcile(profitSum, subtractInteger(saleSum, purchaseSum), 'footer.profit');

  const mixedUnits = unitTotals.size > 1;
  const quantityTotals = UNITS.filter(unit => unitTotals.has(unit))
    .map(unit => ({ unit, quantity: formatDecimal(unitTotals.get(unit)), quantityHundredths: unitTotals.get(unit).toString() }));
  const payload = {
    schemaVersion: PARSER_VERSION,
    recordType: 'monthly_category_summary',
    period,
    quantityMeaning: 'purchased',
    currency: 'THB',
    rows,
    quantityTotals,
    moneyTotals: { purchaseAmount: formatDecimal(purchaseSum), saleAmount: formatDecimal(saleSum), profitAmount: formatDecimal(profitSum),
      purchaseSatang: purchaseSum.toString(), saleSatang: saleSum.toString(), profitSatang: profitSum.toString() },
  };
  const warnings = [
    { code: 'MONTHLY_SUMMARY_ONLY', message: 'This is a monthly category summary, not transaction records. No row dates or transaction IDs are provided.' },
    { code: 'PURCHASE_QUANTITY_CONFIRMED', message: 'Quantity is treated as purchased quantity based on the owner’s explicit confirmation, not an inference from the file. No sold quantities are provided.' },
  ];
  if (mixedUnits) warnings.push({ code: 'MIXED_UNIT_FOOTER', message: 'The footer adds kilograms and crates. It is not a weight total. Use the separate per-unit quantities.' });

  return {
    ...payload,
    normalizedPayload: payload,
    source: { format: 'verified-utf8-html-xls', byteLength: bytes.length },
    footerQuantity: { reportedNumericSum: formatDecimal(quantitySum), hasMixedUnits: mixedUnits,
      unit: mixedUnits ? null : quantityTotals[0].unit, usableAsWeightTotal: !mixedUnits && quantityTotals[0].unit === 'กิโลกรัม' },
    warnings,
    // A semantic identity, independent of filename, markup/spacing, grouping commas,
    // row order and byte encoding variants such as a UTF-8 BOM.
    canonicalPayload: JSON.stringify(payload),
  };
}

/** Synchronous parse; throws BankReportError. Does not accept a filename as evidence of format. */
export function parseWasteBankReport(input) {
  return parseBytes(inputBytes(input));
}

/** Optional async SHA-256 provenance. Hash original bytes separately from semantic identity. */
export async function fingerprintWasteBankReport(input, cryptoProvider = globalThis.crypto) {
  const bytes = inputBytes(input);
  const report = parseBytes(bytes);
  if (!cryptoProvider?.subtle?.digest) fail('CRYPTO_UNAVAILABLE', 'Web Crypto SHA-256 is unavailable; canonicalPayload remains available from the synchronous parser.');
  const hexDigest = async data => Array.from(new Uint8Array(await cryptoProvider.subtle.digest('SHA-256', data)),
    n => n.toString(16).padStart(2, '0')).join('');
  const [sourceSha256, canonicalSha256] = await Promise.all([
    hexDigest(bytes), hexDigest(new TextEncoder().encode(report.canonicalPayload)),
  ]);
  return { ...report, source: { ...report.source, sha256: sourceSha256 },
    identity: { algorithm: 'SHA-256', canonicalSha256 } };
}
