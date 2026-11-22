/* PA reports use curated roster and topics through the existing Apps Script relay; names are self-reported. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id), form=$('pa-work-form'), gate=$('pa-work-fields');
  const status=$('pa-work-status'), staff=$('pa-work-identity'), assignment=$('pa-work-assignment'),
    date=$('pa-work-date'), note=$('pa-work-description'), photos=$('pa-work-photos'), peerList=$('pa-work-peer-list'), peerBox=$('pa-work-collaborators');
  if(!form||!gate||!status||!staff||!assignment||!date||!note||!photos||!peerList||!peerBox)return;
  const dateFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'});
  function resetWorkDate(){
    const parts=Object.fromEntries(dateFormatter.formatToParts(new Date()).map(({type,value})=>[type,value]));
    date.value=parts.year+'-'+parts.month+'-'+parts.day;
  }
  function resetDraft(){form.reset();resetWorkDate();}
  resetWorkDate();
  form.addEventListener('submit',event=>event.preventDefault());
  const onRoute=()=>location.hash==='#pa-work-report';
  const getReporter=()=>{
    try{
      const value=window.HubSelectedProfile?.get?.()?.name;
      return typeof value==='string'?value.normalize('NFC').trim().replace(/\s+/gu,' ').slice(0,160):'';
    }catch(_){return '';}
  };
  function showReporter(verified){
    const value=verified||getReporter();
    staff.hidden=!value;
    staff.textContent=value?'ผู้รายงาน: '+value:'';
  }
  const refreshReporter=()=>showReporter();
  if(window.HubConfig?.paReportEnabled!==true||!window.isSecureContext||!crypto.randomUUID||!window.UnifiedApi?.request){
    window.addEventListener('hashchange',refreshReporter);
    window.addEventListener('mu:profile-changed',refreshReporter);
    refreshReporter();
    return;
  }
  const key=/^[A-Za-z0-9_-]{1,64}$/;
  let choices=new Map(),peers=new Map(),employeeKey='',endpoint='',generation=0,pending=false,requestId='';
  const forget=()=>{requestId='';};
  function reset(){
    generation++;pending=false;forget();employeeKey='';endpoint='';choices.clear();peers.clear();peerList.replaceChildren();peerBox.hidden=true;
    gate.disabled=true;showReporter();resetDraft();
    assignment.replaceChildren(new Option('เลือกงาน',''));
  }
  const normalize=value=>String(value).normalize('NFC').trim().toLocaleLowerCase('th')
    .replace(/^[0-9๐-๙]+(?:\.[0-9๐-๙]+)+\.?\s+/u,'').replace(/\s+/gu,' ');
  const isAssignedWork=label=>normalize(label).replace(/^[0-9๐-๙]+\.\s+/u,'')
    .replace(/\s*\([0-9๐-๙]+(?:\.[0-9๐-๙]+)?%?\)\s*$/u,'').trim()==='งานที่ได้รับมอบหมาย';
  function automaticPeerTopic(authorLabel,assignments){
    const normalized=authorLabel&&normalize(authorLabel);
    if(!normalized)return '';
    const matching=assignments.filter(x=>normalize(x.label)===normalized);
    if(matching.length)return matching.length===1?matching[0].key:'';
    const fallback=assignments.filter(x=>isAssignedWork(x.label));
    return fallback.length===1?fallback[0].key:'';
  }
  function verifiedTopics(list){
    if(!Array.isArray(list)||list.length>100)return false;
    const seen=new Set();
    return list.every(x=>{
      if(typeof x?.key!=='string'||!key.test(x.key)||seen.has(x.key)||typeof x.label!=='string'||!x.label.trim()||x.label.length>180)return false;
      seen.add(x.key);return true;
    });
  }
  function employeeTitle(data){
    if(data?.ok!==true||data.version!==1||typeof data.staff?.key!=='string'||!key.test(data.staff.key)||typeof data?.staff?.displayName!=='string'||!data.staff.displayName.trim()||
       data.staff.displayName.length>160||
       !verifiedTopics(data.assignments)||!Array.isArray(data.peers)||data.peers.length>80)return false;
    const seen=new Set();
    return data.peers.every(x=>{
      if(typeof x?.key!=='string'||!key.test(x.key)||seen.has(x.key)||data.staff.key===x.key||
        typeof x.name!=='string'||!x.name.trim()||x.name.length>160||!verifiedTopics(x.assignments)||!x.assignments.length)return false;
      seen.add(x.key);return true;
    });
  }
  function updatePeerTopics(peer,allowAuto){
    if(!peer.check.checked){peer.topic.hidden=true;peer.topic.disabled=true;peer.topic.required=false;peer.topic.value='';return;}
    peer.topic.hidden=false;peer.topic.disabled=false;peer.topic.required=true;
    if(allowAuto){
      peer.topic.value=automaticPeerTopic(choices.get(assignment.value),peer.assignments);
    }
  }
  function addPeer(data){
    const row=document.createElement('div');row.className='pa-work-peer';
    const label=document.createElement('label'),check=document.createElement('input'),name=document.createElement('span');
    check.type='checkbox';name.textContent=data.name;label.append(check,name);
    const topic=document.createElement('select');topic.setAttribute('aria-label','หัวข้อ PA ของ '+data.name);
    topic.add(new Option('เลือกหัวข้อ PA ของผู้ร่วมงาน',''));
    for(const x of data.assignments)topic.add(new Option(x.label,x.key));
    const peer={...data,check,topic};
    check.addEventListener('change',()=>updatePeerTopics(peer,true));
    updatePeerTopics(peer,true);row.append(label,topic);peerList.append(row);peers.set(data.key,peer);
  }
  assignment.addEventListener('change',()=>{for(const peer of peers.values())updatePeerTopics(peer,true);});
  let activeReporter='';
  async function enter(event){
    const selectedName=getReporter();
    if(event?.type==='mu:profile-changed'&&onRoute()&&activeReporter===selectedName&&(!gate.disabled||pending))return;
    activeReporter=onRoute()?selectedName:'';
    reset();
    if(!onRoute()||!selectedName)return;
    const turn=generation;status.textContent='กำลังอ่านหัวข้อ PA ตามชื่อที่เลือกในแอป';
    try{
      const selectedEndpoint=window.UnifiedApi.endpoint();
      const data=await window.UnifiedApi.request({action:'paWorkReportOptions',selectedName},selectedEndpoint);
      if(turn!==generation||!onRoute()||getReporter()!==selectedName)return;
      if(!employeeTitle(data)||data.staff.displayName.normalize('NFC').trim().replace(/\s+/gu,' ')!==selectedName)throw Error('roster');
      if(!data.assignments.length){status.textContent='ยังไม่มีหัวข้อ PA ที่ใช้บันทึกได้สำหรับชื่อนี้';return;}
      employeeKey=data.staff.key;endpoint=selectedEndpoint;showReporter(data.staff.displayName);
      for(const x of data.assignments){choices.set(x.key,x.label);assignment.add(new Option(x.label,x.key));}
      for(const p of data.peers)addPeer(p);peerBox.hidden=!data.peers.length;
      gate.disabled=false;status.textContent='ใช้ชื่อที่เลือกในแอปเป็นชื่อผู้รายงาน';
     }catch(error){
      if(turn!==generation||!onRoute())return;
      status.textContent=error?.code==='PA_WORK_UNAVAILABLE'
        ?'ปลายทาง Apps Script ยังไม่ได้เปิดระบบรายงาน PA หรือยังไม่มีข้อมูลรายชื่อที่พร้อมใช้'
        :error?.code==='CONNECT_TIMEOUT'
          ?'ยังติดต่อ Apps Script ไม่สำเร็จ กรุณาตรวจลิงก์ที่ดีพลอยและรีเฟรชหน้า'
          :'ยังเปิดรายการหัวข้อ PA สำหรับชื่อนี้ไม่ได้ จึงยังส่งรายงานไม่ได้';
    }
  }
  function encodePhoto(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(Error('photo'));
      reader.onload=()=>{
        const prefix='data:'+file.type+';base64,', value=reader.result;
        if(typeof value!=='string'||!value.startsWith(prefix))return reject(Error('photo'));
        const data=value.slice(prefix.length);
        if(!data||data.length>4000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(data))return reject(Error('photo'));
        resolve({mimeType:file.type,data});
      };
      reader.readAsDataURL(file);
    });
  }
  form.addEventListener('input',forget);
  form.addEventListener('change',forget);
  form.addEventListener('submit',async()=>{
    if(!onRoute()||gate.disabled||pending||!employeeKey||!endpoint)return;
    if(!form.reportValidity()||!choices.has(assignment.value))return;
    const day=date.value,description=note.value.trim(), files=Array.from(photos.files||[]);
    const actual=new Date(day+'T00:00:00Z');
    if(!/^20\d{2}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(actual.getTime())||actual.toISOString().slice(0,10)!==day||!description||description.length>1500){status.textContent='กรอกวันที่และรายละเอียดงานให้ครบ';return;}
    if(!files.length||files.length>3||files.some(f=>!['image/jpeg','image/png'].includes(f.type)||f.size<1||f.size>3000000)||files.reduce((n,f)=>n+f.size,0)>6000000){status.textContent='แนบรูป JPG หรือ PNG 1–3 รูป ขนาดรูปละไม่เกิน 3 MB และรวมไม่เกิน 6 MB';return;}
    const collaborators=[...peers.values()].filter(p=>p.check.checked).map(p=>({employeeKey:p.key,assignmentKey:p.topic.value}));
    if(collaborators.length>10||collaborators.some(p=>!peers.get(p.employeeKey).assignments.some(a=>a.key===p.assignmentKey))){status.textContent='เลือกหัวข้อ PA ให้ผู้ร่วมงานแต่ละคน (ไม่เกิน 10 คน)';return;}
    requestId ||= crypto.randomUUID();
    const turn=generation, selectedName=getReporter(), authorAssignmentKey=assignment.value, activeEmployee=employeeKey,
      selectedEndpoint=endpoint, clientRequestId=requestId;
    pending=true;gate.disabled=true;status.textContent='กำลังส่งรายงาน';
    try{
      const attached=await Promise.all(files.map(encodePhoto));
      if(turn!==generation||!onRoute()||getReporter()!==selectedName)return;
      const ack=await window.UnifiedApi.request({action:'paWorkReportSubmit',employeeKey:activeEmployee,workDate:day,authorAssignmentKey,
        description,photos:attached,collaborators,clientRequestId},selectedEndpoint);
      if(turn!==generation)return;
      if(ack?.ok!==true||ack.requestId!==clientRequestId||typeof ack.reportId!=='string'||!/^pa_[a-f0-9]{64}$/.test(ack.reportId)||typeof ack.duplicate!=='boolean')throw Error('receipt');
      resetDraft();for(const peer of peers.values())updatePeerTopics(peer,false);forget();status.textContent='บันทึกรายงานแล้ว';
    }catch(_){if(turn===generation)status.textContent='ยังยืนยันผลไม่ได้ หากส่งอีกครั้งโดยไม่แก้ข้อมูล ระบบจะใช้รหัสคำขอเดิม';}
    finally{if(turn===generation){pending=false;gate.disabled=false;}}
  });
  window.addEventListener('hashchange',enter);
  window.addEventListener('mu:profile-changed',enter);
  if(onRoute())enter();
})();