(function (root) { // แยกการวาดกราฟจากการรวมข้อมูล
  'use strict'; // ตรวจข้อผิดพลาดอย่างเคร่งครัด
  const shortMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']; // ชื่อเดือนบนแกนกราฟ
  const valid = (m) => root.HubReportAnalytics.valid(m); // ยอมรับเฉพาะยอดที่ผ่านการตรวจครบ
  const number = root.HubWasteReportDisplay.number;
  const compactNumber = n => root.HubWasteReportDisplay.tick(n,true);
  const barLabel = number;
  const compactAmount=m=>valid(m)?barLabel(m.value):'';
  const amount = (m) => valid(m) ? number(m.value) : ''; // ขีดหมายถึงยังสรุปไม่ได้ ไม่ใช่ศูนย์
  function node(tag, text, className) { // สร้าง DOM ด้วยข้อความแทน HTML ที่อาจมาจากไฟล์นำเข้า
    const el = document.createElement(tag); // สร้างชนิดองค์ประกอบที่โค้ดกำหนด
    if (text != null) el.textContent = text; // ป้องกันข้อความถูกตีความเป็น HTML
    if (className) el.className = className; // ใส่คลาสเพื่อแยก CSS ของรายงาน
    return el; // ส่งองค์ประกอบกลับ
  } // จบตัวช่วย DOM
  function niceMaximum(value) { // เลือกขีดแกน 1, 2, 5 หรือ 10 เท่าของหลัก โดยไม่เปลี่ยนค่าจริง
    if (!(value > 0)) return 1; // กรอบอ้างอิงสำหรับศูนย์/ข้อมูลขาด ไม่ใช่ค่ารายงาน
    const power = 10 ** Math.floor(Math.log10(value));
    return [1, 2, 5, 10].find(step => step * power >= value) * power;
  }
  function units(metrics, unit) { // ทั้งกราฟเปลี่ยนหน่วยพร้อมกันเมื่อมีน้ำหนักตั้งแต่ 1,000 กก.
    const tons = unit === 'กก.' && metrics.some(m => valid(m) && m.value >= 1000);
    const divisor = tons ? 1000 : 1;
    return {unit: tons ? 'ตัน' : unit, divisor,
      value: m => valid(m) ? number(m.value / divisor) : ''};
  }
  function vertical(label, metric, maximum, kind = '', display = units([metric], 'กก.'), showLabel = true) {
    const column = node('div', null, 'analytics-column' + (kind ? ' ' + kind : ''));
    const plot = node('div', null, 'analytics-column-plot');
    const bar = node('span', null, 'analytics-column-bar');
    const height = valid(metric) && maximum > 0 ? Math.max(0, metric.value / display.divisor / maximum * 100) : 0;
    bar.style.height = height + '%';
    if(height>0)bar.style.minHeight='4px';const smallKg=valid(metric)&&display.divisor===1000&&metric.value>0&&metric.value<1000;const value = node('span', valid(metric)?smallKg?number(metric.value)+' กก.':barLabel(metric.value/display.divisor):'', 'analytics-column-value');
    if(smallKg&&height<2.5)value.dataset.reportTiny='true';
    value.style.bottom = height>0?'max(calc('+height+'% + 1mm),calc(4px + 1mm))':'1mm'; // ตัวเลขอยู่เหนือปลายแท่งของตน ไม่เรียงลอยอยู่บนสุดทุกแท่ง
    plot.append(bar, value);
    column.append(plot);
    if (showLabel) column.append(node('span', label, 'analytics-column-label'));
    else column.title = label + ': ' + display.value(metric) + ' ' + display.unit; // ชนิดแท่งยังอ่านได้เมื่อชี้ โดยใช้สีอธิบายด้านบนแทนคำซ้ำใต้แท่ง
    return column;
  }
  function unitAmount(label, metric, kind, display) { // ลิตรแสดงเป็นตัวเลข ไม่ทำแท่งเทียบกิโลกรัมบนแกนเดียวกัน
    const column = node('div', null, 'analytics-column analytics-unit-column' + (kind ? ' ' + kind : ''));
    const plot = node('div', null, 'analytics-column-plot analytics-unit-plot');
    plot.append(node('span', display.value(metric) + ' ' + display.unit, 'analytics-unit-value'));
    column.title = label + ': ' + display.value(metric) + ' ' + display.unit;
    column.append(plot); return column;
  }
  function axes(plot, maximum, {signed = false, known = true, values = [], narrow = false, rightMaximum = null, rightKnown = false, categoryLines = 1, labelCharacters = null, compact = false, leftUnit = null, rightUnit = null, shortTicks = false}) {
    const chart = node('div', null, 'analytics-chart');
    const frame = node('div', null, 'analytics-cartesian');
    const positions = signed ? [100, 75, 50, 25, 0] : [100, 50, 0];
    const tickFormat = root.HubWasteReportDisplay.tick;
    const tickValues = positions.map(pos => signed ? maximum * (pos / 50 - 1) : maximum * pos / 100);
    const ticks = tickValues.map(value => !known && value !== 0 ? '' : (shortTicks?compactNumber(value).toUpperCase():tickFormat(value)));
    const axisWidth = labels => Math.max(12, Math.max(...labels.map(v => v.length)) * 1.8 + 2) + 'mm';
    const rightTicks = positions.map(pos => !rightKnown && pos !== 0 ? '' : tickFormat(rightMaximum * pos / 100));
    frame.style.gridTemplateColumns = (compact ? 'max-content' : axisWidth(ticks)) + ' minmax(0, 1fr)' + (rightMaximum ? ' ' + axisWidth(rightTicks) : '');
    frame.style.marginBottom = (categoryLines * 20) + 'pt'; // เผื่อชื่อผลิต/ขายและชื่อสินค้าใต้กราฟเดียว
    frame.style.paddingTop = Math.max(1, Math.ceil(Math.max(1, ...values.map(v => v.length)) / (labelCharacters || (narrow ? 5 : 8)))) * 20 + 'pt'; // เผื่อข้อความ 15pt ไม่ย่อเลขยาว
    const y = node('div', null, 'analytics-y-axis');if(leftUnit){const u=node('span',leftUnit,'analytics-axis-unit');u.style.cssText='position:absolute;bottom:calc(100% + 20pt);right:0;white-space:nowrap';y.append(u);}
    const area = node('div', null, 'analytics-plot-area');
    positions.forEach((position, i) => {
      const tick = node('span', ticks[i], 'analytics-y-tick'); tick.style.bottom = position + '%'; y.append(tick);
      const line = node('span', null, 'analytics-gridline' + (tickValues[i] === 0 ? ' zero' : '')); line.style.bottom = position + '%'; area.append(line);
    });
    area.append(plot); frame.append(y, area);
    if (rightMaximum) {
      area.className += ' dual-scale';
      const right = node('div', null, 'analytics-y-axis analytics-y-axis-right');if(rightUnit){const u=node('span',rightUnit,'analytics-axis-unit');u.style.cssText='position:absolute;bottom:calc(100% + 20pt);left:0;white-space:nowrap';right.append(u);}
      positions.forEach((position,i)=>{const tick=node('span',rightTicks[i],'analytics-y-tick');tick.style.bottom=position+'%';right.append(tick);});
      frame.append(right); // สเกลลิตรแยกด้านขวา ไม่อ้างว่าลิตรเท่ากิโลกรัม
    }
    chart.append(frame); // คงเส้นแกน ขีดสเกล และชื่อหมวด โดยไม่เพิ่มคำว่าแกน X/Y
    return chart;
  }
  function quantityStatus(metric, label) { // สถานะอยู่ในคำอธิบายเซลล์ ไม่สร้างยอดจากข้อมูลที่ยังไม่ครบ
    if (valid(metric) && metric.quantityScope === 'known-kg-only') return 'ยอดรับซื้อที่ระบุหน่วยกิโลกรัม ไม่แปลงลังเป็นน้ำหนัก';
    if (metric?.status === 'monthly-only' || metric?.status === 'unavailable' || metric?.status === 'incomplete') return metric.reason || 'ข้อมูลรายเดือนไม่สามารถแยกเป็นรายวันหรือน้ำหนักขายได้';
    if (valid(metric)) return label === 'รีไซเคิล' ? 'ยอดรับเข้าธนาคารขยะ' : label === 'อันตราย' ? 'ยอดแจ้ง' : 'ตามข้อมูลที่อ่านได้';
    if (metric?.status === 'unresolved' && label === 'อันตราย') return 'รอยืนยันรหัสการแจ้ง';
    const labels = {
      unconfigured: 'ยังไม่ระบุแหล่งข้อมูล', missing: 'ยังไม่มีข้อมูล', 'not-loaded': 'ยังไม่ได้โหลดช่วงนี้',
      'no-records': 'ไม่มีรายการในช่วงนี้', empty: 'ยังไม่มีรายการ', 'schema-error': 'หัวคอลัมน์ยังไม่ตรง',
      partial: 'ข้อมูลไม่ครบ ยังสรุปไม่ได้', unresolved: 'รอยืนยันข้อมูล', incomplete: 'ข้อมูลไม่ครบ ยังสรุปไม่ได้'
    };
    return labels[metric?.status] || 'ยังสรุปไม่ได้';
  }
  function wasteQuantity(metric) { // ตารางเลือกหน่วยทีละค่า ไม่ยืมหน่วยร่วมของแกนกราฟ
    if (!valid(metric)) return ''; // ข้อมูลขาด/รอยืนยันไม่ใช่ศูนย์ และไม่ใส่หน่วยให้ค่าที่ไม่ทราบ
    return root.HubWasteReportDisplay.weight(metric.value); // ตัดเศษเฉพาะการแสดง ไม่แก้ข้อมูลต้นทาง

  }
  function quantityTable(rows) { // ตารางแนวนอนสองแถว: ประเภทขยะและปริมาณ ครบห้าประเภทตามกราฟ
    const table = node('table', null, 'analytics-quantity-table analytics-waste-table');
    const head = node('thead'); const header = node('tr');
    const heading = node('th', 'ประเภทขยะ'); heading.scope = 'col'; header.append(heading);
    for (const {label} of rows) { const cell = node('th', label); cell.scope = 'col'; header.append(cell); }
    head.append(header); table.append(head);
    const body = node('tbody'); const row = node('tr');
    const rowHeading = node('th', 'ปริมาณ'); rowHeading.scope = 'row'; row.append(rowHeading);
    for (const {label, metric} of rows) {
      const cell = node('td', wasteQuantity(metric));
      cell.title = quantityStatus(metric, label); // คงเหตุผลของขีดและความหมายยอดไว้เมื่อชี้เมาส์ โดยไม่เพิ่มแถวในตาราง
      cell.ariaLabel = label + ': ' + cell.textContent + ' (' + cell.title + ')'; // โปรแกรมอ่านหน้าจอรับทั้งค่าและสถานะ
      row.append(cell);
    }
    body.append(row); table.append(body); return table;
  }
  function fitAnnualLabels(annual) { // ลดช่องว่างให้พอดีกับตัวเลขที่ล้นขึ้นเหนือกราฟจริง โดยไม่ย่อฟอนต์
    if (typeof annual.querySelector !== 'function') return;
    const frame = annual.querySelector('.analytics-cartesian');
    const area = annual.querySelector('.analytics-plot-area');
    frame.style.paddingTop = '0px'; // reset previous measurement before measuring current visible labels
    const bounds = area.getBoundingClientRect();
    if (!(bounds.width > 0 && bounds.height > 0)) return; // กราฟที่ยังซ่อนคงช่องว่างสำรองจนเปิดให้วัดได้
    const labels = [...annual.querySelectorAll('.analytics-month-value, .analytics-y-tick')];
    const visible = labels.map(label => label.getBoundingClientRect()).filter(rect => rect.width > 0 && rect.height > 0); // display:none labels have zero rect, not page-top labels
    const top = Math.min(bounds.top, ...visible.map(rect => rect.top));
    frame.style.paddingTop = Math.ceil(Math.max(0, bounds.top - top)) + 'px';
  }
  function render(container, model) { // วาดกราฟใหม่ทุกครั้งที่เปลี่ยนข้อมูลหรือช่วงเวลา
    container.replaceChildren();
    for(const reason of model.pendingNotes||[])container.append(node('p','ข้อมูลรอตรวจ: '+reason,'analytics-import-note')); // ล้างยอดจากไฟล์หรือช่วงก่อนหน้า
    const grid = node('div', null, 'analytics-grid'); // เรียงส่วน 1–4 ลงด้านล่างและเว้นหนึ่งบรรทัด
    const waste = node('section', null, 'analytics-panel analytics-waste'); // ส่วนขยะห้าประเภท
    const wasteUnits = units(model.waste.map(r => r.metric), 'กก.');
    waste.append(node('h3', '1. ปริมาณขยะในช่วงรายงาน (' + wasteUnits.unit + ')')); // ระบุหน่วยเดียวกันของกราฟ
    const maximum = niceMaximum(Math.max(0, ...model.waste.filter((r) => valid(r.metric)).map((r) => r.metric.value / wasteUnits.divisor))); // คำนวณสเกลจากข้อมูลที่ใช้ได้
    const wastePlot = node('div', null, 'analytics-waste-columns'); // ห้าหมวดใช้ฐานศูนย์และสเกลร่วมกัน
    for (const row of model.waste) wastePlot.append(vertical(row.label, row.metric, maximum, '', wasteUnits)); // แสดงครบห้าหมวดแม้ยังไม่มีข้อมูล
    waste.append(axes(wastePlot, maximum, {known:model.waste.some(r=>valid(r.metric)), values:model.waste.map(r=>wasteUnits.value(r.metric)), compact:true})); // วางชุดแท่งตั้งเต็มความกว้างรายงาน
    waste.append(quantityTable(model.waste));
    if(model.waste.some(r=>r.metric?.verifiedSubset))waste.append(node('p','เศษอาหาร: เฉพาะรายการที่ตรวจได้','analytics-import-note'));
    if(model.waste.some(r=>valid(r.metric)&&r.metric.value>0&&r.metric.value/wasteUnits.divisor/maximum<0.025))waste.append(node('p','แท่งค่าต่ำมีความสูงขั้นต่ำเพื่อให้อ่านง่าย ให้ยึดปริมาณที่ระบุ','analytics-import-note')); // ตารางสองแถวเลือกกก./ตันทีละค่า โดยสเกลร่วมของกราฟคงเดิม
    const importedRecycling = model.waste.find(row => row.metric?.quantityScope === 'known-kg-only');
    if (importedRecycling && Object.keys(importedRecycling.metric.quantityByUnit || {}).some(unit => unit !== 'กิโลกรัม')) waste.append(node('p', 'รีไซเคิล: สรุปเฉพาะน้ำหนักที่ระบุเป็นกิโลกรัม ไม่แปลงหน่วยอื่นเป็นน้ำหนัก', 'analytics-import-note'));
    const products = node('section', null, 'analytics-panel analytics-products'); // ส่วนผลิตเทียบขาย
    products.append(node('h3', '2. ปริมาณผลิตเทียบจำหน่าย')); // ใช้ปริมาณเทียบปริมาณ ไม่ใช้บาทเทียบกิโลกรัม
    const productLegend = node('div', null, 'analytics-product-legend');
    productLegend.append(node('span', 'ผลิต', 'analytics-legend-produced'), node('span', 'ขาย', 'analytics-legend-sold'));
    products.append(productLegend); // บอกสีก่อนกราฟ ไม่ใส่ผลิต/ขายซ้ำใต้คู่แท่ง
    const weights=model.products.filter(p=>p.unit!=='ลิตร').flatMap(p=>[p.produced,p.sold]),liquids=model.products.filter(p=>p.unit==='ลิตร').flatMap(p=>[p.produced,p.sold]);
    const wd=units(weights,'กก.'),ld=units(liquids,'ลิตร');
    const leftMax=niceMaximum(Math.max(0,...weights.filter(valid).map(m=>m.value/wd.divisor))),rightMax=niceMaximum(Math.max(0,...liquids.filter(valid).map(m=>m.value)));
    const groups=node('div',null,'analytics-product-groups'),values=[];
    for(const product of model.products){
      const liquid=product.unit==='ลิตร',display=liquid?ld:wd;
      const group=node('div',null,'analytics-product-group'),pair=node('div',null,'analytics-product-pair');
      pair.append(vertical('ผลิต',product.produced,liquid?rightMax:leftMax,'',display,false),vertical('ขาย',product.sold,liquid?rightMax:leftMax,'sales',display,false));
      group.dataset.productId=product.id;group.append(pair,node('div',(product.label==='สารปรุงดิน'?'ฮิวมิค':product.label),'analytics-product-label'));groups.append(group);values.push(display.value(product.produced),display.value(product.sold));
    }
    products.append(axes(groups,leftMax,{known:weights.some(valid),values,narrow:true,rightMaximum:rightMax,rightKnown:liquids.some(valid),leftUnit:wd.unit,rightUnit:'ลิตร',compact:true,categoryLines:1}));
    // ส่วน 2 คงเฉพาะกราฟคู่ผลิต/ขายและหน่วยที่ชื่อสินค้า ไม่มีคำอธิบาย ตาราง หรืออัตราส่วนใต้กราฟ
    for(const reason of [...new Set(model.products.flatMap(p=>[p.produced,p.sold]).filter(m=>m.reason).map(m=>m.reason))])products.append(node('p',reason,'analytics-import-note'));
    const revenueData=root.HubReportAnalytics.revenueView(model);
    const revenue = node('section', null, 'analytics-panel'); // ส่วนตารางยอดเงินสามสินค้า
    revenue.append(node('h3', '3. รายได้จากการจำหน่ายผลิตภัณฑ์')); // รายได้ไม่ใช่กำไร
    const table = node('table'); // สร้างตารางที่อ่านและพิมพ์ได้
    const header = node('tr'); // แถวชื่อคอลัมน์
    header.append(node('th', 'ผลิตภัณฑ์'), node('th', 'ยอดเงิน (บาท)')); // แสดงชื่อสินค้าและจำนวนเงิน
    table.append(header); // ใส่หัวตาราง
    for (const product of revenueData.products) { // แสดงรายได้เฉพาะสินค้าที่กำหนด
      const tr = node('tr');tr.dataset.revenueProduct=product.id; // สร้างแถวสินค้า
      tr.append(node('td', (product.label==='สารปรุงดิน'?'ฮิวมิค':product.label)), node('td', (valid(product.revenue)?amount(product.revenue)+' บาท':''))); // ไม่แบ่งยอดเงินรวมด้วยการประมาณ
      table.append(tr); // ใส่แถวในตาราง
    } // จบรายการยอดเงิน
    if (true) { // ยอดเงินรวมใช้ข้อมูลคอลัมน์เงินจริง ไม่อนุมานรายได้สินค้า
      const totalRow = node('tr', null, 'analytics-unallocated-total');
      totalRow.append(node('td', revenueData.totalLabel), node('td', (valid(revenueData.total)?amount(revenueData.total)+' บาท':'')));
      table.append(totalRow);
    }
    revenue.append(table); if(revenueData.warning)revenue.append(node('p',revenueData.warning,'analytics-import-note')); // ใส่ตารางในส่วนรายได้
    const bank = node('section', null, 'analytics-panel'); // ส่วนธนาคารขยะ
    bank.append(node('h3', '4. ธนาคารขยะ')); // หัวข้อธนาคารขยะ
    const bankTable = node('table', null, 'analytics-bank-table');
    const bankHeader = node('tr');
    bankHeader.append(node('th', 'รายการ'), node('th', 'ปริมาณ / มูลค่า'));
    bankTable.append(bankHeader);
    for (const [label, metric] of [['รับเข้ารีไซเคิล (กก.)', model.bank.received], ['เงินซื้อ (บาท)', model.bank.purchase], ['เงินขาย (บาท)', model.bank.sale], ['ส่วนต่างขาย − ซื้อ (บาท)', model.bank.difference]]) { // รวมสี่รายการที่ผู้ใช้ขอ
      const row = node('tr', null, 'analytics-summary-row'); // ตารางสรุปมีเส้นแบ่งรายการชัดเจน
      const value = node('td'); value.append(node('strong', amount(metric)+(valid(metric)&&label.includes('(บาท)')?' บาท':'')));
      row.append(node('td', label), value); // หน่วยอยู่กับชื่อรายการ ไม่รวมบาทกับกิโลกรัม
      bankTable.append(row);
    } // จบรายการธนาคารขยะ
    bank.append(bankTable);if(model.bank.sourceNote?.includes('ยังไม่มีข้อมูลนำเข้าของเดือนที่เลือก'))bank.append(node('p','ยังไม่มีข้อมูลนำเข้าของเดือนที่เลือก จึงไม่ใช้ยอดเดือนอื่นแทน','analytics-import-note'));
    const bankReasons = [...new Set([model.bank.received, model.bank.purchase, model.bank.sale, model.bank.difference].filter(metric => metric?.reason && !(metric.status==='ok'&&/^(รวมเฉพาะรายการหน่วยกิโลกรัม;|ใช้ยอดรวมเดือนที่นำเข้าสำเร็จแทนรายการธนาคารขยะเดิมในเดือนเดียวกัน|ใช้ยอดรายเดือนที่บันทึกสำเร็จในแท็บธนาคารขยะโดยตรง)/.test(metric.reason)) && (metric?.sourceMode || ['monthly-only', 'incomplete', 'unavailable'].includes(metric.status))).map(metric => metric.reason))];
    for (const reason of bankReasons) bank.append(node('p', reason, 'analytics-import-note'));
    grid.append(waste, products, revenue, bank); // จัดลำดับจากขยะไปสินค้าและธนาคารขยะ
    container.append(grid); // ใส่กริดทั้งหมดในรายงาน
    const annual = node('section', null, 'analytics-panel analytics-annual'); // ส่วนเปรียบเทียบ 12 เดือน
    annual.append(node('h3', '5. ยอดซื้อและยอดขายรีไซเคิล 12 เดือน ปี ' + (Number(model.year) + 543) + ' (บาท)')); // เทียบเงินซื้อกับเงินขาย ไม่แปลงส่วนต่างติดลบให้เป็นบวก
    const legend = node('div', null, 'analytics-annual-legend'); // คำอธิบายสีอยู่เหนือกราฟ ไม่เพิ่มข้อความใต้กราฟ
    legend.append(node('span', 'ยอดซื้อ', 'analytics-legend-purchase'), node('span', 'ยอดขาย', 'analytics-legend-sale'));
    annual.append(legend);
    const annualRows = node('div', null, 'analytics-annual-rows');
    const annualMetrics = model.months.flatMap(row => [row.purchase, row.sale]); // สเกลเดียวกันสำหรับทั้ง 24 แท่ง
    const scale = niceMaximum(Math.max(0, ...annualMetrics.filter(valid).map(metric => metric.value)));
    const known = annualMetrics.some(valid);
    const plot = node('div', null, 'analytics-months');
    annualRows.append(axes(plot, scale, {known, values:annualMetrics.map(amount), narrow:true, labelCharacters:2, compact:true, shortTicks:true})); // ฐานศูนย์ด้านล่างและเผื่อเลขยาวโดยไม่ลดฟอนต์
    model.months.forEach((row, index) => {
      const cell = node('div', null, 'analytics-month');
      const pair = node('div', null, 'analytics-month-pair'); // แท่งซื้อและขายของเดือนเดียวกันติดกัน
      for (const [label, metric, kind] of [['ยอดซื้อ', row.purchase, 'purchase'], ['ยอดขาย', row.sale, 'sale']]) {
        const chart = node('div', null, 'analytics-month-plot ' + kind);
        const bar = node('span', null, 'analytics-month-bar ' + kind);
        const height = valid(metric) && metric.value >= 0 && scale ? metric.value / scale * 100 : 0;
        bar.style.height = height + '%';
        bar.style.bottom = '0%'; // ทั้งสองยอดขึ้นจากฐานล่างเดียวกัน ไม่ใช้ส่วนต่างมาวาดกลับด้าน
        const value = node('span', compactAmount(metric), 'analytics-month-value');
        value.style.bottom = 'calc(' + height + '% + 1mm)';
        chart.title = shortMonths[index] + ' ' + label + ': ' + amount(metric) + ' บาท';
        chart.append(bar, value); pair.append(chart);
      }
      cell.append(pair, node('span', shortMonths[index], 'analytics-month-label'));
      plot.append(cell);
    });
    annual.append(annualRows); // ไม่มีข้อความอธิบายใต้กราฟ 5 ตามคำขอ ข้อควรตรวจสอบอยู่ในหน้าควบคุมที่ไม่พิมพ์
    container.append(annual); // เพิ่มกราฟรายปีต่อท้าย
    fitAnnualLabels(annual);
    if (document.fonts?.ready) document.fonts.ready.then(() => {
      if (annual.isConnected) fitAnnualLabels(annual); // วัดซ้ำเมื่อ TH Sarabun New พร้อม ไม่แตะกราฟเก่าที่ถูกแทนแล้ว
    }); // จบการปรับระยะหลังฟอนต์พร้อม
  } // จบตัววาดกราฟ
  root.HubReportCharts = { render, compactNumber, barLabel }; // เปิด API ให้ controller เรียก
})(typeof window === 'undefined' ? globalThis : window); // รองรับเบราว์เซอร์และการทดสอบ
