/* แกนคำนวณคลังแบบเหตุการณ์: สร้างสถานะปัจจุบันจากลำดับ ledger และตรวจข้อจำกัดคำสั่ง
 * ไม่มีการติดต่อเซิร์ฟเวอร์ในไฟล์นี้ การอนุญาตผู้ใช้และการเขียนจริงต้องตรวจซ้ำที่ backend */
/* Canonical inventory rules. No network, storage, DOM or trusted client identity. */
(function (root) {
  'use strict';
  var MAX = 1000000000;
  var ACTIONS = ['create_item','receive','issue','loan','receive_return','inspect_return','repair','retire','adjust','count_stock','reconcile_count','extend_loan'];
  var ADMIN = ['create_item','repair','retire','adjust','reconcile_count','extend_loan'];
  function fail(code) { var e = new Error(code); e.code = code; throw e; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  // ตรวจข้อความและจำกัดความยาวตามแต่ละช่องก่อนสร้างเหตุการณ์คลัง
  function text(value, max, optional) {
    if (optional && (value === undefined || value === null || value === '')) return '';
    if (typeof value !== 'string') fail('INVALID_TEXT');
    var s = value.trim();
    if ((!optional && !s) || s.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(s)) fail('INVALID_TEXT');
    return s;
  }
  // ตรวจรูปแบบรหัสและปฏิเสธชื่อที่ชน Object.prototype
  function id(value) { if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{7,99}$/.test(value) || Object.prototype.hasOwnProperty.call(Object.prototype,value)) fail('INVALID_ID'); return value; }
  // ยอมรับจำนวนเต็มปลอดภัยในขอบเขต เพื่อไม่เกิดสต็อกเศษหรือค่าล้น
  function qty(value, zero) { if (!Number.isSafeInteger(value) || value < (zero ? 0 : 1) || value > MAX) fail('INVALID_QUANTITY'); return value; }
  // ตรวจวันที่รูปแบบ ISO และวันที่ปฏิทินจริง ไม่ยอมให้ JavaScript เลื่อนวันผิดเป็นวันใหม่
  function date(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value+'T00:00:00Z')) || new Date(value+'T00:00:00Z').toISOString().slice(0,10) !== value || value < '2000-01-01') fail('INVALID_DATE');
    return value;
  }
  // คิดวันปัจจุบันตาม UTC+7 สำหรับตรวจวันที่ทำรายการ
  function today(now) { return new Date(new Date(now).getTime()+7*3600000).toISOString().slice(0,10); }
  // สร้างสถานะคลังเริ่มต้นในหน่วยความจำ ไม่สร้างชีตหรือไฟล์
  function empty() { return {version:1,revision:0,items:{},cases:{},returns:{},counts:{},eventIds:{},requestIds:{}}; }
  // แยกค้างคืน คืนบางส่วน รอตรวจ และปิดงานจากยอดจริง
  function caseStatus(c) { return c.outstanding > 0 ? (c.received > 0 ? 'partial' : 'open') : c.pendingInspection > 0 ? 'inspection' : 'closed'; }
  // ตรวจคำสั่งแต่ละชนิดกับสถานะปัจจุบัน เช่นจำนวนคงเหลือ เลขประจำซ้ำ และวันทำรายการ
  function normalize(state, c) {
    var d = {note:text(c.note,1000,true)}, item, loan, ret, count;
    if (c.action === 'create_item') {
      if (state.items[c.itemId]) fail('ITEM_EXISTS');
      if (!['consumable','returnable'].includes(c.kind)) fail('INVALID_KIND');
      d.name=text(c.name,120); d.code=text(c.code,40); d.unit=text(c.unit,30); d.location=text(c.location,120,true); d.kind=c.kind;
      if (Object.keys(state.items).some(function(k){return state.items[k].code.toLowerCase() === d.code.toLowerCase();})) fail('DUPLICATE_ITEM_CODE');
      d.category=text(c.category,80,true); d.custodian=text(c.custodian,120,true); d.model=text(c.model,120,true); d.serial=text(c.serial,120,true);
      if (d.serial && (d.kind!=='returnable' || c.quantity!==1)) fail('SERIAL_REQUIRES_SINGLE_ASSET');
      if (d.serial && Object.keys(state.items).some(function(k){return (state.items[k].serial||'').toLowerCase()===d.serial.toLowerCase();})) fail('DUPLICATE_SERIAL');
      d.quantity=qty(c.quantity,true); d.minimum=qty(c.minimum === undefined ? 0 : c.minimum,true);
      return d;
    }
    item=state.items[c.itemId]; if (!item) fail('ITEM_NOT_FOUND');
    if (c.date < item.createdDate) fail('DATE_BEFORE_ITEM');
    if (['receive','issue','loan','receive_return','repair','retire'].includes(c.action)) d.quantity=qty(c.quantity);
    if (c.action === 'receive') { if (item.serial) fail('SERIAL_ASSET_FIXED_QUANTITY'); d.reference=text(c.reference,120,true); }
    if (c.action === 'issue' || c.action === 'loan') {
      if (item.kind !== (c.action === 'issue' ? 'consumable' : 'returnable')) fail('ITEM_KIND_MISMATCH');
      if (d.quantity > item.available) fail('INSUFFICIENT_STOCK');
      d.borrower=text(c.borrower,120); d.issuer=text(c.issuer,120); d.conditionOut=text(c.conditionOut,500,true); if (c.action==='loan' && !d.conditionOut) fail('CONDITION_REQUIRED'); d.department=text(c.department,120,true); d.purpose=text(c.purpose,500);
      d.dueDate=c.dueDate ? date(c.dueDate) : '';
      if (c.action === 'issue' && d.dueDate) fail('INVALID_DUE_DATE');
      if (d.dueDate && d.dueDate < c.date) fail('INVALID_DUE_DATE');
    }
    if (c.action === 'receive_return') {
      d.caseId=id(c.caseId); loan=state.cases[d.caseId];
      if (!loan || loan.itemId !== c.itemId) fail('CASE_NOT_FOUND');
      if (d.quantity > loan.outstanding) fail('EXCESS_RETURN');
      if (c.date < loan.date) fail('DATE_BEFORE_LOAN');
      d.returner=text(c.returner,120);
    }
    if (c.action === 'inspect_return') {
      d.returnId=id(c.returnId); ret=state.returns[d.returnId];
      if (!ret || ret.itemId !== c.itemId) fail('RETURN_NOT_FOUND');
      if (ret.inspected) fail('ALREADY_INSPECTED');
      if (c.date < ret.date) fail('DATE_BEFORE_RETURN');
      d.goodQty=qty(c.goodQty,true); d.damagedQty=qty(c.damagedQty,true);
      if (d.goodQty+d.damagedQty !== ret.quantity) fail('INSPECTION_TOTAL_MISMATCH');
      d.inspector=text(c.inspector,120);
      if (d.damagedQty > 0 && !d.note) fail('DAMAGE_NOTE_REQUIRED');
    }
    if (c.action === 'repair' || c.action === 'retire') {
      if (d.quantity > item.damaged) fail('INSUFFICIENT_DAMAGED');
      if (!d.note) fail('REASON_REQUIRED');
    }
    if (c.action === 'adjust') {
      if (!Number.isSafeInteger(c.delta) || c.delta === 0 || Math.abs(c.delta)>MAX) fail('INVALID_QUANTITY');
      d.delta=c.delta; if (item.serial) fail('SERIAL_ASSET_FIXED_QUANTITY'); if (item.available+d.delta<0) fail('INSUFFICIENT_STOCK');
      if (!d.note) fail('REASON_REQUIRED');
    }
    if (c.action === 'count_stock') {
      d.countedQty=qty(c.countedQty,true); d.counter=text(c.counter,120); d.expectedQty=item.available; d.balanceRevision=item.balanceRevision;
    }
    if (c.action === 'reconcile_count') {
      d.countId=id(c.countId); count=state.counts[d.countId];
      if (!count || count.itemId!==c.itemId) fail('COUNT_NOT_FOUND');
      if (count.status!=='review') fail('COUNT_NOT_OPEN');
      if (count.balanceRevision!==item.balanceRevision) fail('STALE_COUNT');
      if (c.date<count.date) fail('DATE_BEFORE_COUNT');
      if (item.serial) fail('SERIAL_ASSET_FIXED_QUANTITY');
      d.delta=count.countedQty-count.expectedQty; d.reviewer=text(c.reviewer,120);
      if (!d.note) fail('REASON_REQUIRED');
    }
    if (c.action === 'extend_loan') {
      d.caseId=id(c.caseId); loan=state.cases[d.caseId];
      if (!loan || loan.itemId!==c.itemId) fail('CASE_NOT_FOUND');
      if (!loan.outstanding) fail('CASE_NOT_OUTSTANDING');
      if (c.date<loan.date) fail('DATE_BEFORE_LOAN');
      d.dueDate=date(c.dueDate); if (d.dueDate<c.date || (loan.dueDate && d.dueDate<=loan.dueDate)) fail('INVALID_DUE_DATE');
      d.previousDueDate=loan.dueDate; if (!d.note) fail('REASON_REQUIRED');
    }
    return d;
  }
  // นำเหตุการณ์ที่ตรวจแล้วมาปรับสถานะคลังในหน่วยความจำ
  function advance(state,e) {
    var s=clone(state), d=e.data, i=s.items[e.itemId], c, r;
    if (e.action === 'create_item') {
      i=s.items[e.itemId]={id:e.itemId,code:d.code,name:d.name,unit:d.unit,location:d.location,kind:d.kind,category:d.category,custodian:d.custodian,model:d.model,serial:d.serial,minimum:d.minimum,createdDate:e.date,available:d.quantity,loaned:0,pendingInspection:0,damaged:0,issued:0,retired:0,totalIn:d.quantity,adjustment:0,balanceRevision:e.revision};
    } else if (e.action === 'receive') { i.available+=d.quantity; i.totalIn+=d.quantity; }
    else if (e.action === 'issue') { i.available-=d.quantity; i.issued+=d.quantity; }
    else if (e.action === 'loan') {
      i.available-=d.quantity; i.loaned+=d.quantity;
      s.cases[e.id]={id:e.id,itemId:e.itemId,borrower:d.borrower,issuer:d.issuer,conditionOut:d.conditionOut,department:d.department,purpose:d.purpose,date:e.date,dueDate:d.dueDate,quantity:d.quantity,outstanding:d.quantity,received:0,pendingInspection:0,good:0,damaged:0,recorder:clone(e.actor),status:'open'};
    } else if (e.action === 'receive_return') {
      c=s.cases[d.caseId]; c.outstanding-=d.quantity; c.received+=d.quantity; c.pendingInspection+=d.quantity;
      i.loaned-=d.quantity; i.pendingInspection+=d.quantity;
      s.returns[e.id]={id:e.id,caseId:d.caseId,itemId:e.itemId,quantity:d.quantity,returner:d.returner,date:e.date,note:d.note,recorder:clone(e.actor),inspected:false}; c.status=caseStatus(c);
    } else if (e.action === 'inspect_return') {
      r=s.returns[d.returnId]; c=s.cases[r.caseId]; r.inspected=true; r.inspector=d.inspector; r.inspectionDate=e.date; r.inspectionRecorder=clone(e.actor); r.goodQty=d.goodQty; r.damagedQty=d.damagedQty; r.inspectionNote=d.note;
      c.pendingInspection-=r.quantity; c.good+=d.goodQty; c.damaged+=d.damagedQty;
      i.pendingInspection-=r.quantity; i.available+=d.goodQty; i.damaged+=d.damagedQty; c.status=caseStatus(c);
    } else if (e.action === 'repair') { i.damaged-=d.quantity; i.available+=d.quantity; }
    else if (e.action === 'retire') { i.damaged-=d.quantity; i.retired+=d.quantity; }
    else if (e.action === 'adjust') { i.available+=d.delta; i.adjustment+=d.delta; }
    else if (e.action === 'count_stock') { s.counts[e.id]={id:e.id,itemId:e.itemId,date:e.date,counter:d.counter,expectedQty:d.expectedQty,countedQty:d.countedQty,variance:d.countedQty-d.expectedQty,balanceRevision:d.balanceRevision,status:d.expectedQty===d.countedQty?'matched':'review',recorder:clone(e.actor),note:d.note}; }
    else if (e.action === 'reconcile_count') { var count=s.counts[d.countId]; i.available+=d.delta; i.adjustment+=d.delta; count.status='resolved'; count.reviewer=d.reviewer; count.reviewDate=e.date; count.reviewRecorder=clone(e.actor); count.reason=d.note; }
    else if (e.action === 'extend_loan') { s.cases[d.caseId].dueDate=d.dueDate; }
    if (!['count_stock','extend_loan'].includes(e.action)) i.balanceRevision=e.revision;
    ['available','loaned','pendingInspection','damaged','issued','retired','totalIn'].forEach(function(k){if(!Number.isSafeInteger(i[k])||i[k]<0||i[k]>MAX)fail('STOCK_LIMIT');});
    if (i.totalIn+i.adjustment !== i.available+i.loaned+i.pendingInspection+i.damaged+i.issued+i.retired) fail('STOCK_INVARIANT');
    s.revision=e.revision; s.eventIds[e.id]=true; s.requestIds[e.requestId]=true; return s;
  }
  // ตรวจตัวตน revision และคำสั่งก่อนสร้างเหตุการณ์ใหม่ ไม่เขียนชีตในฟังก์ชันนี้
  function prepare(state,command,actor,context) {
    if (!state || state.version !== 1 || !command || !actor || !context) fail('INVALID_REQUEST');
    var c=clone(command), a={id:text(actor.id,254),name:text(actor.name,120),role:actor.role};
    if (!ACTIONS.includes(c.action)) fail('INVALID_ACTION');
    if (!['operator','admin'].includes(a.role) || (ADMIN.includes(c.action) && a.role !== 'admin')) fail('FORBIDDEN');
    if (!Number.isSafeInteger(c.expectedRevision) || c.expectedRevision !== state.revision) fail('REVISION_CONFLICT');
    id(c.requestId); id(c.itemId); id(context.eventId);
    if (state.requestIds[c.requestId]) fail('DUPLICATE_REQUEST');
    if (state.eventIds[context.eventId]) fail('DUPLICATE_EVENT');
    if (typeof context.now !== 'string' || !Number.isFinite(Date.parse(context.now)) || new Date(context.now).toISOString() !== context.now) fail('INVALID_TIMESTAMP');
    c.date=date(c.date); if (c.date>today(context.now)) fail('FUTURE_DATE');
    var e={version:1,id:context.eventId,requestId:c.requestId,revision:state.revision+1,action:c.action,itemId:c.itemId,date:c.date,actor:a,recordedAt:context.now,data:normalize(state,c)};
    advance(state,e); return e;
  }
  // สร้างสถานะจาก ledger ตามลำดับ พร้อมตรวจเหตุการณ์ซ้ำ/ความต่อเนื่อง
  function replay(events, beforeEvent) {
    if (!Array.isArray(events) || events.length>50000) fail('INVALID_LEDGER');
    var s=empty();
    events.forEach(function(e,index){
      if (!e || e.version!==1 || e.revision!==s.revision+1 || !e.data || typeof e.data!=='object') fail('INVALID_LEDGER');
      if (beforeEvent) beforeEvent(clone(s),clone(e),index);
      var cmd=Object.assign({},e.data,{requestId:e.requestId,expectedRevision:s.revision,action:e.action,itemId:e.itemId,date:e.date});
      var rebuilt=prepare(s,cmd,e.actor,{now:e.recordedAt,eventId:e.id});
      if (stable(rebuilt)!==stable(e)) fail('INVALID_LEDGER');
      s=advance(s,rebuilt);
    }); return s;
  }
  // เรียงคีย์เพื่อสร้างรูปแบบข้อความคงที่สำหรับตรวจข้อมูลเหมือนกัน
  function stable(o) {
    if (o===null || typeof o!=='object') return JSON.stringify(o);
    if (Array.isArray(o)) return '['+o.map(stable).join(',')+']';
    return '{'+Object.keys(o).sort().map(function(k){return JSON.stringify(k)+':'+stable(o[k]);}).join(',')+'}';
  }
  var api=Object.freeze({empty:empty,prepare:prepare,replay:replay,caseStatus:caseStatus,today:today,stable:stable,actions:Object.freeze(ACTIONS)});
  root.HubInventory=api;
  if (typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof window === 'undefined' ? globalThis : window);
