/* แดชบอร์ดอ่านอย่างเดียว: ไม่สร้างข้อมูลตัวอย่าง ไม่รวมหน่วยต่างกัน */
(function(root){
'use strict';
function rollingMonths(month,count=12){const months=[];for(let i=count-1;i>=0;i--){const date=new Date(Date.UTC(+month.slice(0,4),+month.slice(5,7)-1-i,1));months.push(date.toISOString().slice(0,7));}return months;}
function chartYearRange(months){const first=Number(months[0].slice(0,4))+543,last=Number(months[months.length-1].slice(0,4))+543;return 'พ.ศ. '+first+(first===last?'':'–'+last);}
const categories=[
 {id:'waste',title:'จัดการขยะ',routes:['food','bank-import','incident'],note:''},
 {id:'humus',title:'ปุ๋ยฮิวมัส',routes:['fresh','humusprod','humusquality','sale'],note:''},
 {id:'green',title:'พื้นที่สีเขียว',routes:['contractor-landscape','tree'],note:'รายงานบริษัทและทะเบียนต้นไม้'},
 {id:'service',title:'บริการจัดตกแต่ง / โรงเรือน',routes:[],note:'ยังไม่มีฟอร์มบริการและโรงเรือนในชุดนี้'},
 {id:'materials',title:'วัสดุ / น้ำมัน',routes:['inventory'],note:'ใช้งานคลังและยืมคืนได้ · ฟอร์มน้ำมันยังไม่เปิดใช้งาน'},
 {id:'executive',title:'รายงานผู้บริหาร',routes:['report'],note:'เลือกเดือนและปีเพื่อดาวน์โหลดรายงานจากชีต'}
];

const metrics=[['food','เศษอาหาร','weight','กิโลกรัม'],['fresh','พืชสด','weight','กิโลกรัม'],['humusprod','ผลิตฮิวมัส'],['humusquality','ตรวจฮิวมัส'],['sale','จำหน่ายปุ๋ย','price','บาท'],['contractor-landscape','งานบริษัท'],['incident','เหตุการณ์'],['inventory','คลังและยืมคืน'],['bank-import','ธนาคารขยะ'],['tree-work','งานต้นไม้']];
const monthNames=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const chartMonthNames=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;}
function thaiDate(value){return validDate(value)?Number(value.slice(8))+' '+monthNames[Number(value.slice(5,7))-1]+' '+(Number(value.slice(0,4))+543):'ไม่ระบุวันที่';}
function dateOf(row,key){return key==='incident'?row.incidentDate:row.date;}
function compact(value){return new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(value);}
// ช่วงเริ่มต้น: วันแรกของเดือนก่อนถึงวันนี้ ตามกรุงเทพ ไม่ใช่ย้อนหลัง30วัน
function defaultRange(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now),part=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 const y=Number(part.year),m=Number(part.month);return {start:(m===1?y-1:y)+'-'+String(m===1?12:m-1).padStart(2,'0')+'-01',end:part.year+'-'+part.month+'-'+part.day};
}
function rangeOf(value){
 if(typeof value==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(value)){const end=new Date(Date.UTC(Number(value.slice(0,4)),Number(value.slice(5)),0)).toISOString().slice(0,10);return {start:value+'-01',end};}
 if(!value||!validDate(value.start)||!validDate(value.end)||value.start>value.end)throw Error('เลือกช่วงวันที่');return {start:value.start,end:value.end};
}
function summarize(payload,period){
 const range=rangeOf(period);
 if(!payload||!payload.datasets||typeof payload.datasets!=='object')throw Error('ไม่ได้รับข้อมูลจากชีท');
 return metrics.map(([key,label,field,unit])=>{
  let records=payload.datasets[key],unconfirmed=0;if(key==='bank-import'&&Array.isArray(records)){const logs=payload.datasets.imports;if(!Array.isArray(logs))return {key,label,available:false,records:[]};const allowed=new Set(logs.filter(x=>x.status==='committed'&&records.filter(r=>r.importId===x.importId).length===Number(x.rowCount)).map(x=>x.importId));unconfirmed=records.filter(r=>!allowed.has(r.importId)).length;records=records.filter(r=>allowed.has(r.importId));}if(!Array.isArray(records))return {key,label,available:false,records:[]};
  let invalidDates=0,undatedRecords=[];const selected=records.filter(row=>{if(!row||typeof row!=='object'){invalidDates++;return false;}if(key==='bank-import'){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month||'')){invalidDates++;return false;}return row.month>=range.start.slice(0,7)&&row.month<=range.end.slice(0,7);}const date=dateOf(row,key);if(!validDate(date)){invalidDates++;undatedRecords.push(row);return false;}return date>=range.start&&date<=range.end;});
  let total=0,invalidValues=0;if(field)selected.forEach(row=>{const v=row[field];if(v===null||v===undefined||v===''||typeof v==='boolean'||!Number.isFinite(Number(v))||Number(v)<0)invalidValues++;else total+=Number(v);});
  return {key,label,available:true,count:selected.length,invalidDates,unit,total:field&&!invalidValues&&!invalidDates?total:null,invalidValues,records:selected,undatedRecords,unconfirmed};
 });
}
function safePhoto(value){const match=/^https:\/\/drive\.google\.com\/(?:file\/d\/([A-Za-z0-9_-]+)(?:\/|$)|(?:open|uc)\?(?:[^#]*&)?id=([A-Za-z0-9_-]+)(?:&|$))/.exec(String(value||''));if(!match)return null;const id=match[1]||match[2];return {url:'https://drive.google.com/file/d/'+id+'/view',thumbnail:'https://drive.google.com/thumbnail?id='+id+'&sz=w640'};}
function photoList(row){const list=Array.isArray(row.fileUrls)?row.fileUrls:[];return list.map(safePhoto).filter(Boolean).slice(0,3);}
function summaryText(row,key){const fields=key==='inventory'?[row.data&&row.data.name,row.data&&row.data.note]:[row.task,row.workType,row.name,row.location,row.plantType,row.productType,row.description,row.details,row.categoryName];return fields.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()).slice(0,2).join(' · ').slice(0,240);}

// Dashboard v3: every total is derived from authenticated read endpoints.
function num(v){return v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;}
function testRow(r){return /ทดสอบระบบ|ไม่ใช่ข้อมูลจริง/.test(JSON.stringify(r));}
function selectRows(rows,month){if(!Array.isArray(rows))return null;return rows.filter(r=>r&&!testRow(r)&&validDate(r.date)&&r.date.slice(0,7)===month);}
function sumMetric(rows,month,field){
 if(!Array.isArray(rows))return {value:null,note:'ยังอ่านข้อมูลไม่ได้'};
 const actual=rows.filter(r=>r&&!testRow(r));if(actual.some(r=>!validDate(r.date)))return {value:null,note:'มีวันที่ไม่สมบูรณ์ ต้องตรวจข้อมูลต้นทาง'};
 const chosen=selectRows(rows,month);if(!chosen.length)return {value:null,note:'ไม่มีรายการในเดือนนี้'};
 let total=0;for(const r of chosen){const n=num(typeof field==='function'?field(r):r[field]);if(n===null)return {value:null,note:'ข้อมูลปริมาณไม่ครบ'};total+=n;}
 return {value:Math.round(total*100)/100,note:chosen.length+' รายการ'};
}
function overview(payload,month,selectedBankSummary){
 const ds=payload.datasets||{},get=k=>payload.errors&&payload.errors[k]?null:ds[k];
 const waste=[['food','เศษอาหาร','weight'],['fresh','พืชสด','weight'],['general','ขยะทั่วไป',r=>r.entryStatus==='เข้า'&&num(r.beforeWeight)!==null&&num(r.afterWeight)!==null&&Number(r.afterWeight)>=Number(r.beforeWeight)?Number(r.afterWeight)-Number(r.beforeWeight):null],['hazard','ขยะอันตราย','weight'],['orphan','ขยะกำพร้า','weight']].map(([key,label,field])=>({key,label,...sumMetric(key==='general'&&Array.isArray(get(key))?get(key).filter(r=>r.entryStatus==='เข้า'):get(key),month,field)}));
 // Optional aggregate endpoint; never consume private contact/photo fields.
 for(const item of waste){const a=payload.extra&&payload.extra.month===month&&payload.extra.waste&&payload.extra.waste[item.key];if(item.key==='food'){if(!Array.isArray(get('food'))&&a?.status==='confirmed-subset'&&typeof a.kg==='number'&&Number.isFinite(a.kg)&&a.kg>=0&&Number.isSafeInteger(a.count)&&a.count>0){item.value=a.kg;item.note='เฉพาะชุดเศษอาหารที่ยืนยันแล้ว · '+a.count+' รายการ';item.subset=true;}continue;}if(a&&a.status==='ready'&&num(a.kg)!==null){item.value=Number(a.kg);item.note=String(a.count||0)+' รายการ';}else if(a&&a.status!=='ready'){item.value=null;item.note=a.status==='empty'?'ไม่มีรายการในเดือนนี้':'ยังอ่านข้อมูลไม่ได้';}}
 waste.push({key:'recycle',label:'ขยะรีไซเคิล',...recycleMetric(selectedBankSummary||bankSummary(payload,month))});
 return {waste,...humusMetrics(get,month)};
}

/* Smooth contiguous monthly points only. Bezier controls stay between endpoints,
   preserving both the actual measurements and all gaps. */
function smoothMonthlyPath(values,x,y){
 const runs=[];let run=[];
 for(let i=0;i<values.length;i++){
  if(Number.isFinite(values[i]))run.push([x(i),y(values[i])]);
  else if(run.length){runs.push(run);run=[];}
 }
 if(run.length)runs.push(run);
 return runs.map(points=>{
  if(points.length<2)return '';
  const d=points.slice(1).map(([nextX,nextY],i)=>(nextY-points[i][1])/(nextX-points[i][0]));
  const tangent=[d[0]*.6,...d.slice(1).map((right,i)=>{const left=d[i];return left*right>0?2*left*right/(left+right):0;}),d[d.length-1]*.6];
  let path='M'+points[0].join(' ');
  for(let i=0;i<d.length;i++){
   const [a,b]=points[i],[c,e]=points[i+1],width=(c-a)/3;
   let first=tangent[i]*width,last=tangent[i+1]*width;
   const step=e-b,limit=Math.abs(step),combined=Math.abs(first)+Math.abs(last);
   if(combined>limit){first*=limit/combined;last*=limit/combined;}
   path+=' C'+[a+width,b+first,c-width,e-last,c,e].join(' ');
  }
  return path;
 }).filter(Boolean).join(' ');
}

function humusProductionYears(rows,selected){
 const year=Number(String(selected).slice(0,4));
 const results=[year,year-1].map(y=>({year:y,values:Array(12).fill(null)}));
 if(!Array.isArray(rows))return results;
 const index=new Map(results.map(s=>[s.year,Array.from({length:12},()=>({count:0,sum:0,valid:true}))]));
 for(const row of rows){
  if(!row||testRow(row))continue;
  if(!validDate(row.date))return results;
  const months=index.get(Number(row.date.slice(0,4)));
  if(!months)continue;
  const item=months[Number(row.date.slice(5,7))-1],volume=num(row.volume);
  item.count++;if(volume===null)item.valid=false;else item.sum+=volume;
 }
 results.forEach(series=>{series.values=index.get(series.year).map(item=>item.count&&item.valid?Math.round(item.sum*100)/100:null);});
 return results;
}
function humusMetrics(get,month){
 const sales=get('sale');const income=sumMetric(sales,month,r=>{let list=r.items;try{if(typeof list==='string')list=JSON.parse(list);}catch(_){return null;}if(!Array.isArray(list))return null;let amount=0;for(const i of list){if(i.name!=='ฮิวมัส')continue;const n=num(i.subtotal);if(n===null)return null;amount+=n;}return amount;});
 const quality=selectRows(get('humusquality'),month);
 // ผู้ใช้ยืนยันแหล่งปริมาณผลิต: ตรวจคุณภาพฮิวมัส คอลัมน์ L (API: volume), กิโลกรัม
 const production=sumMetric(get('humusquality'),month,'volume');
 return {income,production,quality:quality?{value:quality.length,note:'รายการตรวจ ไม่ใช่ผลผ่าน/ไม่ผ่าน'}:{value:null,note:'ยังอ่านข้อมูลไม่ได้'}};
}
// Cache only validated aggregation, never requests or rendered DOM. The content
// signature also catches in-place row/journal edits; array identity alone is unsafe.
// Weak keys release old row arrays; keep at most three years per current snapshot.
const bankAggregateCache=new WeakMap();
function bankState(records,journal,year,adapter,engine){
 const signature=JSON.stringify([records,journal]);
 let cache=bankAggregateCache.get(records);
 if(!cache||cache.signature!==signature||cache.adapter!==adapter.bankTables||cache.inspect!==engine.inspectBankImports){
  cache={signature,adapter:adapter.bankTables,inspect:engine.inspectBankImports,years:new Map()};bankAggregateCache.set(records,cache);
 }
 if(cache.years.has(year))return cache.years.get(year);
 const tables=adapter.bankTables(records,journal,{type:'year',value:year}),state=engine.inspectBankImports({datasets:tables});
 if(cache.years.size>=3)cache.years.delete(cache.years.keys().next().value);
 cache.years.set(year,state);return state;
}
function inspectBank(payload,year){
 const ds=payload.datasets||{};if(!Array.isArray(ds['bank-import'])||!Array.isArray(ds.imports)||payload.errors?.['bank-import']||payload.errors?.imports)throw Error('ยังอ่านข้อมูลไม่ได้');
 const adapter=root.HubReportUnified||(typeof require==='function'?require('./report-unified.js'):null),engine=root.ReportEngine||(typeof require==='function'?require('../report.js'):null);
 const state=bankState(ds['bank-import'],ds.imports,year,adapter,engine);
 if(state.status==='error')throw Error('ชุดนำเข้ายังตรวจสอบไม่ผ่าน');return state;
}
function bankEntry(state,month){
 const entry=state.months.get(month);if(!entry||entry.status!=='committed')return {available:false,note:'ยังไม่มีชุดนำเข้าที่ครบในเดือนนี้',rows:[]};
 return {available:true,rows:[...entry.rows.values()].map(row=>({...row})),units:{...entry.quantityByUnit},purchase:entry.purchaseSatang/100,sale:entry.saleSatang/100,profit:entry.profitSatang/100,quantityKg:Object.prototype.hasOwnProperty.call(entry.quantityByUnit,'กิโลกรัม')?entry.quantityByUnit['กิโลกรัม']/100:null};
}
function bankSummary(payload,month){try{return bankEntry(inspectBank(payload,month.slice(0,4)),month);}catch(e){return {available:false,note:e.message,rows:[]};}}
function recycleMetric(bank){if(!bank.available)return {value:null,note:'น้ำหนักรับซื้อจากธนาคารขยะ: '+bank.note};const kg=bank.units&&bank.units['กิโลกรัม'];if(!Number.isSafeInteger(kg)||kg<0)return {value:null,note:'ไม่มีน้ำหนักหน่วยกิโลกรัมที่ยืนยัน ไม่แปลงจำนวนลัง'};return {value:kg/100,note:'น้ำหนักรับซื้อธนาคารขยะเดือนเดียวกัน · ไม่รวมจำนวนลังและไม่บวกซ้ำกับยอดขาย'};}
function bankYear(payload,year){
 let state,note;try{state=inspectBank(payload,String(year));}catch(e){note=e.message;}
 const rows=Array.from({length:12},(_,i)=>{const month=String(year)+'-'+String(i+1).padStart(2,'0');return {month,...(state?bankEntry(state,month):{available:false,note,rows:[]})};});
 return {rows,...bankPeak(rows)};
}
function bankPeak(rows){const valid=rows.filter(x=>x.available&&Number.isFinite(x.profit));if(!valid.length)return {highest:null,bestMonths:[],coverage:0};const highest=Math.max(...valid.map(x=>x.profit));return {highest,bestMonths:valid.filter(x=>x.profit===highest).map(x=>x.month),coverage:valid.length};}
function currentMonth(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit'}).format(new Date());}
const iconPaths={food:'M11 3c1 2 2 3 2 5m-1-3c-3-3-5-2-5-2m6 5c3-3 5-3 6-2M7 9c2-1 4 0 5 1 2-1 4-2 6-1 2 2 1 5-1 7l2 5c-3 1-5-1-7-1-2 0-4 2-7 1l2-5C5 14 5 11 7 9z',fresh:'M12 21V11M12 15C5 15 3 11 3 5c6 0 9 4 9 10zM12 12c0-6 4-9 10-9 0 7-4 10-10 10',general:'M4 6h16M9 3h6v3M6 6l1 15h10l1-15M10 9v9M14 9v9',hazard:'M12 3L2 21h20L12 3zM12 9v5M12 17v1',orphan:'M3 6l5-3h12v17H3V6zm0 0h12l5-3M15 6v14M8 3v6h4V3',production:'M3 18c-2-3 1-6 4-5-1-6 6-8 8-3 4-1 6 3 5 5 4 1 3 5 0 5H4M8 15h.1M12 11h.1M15 17h.1',sale:'M2 3h3l3 13h11l3-10H6M9 20a1 1 0 1 0 0 .1M18 20a1 1 0 1 0 0 .1',quality:'M9 4H5v18h14V4h-4M9 2h6v4H9V2zM8 11l2 2 4-4M8 17l2 2 4-4',bank:'M8 4l3-2 4 6M17 8l-2 1-1-3M19 11l3 4-4 6h-5M14 18l-1 3 3 1M8 21H3l-1-7 3-4M3 11l2-1 2 3',box:'M3 6l9-4 9 4-9 5-9-5zM3 6v13l9 4 9-4V6M12 11v12',money:'M4 7c0-5 16-5 16 0s-16 5-16 0zm0 0v12c0 5 16 5 16 0V7M4 11c0 5 16 5 16 0M4 15c0 5 16 5 16 0',refresh:'M20 7a9 9 0 0 0-15-2L2 8m0-5v5h5M4 17a9 9 0 0 0 15 2l3-3m0 5v-5h-5'};
function mount(){
 const d=root.document,picker=d.getElementById('dashboard-month'),button=d.getElementById('dashboard-refresh'),status=d.getElementById('dashboard-status'),results=d.getElementById('dashboard-results');if(!picker||!button||!results)return;
 const freshFor=120000,previewFor=300000;
 const reads=root.HubDashboardCache.create({ttl:freshFor});
 const extraKey=month=>({action:'environmentDashboardRead',month});
 const shifted=(month,offset)=>new Date(Date.UTC(+month.slice(0,4),+month.slice(5,7)-1+offset,1)).toISOString().slice(0,7);
 const aggShape=(v,month)=>v&&v.month===month&&v.waste&&['hazard','orphan'].every(k=>{
  const a=v.waste[k];return a&&(['empty','error'].includes(a.status)||(a.status==='ready'&&num(a.kg)!==null&&Number.isSafeInteger(a.count)&&a.count>0));
 });
 const okExtra=v=>aggShape(v,v?.month)&&['hazard','orphan'].every(k=>v.waste[k].status!=='error');
 const paintSoon=root.requestAnimationFrame?.bind(root)||(fn=>Promise.resolve().then(fn));
 picker.value=currentMonth();let generation=0,started=false,bankChartMode='sale',selectedWaste=null,selectedHumus=null,selectedBank=null;
 const monthSelect=d.getElementById('dashboard-month-choice'),yearSelect=d.getElementById('dashboard-year-choice');
 if(monthSelect&&yearSelect){monthNames.forEach((name,i)=>{const o=d.createElement('option');o.value=String(i+1).padStart(2,'0');o.textContent=name;monthSelect.append(o);});const year=+picker.value.slice(0,4);for(let y=year+1;y>=year-10;y--){const o=d.createElement('option');o.value=String(y);o.textContent=String(y+543);yearSelect.append(o);}monthSelect.value=picker.value.slice(5);yearSelect.value=picker.value.slice(0,4);const change=()=>{picker.value=yearSelect.value+'-'+monthSelect.value;load();};monthSelect.addEventListener('change',change);yearSelect.addEventListener('change',change);}
const numberFormat=new Intl.NumberFormat('th-TH',{maximumFractionDigits:2}),fmt=n=>numberFormat.format(n);
 const node=(tag,cls,text)=>{const e=d.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 function icon(key){const e=node('span','dash-icon');const svg=d.createElementNS('http://www.w3.org/2000/svg','svg'),path=d.createElementNS('http://www.w3.org/2000/svg','path');svg.setAttribute('viewBox','0 0 24 26');svg.setAttribute('aria-hidden','true');path.setAttribute('d',iconPaths[key]||iconPaths.fresh);svg.append(path);e.append(svg);return e;}
 function drawBahtCoin(svg){
  const ns='http://www.w3.org/2000/svg';
  const add=(tag,attrs)=>{const element=d.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>element.setAttribute(k,v));svg.append(element);};
  add('circle',{cx:12,cy:12.8,r:10.5,fill:'#965b10'});
  add('circle',{cx:12,cy:11.5,r:10.2,fill:'#ffcc38',stroke:'#714605','stroke-width':'1.15'});
  add('circle',{cx:12,cy:11.5,r:7.6,fill:'#faaa15',stroke:'#fff0a9','stroke-width':'1.15'});
  add('path',{d:'M4.7 10.5a7.4 7.4 0 0 1 6.1-6',stroke:'#fff7c7','stroke-width':'1.1',fill:'none','stroke-linecap':'round'});
  add('path',{d:'M10 6.9v9.4h3.1c2 0 2.8-.9 2.8-2.5 0-1.3-.7-2.3-2.1-2.4 1-.3 1.6-1 1.6-2.1 0-1.5-.9-2.4-2.5-2.4H10Zm0 4.6h3.8M12.2 5.6v12.2',stroke:'#714605','stroke-width':'1.48',fill:'none','stroke-linecap':'round','stroke-linejoin':'round'});
 }
 function humusIncomeCoin(){
  const mark=node('span','dash-humus-coin'), svg=d.createElementNS('http://www.w3.org/2000/svg','svg');
  mark.setAttribute('aria-hidden','true');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('focusable','false');
  drawBahtCoin(svg);
  mark.append(svg);return mark;
 }
 function card(label,metric,unit,key){const e=node('article','dash-stat'),content=node('div','dash-stat-content');content.append(node('h4','',label),node('strong','dash-number',metric.value===null?'—':fmt(metric.value)+(unit?' '+unit:'')));if(metric.subset)content.append(node('p','dash-note','เฉพาะชุดที่ยืนยันแล้ว'));e.append(content);if(metric.note)e.title=metric.note;return e;}
 function section(title){const e=node('section','dash-section');e.append(node('h3','dash-section-title',title));results.append(e);return e;}
 function bindBarKeys(bar,activate){
   bar.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();bar.dataset.pressing='true';if(!event.repeat&&activate)activate();}});
   bar.addEventListener('keyup',event=>{if(event.key==='Enter'||event.key===' ')delete bar.dataset.pressing;});
   bar.addEventListener('blur',()=>{delete bar.dataset.pressing;});
 }
 function render(payload,month){
 const annual=bankYear(payload,month.slice(0,4)),b=annual.rows[+month.slice(5)-1];
 const model=overview(payload,month,b);results.replaceChildren();const waste=section('ปริมาณขยะที่บันทึกได้ เดือน '+monthNames[Number(month.slice(5,7))-1]),chart=node('div','dash-panel');chart.append(node('h4','dash-panel-title','เปรียบเทียบปริมาณขยะแต่ละประเภท'));const graphFrame=node('div','dash-graph-frame');graphFrame.append(node('span','dash-y-title','น้ำหนัก (กก.)'));
 const wasteCards=[],wasteColumns=[];function selectWaste(key){selectedWaste=selectedWaste===key?null:key;wasteCards.forEach((c,i)=>{const chosen=model.waste[i].key===selectedWaste;c.setAttribute('aria-pressed',String(chosen));c.dataset.selected=String(chosen);wasteColumns[i].dataset.selected=String(chosen);const target=wasteColumns[i].querySelector('.dash-bar');if(target.hasAttribute('aria-pressed'))target.setAttribute('aria-pressed',String(chosen));});}const graph=node('div','dash-bars dash-waste-bars'),max=Math.max(1,...model.waste.map(x=>x.value||0));model.waste.forEach((x,i)=>{const col=node('div','dash-column');col.dataset.color=String(i);col.dataset.selected=String(x.key===selectedWaste);col.id='dashboard-bar-'+x.key;wasteColumns.push(col);col.append(node('strong','dash-bar-label',x.value===null?'—':fmt(x.value)));const track=node('div','dash-bar-space'),bar=node('div','dash-bar');bar.style.height=(x.value===null?0:x.value/max*100)+'%';if(x.value>0){bar.tabIndex=0;bar.setAttribute('role','button');bar.setAttribute('aria-label',x.label+': '+fmt(x.value)+' kg');bar.setAttribute('aria-pressed',String(x.key===selectedWaste));bar.addEventListener('click',()=>selectWaste(x.key));bindBarKeys(bar,()=>selectWaste(x.key));}track.append(bar);col.append(track,node('span','dash-category',x.label));graph.append(col);});graphFrame.append(graph);chart.append(graphFrame);const stats=node('div','dash-stats dash-five');model.waste.forEach((x,i)=>{const c=card(x.label,x,'กก.',['food','fresh','general','hazard','orphan','bank'][i]);c.dataset.color=String(i);c.dataset.selected=String(x.key===selectedWaste);c.setAttribute('role','button');c.setAttribute('tabindex','0');c.setAttribute('aria-pressed',String(x.key===selectedWaste));c.setAttribute('aria-controls','dashboard-bar-'+x.key);c.setAttribute('aria-label',x.label+' '+(x.value===null?'ยังไม่มีข้อมูลยืนยัน':fmt(x.value)+' กิโลกรัม')+(x.subset?' · เฉพาะชุดที่ยืนยันแล้ว':'')+' · เน้นแท่งกราฟ กดซ้ำเพื่อยกเลิก');c.addEventListener('click',()=>selectWaste(x.key));c.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();c.dataset.pressing='true';if(!event.repeat)selectWaste(x.key);}});c.addEventListener('keyup',()=>{c.dataset.pressing='false';});c.addEventListener('blur',()=>{c.dataset.pressing='false';});wasteCards.push(c);stats.append(c);});waste.append(stats,chart);
 const humus=section('การผลิตฮิวมัสและรายได้จากการขาย เดือน '+monthNames[Number(month.slice(5,7))-1]),hs=node('div','dash-stats dash-humus-kpis'),humusBox=node('div','dash-section-box'),trend=node('div','dash-panel dash-trend');trend.id='dashboard-humus-trend';
 const getHumus=k=>payload.errors?.[k]?null:payload.datasets[k],humusHistory=new Map([[month,model]]);
 const humusSpecs=[['production','ปริมาณผลิต','กก.','production'],['income','รายได้จากการขาย','บาท','sale']];const humusCards=humusSpecs.map(([key,label,unit,ico])=>{const c=card(label,model[key],unit,ico);c.setAttribute('role','button');c.setAttribute('tabindex','0');c.setAttribute('aria-controls','dashboard-humus-trend');c.setAttribute('aria-label',label+' · แสดงกราฟ กดซ้ำยกเลิก');const choose=()=>{selectedHumus=selectedHumus===key?null:key;drawHumus();};c.addEventListener('click',choose);c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();c.dataset.pressing='true';if(!e.repeat)choose();}});c.addEventListener('keyup',()=>{c.dataset.pressing='false';});c.addEventListener('blur',()=>{c.dataset.pressing='false';});hs.append(c);return c;});humusBox.append(hs,trend);humus.append(humusBox);

 function drawProductionYears(){
  const series=humusProductionYears(getHumus('humusquality'),month);
  const counted=series.map(s=>s.values.filter(Number.isFinite).length);
  trend.append(node('h4','dash-panel-title','เปรียบเทียบปริมาณผลิตฮิวมัสรายเดือน'));
  const legend=node('div','dash-yoy-legend');
  series.forEach((entry,i)=>{const key=node('span','dash-yoy-key'+(i?' is-prior':''),'พ.ศ. '+(entry.year+543)+(counted[i]?'':' (ไม่มีข้อมูลยืนยัน)'));legend.append(key);});
  trend.append(legend);
  if(!counted.some(Boolean)){trend.append(node('p','dash-empty-chart','ยังไม่มีข้อมูลปริมาณผลิตที่ยืนยันในทั้งสองปี'));return;}
  const scroller=node('div','dash-yoy-scroll'),ns='http://www.w3.org/2000/svg',svg=d.createElementNS(ns,'svg');
  const add=(parent,tag,attrs,content)=>{const e=d.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(content!==undefined)e.textContent=content;parent.append(e);return e;};
  svg.setAttribute('viewBox','0 0 960 288');svg.setAttribute('role','img');svg.setAttribute('aria-label','ปริมาณผลิตเป็นกิโลกรัม เปรียบเทียบ พ.ศ. '+(series[0].year+543)+' และ '+(series[1].year+543));
  const axisTop=23,base=236,left=76,right=932;
  const data=series.flatMap(s=>s.values.filter(Number.isFinite)), maximum=Math.max(1,...data);
  const scale=Math.pow(10,Math.floor(Math.log10(maximum)))/4, top=Math.ceil(maximum/(scale*4))*scale*4;
  const x=i=>left+(right-left)*i/11, y=value=>base-(base-axisTop)*value/top;
  for(let i=0;i<=4;i++){
    const value=top*i/4, at=y(value);
    add(svg,'line',{class:'dash-yoy-grid',x1:left,x2:right,y1:at,y2:at});
    add(svg,'text',{class:'dash-yoy-axis',x:left-10,y:at+4,'text-anchor':'end'},fmt(value));
  }
  chartMonthNames.forEach((label,i)=>add(svg,'text',{class:'dash-yoy-axis',x:x(i),y:264,'text-anchor':'middle'},label));
  // Plot previous first; split path at every missing month (never interpolate).
  for(const i of [1,0]){
    const entry=series[i], group=add(svg,'g',{class:'dash-yoy-series'+(i?' is-prior':'')});
    const path=smoothMonthlyPath(entry.values,x,y);
    if(path)add(group,'path',{class:'dash-yoy-line',d:path});
    entry.values.forEach((value,m)=>{
      if(!Number.isFinite(value))return;
      const point=add(group,'circle',{class:'dash-yoy-point',cx:x(m),cy:y(value),r:i?4.2:4.8});
      add(point,'title',{},monthNames[m]+' '+(entry.year+543)+': '+fmt(value)+' กิโลกรัม');
    });
  }
  scroller.append(svg);trend.append(scroller);
  trend.append(node('p','dash-note','หน่วย: กิโลกรัม • เดือนที่ไม่มีข้อมูลยืนยันจะเว้นช่อง ไม่แสดงเป็นศูนย์'));
  const detail=node('details','dash-yoy-table'),summary=node('summary','','ดูตัวเลขรายเดือน');
  const table=node('table','dash-table'),thead=node('thead'),tr=node('tr'),tbody=node('tbody');
  ['เดือน',...series.map(s=>'พ.ศ. '+(s.year+543))].forEach(label=>{const th=node('th','',label);th.setAttribute('scope','col');tr.append(th);});
  thead.append(tr);table.append(thead,tbody);
  monthNames.forEach((label,i)=>{const row=node('tr'),th=node('th','',label);th.setAttribute('scope','row');row.append(th,...series.map(s=>node('td','',Number.isFinite(s.values[i])?fmt(s.values[i]):'—')));tbody.append(row);});
  detail.append(summary,table);trend.append(detail);
 }
 function drawHumus(){const spec=humusSpecs.find(x=>x[0]===selectedHumus)||humusSpecs[0],mode=spec[0];humusCards.forEach((c,i)=>{const chosen=humusSpecs[i][0]===mode;c.setAttribute('aria-pressed',String(chosen));c.dataset.selected=String(chosen);});trend.replaceChildren();if(mode==='production'){drawProductionYears();return;}const months=rollingMonths(month);trend.append(node('h4','dash-panel-title',spec[1]+'ย้อนหลัง 1 ปี · '+chartYearRange(months)));const vals=months.map(m=>{if(!humusHistory.has(m))humusHistory.set(m,humusMetrics(getHumus,m));return humusHistory.get(m)[mode];}),top=Math.max(1,...vals.map(x=>x.value||0)),tr=node('div','dash-bars dash-trend-bars');months.forEach((m,i)=>{const col=node('div','dash-column'),space=node('div','dash-bar-space'),bar=node('div','dash-bar');col.dataset.selected=String(selectedHumus!==null);bar.style.height=(vals[i].value===null?0:vals[i].value/top*100)+'%';if(vals[i].value>0){bar.tabIndex=0;bar.setAttribute('role','img');bar.setAttribute('aria-label',chartMonthNames[+m.slice(5)-1]+': '+fmt(vals[i].value)+' '+spec[2]);bindBarKeys(bar);bar.append(mode==='income'?humusIncomeCoin():icon(spec[3]));}space.append(bar);col.append(node('strong','dash-bar-label',vals[i].value===null?'—':fmt(vals[i].value)),space,node('span','dash-category',chartMonthNames[+m.slice(5)-1]));tr.append(col);});if(vals.some(x=>x.value!==null)){const scroll=node('div','dash-trend-scroll');scroll.append(tr);trend.append(scroll);}else trend.append(node('p','dash-empty-chart','ยังไม่มีข้อมูลที่ยืนยันในช่วงนี้'));trend.append(node('p','dash-note','หน่วย: '+spec[2]+(mode==='quality'?' · จำนวนรายการตรวจ ไม่ใช่ผลผ่าน/ไม่ผ่าน':'')+' · — คือไม่มีข้อมูลยืนยัน'));}
 drawHumus();
 const bank=section('รายงานผลธนาคารขยะรีไซเคิล เดือน '+monthNames[Number(month.slice(5,7))-1]),bs=node('div','dash-stats');const quantities=b.available?Object.entries(b.units).map(([unit,n])=>fmt(n/100)+' '+unit).join(' / '):'—';const qc=card('เงินที่ใช้รับซื้อทั้งหมด',{value:b.available?b.purchase:null,note:b.available?'เงินรับซื้อจริงของเดือนที่เลือก':b.note},'บาท','money');bs.append(qc,card('ยอดขาย',{value:b.available?b.sale:null,note:b.available?'ยอดเดือนที่ยืนยันแล้ว':b.note},'บาท','sale'),card('กำไร',{value:b.available?b.profit:null,note:b.available?'ยอดขาย − เงินรับซื้อ':b.note},'บาท','money'));const bankCards=Array.from(bs.children);const bankKeys=['purchase','sale','profit'];bankCards.forEach((c,i)=>{c.setAttribute('role','button');c.setAttribute('tabindex','0');c.setAttribute('aria-controls','dashboard-bank-year-graph');c.setAttribute('aria-label',['เงินที่ใช้รับซื้อทั้งหมด','ยอดขาย','กำไร'][i]+' · แสดงกราฟ กดซ้ำยกเลิก');const choose=()=>{selectedBank=selectedBank===bankKeys[i]?null:bankKeys[i];drawAnnual(selectedBank||'sale');};c.addEventListener('click',choose);c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();c.dataset.pressing='true';if(!e.repeat)choose();}});c.addEventListener('keyup',()=>{c.dataset.pressing='false';});c.addEventListener('blur',()=>{c.dataset.pressing='false';});});const bankBox=node('div','dash-section-box');bankBox.append(bs);bank.append(bankBox);
 const annualPanel=node('div','dash-bank-year'),annualHeader=node('div','dash-bank-year-heading');annualHeader.append(node('h4','','ธนาคารขยะรายเดือน ปี '+(+month.slice(0,4)+543)));const switches=node('div','dash-bank-switch');const graphArea=node('div','dash-bank-year-graph');graphArea.id='dashboard-bank-year-graph';const saleButton=node('button','','ยอดขายรวม'),profitButton=node('button','','กำไร');[saleButton,profitButton].forEach(x=>{x.type='button';switches.append(x);});annualHeader.append(switches);annualPanel.append(annualHeader,graphArea);
 function drawAnnual(mode){bankChartMode=mode;bankCards.forEach((c,i)=>{c.setAttribute('aria-pressed',String(bankKeys[i]===selectedBank));c.dataset.selected=String(bankKeys[i]===selectedBank);});graphArea.replaceChildren();graphArea.dataset.selected=String(selectedBank!==null);const unit=mode==='quantityKg'?'กิโลกรัม':'บาท',label=mode==='purchase'?'เงินที่ใช้รับซื้อทั้งหมด':mode==='quantityKg'?'ปริมาณรับซื้อ':mode==='sale'?'ยอดขายรวม':'กำไร';graphArea.append(node('p','dash-note',label+' · หน่วย: '+unit+(mode==='quantityKg'?' (ไม่รวมจำนวนลัง)':'')));saleButton.setAttribute('aria-pressed',String(mode==='sale'));profitButton.setAttribute('aria-pressed',String(mode==='profit'));const values=annual.rows.map(x=>x.available&&Number.isFinite(x[mode])?x[mode]:null),finite=values.filter(x=>Number.isFinite(x)),low=Math.min(0,...finite),high=Math.max(1,...finite),span=high-low;const svg=d.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 1000 365');svg.setAttribute('role','group');svg.setAttribute('aria-label',label+'รายเดือน หน่วย'+unit);const svgNode=(tag,attrs,text)=>{const e=d.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));if(text!==undefined)e.textContent=text;svg.append(e);return e;};const annualPalettes={loss:['#c98c77','#9f5949','#6f392e'],profit:['#91ba6e','#4b803b','#2d5529'],sale:['#99bd8a','#588b61','#2d593e']};const defs=svgNode('defs',{});Object.entries(annualPalettes).forEach(([key,colors])=>{const gradient=svgNode('linearGradient',{id:'dash-annual-gradient-'+key,x1:'0%',y1:'0%',x2:'100%',y2:'60%'});colors.forEach((color,index)=>{gradient.append(svgNode('stop',{offset:['0%','36%','100%'][index],'stop-color':color}));});defs.append(gradient);});const y=v=>305-(v-low)/span*265;for(let tick=0;tick<=4;tick++){const v=low+span*tick/4;svgNode('line',{x1:85,x2:985,y1:y(v),y2:y(v),stroke:'#dfe8e1'});svgNode('text',{x:76,y:y(v)+4,'text-anchor':'end',fill:'#67786c','font-size':12},fmt(v));}svgNode('line',{x1:85,x2:985,y1:y(0),y2:y(0),stroke:'#a5b7a9'});const short=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];values.forEach((v,i)=>{const x=93+i*74.5;svgNode('text',{x:x+26,y:337,'text-anchor':'middle',fill:'#26392b','font-size':14},short[i]);if(v===null){svgNode('text',{x:x+26,y:297,'text-anchor':'middle',fill:'#819087','font-size':18},'—');return;}const yy=Math.min(y(v),y(0)),height=Math.max(1,Math.abs(y(v)-y(0)));const group=svgNode('g',{'class':'dash-annual-bar'+(v<0?' is-negative':'')});const rect=svgNode('rect',{x:x+5,y:yy,width:43,height,rx:4,fill:'url(#dash-annual-gradient-'+(v<0?'loss':mode==='profit'?'profit':'sale')+')',stroke:v<0?'#d7a48d':'#a9ce99','stroke-width':0.8});const title=d.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=monthNames[i]+': '+fmt(v)+' '+unit;rect.append(title);group.append(rect);if(v!==0){group.setAttribute('tabindex','0');group.setAttribute('role','img');group.setAttribute('aria-label',title.textContent);bindBarKeys(group);}svgNode('text',{x:x+26,y:v<0?y(v)+16:Math.max(16,y(v)-7),'text-anchor':'middle',fill:'#29432f','font-size':11},fmt(v));});graphArea.append(svg);}
 saleButton.addEventListener('click',()=>{selectedBank='sale';drawAnnual('sale');});profitButton.addEventListener('click',()=>{selectedBank='profit';drawAnnual('profit');});drawAnnual(bankChartMode);
 const best=annual.bestMonths.map(m=>monthNames[+m.slice(5)-1]).join(', ');annualPanel.append(node('p','dash-bank-peak',annual.highest===null?'ยังไม่มีเดือนที่ยืนยันกำไรได้':(annual.highest<0?'ผลกำไรสูงสุดยังติดลบ: ':'เดือนที่กำไรสูงสุด: ')+best+' · '+fmt(annual.highest)+' บาท'+(annual.coverage<12?' (เทียบเฉพาะ '+annual.coverage+' เดือนที่มีข้อมูลยืนยัน)':'')),node('p','dash-note','— หมายถึงไม่มีข้อมูลยืนยัน ไม่ใช่ศูนย์'));bankBox.append(annualPanel);
 const tree=section('แมพต้นไม้');tree.append(node('p','dash-note',''));const notes=node('details','dash-data-notes');notes.append(node('summary','','สถานะข้อมูล'));[...model.waste.map(x=>x.label+': '+x.note),'ปริมาณผลิต: '+model.production.note,'ผลตรวจคุณภาพ: '+model.quality.note,b.available?'ธนาคารขยะ: ยอดรายเดือนที่ตรวจสอบแล้ว':'ธนาคารขยะ: '+b.note].forEach(t=>notes.append(node('p','',t)));results.append(notes);
 }
 function period(month){const e=d.getElementById('dashboard-period');e.textContent=monthNames[+month.slice(5)-1]+' '+(+month.slice(0,4)+543);}
 async function load(force=false){
  let selected=null,endpoint;try{selected=root.HubSelectedProfile?.get();}catch(_){}
  if(!selected)return;
  try{endpoint=root.UnifiedApi.endpoint();reads.useScope(JSON.stringify([endpoint,selected]));}
  catch(e){generation++;reads.clear();started=false;button.disabled=false;button.classList.remove('is-loading');render({datasets:{}},picker.value);status.textContent='ยังเชื่อมต่อแหล่งข้อมูลไม่ได้ กรุณาตรวจการตั้งค่า';return;}
  const month=picker.value;
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)){status.textContent='กรุณาเลือกเดือน';return;}
  if(force===true)reads.clear();
  const epoch=++generation;started=true;period(month);
  const report={action:'reportData'},municipal={action:'municipalRead'},extra=extraKey(month);
  const sources=[
   {key:'report',body:report,read:()=>reads.read(report,body=>root.UnifiedApi.request(body,endpoint).then(v=>{if(!v||!v.datasets||typeof v.datasets!=='object'||Array.isArray(v.datasets))throw Error('รายงาน');return v;}))},
   {key:'municipal',body:municipal,read:()=>reads.read(municipal,body=>root.UnifiedApi.request(body,endpoint).then(v=>{if(!Array.isArray(v?.records))throw Error('ขยะทั่วไป');return v;}))},
   {key:'extra',body:extra,read:()=>reads.read(extra,body=>{
    // Ask for nearby months in the same read. Older backends ignore the optional list and still return this month.
    const months=[month,...[-1,-2,-3,-4,1].map(n=>shifted(month,n)).filter(m=>/^\d{4}-/.test(m)&&+m.slice(0,4)>=1900&&+m.slice(0,4)<2400&&!reads.peek(extraKey(m)))];
    return root.UnifiedApi.request({...body,months},endpoint).then(v=>{if(!aggShape(v,month))throw Error('ข้อมูลไม่ตรงเดือน');return v;});
   },{cacheable:okExtra,warm:(v,put)=>{
    for(const offset of [-1,-2,-3,-4,1]){const m=shifted(month,offset),item=v.byMonth?.[m];if(aggShape(item,m)&&okExtra(item))put(extraKey(m),item);}
   }})}
  ];
  const latest={},pending=[],preview=new Set(),failed=new Set();
  for(const source of sources){
   const fresh=reads.peek(source.body),old=fresh??reads.peek(source.body,previewFor);
   if(old!==undefined)latest[source.key]=old;
   if(fresh===undefined){pending.push(source);if(old!==undefined)preview.add(source.key);}
  }
  let remaining=pending.length,scheduled=false;
  const inScope=()=>{try{return epoch===generation&&root.UnifiedApi.endpoint()===endpoint&&JSON.stringify(root.HubSelectedProfile?.get())===JSON.stringify(selected);}catch(_){return false;}};
  function paint(){
   if(!inScope())return;
   const payload={datasets:{...latest.report?.datasets},errors:{...latest.report?.errors},extra:latest.extra};
   if(latest.municipal){payload.datasets.general=latest.municipal.records;delete payload.errors.general;}
   render(payload,month);
   button.disabled=remaining>0;
   if(remaining>0)button.classList.add('is-loading');else button.classList.remove('is-loading');
   const incomplete=failed.size||Object.keys(payload.errors).length||['hazard','orphan'].some(k=>latest.extra?.waste[k]?.status==='error');
   status.textContent=remaining>0?(preview.size?'แสดงข้อมูลที่โหลดไว้ · กำลังอัปเดต':Object.keys(latest).length?'แสดงข้อมูลที่อ่านได้แล้ว · กำลังโหลดส่วนที่เหลือ':'กำลังอ่านข้อมูล'):
    (incomplete?'อ่านได้บางส่วน · ช่อง — ยังไม่มีข้อมูลที่ยืนยัน':'แสดงข้อมูล · กดรีเฟรชเพื่ออ่านใหม่');
  }
  function schedule(){if(scheduled)return;scheduled=true;paintSoon(()=>{scheduled=false;paint();});}
  paint();
  await Promise.all(pending.map(source=>source.read().then(v=>{
   if(inScope())latest[source.key]=v;
  }).catch(()=>{
   if(inScope()){delete latest[source.key];failed.add(source.key);}
  }).finally(()=>{
   if(inScope()){remaining--;preview.delete(source.key);schedule();}
  })));
 }
 api.reset=()=>{reads.clear();generation++;started=false;selectedWaste=null;selectedHumus=null;selectedBank=null;bankChartMode='sale';picker.value=currentMonth();if(monthSelect&&yearSelect){monthSelect.value=picker.value.slice(5);yearSelect.value=picker.value.slice(0,4);}render({datasets:{}},picker.value);period(picker.value);button.disabled=false;button.classList.remove('is-loading');status.textContent='พร้อมอ่านข้อมูล';};
 api.activate=()=>{let profile=false;try{profile=!!root.HubSelectedProfile?.get();}catch(_){}if(!started&&profile)return load();};picker.addEventListener('change',load);button.addEventListener('click',()=>load(true));root.addEventListener('mu:data-changed',()=>{reads.clear();started=false;generation++;button.disabled=false;button.classList.remove('is-loading');render({datasets:{}},picker.value);status.textContent='ข้อมูลเปลี่ยนแล้ว กรุณารีเฟรชเพื่ออ่านล่าสุด';});render({datasets:{}},picker.value);period(picker.value);api.activate();
}
const api={rollingMonths,humusProductionYears,smoothMonthlyPath,recycleMetric,bankYear,bankPeak,overview,bankSummary,sumMetric,selectRows,num,categories,summarize,mount,validDate,thaiDate,safePhoto,photoList,summaryText,defaultRange,rangeOf,metrics};if(typeof module==='object'&&module.exports)module.exports=api;else root.HubDashboard=api;
})(typeof window==='object'?window:globalThis);
