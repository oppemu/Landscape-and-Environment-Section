/* PA reports use curated roster and topics through the existing Apps Script relay; names are self-reported. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id), form=$('pa-work-form'), gate=$('pa-work-fields');
  const status=$('pa-work-status'), staff=$('pa-work-identity'), assignment=$('pa-work-assignment'),
    date=$('pa-work-date'), note=$('pa-work-description'), photos=$('pa-work-photos'), peerList=$('pa-work-peer-list'), peerBox=$('pa-work-collaborators');
  if(!form||!gate||!status||!staff||!assignment||!date||!note||!photos||!peerList||!peerBox)return;
  const send=$('pa-work-send')||form.querySelector('button[type="submit"]');
  if(!send)return;
  let feedback=$('pa-work-send-status');
  // A phone may still have the previous HTML during a static rollout or in an open tab.
  if(!feedback){
    const actions=document.createElement('div');actions.id='pa-work-actions';
    feedback=document.createElement('p');feedback.id='pa-work-send-status';
    feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');feedback.setAttribute('aria-atomic','true');
    send.id='pa-work-send';send.setAttribute('aria-describedby',feedback.id);
    actions.append(feedback,send);form.append(actions);
  }
  form.noValidate=true;
  // iPhone Photos may supply HEIC even for a camera photo. Decode it locally if supported.
  photos.accept='image/jpeg,image/png,image/heic,image/heif,.heic,.heif';
  send.disabled=false;
  function message(text,state='info'){
    feedback.dataset.state=state;
    feedback.textContent=text;
  }
  function connection(text){
    status.textContent=text;
    message(text);
  }
  const cryptoApi=window.crypto;
  function nextRequestId(){
    if(typeof cryptoApi.randomUUID==='function')return cryptoApi.randomUUID();
    // Older mobile browsers can still generate a secure RFC 4122 v4 identifier.
    const a=cryptoApi.getRandomValues(new Uint8Array(16));
    a[6]=(a[6]&15)|64;a[8]=(a[8]&63)|128;
    const hex=Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');
    return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
  }
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
  if(window.HubConfig?.paReportEnabled!==true||!window.isSecureContext||typeof cryptoApi?.getRandomValues!=='function'||!window.UnifiedApi?.request){
    const reason=window.HubConfig?.paReportEnabled!==true
      ?'ระบบยังไม่ได้เปิดรับรายงานการปฏิบัติงาน'
      :'เปิดแอปผ่านลิงก์ HTTPS ใน Safari หรือ Chrome แล้วลองอีกครั้ง';
    connection(reason);
    form.addEventListener('submit',()=>message(reason,'error'));
    window.addEventListener('hashchange',refreshReporter);
    window.addEventListener('mu:profile-changed',refreshReporter);
    refreshReporter();
    return;
  }
  const key=/^[A-Za-z0-9_-]{1,64}$/;
  let choices=new Map(),peers=new Map(),employeeKey='',endpoint='',generation=0,pending=false,requestId='',prepared=null;
  const forget=()=>{requestId='';prepared=null;};
  function reset(){
    generation++;pending=false;send.disabled=false;forget();employeeKey='';endpoint='';choices.clear();peers.clear();peerList.replaceChildren();peerBox.hidden=true;
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
    if(!onRoute())return;
    if(!selectedName){connection('กรุณาเลือกชื่อผู้รายงานในแอปก่อนส่ง');return;}
    const turn=generation;connection('กำลังอ่านหัวข้อ PA ตามชื่อที่เลือกในแอป…');
    try{
      const selectedEndpoint=window.UnifiedApi.endpoint();
      const data=await window.UnifiedApi.request({action:'paWorkReportOptions',selectedName},selectedEndpoint);
      if(turn!==generation||!onRoute()||getReporter()!==selectedName)return;
      if(!employeeTitle(data)||data.staff.displayName.normalize('NFC').trim().replace(/\s+/gu,' ')!==selectedName)throw Error('roster');
      if(!data.assignments.length){connection('ยังไม่มีหัวข้อ PA ที่ใช้บันทึกได้สำหรับชื่อนี้');return;}
      employeeKey=data.staff.key;endpoint=selectedEndpoint;showReporter(data.staff.displayName);
      for(const x of data.assignments){choices.set(x.key,x.label);assignment.add(new Option(x.label,x.key));}
      for(const p of data.peers)addPeer(p);peerBox.hidden=!data.peers.length;
      gate.disabled=false;status.textContent='ใช้ชื่อที่เลือกในแอปเป็นชื่อผู้รายงาน';message('');
     }catch(error){
      if(turn!==generation||!onRoute())return;
      connection(error?.code==='PA_WORK_UNAVAILABLE'
        ?'ปลายทาง Apps Script ยังไม่ได้เปิดระบบรายงาน PA หรือยังไม่มีข้อมูลรายชื่อที่พร้อมใช้'
        :error?.code==='CONNECT_TIMEOUT'
          ?'ยังติดต่อ Apps Script ไม่สำเร็จ กรุณาตรวจลิงก์ที่ดีพลอยและรีเฟรชหน้า'
          :'ยังเปิดรายการหัวข้อ PA สำหรับชื่อนี้ไม่ได้ จึงยังส่งรายงานไม่ได้');
    }
  }
  const MAX_INPUT=25000000, MAX_PART=3000000, SAFE_PART=1900000;
  const failPhoto=code=>Object.assign(Error(code),{photoCode:code});
  function readPhoto(blob,asUrl){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader(), finish=(fn,value)=>{
        clearTimeout(timer);reader.onload=reader.onerror=reader.onabort=null;fn(value);
      };
      const timer=setTimeout(()=>{finish(reject,failPhoto('read'));try{reader.abort();}catch(_){}},12000);
      reader.onerror=reader.onabort=()=>finish(reject,failPhoto('read'));
      reader.onload=()=>finish(resolve,reader.result);
      try{if(asUrl)reader.readAsDataURL(blob);else reader.readAsArrayBuffer(blob);}
      catch(_){finish(reject,failPhoto('read'));}
    });
  }
  async function encodeAccepted(blob,mimeType){
    const result=await readPhoto(blob,true);
    const match=typeof result==='string'&&/^data:[^,]*;base64,([A-Za-z0-9+/]+={0,2})$/.exec(result);
    const data=match&&match[1];
    if(!data||data.length>4000000||
      (mimeType==='image/png'?!data.startsWith('iVBORw0KGgo'):!data.startsWith('/9j/')))throw failPhoto('read');
    return {mimeType,data};
  }
  async function detectPhoto(file){
    const bytes=new Uint8Array(await readPhoto(file.slice(0,64),false));
    if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';
    if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
    const ascii=i=>String.fromCharCode(...bytes.subarray(i,i+4));
    const brands=['heic','heix','hevc','hevx','heim','heis','hevm','hevs','mif1','msf1'];
    if(ascii(4)==='ftyp'&&Array.from({length:Math.floor((bytes.length-8)/4)},(_,i)=>8+4*i)
      .some(i=>i!==12&&brands.includes(ascii(i))))return 'image/heic';
    throw failPhoto('type');
  }
  async function openPhoto(file,type){
    const payload=file.type===type?file:new Blob([file],{type});
    const url=URL.createObjectURL(payload), image=new Image();
    try{
      await new Promise((resolve,reject)=>{
        const finish=(fn)=>{clearTimeout(timer);image.onload=image.onerror=null;fn();};
        const failure=()=>reject(failPhoto(type==='image/heic'?'heic':'read'));
        const timer=setTimeout(()=>finish(failure),12000);
        image.onload=()=>finish(resolve);image.onerror=()=>finish(failure);
        image.src=url;
      });
      return {image,dispose:()=>URL.revokeObjectURL(url)};
    }catch(error){URL.revokeObjectURL(url);throw error;}
  }
  function canvasJpeg(canvas,quality){
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(failPhoto('read')),10000);
      try{
        canvas.toBlob(blob=>{
          clearTimeout(timer);
          if(!blob||blob.type!=='image/jpeg')reject(failPhoto('read'));else resolve(blob);
        },'image/jpeg',quality);
      }catch(_){clearTimeout(timer);reject(failPhoto('read'));}
    });
  }
  async function resizePhoto(file,type){
    const decoded=await openPhoto(file,type), canvas=document.createElement('canvas');
    try{
      const {image}=decoded,w=image.naturalWidth,h=image.naturalHeight;
      if(!w||!h||w*h>65000000)throw failPhoto('dimensions');
      const context=canvas.getContext('2d',{alpha:false});
      if(!context)throw failPhoto('read');
      for(const [edge,quality] of [[1920,.84],[1600,.76],[1280,.72]]){
        const scale=Math.min(1,edge/Math.max(w,h));
        canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
        context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
        context.drawImage(image,0,0,canvas.width,canvas.height);
        const output=await canvasJpeg(canvas,quality);
        if(output.size<=SAFE_PART)return await encodeAccepted(output,'image/jpeg');
      }
      throw failPhoto('dimensions');
    }finally{canvas.width=1;canvas.height=1;decoded.dispose();}
  }
  async function encodePhoto(file,normalize){
    const type=await detectPhoto(file);
    if(file.type&&file.type!==type&&!(type==='image/heic'&&/^image\/hei[cf](?:-sequence)?$/.test(file.type)))throw failPhoto('type');
    if(type==='image/heic'||file.size>MAX_PART||(normalize&&file.size>SAFE_PART))return resizePhoto(file,type);
    return encodeAccepted(file,type);
  }
  async function encodePhotos(files){
    const normalize=files.reduce((n,f)=>n+f.size,0)>6000000;
    const out=[];
    // Only one decoded camera image in memory at a time on mobile.
    for(const file of files)out.push(await encodePhoto(file,normalize));
    return out;
  }
  function photoError(error){
    if(error?.photoCode==='heic')return 'เครื่องนี้อ่านรูป HEIC ไม่ได้ กรุณาเลือก JPEG/PNG หรือเปลี่ยนกล้องเป็น “เข้ากันได้มากที่สุด” แล้วถ่ายใหม่';
    if(error?.photoCode==='type')return 'ไฟล์นี้ไม่ใช่รูป JPG, PNG หรือ HEIC ที่รองรับ กรุณาเลือกภาพใหม่';
    if(error?.photoCode==='dimensions')return 'รูปนี้มีความละเอียดสูงเกินไป กรุณาแนบภาพที่เล็กลง';
    return 'ยังไม่ได้ส่งรายงาน เพราะอ่านรูปไม่ได้ กรุณาแนบรูปใหม่แล้วลองอีกครั้ง';
  }
  form.addEventListener('input',forget);
  form.addEventListener('change',forget);
  form.addEventListener('submit',async()=>{
    if(!onRoute()||pending)return;
    if(gate.disabled||!employeeKey||!endpoint){message(status.textContent||'ยังส่งรายงานไม่ได้ กรุณาเลือกชื่อผู้รายงานก่อน','error');return;}
    if(!choices.has(assignment.value)){message('กรุณาเลือกงานตามที่ได้รับมอบหมายก่อนส่ง','error');return;}
    const day=date.value,description=note.value.trim(), files=Array.from(photos.files||[]);
    const actual=new Date(day+'T00:00:00Z');
    if(!/^20\d{2}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(actual.getTime())||actual.toISOString().slice(0,10)!==day||!description||description.length>1500){message('กรอกวันที่และรายละเอียดงานให้ครบ','error');return;}
    if(!files.length||files.length>3){message('แนบรูปประกอบ 1–3 รูปก่อนส่ง','error');return;}
    if(files.some(f=>f.size<1||f.size>MAX_INPUT)){message('แนบรูปขนาดไม่เกิน 25 MB ต่อรูป หรือลองเลือกภาพที่เล็กลง','error');return;}
    const collaborators=[...peers.values()].filter(p=>p.check.checked).map(p=>({employeeKey:p.key,assignmentKey:p.topic.value}));
    if(collaborators.length>10||collaborators.some(p=>!peers.get(p.employeeKey).assignments.some(a=>a.key===p.assignmentKey))){message('เลือกหัวข้อ PA ให้ผู้ร่วมงานแต่ละคน (ไม่เกิน 10 คน)','error');return;}
    requestId ||= nextRequestId();
    const turn=generation, selectedName=getReporter(), authorAssignmentKey=assignment.value, activeEmployee=employeeKey,
      selectedEndpoint=endpoint, clientRequestId=requestId;
    pending=true;send.disabled=true;gate.disabled=true;message('กำลังเตรียมรูป… กรุณาเปิดหน้านี้ไว้');
    let attempted=false;
    try{
      const attached=prepared?.id===clientRequestId?prepared.photos:await encodePhotos(files);
      if(turn!==generation||!onRoute()||getReporter()!==selectedName)return;
      prepared={id:clientRequestId,photos:attached};
      attempted=true;message('กำลังส่งรายงาน… กรุณาเปิดหน้านี้ไว้');
      const ack=await window.UnifiedApi.request({action:'paWorkReportSubmit',employeeKey:activeEmployee,workDate:day,authorAssignmentKey,
        description,photos:attached,collaborators,clientRequestId},selectedEndpoint);
      if(turn!==generation)return;
      if(ack?.ok!==true||ack.requestId!==clientRequestId||typeof ack.reportId!=='string'||!/^pa_[a-f0-9]{64}$/.test(ack.reportId)||typeof ack.duplicate!=='boolean')throw Error('receipt');
      resetDraft();for(const peer of peers.values())updatePeerTopics(peer,false);forget();message('บันทึกรายงานแล้ว','success');
    }catch(error){
      if(turn===generation)message(attempted
        ?'ยังยืนยันผลการส่งไม่ได้ ลองกดส่งอีกครั้งโดยไม่แก้ข้อมูล ระบบจะใช้รหัสเดิมเพื่อไม่บันทึกซ้ำ'
        :photoError(error),'error');
    }
    finally{if(turn===generation){pending=false;send.disabled=false;gate.disabled=false;}}
  });
  window.addEventListener('hashchange',enter);
  window.addEventListener('mu:profile-changed',enter);
  if(onRoute())enter();
})();