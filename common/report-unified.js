/* ตัวแปลงฐานแอปรวมเป็นตารางมาตรฐานของ ReportEngine
 * ตรวจหน่วย ปริมาณ และใบรับรองธนาคารขยะก่อนรวมยอด ถ้าต้นทางไม่ครบต้องแสดงไม่ทราบ ไม่แทนด้วยศูนย์ */
/* Read-only adapter for the NEW unified database. No old Sheets URLs or snapshots. */
(function (root) {
  'use strict';
  const engine = root.ReportEngine || (typeof require === 'function' ? require('../report.js') : null);
  const MODULES = ['food','fresh','humusprod','humusquality','sale','hazard','general','bank-receive','bank-sell','bank-import','imports'];
  // สามฟอร์มนี้เลิกใช้ในแอปภายในแล้ว ฐานใหม่อาจไม่มีแท็บ แต่ไม่ถือว่าเป็นยอดศูนย์
  const RETIRED = {'humusprod':'การผลิตแบบเดิม','hazard':'ขยะอันตราย','bank-receive':'รับรีไซเคิลแบบเดิม','bank-sell':'ขายรีไซเคิลแบบเดิม'};
  const text = v => v == null ? '' : String(v);
  const numeric = v => engine.number(v);
 // อ่านรายการย่อยที่เป็น JSON ในเซลล์ โดยปฏิเสธโครงสร้างที่ไม่ใช่อาร์เรย์แทนการคืนรายการว่าง
  function array(v) { if(v==null||v==='')return []; if (typeof v === 'string') { try { v = JSON.parse(v); } catch (_) { throw Error('อ่านรายการย่อยจากชีตไม่ได้'); } } if (!Array.isArray(v)) throw Error('รายการย่อยไม่ครบ'); return v; }
 // แปลงทศนิยมสองตำแหน่งเป็นจำนวนเต็มเพื่อตรวจยอดอย่างแม่นยำ ไม่ยอมปัดค่าที่ละเอียดเกินสัญญา
  function minor(v, signed = false) { const n = Number(v); if (v === '' || v == null || !Number.isFinite(n) || (!signed && n < 0) || !Number.isSafeInteger(Math.round(n * 100)) || Math.abs(n * 100 - Math.round(n * 100)) > 0.00001) throw Error('จำนวนเงินหรือปริมาณนำเข้าไม่ถูกต้อง'); return Math.round(n * 100); }
  const decimal = v => (v < 0 ? '-' : '') + Math.floor(Math.abs(v)/100) + '.' + String(Math.abs(v)%100).padStart(2,'0');
  // จับคู่รายการกับ journal ตรวจ hash เดือน แถว และสถานะก่อนสร้างยอดธนาคารขยะ
 // ประกอบตารางธนาคารขยะพร้อม journal และ coverage เพื่อแยกเดือนที่ไม่มีข้อมูลจากเดือนยอดศูนย์
  function bankTables(records, journal, coverage) {
    const schema = engine.BANK_MONTHLY;
    const data = {status:'loaded',coveragePeriod:coverage,headers:[...schema.dataHeaders],rows:[]};
    const log = {status:'loaded',coveragePeriod:coverage,headers:[...schema.journalHeaders],rows:[]};
    const seen = new Set(); let rowIndex = 2;
    for (const entry of journal) {
      if (seen.has(entry.importId)) throw Error('รหัสนำเข้าธนาคารขยะซ้ำ'); seen.add(entry.importId);
      if (!/^[a-f0-9]{64}$/.test(entry.hash || '') || !/^\d{4}-(0[1-9]|1[0-2])$/.test(entry.month || '')) throw Error('ประวัตินำเข้าธนาคารขยะไม่ครบ');
      const count = Number(entry.rowCount); if (!Number.isInteger(count) || count < 1 || count > 1000) throw Error('จำนวนรายการนำเข้าไม่ถูกต้อง');
      const period = {month:entry.month,startDate:entry.month+'-01',endDate:entry.month+'-'+new Date(Date.UTC(+entry.month.slice(0,4),+entry.month.slice(5,7),0)).getUTCDate()};
      const acceptedAt = text(entry.createdAt), id = 'bm1_' + entry.hash;
      const members = records.filter(r => r.importId === entry.importId);
      if (members.length > count) throw Error('รายการนำเข้าซ้ำหรือเกินจำนวนที่ยืนยัน');
      const rows = members.map(r => {
        if (r.month !== entry.month || r.startDate !== period.startDate || r.endDate !== period.endDate || text(r.acceptedAt) !== acceptedAt) throw Error('ข้อมูลนำเข้าไม่ตรงกับประวัติ');
        const q=minor(r.quantity),p=minor(r.purchaseAmount),s=minor(r.saleAmount),f=minor(r.profitAmount,true);
        data.rows.push(['waste-bank-monthly-summary/v1',id,r.startDate,r.endDate,'purchased',text(r.categoryCode),r.categoryName,r.unit,String(q),String(p),String(s),String(f),entry.hash,acceptedAt]);
        return {categoryCode:text(r.categoryCode),categoryName:r.categoryName,unit:r.unit,quantity:decimal(q),purchaseAmount:decimal(p),saleAmount:decimal(s),profitAmount:decimal(f),quantityHundredths:String(q),purchaseSatang:String(p),saleSatang:String(s),profitSatang:String(f)};
      }).sort((a,b)=>+a.categoryCode-+b.categoryCode);
      const reservation={version:'bank-monthly-reservation/v1',importId:id,canonicalSha256:entry.hash,period,quantityMeaning:'purchased',sourceSystem:'waste-bank-export',rowCount:count,dataStartRow:rowIndex,acceptedAt}; rowIndex+=count;
      let receipt = '';
      if (entry.status === 'committed') {
        const units={};let p=0,s=0,f=0;
        rows.forEach(r=>{ units[r.unit]=(units[r.unit]||0)+Number(r.quantityHundredths);p+=Number(r.purchaseSatang);s+=Number(r.saleSatang);f+=Number(r.profitSatang); });
        const quantityTotals=Object.keys(units).sort((a,b)=>a==='กิโลกรัม'?-1:b==='กิโลกรัม'?1:a.localeCompare(b)).map(unit=>({unit,quantity:decimal(units[unit]),quantityHundredths:String(units[unit])}));
        const moneyTotals={purchaseAmount:decimal(p),saleAmount:decimal(s),profitAmount:decimal(f),purchaseSatang:String(p),saleSatang:String(s),profitSatang:String(f)};
        receipt=JSON.stringify({schemaVersion:'bank-monthly-receipt/v1',importId:id,canonicalSha256:entry.hash,period,quantityMeaning:'purchased',rowCount:count,quantityTotals,moneyTotals,acceptedAt,committedAt:acceptedAt});
      } else if (!['pending','reserved','writing','archived'].includes(entry.status)) throw Error('สถานะนำเข้ายังไม่ยืนยัน: '+entry.status);
      log.rows.push([JSON.stringify(reservation),receipt]);
    }
    if (records.some(r=>!seen.has(r.importId))) throw Error('พบข้อมูลธนาคารขยะที่ไม่มีประวัตินำเข้า');
    return {[schema.dataSheet]:data,[schema.journalSheet]:log};
  }
  // แปลงฐานรวมเป็น schema รายงาน ไม่อ่านฐานเก่าหรือ snapshot
 // แปลงชื่อฟิลด์ของฐานรวมเป็นคอลัมน์ที่ ReportEngine รู้จัก โดยคงช่วงข้อมูลต้นทาง
  function adapt(payload, requested, now = new Date().toISOString()) {
    const period=engine.normalizePeriod(requested), coverage={type:'year',value:period.value.slice(0,4)};
    if (!payload || !payload.datasets) throw Error('ระบบไม่คืนข้อมูลรายงาน');
    const records={...payload.datasets}, unavailable=[], failed={};
    const labels={food:'เศษอาหาร',fresh:'พืชสด',humusquality:'ตรวจคุณภาพฮิวมัส',sale:'จำหน่ายผลิตภัณฑ์',general:'ขยะทั่วไป','bank-import':'รายการธนาคารขยะ',imports:'ประวัติธนาคารขยะ',...RETIRED};
    for(const m of MODULES){
      const error=payload.errors?.[m];
      if(Array.isArray(records[m])&&!error)continue;
      const retired=RETIRED[m]&&(!error||error.code==='SCHEMA_MISSING');
      failed[m]=retired?'missing':'not-loaded';records[m]=[];
      unavailable.push((retired?'ไม่มีแหล่งข้อมูล':'ยังยืนยันข้อมูลไม่ได้')+' '+labels[m]+(m==='food'&&error?.code==='FOOD_BATCH_INCOMPLETE'?' (ชุดบันทึกไม่ครบ)':''));
    }
    const foodCounts=payload.warnings?.food;
    const foodPartial=!failed.food && records.food.length>0 && foodCounts?.status==='partial' && Number.isSafeInteger(foodCounts.excludedBatches) && foodCounts.excludedBatches>0;
    if(foodPartial)unavailable.push('เศษอาหาร: เฉพาะรายการที่ตรวจได้');
    const datasets={}, unclassified=[];
    const unknown=(module,r,reason)=>unclassified.push([module,text(r.id),text(r.date),r.producedQuantity??r.totalWeight??'',text(r.unit),r.price??'',reason]);
    const table=(name,headers,rows)=>{datasets[name]={status:'loaded',coveragePeriod:coverage,headers,rows:rows.map(row=>row.map(value=>value===undefined?null:value))};};
    table('เก็บเศษอาหาร',['วันที่บันทึก','น้ำหนัก (กก.)'],records.food.map(r=>[text(r.date),r.weight]));
    table('ปริมาณการรับเข้าพืชสด',['วัน/เดือน/ปี','น้ำหนัก (กิโลกรัม)'],records.fresh.map(r=>[text(r.date),r.weight]));
    table('ข้อมูลฮิวมัส',['วัน/เดือน/ปี','ปริมาณการผลิตฮิวมัส'],records.humusquality.map(r=>[text(r.date),r.volume]));
    table('ข้อมูลขยะอันตรายหน่วยงานแจ้งเข้ามา',['วันที่แจ้ง','น้ำหนักรวม (กก.)','รหัสการแจ้ง'],records.hazard.map(r=>[text(r.date),r.totalWeight,text(r.id)]));
    if(unavailable.includes('hazard'))datasets['ข้อมูลขยะอันตรายหน่วยงานแจ้งเข้ามา'].status='missing';
    table('ขยะทั่วไป',['วันที่','น้ำหนัก'],records.general.map(r=>[text(r.date),r.weight]));
    const bank=[];
    for(const [module,kind] of [['bank-receive','รับเข้า'],['bank-sell','ขายออก']])for(const r of records[module]){
      const items=array(r.items);if(!items.length)unknown(module,r,'ยังไม่ระบุรายการย่อย');
      for(const item of items)bank.push([text(r.date),kind,['กก.','กิโลกรัม','kg'].includes(item.unit || 'กิโลกรัม') ? item.quantity : null,item.subtotal]);
    }
    table('ธนาคารขยะ',['วันที่','ประเภทรายการ','น้ำหนัก (กก.)','รวมเป็นเงิน (บาท)'],bank);
    if(unavailable.some(m=>m==='bank-receive'||m==='bank-sell'))datasets['ธนาคารขยะ'].status='not-loaded';
    const products={humus:records.humusquality.map(r=>[text(r.date),r.volume]),soil:[],liquid:[]};
    table('ประวัติการผลิตเดิม',['วันที่','ประเภท','ปริมาณ','หน่วย'],records.humusprod.map(r=>[text(r.date),text(r.productType),r.producedQuantity,text(r.unit)]));
    const category = name => name==='ฮิวมัส' ? 'humus' : ['ปุ๋ยเศษอาหาร','สารปรับปรุงดิน','สารปรุงดิน'].includes(name) ? 'soil' : name==='น้ำหมักชีวภาพ' ? 'liquid' : null;
    for(const r of records.humusprod){if(!text(r.productType).trim())continue;const key=category(r.productType);if(!key) throw Error('ประเภทผลผลิตไม่รู้จัก');if(key==='humus')continue;const expected=key==='liquid'?['ลิตร','L']:['กก.','กิโลกรัม','kg'];products[key].push([text(r.date),expected.includes(r.unit)?r.producedQuantity:null]);}
    Object.keys(products).forEach(k=>table('ผลิต-'+k,['วันที่','ปริมาณ'],products[k]));
    if(unavailable.includes('humusprod'))['soil','liquid'].forEach(k=>datasets['ผลิต-'+k].status='missing');
    const sales={humus:[],soil:[],liquid:[]}, aggregateSales=[];
    for(const r of records.sale){
      const items=array(r.items);let totalKg=0,unknownKg=!items.length;
      if(!items.length)unknown('sale',r,'ยังไม่ระบุรายการจำหน่าย');
      for(const item of items){
        const key=category(item.name),quantity=numeric(item.quantity),money=numeric(item.subtotal);
        if(!key)throw Error('ประเภทสินค้าขายไม่รู้จัก');
        const proper=key==='liquid'?['ลิตร','L'].includes(item.unit):['กก.','กิโลกรัม','kg'].includes(item.unit);
        sales[key].push([text(r.date),proper?quantity:null,money]);
        if(key!=='liquid'){if(!proper||quantity===null)unknownKg=true;else totalKg+=quantity;}
      }
      aggregateSales.push([text(r.date),unknownKg?null:totalKg,r.price,text(r.bagSize)]);
    }
    table('ยอดจำหน่ายปุ๋ย',['วัน/เดือน/ปี','น้ำหนักรวม (กิโลกรัม)','ราคาที่จำหน่าย','รายการและจำนวน'],aggregateSales);
    Object.keys(sales).forEach(k=>table('ขาย-'+k,['วันที่','ปริมาณ','เงิน'],sales[k]));
    table('รายการรอจัดหมวด',['แบบฟอร์ม','รหัส','วันที่','ปริมาณ','หน่วย','เงิน','เหตุผล'],unclassified);
    function mark(module,predicate){if(failed[module])for(const [name,ds] of Object.entries(datasets))if(predicate(name))ds.status=failed[module];}
    const tableNames=Object.keys(datasets);
    // Names are from the same stable table registration order above.
    mark('food',name=>name===tableNames[0]);mark('fresh',name=>name===tableNames[1]);mark('humusquality',name=>name===tableNames[2]||name==='ผลิต-humus');
    mark('hazard',name=>name===tableNames[3]);mark('general',name=>name===tableNames[4]);
    mark('humusprod',name=>name.startsWith('ผลิต-')&&name!=='ผลิต-humus'||name===tableNames[6]);
    mark('sale',name=>name.startsWith('ขาย-')||name===tableNames[10]);
    if(failed['bank-receive']||failed['bank-sell'])datasets[tableNames[5]].status='not-loaded';
    if(!failed['bank-import']&&!failed.imports)try{Object.assign(datasets,bankTables(records['bank-import'],records.imports,coverage));}
    catch(_){unavailable.push('ยังยืนยันข้อมูลธนาคารขยะไม่ได้');}
    else unavailable.push('ข้อมูลธนาคารขยะไม่ครบ');

    const result={foodPartial,environmentSummary:payload.environmentSummary,municipalRecords:payload.municipalRecords,version:2,period:coverage,timezone:'Asia/Bangkok',sourceDate:payload.loadedAt || now,datasets,sourceWarnings:unavailable.concat(records.humusprod.length?['ฮิวมัสใช้ปริมาณจากฟอร์มผลิตฮิวมัสเท่านั้น ไม่รวมยอดการผลิตเดิม; ประวัติเดิมเก็บแยกเพื่อป้องกันนับซ้ำ']:[])};
    const state=engine.inspectBankImports(result);if(state.status==='error')result.sourceWarnings.push('ยังยืนยันข้อมูลธนาคารขยะไม่ได้');
    return result;
  }
  // ใช้ generation ทิ้งคำตอบเก่าหลังเปลี่ยนช่วงหรือหยุดเชื่อมต่อ
 // ตัวควบคุมอ่านรายงานผ่าน UnifiedApi; จัดการสถานะและ refresh แต่ไม่เขียนฐานข้อมูล
  function create(options={}) {
    let connected=false,generation=0;
    const onState=options.onState||(()=>{}),clearData=options.clearData||(()=>{});
    const request=options.request||(req=>root.UnifiedApi.request(req));
    // Retry only read-only transient failures. Never retry schema/access errors or mutate Sheets.
    const delay=options.delay||(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
    const transient=new Set(['BUSY','CONNECT_TIMEOUT','OUTCOME_UNCERTAIN','NETWORK_ERROR']);
    async function read(action,epoch,extra={}){
      for(let attempt=0;;attempt++){
        if(!connected||epoch!==generation)return null;
        try{return await request({action,...extra});}
        catch(error){
          if(attempt>=1||!transient.has(error.code)||!connected||epoch!==generation)throw error;
          await delay(1000);
        }
      }
    }
    // All sources must still pass validation. Do not replace a failed source with an empty array.
    async function refresh(){
      if(!connected)return;const epoch=++generation,period=options.getPeriod();clearData();onState('กำลังอ่านข้อมูลจากฐานข้อมูลใหม่',true);
      try{
        const [rr,mr,er]=await Promise.allSettled([
          read('reportData',epoch),read('municipalRead',epoch),read('environmentDashboardRead',epoch,{period})]);
        if(!connected||epoch!==generation)return;
        const raw=rr.status==='fulfilled'?rr.value:null, municipal=mr.status==='fulfilled'?mr.value:null, environment=er.status==='fulfilled'?er.value:null;
        if(!raw?.datasets&&!Array.isArray(municipal?.records)&&!environment)throw Error('ยังไม่ได้รับข้อมูลจากชีท');
        const payload={...raw,environmentSummary:environment,datasets:{...raw?.datasets},errors:{...raw?.errors}};
        const general=Array.isArray(municipal?.records)?municipal.records:payload.datasets.general;
        if(Array.isArray(general)&&(!payload.errors.general||Array.isArray(municipal?.records))){
          payload.datasets.general=general;payload.municipalRecords=general;delete payload.errors.general;
        }
        const data=adapt(payload,period);
        if((!environment || environment.period?.type!==period.type || environment.period?.value!==period.value || !['ready','empty'].includes(environment.waste?.orphan?.status)))data.sourceWarnings.push('ยังอ่านขยะกำพร้าไม่ได้ ต้องตรวจ route environmentDashboardRead และหัวคอลัมน์หลังบ้าน');
        options.onData(data,period);
        onState('อ่านข้อมูลจากฐานข้อมูลใหม่แล้ว'+(data.sourceWarnings.length?' · '+data.sourceWarnings.join(' · '):'')+' · '+new Intl.DateTimeFormat('th-TH',{dateStyle:'full',timeStyle:'medium',timeZone:'Asia/Bangkok'}).format(new Date()),true);
      }catch(e){if(connected&&epoch===generation){clearData();onState('อ่านข้อมูลไม่สำเร็จ: '+e.message,true);}}
    }
    function disconnect(){connected=false;generation++;clearData();onState('หยุดอ่านข้อมูลแล้ว',false);}
    return {connect:()=>{connected=true;return refresh();},refresh,disconnect,connected:()=>connected};
  }
  root.HubReportUnified={adapt,bankTables,create,MODULES};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.HubReportUnified;
})(typeof window==='undefined'?globalThis:window);
