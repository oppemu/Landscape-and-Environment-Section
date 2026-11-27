(function () {
  'use strict';
  const Core=window.HubInventory;
  const $=id=>document.getElementById(id);
  const actions={create_item:'เพิ่มรายการของ',receive:'รับของเข้าคลัง',issue:'เบิกใช้สิ้นเปลือง',loan:'เปิดเคสยืม',receive_return:'บันทึกรับคืน',inspect_return:'ตรวจสภาพของคืน',repair:'ซ่อมเสร็จและคืนพร้อมจ่าย',retire:'ตัดของชำรุดออก',adjust:'ปรับยอดพร้อมจ่าย',count_stock:'ตรวจนับของพร้อมจ่าย',reconcile_count:'ทบทวนและปรับผลต่างตรวจนับ',extend_loan:'ขยายกำหนดคืน'};
  const statuses={open:'รอคืน',partial:'คืนบางส่วน',inspection:'รอตรวจคืน',closed:'ปิดเคส'};
  const errors={RECEIPT_UNREADABLE:'อ่านหลักฐานรายการค้างไม่ได้ ยังยืนยันไม่ได้ กรุณาเก็บข้อมูลเบราว์เซอร์ไว้และให้ผู้ดูแลตรวจ',DATABASE_CHANGED:'ยังมีรายการคลังค้างของฐานเดิม กรุณากลับไปใช้ฐานเดิมเพื่อตรวจผล ห้ามล้างข้อมูลเบราว์เซอร์',DATABASE_MISMATCH:'ลิงก์นี้เชื่อมฐานข้อมูลไม่ตรง ยังไม่ตรวจหรือส่งรายการคลัง',ACTOR_CHANGED:'กรุณาใช้บัญชี Google เดิมเพื่อตรวจรายการค้าง',PHOTO_REQUIRED:'กรุณาแนบรูปหลักฐานก่อนบันทึก',IMAGE_INVALID:'รูปไม่ถูกต้อง กรุณาแนบ JPG PNG หรือ WEBP',STALE_COUNT:'ยอดของเปลี่ยนหลังตรวจนับ ต้องตรวจนับใหม่ก่อนปรับผลต่าง',COUNT_NOT_OPEN:'ผลตรวจนับนี้ไม่รอทบทวนแล้ว',DATE_BEFORE_COUNT:'วันทบทวนต้องไม่ก่อนวันตรวจนับ',CASE_NOT_OUTSTANDING:'เคสนี้ไม่มีของค้างคืนให้เปลี่ยนกำหนด',DUPLICATE_SERIAL:'หมายเลขประจำชิ้นนี้มีในทะเบียนแล้ว',INVALID_TEXT:'กรอกข้อความที่จำเป็นให้ครบและไม่ยาวเกินกำหนด',INVALID_QUANTITY:'จำนวนต้องเป็นจำนวนเต็มตามช่วงที่กำหนด',INVALID_DATE:'วันที่ไม่ถูกต้อง',FUTURE_DATE:'วันที่ทำรายการต้องไม่เป็นอนาคต',INVALID_DUE_DATE:'กำหนดคืนต้องไม่ก่อนวันทำรายการ และการขยายต้องหลังวันกำหนดเดิม',REVISION_CONFLICT:'ข้อมูลเปลี่ยนแล้ว โปรดตรวจยอดล่าสุดก่อนบันทึกใหม่',INSUFFICIENT_STOCK:'ของพร้อมจ่ายไม่พอ กรุณาตรวจยอดล่าสุด',EXCESS_RETURN:'จำนวนรับคืนมากกว่าจำนวนค้างคืนในเคสนี้',DATE_BEFORE_LOAN:'วันที่คืนต้องไม่ก่อนวันที่ยืม',DATE_BEFORE_RETURN:'วันที่ตรวจต้องไม่ก่อนวันที่รับคืน',DATE_BEFORE_ITEM:'วันที่ทำรายการต้องไม่ก่อนวันที่เริ่มทะเบียน',ALREADY_INSPECTED:'รอบรับคืนนี้ตรวจไปแล้ว',INSPECTION_TOTAL_MISMATCH:'จำนวนใช้ได้รวมชำรุดต้องเท่ากับจำนวนรับคืนทั้งหมด',DAMAGE_NOTE_REQUIRED:'กรุณาระบุอาการชำรุดและสิ่งที่พบ',REASON_REQUIRED:'กรุณาระบุเหตุผลประกอบ',DUPLICATE_ITEM_CODE:'รหัสของนี้มีแล้ว กรุณาใช้รหัสใหม่',SERIAL_REQUIRES_SINGLE_ASSET:'ของที่มีหมายเลขประจำชิ้นต้องเป็นของยืมคืนและมีจำนวนเริ่มต้น 1 ชิ้น',SERIAL_ASSET_FIXED_QUANTITY:'ของประจำชิ้นไม่เพิ่มหรือลดยอดรวมด้วยรายการนี้ ให้ลงทะเบียนชิ้นใหม่แยกต่างหาก',INSUFFICIENT_DAMAGED:'จำนวนเกินยอดชำรุดที่พักไว้',CONDITION_REQUIRED:'กรุณาระบุสภาพก่อนจ่ายยืม'};
  let events=[],state=Core.empty(),tab='stock',activeForm=null,busy=false,lastFocus=null;
  const today=()=>Core.today(new Date().toISOString());
  const uid=prefix=>prefix+'-'+(crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint32Array(4))).map(x=>x.toString(16).padStart(8,'0')).join('-'));
  // สร้างองค์ประกอบและใส่ข้อความผ่าน textContent ป้องกันชื่อของถูกตีความเป็น HTML
  function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
  // แสดงสถานะพร้อมรูปแบบข้อผิดพลาด ไม่เปลี่ยนข้อมูลคลัง
  function message(text,error){if(error&&window.UnifiedApi.submissionStatus)window.UnifiedApi.submissionStatus('blocked',text);}
  let storage;try{storage=window.localStorage;}catch(e){storage={getItem(){throw e;}};}
  // เก็บเฉพาะหลักฐานคำขอเพื่อสอบผล ไม่ใช่คิวรายการหรือรูป และผูกกับฐานข้อมูลนี้โดยเฉพาะ
  const client=new window.HubInventoryClient({request:(payload,expectedEndpoint)=>window.UnifiedApi.request(payload,expectedEndpoint),endpoint:()=>window.UnifiedApi.endpoint(),database:()=>{const c=window.parent.HubConfig||window.HubConfig;return c&&c.api&&c.api.spreadsheetId||'';},legacySpreadsheetId:'',storage,key:'hub.inventory.receipt.v1:'+String(window.HubConfig?.api?.spreadsheetId||'unconfigured'),core:Core});
  let identity=null,ready=false,writesEnabled=false;
  // คืนตัวตนที่เซิร์ฟเวอร์ยืนยัน หรือ reader เมื่อยังไม่ยืนยัน
  function actor(){return identity||{name:'ยังไม่ยืนยันตัวตน',role:'reader'};}
  // จำกัดปุ่มเขียนตามสถานะพร้อมใช้และบทบาท งานปรับ/ซ่อม/ตัดออกต้อง admin แต่เซิร์ฟเวอร์ยังต้องตรวจอีกชั้น
  function canWrite(action){return ready&&writesEnabled&&identity&&identity.role!=='reader'&&(!['create_item','repair','retire','adjust','reconcile_count','extend_loan'].includes(action)||identity.role==='admin');}
  // นำ snapshot ที่ตรวจแล้วมาปรับสถานะหน้าจอ รวมตัวตนและสิทธิ์เขียน ไม่สร้างสิทธิ์จากข้อมูลกรอก
  function sync(){const snapshot=client.snapshot;if(!snapshot)return;events=snapshot.events;state=snapshot.state;identity=snapshot.actor;writesEnabled=snapshot.writesEnabled;ready=true;$('mode-label').textContent=writesEnabled?'เชื่อมฐานข้อมูล':'อ่านอย่างเดียว';$('connection-detail').textContent='บัญชีผู้บันทึก: '+identity.name+' · '+(writesEnabled?'เชื่อมฐานข้อมูลใหม่แล้ว':'ยังไม่เปิดให้บันทึก');$('verify-receipt').hidden=!client.uncertain;render();}
  // อ่านทะเบียนจากเซิร์ฟเวอร์และแสดงสถานะคำขอที่ยังไม่แน่ชัด ไม่ส่งรายการเก่าซ้ำ
  async function refresh(){try{message('กำลังโหลดทะเบียน…');await client.read();sync();message(client.uncertain?'ยังไม่พบผลยืนยัน โปรดตรวจสอบทะเบียนก่อน ไม่ส่งซ้ำ':'โหลดทะเบียนล่าสุดแล้ว',!!client.uncertain);}catch(e){message('โหลดทะเบียนไม่ได้: '+(errors[e.code||e.message]||e.message),true);}}
  // รูปแบบตัวเลขตามภาษาไทย
  function num(n){return n.toLocaleString('th-TH');}
  // แสดงวันที่เป็นวัน/เดือน/พุทธศักราช โดยค่าต้นฉบับยังเป็น ISO
  function date(d){if(!d)return 'ไม่กำหนด';if(window.HubThaiDate)return window.HubThaiDate.date(d);const [y,m,day]=d.split('-').map(Number);return day+'/'+m+'/'+(y+543);}
  // แสดงเวลาบันทึกตาม Asia/Bangkok แบบ 24 ชั่วโมง
  function stamp(s){if(window.HubThaiDate)return window.HubThaiDate.timestamp(s);return new Date(s).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',hour12:false});}
  // ย่อรหัสเฉพาะข้อความบนจอ ไม่แก้รหัสจริงที่ใช้อ้างอิง
  function short(id){return id.slice(0,4)+'…'+id.slice(-8);}
  // สร้างป้ายสถานะพร้อมคลาสสี
  function badge(text,cls){return el('span',text,'badge '+(cls||''));}
  // ถือว่าเกินกำหนดเฉพาะเคสยังมีของค้างและวันคืนก่อนวันนี้
  function overdue(c){return c.outstanding>0&&!!c.dueDate&&c.dueDate<today();}
  // ค้นข้อความจากรายละเอียดรายการโดยไม่แยกตัวพิมพ์ใหญ่เล็ก
  function search(obj){const q=$('search').value.trim().toLocaleLowerCase();return !q||JSON.stringify(obj).toLocaleLowerCase().includes(q);}
  // แทนพื้นที่ตารางด้วยข้อความเมื่อไม่มีข้อมูล
  function empty(id,text){$(id).replaceChildren(el('div',text,'empty'));}
  // สร้างโครงตารางหัวคอลัมน์และคืน tbody ให้ตัววาดเพิ่มแถว
  function table(id,headers){const wrap=el('div',undefined,'table-wrap'),t=el('table'),head=el('thead'),tr=el('tr'),body=el('tbody');headers.forEach(h=>{const th=el('th',h);th.scope='col';tr.append(th);});head.append(tr);t.append(head,body);wrap.append(t);$(id).replaceChildren(wrap);return body;}
  // เพิ่มเซลล์ข้อความหรือ DOM ที่เตรียมไว้ลงแถว
  function cell(row,...children){const td=el('td');children.forEach(c=>td.append(typeof c==='string'?document.createTextNode(c):c));row.append(td);return td;}
  // สร้างปุ่มคำสั่งและผูก click โดยไม่ให้ปุ่มกลายเป็น submit เอง
  function button(label,fn,secondary){const b=el('button',label,secondary?'secondary':'');b.type='button';b.addEventListener('click',fn);return b;}
  // แสดงจำนวนและหน่วยคู่กัน ป้องกันอ่านตัวเลขโดยไม่รู้หน่วย
  function quantity(n,unit){const box=el('div');box.append(el('span',num(n),'number'),el('span',unit,'sub unit'));return box;}
  // คำนวณการ์ดสรุปและเลือกแผงตามแท็บจาก state ล่าสุด
  function render(){
    const items=Object.values(state.items),cases=Object.values(state.cases),pending=Object.values(state.returns).filter(r=>!r.inspected);
    $('summary').replaceChildren(...[[items.length,'รายการในทะเบียน'],[cases.filter(c=>c.status!=='closed').length,'เคสยืมที่ยังไม่ปิด'],[pending.length,'รอบรับคืนที่รอตรวจ'],[items.filter(i=>i.available<=i.minimum).length,'รายการถึงจุดเติมของ']].map(([n,label])=>{const m=el('div',undefined,'metric');m.append(el('strong',ready?num(n):'—'),el('span',label));return m;}));
    document.querySelectorAll('[data-tab]').forEach(b=>{if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    ['stock','cases','inspections','counts','history'].forEach(t=>$(t+'-panel').hidden=t!==tab);
    renderStock();renderCases();renderInspections();renderCounts();renderHistory();$('new-item').disabled=!canWrite('create_item')||!!client.uncertain;
  }
  // แสดงของพร้อมจ่าย ยืมค้าง รอตรวจและชำรุด แยกยอดไม่ปะปน
  function renderStock(){
    if(!ready){empty('stock-list','ยังไม่มียอดคลังที่ยืนยันแล้ว เปิดทะเบียนรายการของด้านล่างเพื่อดูชื่อและรหัสได้');return;}
    const items=Object.values(state.items).filter(search);
    if(!items.length){empty('stock-list',state.revision?'ไม่พบรายการที่ค้นหา':'ยังไม่มีรายการในทะเบียน เพิ่มรายการของเพื่อเริ่มใช้งาน');return;}
    const body=table('stock-list',['รายการ / ที่เก็บ','ประเภท','พร้อมจ่าย','ยืมค้างคืน','รอตรวจ','ชำรุดพักไว้','ทำรายการ']);
    items.forEach(i=>{const tr=el('tr'),name=el('div');name.append(el('span',i.name,'item-name'),el('span',i.code+' · '+(i.location||'ยังไม่ระบุที่เก็บ'),'sub'));if(i.serial)name.append(el('span','S/N '+i.serial,'sub'));if(i.available<=i.minimum)name.append(badge('ถึงจุดเติม '+num(i.minimum),'warning'));cell(tr,name);cell(tr,badge(i.kind==='returnable'?'ยืมและคืน':'ใช้สิ้นเปลือง'));['available','loaned','pendingInspection','damaged'].forEach(k=>cell(tr,quantity(i[k],i.unit)));const box=el('div',undefined,'row-actions');const issue=button(i.kind==='returnable'?'ยืมของ':'เบิกใช้',()=>openAction(i.kind==='returnable'?'loan':'issue',{itemId:i.id}));issue.disabled=i.available===0;box.append(issue,button('จัดการ',()=>openItem(i.id),true));cell(tr,box);body.append(tr);});
  }
  // แสดงเคสยืมพร้อมสถานะ/เกินกำหนดและคำสั่งตามเคส
  function renderCases(){
    const filter=$('case-filter').value;
    const cases=Object.values(state.cases).reverse().filter(c=>search({...c,item:state.items[c.itemId]})&&(filter==='all'||(filter==='active'?c.status!=='closed':filter==='overdue'?overdue(c):c.status===filter)));
    if(!cases.length){empty('case-list','ไม่มีเคสในสถานะหรือคำค้นนี้');return;}
    const body=table('case-list',['เลขเคส / ของ','ผู้ยืม / วันที่','ยืมทั้งหมด','ค้างคืน','รอตรวจ','สถานะ','ทำรายการ']);
    cases.forEach(c=>{const i=state.items[c.itemId],tr=el('tr'),name=el('div');name.append(el('span',i.name,'item-name'),el('span',short(c.id),'case-id'));name.title=c.id;cell(tr,name);const person=el('div');person.append(el('span',c.borrower),el('span','ยืม '+date(c.date),'sub'),el('span','กำหนดคืน '+date(c.dueDate),'sub'));cell(tr,person);['quantity','outstanding','pendingInspection'].forEach(k=>cell(tr,quantity(c[k],i.unit)));const bs=el('div');bs.append(badge(statuses[c.status],c.status==='closed'?'good':'warning'));if(c.damaged>0)bs.append(el('br'),badge('พบชำรุด '+num(c.damaged)+' '+i.unit,'bad'));if(overdue(c))bs.append(el('br'),badge('เกินกำหนด','bad'));cell(tr,bs);const box=el('div',undefined,'row-actions');box.append(button('เปิดเคส',()=>openCase(c.id),true));if(c.outstanding)box.append(button('รับคืน',()=>openAction('receive_return',{itemId:i.id,caseId:c.id})));cell(tr,box);body.append(tr);});
  }
  // แสดงเฉพาะรอบรับคืนที่ยังไม่ตรวจสภาพ ไม่ถือรับคืนว่าใช้ได้ทันที
  function renderInspections(){
    const returns=Object.values(state.returns).filter(r=>!r.inspected&&search({...r,item:state.items[r.itemId],loan:state.cases[r.caseId]}));
    if(!returns.length){empty('inspection-list','ไม่มีของคืนรอตรวจ เมื่อบันทึกรับคืนแล้ว รายการจะเข้าคิวนี้');return;}
    const body=table('inspection-list',['ของ / เคสอ้างอิง','ผู้ส่งคืน / วันที่','รับคืนรอบนี้','ผู้บันทึกรับคืน','ทำรายการ']);
    returns.forEach(r=>{const i=state.items[r.itemId],tr=el('tr'),name=el('div');name.append(el('span',i.name,'item-name'),el('span',short(r.caseId),'case-id'),el('span','ผู้ยืม '+state.cases[r.caseId].borrower,'sub'));cell(tr,name);const person=el('div');person.append(el('span',r.returner),el('span',date(r.date),'sub'));cell(tr,person);cell(tr,quantity(r.quantity,i.unit));cell(tr,r.recorder.name);cell(tr,button('ตรวจสภาพ',()=>openAction('inspect_return',{itemId:i.id,returnId:r.id})));body.append(tr);});
  }
  // แสดงผลตรวจนับและบังคับนับใหม่เมื่อยอดเปลี่ยนหลังนับ ก่อนทบทวนผลต่าง
  function renderCounts(){
    const counts=Object.values(state.counts).reverse().filter(c=>search({...c,item:state.items[c.itemId]}));
    if(!counts.length){empty('count-list','ยังไม่มีผลตรวจนับ เปิดจัดการที่รายการของแล้วเลือกตรวจนับของพร้อมจ่าย');return;}
    const body=table('count-list',['ของ / วันที่ตรวจนับ','ผู้ตรวจนับ','ตามทะเบียน','นับจริง','ผลต่าง / สถานะ','ทบทวน']);
    counts.forEach(c=>{const i=state.items[c.itemId],tr=el('tr'),name=el('div');name.append(el('span',i.name,'item-name'),el('span',date(c.date)+' · '+short(c.id),'sub'));cell(tr,name);cell(tr,c.counter);cell(tr,quantity(c.expectedQty,i.unit));cell(tr,quantity(c.countedQty,i.unit));const stale=c.status==='review'&&c.balanceRevision!==i.balanceRevision;const status=c.status==='matched'?'ตรงทะเบียน':c.status==='resolved'?'ปรับผลต่างแล้ว':stale?'ต้องนับใหม่':'รอผู้ดูแลทบทวน';cell(tr,el('span',(c.variance>0?'+':'')+num(c.variance)+' ','number'),badge(status,c.status==='matched'||c.status==='resolved'?'good':'warning'));const b=el('div',undefined,'row-actions');if(c.status==='review'&&!stale&&!i.serial)b.append(button('ทบทวนผลต่าง',()=>openAction('reconcile_count',{itemId:i.id,countId:c.id})));else if(stale)b.append(button('ตรวจนับใหม่',()=>openAction('count_stock',{itemId:i.id}),true));else b.append(el('span',c.reviewer?'ผู้ทบทวน '+c.reviewer:i.serial&&c.status==='review'?'แจ้งผู้ดูแลทรัพย์สินประจำชิ้น':'—','sub'));cell(tr,b);body.append(tr);});
  }
  // หารหัสเคสจากการยืม เคสอ้างอิง หรือรอบคืน เพื่อผูกประวัติถูกเคส
  function relatedCase(e){if(e.action==='loan')return e.id;if(e.data.caseId)return e.data.caseId;if(e.data.returnId)return state.returns[e.data.returnId].caseId;return '';}
  // จัดรายละเอียดเหตุการณ์ให้ตรงประเภท เช่นผลต่าง จำนวนตรวจดี/ชำรุด หรือวันขยายคืน
  function describe(e){const d=e.data;if(e.action==='count_stock')return 'ตามทะเบียน '+num(d.expectedQty)+' / นับจริง '+num(d.countedQty);if(e.action==='extend_loan')return date(d.previousDueDate)+' → '+date(d.dueDate);if(e.action==='reconcile_count')return (d.delta>0?'+':'')+num(d.delta);if(e.action==='inspect_return')return 'ใช้ได้ '+num(d.goodQty)+' / ชำรุด '+num(d.damagedQty);if(e.action==='adjust')return (d.delta>0?'+':'')+num(d.delta);return num(d.quantity);}
  // รวบรวมผู้เกี่ยวข้องที่มีค่าโดยไม่แสดงชื่อบทบาทว่าง
  function people(e){const d=e.data;return [d.borrower&&'ผู้รับ/ยืม: '+d.borrower,d.issuer&&'ผู้จ่าย: '+d.issuer,d.returner&&'ผู้ส่งคืน: '+d.returner,d.inspector&&'ผู้ตรวจ: '+d.inspector,d.counter&&'ผู้ตรวจนับ: '+d.counter,d.reviewer&&'ผู้ทบทวน: '+d.reviewer].filter(Boolean).join(' · ');}
  // เรียงเหตุการณ์ล่าสุดก่อน พร้อมเวลา บัญชีผู้บันทึกและเหตุผล โดยไม่แก้ประวัติ
  function renderHistory(){
    const list=events.slice().reverse().filter(e=>search({...e,item:state.items[e.itemId]}));
    if(!list.length){empty('history-list','ยังไม่มีประวัติที่ตรงกับคำค้น');return;}
    const body=table('history-list',['วันที่ทำรายการ / เวลาบันทึก','รายการ','จำนวน','บุคคลที่เกี่ยวข้อง','ผู้บันทึก / เหตุผล']);
    list.forEach(e=>{const i=state.items[e.itemId],tr=el('tr'),d=el('div');d.append(el('span',date(e.date)),el('span',stamp(e.recordedAt)+' น.','sub'));cell(tr,d);const item=el('div');item.append(el('span',actions[e.action],'item-name'),el('span',i.name+' · '+i.code,'sub'));const cid=relatedCase(e);if(cid)item.append(button('เคส '+short(cid),()=>openCase(cid),true));cell(tr,item);cell(tr,describe(e)+(e.action==='extend_loan'?'':' '+i.unit));cell(tr,people(e)||'—');const a=el('div');a.append(el('span',e.actor.name),el('span',e.data.note||'—','sub'),el('span','รายการที่ '+e.revision+' · '+short(e.id),'sub'));cell(tr,a);body.append(tr);});
  }
  // จำจุดโฟกัสแล้วเปิด modal ให้คีย์บอร์ดทำงานในกล่อง
  function showDialog(id){lastFocus=document.activeElement;$(id).showModal();}
  // ปิด modal และคืนโฟกัสไปปุ่มเดิมหากยังอยู่บนหน้า
  function closeDialog(id){$(id).close();if(lastFocus&&document.contains(lastFocus))lastFocus.focus();}
  // สร้างช่องตามสเปก กำหนด required/ชนิด/ขอบเขตตัวเลขและวันที่ก่อนเพิ่มในฟอร์ม
  function addField(spec){const label=el('label',spec.label);if(spec.wide)label.classList.add('wide');let input;
    if(spec.options){input=el('select');spec.options.forEach(([value,name])=>{const o=el('option',name);o.value=value;input.append(o);});}
    else input=el(spec.type==='textarea'?'textarea':'input');
    input.name=spec.key;input.id='field-'+spec.key;if(input.tagName==='INPUT')input.type=spec.type||'text';if(spec.required)input.required=true;if(spec.maxLength)input.maxLength=spec.maxLength;
    if(spec.type==='number'){input.min=spec.min??1;input.max=spec.max??1000000000;input.step=1;}
    if(spec.type==='date'&&spec.key!=='dueDate')input.max=today();if(spec.value!==undefined)input.value=spec.value;
    if(spec.readOnly)input.readOnly=true;label.append(input);if(spec.help)label.append(el('span',spec.help,'sub'));$('form-fields').append(label);return input;
  }
  // ตรวจสิทธิ์และรายการไม่แน่ชัดก่อนเปิดแบบทำรายการ แล้วสร้างช่องเฉพาะ action
  function openAction(action,context={}){
    if(!canWrite(action)){message('บัญชีนี้ยังไม่มีสิทธิ์ทำรายการนี้ หรือยังเชื่อมต่อไม่สำเร็จ',true);return;}if(client.uncertain){message('ผลรายการก่อนหน้ายังไม่ยืนยัน กรุณาตรวจสอบทะเบียนก่อน ไม่ส่งซ้ำ',true);return;}
    if($('case-dialog').open)closeDialog('case-dialog');
    activeForm={action,context,revision:state.revision,fields:[]};$('inventory-photo').value='';$('dialog-title').textContent=actions[action];$('dialog-description').replaceChildren();$('form-fields').replaceChildren();$('form-error').textContent='';$('save-action').disabled=false;
    const i=state.items[context.itemId];if(i)$('dialog-description').append(el('p',i.name+' · '+i.code+' · พร้อมจ่าย '+num(i.available)+' '+i.unit));
    if(context.caseId){const c=state.cases[context.caseId];$('dialog-description').append(el('p','เคส '+c.id,'case-id'),el('p','ผู้ยืม '+c.borrower+' · ยืม '+date(c.date)+' · ค้างคืน '+num(c.outstanding)+' '+i.unit));}
    if(context.returnId){const r=state.returns[context.returnId],c=state.cases[r.caseId];$('dialog-description').append(el('p','เคส '+c.id,'case-id'),el('p','ผู้ยืม '+c.borrower+' · ผู้ส่งคืน '+r.returner+' · รับคืน '+num(r.quantity)+' '+i.unit+' เมื่อ '+date(r.date)));}
    if(context.countId){const c=state.counts[context.countId];$('dialog-description').append(el('p','ผลตรวจนับ '+c.id,'case-id'),el('p','นับโดย '+c.counter+' เมื่อ '+date(c.date)+' · ตามทะเบียน '+num(c.expectedQty)+' · นับจริง '+num(c.countedQty)+' · ผลต่าง '+num(c.variance)+' '+i.unit));}
    const field=spec=>{activeForm.fields.push(spec);return addField(spec);};
    const text=(key,label,required=true,value='',wide=false,maxLength=120)=>field({key,label,required,value,wide,maxLength});
    const number=(key,label,min=1,value=1,max=1000000000)=>field({key,label,type:'number',required:true,min,max,value});
    field({key:'date',label:'วันที่ทำรายการ',type:'date',required:true,value:today()});
    if(action==='create_item'){
      text('code','รหัสของ เช่น ST-001');text('name','ชื่อวัสดุ / อุปกรณ์');field({key:'kind',label:'ประเภท',options:[['returnable','อุปกรณ์ยืมคืน'],['consumable','วัสดุใช้สิ้นเปลือง']],required:true});text('unit','หน่วย เช่น ชิ้น / กล่อง');text('location','ตำแหน่งเก็บ / ชั้น',true);text('category','หมวดหมู่',false);text('custodian','ผู้รับผิดชอบของ',false);text('model','ยี่ห้อ / รุ่น',false);text('serial','หมายเลขประจำชิ้น ถ้ามี',false);number('quantity','จำนวนตั้งต้นที่ใช้ได้',0,0);number('minimum','จุดแจ้งให้เติมของ',0,0);
    }
    if(['receive','issue','loan','receive_return','repair','retire'].includes(action)){
      const max=action==='receive_return'?state.cases[context.caseId].outstanding:action==='repair'||action==='retire'?i.damaged:action==='issue'||action==='loan'?i.available:1000000000;
      number('quantity','จำนวน ('+i.unit+')',1,1,max);
    }
    if(action==='receive')text('reference','เลขเอกสาร / แหล่งที่รับเข้า',false,'',true);
    if(action==='issue'||action==='loan'){
      text('borrower',action==='loan'?'ผู้ยืม':'ผู้เบิก / ผู้รับของ');text('department','หน่วยงาน / ทีม',false);text('issuer','ผู้จ่ายของ');text('purpose','วัตถุประสงค์ / พื้นที่ใช้งาน',true,'',true,500);
      if(action==='loan'){field({key:'dueDate',label:'กำหนดคืน',type:'date',value:today(),required:true});text('conditionOut','สภาพและอุปกรณ์ประกอบก่อนจ่าย',true,'',true,500);}
    }
    if(action==='receive_return')text('returner','ผู้ส่งคืน (อาจต่างจากผู้ยืม)',true,'',true);
    if(action==='inspect_return'){
      const r=state.returns[context.returnId];number('goodQty','ใช้ได้ ('+i.unit+')',0,r.quantity,r.quantity);number('damagedQty','ชำรุด / ไม่พร้อมใช้ ('+i.unit+')',0,0,r.quantity);text('inspector','ผู้ตรวจสภาพจริง',true,'',true);$('dialog-description').append(el('p','ใช้ได้รวมชำรุดต้องครบ '+num(r.quantity)+' '+i.unit+' ของชำรุดจะไม่กลับเข้ายอดพร้อมจ่าย'));
    }
    if(action==='count_stock'){number('countedQty','จำนวนที่นับจริง ('+i.unit+')',0,'');text('counter','ผู้ตรวจนับจริง');$('dialog-description').append(el('p','นับเฉพาะของใช้ได้ที่พร้อมจ่าย ไม่รวมของยืมค้างคืน รอตรวจ หรือชำรุด การบันทึกนี้ยังไม่เปลี่ยนยอด'));}
    if(action==='reconcile_count')text('reviewer','ผู้ทบทวนผลต่าง',true,'',true);
    if(action==='extend_loan')field({key:'dueDate',label:'กำหนดคืนใหม่',type:'date',value:state.cases[context.caseId].dueDate||today(),required:true});
    if(action==='adjust'){number('delta','ยอดเพิ่ม (+) หรือลด (−) ของพร้อมจ่าย',-1000000000,0);$('dialog-description').append(el('p','ใช้เฉพาะการแก้ยอดที่มีหลักฐาน ไม่เปลี่ยนจำนวนในเคสยืมหรือของรอตรวจ และไม่ลบประวัติเดิม'));}
    field({key:'note',label:action==='inspect_return'?'สิ่งที่พบ / อาการชำรุด / อุปกรณ์ขาด':'หมายเหตุ / เหตุผล / เอกสารอ้างอิง',type:'textarea',required:['repair','retire','adjust','reconcile_count','extend_loan'].includes(action),maxLength:1000,wide:true});
    $('dialog-description').append(el('p','ผู้บันทึกที่ยืนยันตัวตน: '+actor().name));
    showDialog('form-dialog');
  }
  // แสดงรายละเอียดของหนึ่งรายการพร้อมยอดและคำสั่งที่เกี่ยวข้อง
  function openItem(id){const i=state.items[id];$('case-title').textContent=i.name;$('case-detail').replaceChildren();const d=$('case-detail'),grid=el('div',undefined,'details-grid');[['รหัสของ',i.code],['ที่เก็บ',i.location||'—'],['หมวดหมู่',i.category||'—'],['ผู้ดูแล',i.custodian||'—'],['รุ่น / ประจำชิ้น',[i.model,i.serial].filter(Boolean).join(' / ')||'—'],['หน่วย',i.unit],['รับเข้าตั้งแต่เริ่ม',num(i.totalIn)],['เบิกสิ้นเปลืองสะสม',num(i.issued)],['ตัดชำรุดสะสม',num(i.retired)],['ปรับยอดสุทธิ',num(i.adjustment)]].forEach(([k,v])=>{const b=el('div',undefined,'detail-box');b.append(el('small',k),el('strong',v));grid.append(b);});d.append(grid,el('p','พร้อมจ่าย '+num(i.available)+' · ยืมค้างคืน '+num(i.loaned)+' · รอตรวจ '+num(i.pendingInspection)+' · ชำรุด '+num(i.damaged)+' '+i.unit));const buttons=el('div',undefined,'row-actions');buttons.append(button('ตรวจนับของพร้อมจ่าย',()=>openAction('count_stock',{itemId:id}),true));if(!i.serial)buttons.append(button('รับเข้าคลัง',()=>openAction('receive',{itemId:id})));if(i.damaged)buttons.append(button('ซ่อมเสร็จ',()=>openAction('repair',{itemId:id}),true),button('ตัดของชำรุด',()=>openAction('retire',{itemId:id}),true));if(!i.serial)buttons.append(button('ปรับยอดพร้อมจ่าย',()=>openAction('adjust',{itemId:id}),true));d.append(buttons,el('p','การซ่อม ตัดออก และปรับยอดเป็นงานผู้ดูแล ต้องใช้บัญชีสิทธิ์ผู้ดูแล','sub'));showDialog('case-dialog');}
  // แสดงเคสยืมพร้อมรอบคืน/ตรวจและเส้นเวลาทั้งเคส
  function openCase(id){const c=state.cases[id],i=state.items[c.itemId];$('case-title').textContent='เคสยืม · '+i.name;const d=$('case-detail');d.replaceChildren(el('p',c.id,'case-id'));const grid=el('div',undefined,'details-grid');[['ผู้ยืม',c.borrower],['หน่วยงาน',c.department||'—'],['วันยืม / กำหนดคืน',date(c.date)+' / '+date(c.dueDate)],['ผู้จ่าย',c.issuer],['วัตถุประสงค์',c.purpose],['สภาพก่อนจ่าย',c.conditionOut],['ยืมทั้งหมด',num(c.quantity)+' '+i.unit],['ค้างคืน / รอตรวจ',num(c.outstanding)+' / '+num(c.pendingInspection)+' '+i.unit],['ตรวจแล้ว ใช้ได้ / ชำรุด',num(c.good)+' / '+num(c.damaged)+' '+i.unit],['สถานะ',statuses[c.status]+(overdue(c)?' · เกินกำหนด':'')]].forEach(([k,v])=>{const box=el('div',undefined,'detail-box');box.append(el('small',k),el('strong',v));grid.append(box);});d.append(grid);const buttons=el('div',undefined,'row-actions');if(c.outstanding)buttons.append(button('รับคืนในเคสนี้',()=>openAction('receive_return',{itemId:i.id,caseId:id})),button('ขยายกำหนดคืน',()=>openAction('extend_loan',{itemId:i.id,caseId:id}),true));Object.values(state.returns).filter(r=>r.caseId===id&&!r.inspected).forEach(r=>buttons.append(button('ตรวจรอบคืน '+date(r.date)+' · '+r.quantity+' '+i.unit,()=>openAction('inspect_return',{itemId:i.id,returnId:r.id}),true)));d.append(buttons,el('h3','เหตุการณ์ในเคสนี้'));const timeline=el('ol',undefined,'timeline');events.filter(e=>relatedCase(e)===id).forEach(e=>{const li=el('li');li.append(el('strong',actions[e.action]+' · '+describe(e)+(e.action==='extend_loan'?'':' '+i.unit)),el('p','วันที่ '+date(e.date)+' · '+people(e)),el('p','บันทึกโดย '+e.actor.name+' เวลา '+stamp(e.recordedAt),'sub'));if(e.data.note)li.append(el('p',e.data.note));timeline.append(li);});d.append(timeline);showDialog('case-dialog');}
  // ล็อกฟอร์มขณะส่ง ตรวจ revision ป้องกันเขียนทับยอดใหม่ ใช้ requestId อ้างอิง และไม่ส่งซ้ำถ้าผลยังไม่แน่ชัด
  $('action-form').addEventListener('submit',async event=>{event.preventDefault();if(busy||!activeForm)return;busy=true;$('save-action').disabled=true;$('cancel-dialog').disabled=true;$('close-dialog').disabled=true;try{if(activeForm.revision!==state.revision)throw Error('REVISION_CONFLICT');const values={};activeForm.fields.forEach(f=>{const value=$('field-'+f.key).value;values[f.key]=f.type==='number'?Number(value):value;});const command={action:activeForm.action,...activeForm.context,...values,requestId:uid('REQ'),expectedRevision:state.revision};if(command.action==='create_item')command.itemId=uid('ITEM');Core.prepare(state,command,identity,{now:new Date().toISOString(),eventId:uid('VALIDATE')});const photos=Array.from($('inventory-photo').files);if(window.UnifiedApi.submissionStatus)window.UnifiedApi.submissionStatus('preparing','กำลังรับข้อมูล');const images=await HubFormPhoto.readMany(photos);const result=await client.submit(command,images);sync();closeDialog('form-dialog');message('บันทึกเข้าทะเบียนแล้ว: '+actions[result.event.action]+(result.refreshWarning?' · โหลดรายการล่าสุดอีกครั้งเพื่อดูข้อมูลครบถ้วน':''));}catch(error){$('form-error').textContent=errors[error.code||error.message]||'บันทึกไม่ได้ ('+(error.code||error.message)+')';if(window.UnifiedApi.submissionStatus)window.UnifiedApi.submissionStatus('blocked',$('form-error').textContent);if(client.uncertain){$('verify-receipt').hidden=false;$('form-error').textContent+=' ยังไม่ทราบผล ห้ามสร้างรายการซ้ำ ให้ปิดหน้าต่างและใช้ปุ่มตรวจสอบผลในทะเบียน';}}finally{busy=false;$('save-action').disabled=!!client.uncertain;$('cancel-dialog').disabled=false;$('close-dialog').disabled=false;}});
  ['close-dialog','cancel-dialog'].forEach(id=>$(id).addEventListener('click',()=>closeDialog('form-dialog')));$('close-case').addEventListener('click',()=>closeDialog('case-dialog'));
  $('form-dialog').addEventListener('close',()=>{activeForm=null;$('form-error').textContent='';});
  document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;render();}));$('search').addEventListener('input',render);$('case-filter').addEventListener('change',render);$('new-item').addEventListener('click',()=>openAction('create_item'));
  $('form-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  $('refresh-ledger').addEventListener('click',refresh);
  $('verify-receipt').addEventListener('click',async()=>{if(busy)return;busy=true;$('verify-receipt').disabled=true;try{const result=await client.verify();sync();message(result.confirmed?'ตรวจสอบแล้ว รายการบันทึกเข้าทะเบียนสำเร็จ':'ยังไม่พบผลยืนยันในทะเบียน ไม่มีการส่งข้อมูลซ้ำ',!result.confirmed);}catch(e){message('ตรวจสอบรายการไม่ได้: '+(errors[e.code||e.message]||e.message),true);$('verify-receipt').hidden=!client.uncertain;}finally{busy=false;$('verify-receipt').disabled=false;}});
  window.addEventListener('message',event=>{if(event.source===window.parent&&event.origin===location.origin&&event.data&&event.data.type==='HUB_ACTIVATE')refresh();});
  if(window.parent!==window)window.parent.postMessage({type:'hub:ready'},location.origin);
  render();refresh();
})();
