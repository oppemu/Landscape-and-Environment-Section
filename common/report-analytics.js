(function (root) { // แยกโมดูลคำนวณกราฟออกจากส่วนแสดงผลและการบันทึกข้อมูล
  'use strict'; // ตรวจข้อผิดพลาดของตัวแปรอย่างเคร่งครัด
  const reportInteger = new Intl.NumberFormat('th-TH',{maximumFractionDigits:0});
  const displayNumber = n => !Number.isFinite(n) ? '' : n !== 0 && Math.abs(n) < 1 ? (n < 0 ? '−<1' : '<1') : reportInteger.format(Math.trunc(n));
  const displayWeight = kg => !Number.isFinite(kg) ? '' : Math.abs(kg) >= 1000 ? displayNumber(kg/1000)+' ตัน' : displayNumber(kg)+' กก.';
  const displayTick = (n,short=false) => !Number.isInteger(n) ? '' : short && Math.abs(n)>=1000 && n%(Math.abs(n)>=1000000?1000000:1000)===0 ? displayNumber(n/(Math.abs(n)>=1000000?1000000:1000))+(Math.abs(n)>=1000000?'M':'K') : displayNumber(n);
  root.HubWasteReportDisplay = { number:displayNumber, weight:displayWeight, tick:displayTick };
  const engine = root.ReportEngine || (typeof require === 'function' ? require('../report.js') : null); // ใช้กติกาวันที่และขอบเขตเดิม
  const valid = (metric) => metric && metric.status === 'ok' && Number.isFinite(metric.value); // กราฟใช้เฉพาะยอดครบที่ตรวจผ่าน ไม่วาดยอดบางส่วนเป็นยอดจริง
  const unknown = (unit) => ({ value: null, status: 'unconfigured', unit }); // ข้อมูลที่ยังไม่ทราบเป็น null ไม่ใช่ศูนย์
  function mapped(input, period, mapping, unit) { // รวมคอลัมน์เพิ่มเติมเฉพาะเมื่อผู้ดูแลยืนยันแหล่งแล้ว
    if (!mapping) return unknown(unit); // ไม่คาดเดาว่าวัตถุดิบเท่ากับผลผลิต
    const result = engine.aggregate({ ...input, period, month: undefined, sourcePeriod: input.period, sourceMonth: input.month, schema: { fertilizerKg: mapping } }); // ใช้ตัวรวมเดิมกับ mapping ที่ตั้งในโค้ดเท่านั้น
    return { ...result.metrics.fertilizerKg, unit }; // ส่งหน่วยที่กำหนดไว้กับสินค้านั้น
  } // จบตัวรวมข้อมูลเพิ่มเติม
  function difference(purchase, sale) { // หาผลต่างเงินขายกับเงินซื้อของช่วงเดียวกัน
    if (!valid(purchase) || !valid(sale)) return { value: null, status: 'incomplete', unit: 'บาท' }; // ขาดด้านใดด้านหนึ่งไม่สรุปกำไร
    return { value: Math.round((sale.value - purchase.value) * 100) / 100, status: 'ok', unit: 'บาท' }; // เก็บค่าติดลบไว้และปัดสองตำแหน่ง
  } // จบการคำนวณผลต่าง
  const saleHeaders = Object.freeze({ date: 'วัน/เดือน/ปี', weight: 'น้ำหนักรวม (กิโลกรัม)', money: 'ราคาที่จำหน่าย', items: 'รายการและจำนวน' }); // ชื่อคอลัมน์จริงของรายการขาย ไม่อ้างตำแหน่งคอลัมน์
  const humusPackages = Object.freeze({ // ผู้ใช้ยืนยันว่าเม็ดและผงเป็นฮิวมัส; น้ำหนักบรรจุอ้างอิงฟอร์มเดิม ไม่ใช้ราคาปัจจุบันคำนวณรายได้ย้อนหลัง
    'เม็ด: ไม่บรรจุถุง': ['กก.', 1],
    'เม็ด: ถุง 2 กก.': ['ถุง', 2],
    'ผง: ไม่บรรจุถุง': ['กก.', 1],
    'ผง: บรรจุถุงชั่งน้ำหนัก': ['กก.', 1],
    'ผง: ถุงเล็ก': ['ถุง', 4],
    'ผง: ถุงใหญ่': ['ถุง', 10],
  });
  function saleItems(value) { // อ่านเฉพาะชื่อสินค้า จำนวน และหน่วยที่ฟอร์มเดิมระบุครบ
    if (typeof value !== 'string' || !value.trim()) return null;
    const seen = new Set();
    let weight = 0, solid = false, liquid = false;
    for (const item of value.trim().split(',')) {
      const match = item.trim().match(/^(.+?) \(([0-9๐-๙]+(?:\.[0-9๐-๙]+)?) (กก\.|ถุง|ลิตร)\)$/);
      if (!match || seen.has(match[1])) return null; // ไม่เดาหน่วย/จำนวนที่ขาด และไม่รับ checkbox เดิมซ้ำในรายการเดียว
      seen.add(match[1]);
      const quantity = engine.number(match[2]);
      if (quantity === null) return null;
      if (match[1] === 'น้ำหมักชีวภาพ' && match[3] === 'ลิตร') { liquid = true; continue; }
      const pack = Object.prototype.hasOwnProperty.call(humusPackages, match[1]) ? humusPackages[match[1]] : null;
      if (!pack || match[3] !== pack[0] || (pack[0] === 'ถุง' && !Number.isInteger(quantity))) return null;
      const next = weight + quantity * pack[1];
      if (!Number.isFinite(next) || next > Number.MAX_SAFE_INTEGER) return null;
      weight = next;
      solid = true;
    }
    return { weight, solid, liquid };
  }
  function humusSales(input, requested) { // รวมได้เมื่อทั้งรายการเป็นฮิวมัสและน้ำหนักตรงกับยอดที่บันทึก ไม่แบ่งเงินของรายการผสม
    const tab = 'ยอดจำหน่ายปุ๋ย', period = engine.normalizePeriod(requested);
    const make = (unit) => ({ unit, tab, value: null, status: 'missing', rows: 0, invalid: 0 });
    const sold = make('กก.'), revenue = make('บาท'), result = { sold, revenue };
    const setStatus = (status) => { sold.status = revenue.status = status; return result; };
    const ds = (input.datasets || {})[tab];
    if (!ds) return result;
    const sourcePeriod = input.period || input.month;
    if (!engine.coverageContains(ds.coveragePeriod || ds.coverageMonth || sourcePeriod, period) || (sourcePeriod && !engine.coverageContains(sourcePeriod, period)) || ds.status !== 'loaded') return setStatus('not-loaded');
    if (!Array.isArray(ds.headers) || !Array.isArray(ds.rows) || Object.values(saleHeaders).some(header => ds.headers.filter(value => value === header).length !== 1)) return setStatus('schema-error');
    if (!ds.rows.length) return setStatus('empty');
    let weightTotal = 0, moneyTotal = 0;
    const invalidate = () => { sold.invalid++; revenue.invalid++; };
    for (const row of ds.rows) {
      if (row == null) continue;
      if (typeof row !== 'object') { invalidate(); continue; }
      if ((Array.isArray(row) ? row : Object.values(row)).every(value => value == null || String(value).trim() === '')) continue;
      const get = (header) => Array.isArray(row) ? row[ds.headers.indexOf(header)] : row[header];
      const date = engine.dateParts(get(saleHeaders.date));
      if (!date) { invalidate(); continue; } // วันที่เสียอาจอยู่ในช่วงรายงาน จึงไม่ทิ้งเงียบ ๆ
      if (!engine.matchesPeriod(date, period)) continue;
      const items = saleItems(get(saleHeaders.items));
      if (!items || (items.solid && items.liquid)) { invalidate(); continue; }
      if (!items.solid && items.liquid) continue; // น้ำหมักล้วนไม่ใช่ฮิวมัส และไม่สร้างรายการฮิวมัสศูนย์ขึ้นเอง
      const weight = engine.number(get(saleHeaders.weight));
      if (weight === null || Number(items.weight.toFixed(2)) !== weight) { invalidate(); continue; } // ฟอร์มเดิมบันทึกยอดน้ำหนักด้วย toFixed(2)
      const money = engine.number(get(saleHeaders.money));
      if (!Number.isFinite(weightTotal + weight) || weightTotal + weight > Number.MAX_SAFE_INTEGER) sold.invalid++;
      else { weightTotal += weight; sold.rows++; }
      if (money === null || !Number.isFinite(moneyTotal + money) || moneyTotal + money > Number.MAX_SAFE_INTEGER) revenue.invalid++;
      else { moneyTotal += money; revenue.rows++; } // ใช้ยอดเงินจริงจาก G ทั้งรายการ ไม่คูณราคาหรือเฉลี่ยรายได้
    }
    for (const [metric, total] of [[sold, weightTotal], [revenue, moneyTotal]]) {
      metric.status = metric.invalid ? 'unresolved' : metric.rows ? 'ok' : 'no-records';
      metric.value = metric.status === 'ok' ? Number(total.toFixed(6)) : null; // ไม่ให้ยอดที่ขาดบางรายการถูกวาดเป็นยอดครบ และยังแยกศูนย์จริงจากไม่มีข้อมูล
      if (metric.invalid) metric.reason = 'รายการขายมีข้อมูลไม่ครบ สินค้าผสม หรือยอดไม่ตรง จึงยังสรุปฮิวมัสไม่ได้';
    }
    return result;
  }
  // หนึ่งแถวต่อรอบจริง; การแจ้งย้อนหลังแก้แถวเดิม จึงไม่นับน้ำหนักซ้ำ
  function municipalSummary(records,period,now=new Date()) {
    if(!Array.isArray(records))return null;
    const p=engine.normalizePeriod(period), matches=date=>{const d=engine.dateParts(date);return d&&engine.matchesPeriod(d,p);};
    const rows=records.filter(r=>matches(r.date)), pickups=rows.filter(r=>r.entryStatus==='เข้า');
    const present=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0;
    const known=pickups.filter(r=>present(r.beforeWeight)&&present(r.afterWeight)&&Number(r.afterWeight)>=Number(r.beforeWeight));
    const afterOnly=pickups.filter(r=>!present(r.beforeWeight)&&present(r.afterWeight));
    const anomalies=pickups.filter(r=>present(r.beforeWeight)&&present(r.afterWeight)&&Number(r.afterWeight)<Number(r.beforeWeight));
    const dates=[...new Set(pickups.map(r=>r.date))].sort();
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    const today=['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');
    const reviewed=new Set(rows.filter(r=>r.entryStatus).map(r=>r.date));
    const start=p.type==='year'?p.value+'-01-01':p.type==='month'?p.value+'-01':p.value;
    let unreviewed=0; for(let d=new Date(start+'T00:00:00Z'),i=0;i<366;i++,d.setUTCDate(d.getUTCDate()+1)){const day=d.toISOString().slice(0,10);if(day>today||!matches(day))break;if(!reviewed.has(day))unreviewed++;}
    const pending=pickups.length-known.length,weight=known.reduce((s,r)=>s+Number(r.afterWeight)-Number(r.beforeWeight),0);
    const thai=date=>new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Bangkok'}).format(new Date(date+'T12:00:00+07:00'));
    const summary={rounds:pickups.length,days:dates.length,dates,weight:known.length?weight:null,pending,unreviewed,notSeen:new Set(rows.filter(r=>r.entryStatus==='ไม่เข้า').map(r=>r.date)).size};
    summary.lines=[['เข้าเก็บ',summary.rounds+' ครั้ง / '+summary.days+' วัน'],['วันที่เข้าเก็บ',dates.length?dates.map(thai).join(', '):'ไม่มีรายการ'],['ส่วนต่างน้ำหนักรวม (หลัง − ก่อน)',summary.weight===null?'ยังไม่มีข้อมูลน้ำหนัก':summary.weight.toLocaleString('th-TH')+' กก.'],['ยังคำนวณส่วนต่างไม่ได้',pending+' ครั้ง'],['มีเฉพาะน้ำหนักหลัง ยังยืนยันปริมาณขยะไม่ได้',afterOnly.length+' ครั้ง'],['น้ำหนักหลังน้อยกว่าก่อน ต้องตรวจสอบ',anomalies.length+' ครั้ง'],['ไม่เข้าเก็บ',summary.notSeen+' วัน'],['ยังไม่ได้บันทึก',unreviewed+' วัน']];
    summary.note='ส่วนต่างคำนวณจากน้ำหนักรถหลังเก็บลบน้ำหนักรถก่อนเก็บ เฉพาะรายการที่มีทั้งสองค่า น้ำหนักหลังอย่างเดียวไม่ใช่ปริมาณขยะ และรายการผิดปกติไม่รวมในยอด';return summary;
  }
  // Only consume a verified monthly aggregate. Missing backend is not a zero total.
  function orphanMetric(input, requested) {
    const period=engine.normalizePeriod(requested), source=input.environmentSummary;
    const metric={value:null,status:'not-loaded',unit:'กก.'};
    if(!source || (source.period ? source.period.type!==period.type || source.period.value!==period.value : period.type!=='month' || source.month!==period.value))return metric;
    const row=source.waste?.orphan;
    if(row?.status==='ready' && Number.isFinite(row.kg) && row.kg>=0 && Number.isInteger(row.count) && row.count>0)
      return {value:row.kg,status:'ok',unit:'กก.',rows:row.count};
    if(row?.status==='empty' && row.count===0 && row.kg===null)return {...metric,status:'no-records'};
    return metric;
  }
  function build(input, period, mappings = {}) { // สร้างข้อมูลกราฟสำหรับวัน เดือน หรือปีที่เลือก
    const aggregate = (p) => engine.aggregate({ ...input, period: p, month: undefined, sourcePeriod: input.period, sourceMonth: input.month }); // รักษาขอบเขตข้อมูลไฟล์ต้นทางทุกครั้ง
    const metrics = aggregate(period).metrics; // รวมตัวชี้วัดจากหกแท็บที่ยืนยันหัวคอลัมน์แล้ว
    if(input.foodPartial===true && metrics.foodKg?.status==='ok')metrics.foodKg.verifiedSubset=true;
    const waste = [ // กราฟขยะพร้อมหมวดขยะกำพร้าที่รอแบบฟอร์ม ไม่รวมรับเข้ากับขายออกซ้ำ
      { label: 'ทั่วไป', metric: mapped(input, period, mappings.generalKg, 'กก.') }, // ขยะทั่วไปต้องระบุแหล่งเพิ่ม
      { label: 'รีไซเคิล', metric: metrics.recycleReceivedKg }, // ใช้รับเข้าธนาคารขยะ ไม่ใช้ยอดขายออก
      { label: 'อันตราย', metric: metrics.hazardKg }, // เป็นยอดแจ้ง ไม่ใช่ยืนยันกำจัด
      { label: 'เศษอาหาร', metric: metrics.foodKg }, // น้ำหนักเก็บเศษอาหาร
      { label: 'พืชสด', metric: metrics.freshKg }, // น้ำหนักพืชสดรับเข้า
      { label: 'ขยะกำพร้า', metric: orphanMetric(input, period) }, // อ่านยอดรวมที่ผ่านการตรวจจากชีทขยะกำพร้า
    ]; // จบรายการขยะ
    const municipal=municipalSummary(input.municipalRecords,period);
    if(municipal)waste[0].metric={value:municipal.weight,status:municipal.weight===null?'not-loaded':'ok',unit:'กก.',reason:'ส่วนต่างน้ำหนักรถหลังเก็บลบน้ำหนักรถก่อนเก็บ'+(municipal.pending?' · ข้อมูลน้ำหนักยังไม่ครบ '+municipal.pending+' รอบ':'')};
    const humus = mappings.humusItemSales === true ? humusSales(input, period) : null; // เปิดการจำแนกเม็ด/ผงเฉพาะเมื่อยืนยัน mapping แล้ว
    const products = [ // แยกแต่ละสินค้าและหน่วย ไม่เปรียบเทียบลิตรกับกิโลกรัมบนสเกลเดียว
      ['humus', 'ฮิวมัส', 'กก.'], // ผลผลิตฮิวมัส ไม่ใช่ปริมาณตรวจคุณภาพ
      ['soil', 'ฮิวมิค', 'กก.'], // ผลผลิตสารปรุงดิน
      ['liquid', 'น้ำหมัก', 'ลิตร'], // ผลผลิตน้ำหมักใช้ลิตร
    ].map(([id, label, unit]) => ({ // สร้างชุดผลิต ขาย และรายได้เงินของแต่ละสินค้า
      id, label, unit, // เก็บชื่อและหน่วยของสินค้า
      produced: mapped(input, period, mappings[id + 'Produced'], unit), // ผลิตสำเร็จจากแหล่งที่ยืนยัน
      sold: id === 'humus' && humus && !mappings.humusSold ? humus.sold : mapped(input, period, mappings[id + 'Sold'], unit), // mapping คอลัมน์ที่ระบุชัดเจนมีสิทธิ์เหนือการจำแนกรายการ
      revenue: id === 'humus' && humus && !mappings.humusRevenue ? humus.revenue : mapped(input, period, mappings[id + 'Revenue'], 'บาท'), // รายการฮิวมัสล้วนใช้เงินจริง ไม่จัดสรรเงินของสินค้าผสม
    })); // จบชุดสินค้า
    // รายการที่เว้นประเภท/รายการย่อยไว้ยังเก็บในชุดข้อมูล ไม่เดาหมวดหรือทำให้ยอดดูครบ
    const unknownRows=((input.datasets||{})['รายการรอจัดหมวด']||{}).rows||[];
    const pending=unknownRows.filter(row=>{const date=engine.dateParts(row[2]);return !date||engine.matchesPeriod(date,engine.normalizePeriod(period));});
    const count=m=>pending.filter(row=>row[0]===m).length;
    const incomplete=(metric,n,reason)=>n?{...metric,status:'unresolved',value:null,reason:reason+' '+n+' รายการ'}:metric;
    for(const product of products){
      product.produced=incomplete(product.produced,count('humusprod'),'รอระบุประเภทผลผลิต');
      product.sold=incomplete(product.sold,count('sale'),'รอระบุรายการจำหน่าย');
      product.revenue=incomplete(product.revenue,count('sale'),'รอระบุรายการจำหน่าย');
    }
    const bank = { received: metrics.recycleReceivedKg, purchase: metrics.recycleReceivedBaht, sale: metrics.recycleSoldBaht, difference: difference(metrics.recycleReceivedBaht, metrics.recycleSoldBaht) }; // ธนาคารขยะแยกรับเข้า ซื้อ ขาย และผลต่าง
    const year = engine.normalizePeriod(period).value.slice(0, 4); // ใช้ปีปฏิทินของรายงาน ไม่ใช้ปีปัจจุบันเครื่อง
    const bankDataset = (input.datasets || {})['ธนาคารขยะ'] || {}; // อ่าน metadata ของแท็บธนาคารขยะโดยไม่คาดเดาขอบเขต
    const importState = engine.inspectBankImports(input);
    // แจ้งเดือนที่อ่านได้จริง เพื่อไม่ให้ผู้ใช้เข้าใจว่าขีดในเดือนว่างคือระบบไม่ดึงชีต
    const availableMonths = importState.status === 'loaded' ? [...importState.months.entries()].filter(([,entry]) => entry.status === 'committed').map(([month]) => month).sort() : [];
    const thaiMonth = value => new Intl.DateTimeFormat('th-TH',{month:'long',year:'numeric',timeZone:'Asia/Bangkok'}).format(new Date(value+'-01T12:00:00+07:00'));
    const bankSourceNote = availableMonths.length ? 'ข้อมูลจากชีตธนาคารขยะรายเดือน · มีข้อมูลที่ยืนยันแล้ว: '+availableMonths.map(thaiMonth).join(', ')+(period.type==='month'&&!availableMonths.includes(period.value)?' · ยังไม่มีข้อมูลนำเข้าของเดือนที่เลือก จึงไม่ใช้ยอดเดือนอื่นแทน':'') : '';

    const hasBankCoverage = importState.status === 'error' || importState.months.size > 0 || Boolean(bankDataset.coveragePeriod || bankDataset.coverageMonth || input.period || input.month); // กราฟรายปีต้องมีช่วงข้อมูลที่ระบุชัดเจน แม้ไฟล์เดิมอนุญาตเดือนเดียวแบบไม่มี metadata
    const months = Array.from({ length: 12 }, (_, index) => { // สร้างครบมกราคมถึงธันวาคมแม้บางเดือนยังไม่มีข้อมูล
      const month = year + '-' + String(index + 1).padStart(2, '0'); // สร้างเดือน ค.ศ. ตามสัญญาข้อมูล
      if (!hasBankCoverage) return { month, purchase: { value: null, status: 'not-loaded', unit: 'บาท' }, sale: { value: null, status: 'not-loaded', unit: 'บาท' }, metric: { value: null, status: 'not-loaded', unit: 'บาท' } }; // ไม่อนุมานความครบถ้วน 12 เดือนจากไฟล์รุ่นเก่าไร้ coverage
      const m = aggregate({ type: 'month', value: month }).metrics; // ตรวจ coverage ของแต่ละเดือนก่อนรวม
      const purchase = importState.months.size && !valid(m.recycleReceivedBaht) ? { ...m.recycleReceivedBaht, value: null } : m.recycleReceivedBaht;
      const sale = importState.months.size && !valid(m.recycleSoldBaht) ? { ...m.recycleSoldBaht, value: null } : m.recycleSoldBaht;
      return { month, purchase, sale, metric: difference(purchase, sale) }; // ไม่เปลี่ยนเดือนว่างเป็นศูนย์
    }); // จบชุดเปรียบเทียบรายเดือน
    return { municipal, period, year, pendingNotes:[...new Set([...(input.municipalIssues||[]),...pending.map(row=>row[6]+(row[2]?'':' · ยังไม่ระบุวันที่'))])], waste, products, bank: { ...bank, availableMonths, sourceNote:bankSourceNote, sourceMode: bank.received.sourceMode, importedMonths: bank.received.importedMonths, knownMonths: bank.received.knownMonths, unknownMonths: bank.received.unknownMonths, coverageComplete: bank.received.coverageComplete, quantityByUnit: bank.received.quantityByUnit }, months, fertilizerTotals: { quantity: metrics.fertilizerKg, revenue: metrics.fertilizerBaht } }; // ส่งแบบจำลองให้ตัววาดและชุดทดสอบ
  } // จบการสร้างข้อมูลกราฟ
  // รายได้รวมเฉพาะแถวที่แสดง ไม่รวมสินค้าที่ผู้ใช้ให้ตัดออก
  function revenueView(model){
    const excluded=p=>p.id==='soil'||['สารปรุงดิน','ฮิวมิค'].includes(p.label);
    const products=model.products.filter(p=>!excluded(p));
    const known=products.filter(p=>valid(p.revenue)),partial=known.length>0&&known.length<products.length;
    const total={status:known.length?'ok':'incomplete',value:known.length?known.reduce((n,p)=>n+p.revenue.value,0):null,unit:'บาท'};
    const totalLabel=model.reportRevenueTotalOverride?'รวมที่ระบุเอง':partial?'รวมเฉพาะที่มีข้อมูล':'รวมเป็นเงิน';
    const warning=model.products.some(p=>excluded(p)&&((valid(p.revenue)&&p.revenue.value!==0)||(valid(p.sold)&&p.sold.value!==0)))?'พบข้อมูลจำหน่ายฮิวมิคในฐานข้อมูล แต่ไม่รวมในตารางรายได้นี้ โปรดตรวจสอบ':'';
    return {products,total:model.reportRevenueTotalOverride||total,totalLabel,partial:!model.reportRevenueTotalOverride&&partial,warning};
  }
  root.HubReportAnalytics = { build, orphanMetric, valid, difference, municipalSummary, revenueView }; // เปิด API ให้หน้าเว็บใช้งาน
  if (typeof module !== 'undefined') module.exports = root.HubReportAnalytics; // เปิด API ให้ Node tests
})(typeof window === 'undefined' ? globalThis : window); // รองรับทั้งเบราว์เซอร์และการทดสอบ
