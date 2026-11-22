/* The deployment must authenticate and authorize the catalogue, HEAD and both PDF GETs. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const status=$('pa-online-status'), panel=$('pa-online-view'), name=$('pa-online-employee'),
    month=$('pa-online-month'), open=$('pa-online-preview'), frame=$('pa-online-frame'), save=$('pa-online-save');
  const search=$('pa-online-search'), matches=$('pa-online-matches');
  if(!panel||!status||!name||!month||!open||!frame||!save||!search||!matches)return;
  const native = (document.currentScript?.dataset.paNative==='true' || window.HubConfig?.paNativeEnabled===true) && window.google?.script?.run;
  const connect=$('pa-online-connect'), api=!native&&window.PaApi?.configured?window.PaApi:null;
  if(!native&&!api&&(window.HubConfig?.paApiEnabled!==true||!/^https?:$/.test(location.protocol)))return;
  const isRoute=()=>location.hash==='#pa-online'||(native && location.hash==='#pa-preview');
  function gas(operation,...args){
    return new Promise((resolve,reject)=>{
      const run=window.google.script.run.withSuccessHandler(value=>{
        if(value?.ok===false)reject(Error(value.code==='ACCESS_DENIED'?'access':'unavailable'));
        else resolve(value);
      }).withFailureHandler(()=>reject(Error('unavailable')));
      if(operation==='catalog')run.paReadCatalog();
      else run.paReadOriginal(...args);
    });
  }
  function originalBlob(data){
    const max=8*1024*1024;
    if(data?.version!==1 || typeof data.base64!=='string' || !data.base64.startsWith('JVBERi0') || data.base64.length>4*Math.ceil(max/3))throw Error('invalid PDF');
    const raw=atob(data.base64);
    if(raw.length<8||raw.length>max||!raw.startsWith('%PDF-'))throw Error('invalid PDF');
    return new Blob([Uint8Array.from(raw,c=>c.charCodeAt(0))],{type:'application/pdf'});
  }
  const key=/^[A-Za-z0-9_-]{1,64}$/, period=/^20\d{2}-(?:0[1-9]|1[0-2])$/;
  const requestOptions={credentials:'same-origin',mode:'same-origin',redirect:'error',cache:'no-store'};
  const monthLabel=new Intl.DateTimeFormat('th-TH',{month:'long',year:'numeric',timeZone:'UTC'});
  const endpoint = operation => new URL('./api/pa/'+operation,location.href);
  let items=[], controller=null, generation=0, objectUrl=null;
  function invalidate(){
    controller?.abort();controller=null;generation++;
    frame.hidden=true;frame.removeAttribute('src');
    save.hidden=true;save.removeAttribute('href');
    if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}
  }
  function disable(){
    search.disabled=name.disabled=month.disabled=open.disabled=true;items=[];
    search.value='';matches.textContent='';matches.hidden=true;
    name.replaceChildren(new Option('เลือกชื่อ',''));month.replaceChildren(new Option('เลือกเดือน',''));
  }
  function fill(){
    invalidate();
    const item=items.find(i=>i.key===name.value);
    month.replaceChildren(new Option('เลือกเดือน',''));
    for(const value of item?.months||[])month.add(new Option(monthLabel.format(new Date(value+'-15T00:00:00Z')),value));
    month.disabled=!item;open.disabled=true;status.textContent='เลือกบุคลากรและเดือนเพื่อเปิด PDF ต้นฉบับ';
  }
  const searchText=value=>String(value).normalize('NFC').toLocaleLowerCase('th').replace(/\s+/gu,' ').trim();
  function filterNames(){
    const query=searchText(search.value), tokens=query?query.split(' '):[];
    const visible=items.filter(item=>tokens.every(token=>searchText(item.name).includes(token)));
    const previous=name.value;
    name.replaceChildren(new Option('เลือกชื่อ',''));
    for(const item of visible)name.add(new Option(item.name,item.key));
    name.value=visible.some(item=>item.key===previous)?previous:'';
    name.disabled=!visible.length;
    matches.hidden=!query;
    matches.textContent=query?(visible.length?'พบ '+visible.length+' รายชื่อ':'ไม่พบชื่อที่ตรงกับคำค้น'):'';
    if(previous&&!name.value)fill();
  }
  search.addEventListener('input',filterNames);
  function validIndex(data){
    if(data?.version!==1||!Array.isArray(data.items)||data.items.length>100)return false;
    const unique=new Set();
    return data.items.every(i=>{
      if(typeof i?.key!=='string'||!key.test(i.key)||unique.has(i.key)||typeof i.name!=='string'||!i.name.trim()||i.name.length>160||!Array.isArray(i.months)||!i.months.length||i.months.length>120||new Set(i.months).size!==i.months.length||!i.months.every(m=>typeof m==='string'&&period.test(m)))return false;
      unique.add(i.key);return true;
    });
  }
  async function enter(){
    invalidate();disable();if(connect)connect.hidden=true;
    if(!isRoute()){api?.clear();return;}
    if(api&&!api.signedIn()){
      const pending=generation;
      status.textContent='กำลังเตรียมการเข้าสู่ระบบ Google';
      try{
        await api.prepare();
        if(pending!==generation)return;
        connect.hidden=false;connect.disabled=false;
        status.textContent='เข้าสู่ระบบ Google เพื่อดูเฉพาะเอกสาร PA ที่บัญชีนี้มีสิทธิ์';
      }catch(_){if(pending===generation)status.textContent='เปิดการเข้าสู่ระบบ Google ไม่ได้';}
      return;
    }
    controller=new AbortController();const token=generation;
    status.textContent='กำลังตรวจสิทธิ์และอ่านรายการเอกสาร';
    try{
      let data;
      if(native)data=await gas('catalog'); else if(api)data=await api.run('catalog',[],controller.signal);
      else{
        const r=await fetch(endpoint('catalog'),{...requestOptions,signal:controller.signal});
        if(r.status===401||r.status===403)throw Error('access');
        if(!r.ok||!/^application\/json(?:;|$)/i.test(r.headers.get('Content-Type')||''))throw Error();
        data=await r.json();
      }
      if(token!==generation)return;
      if(!validIndex(data))throw Error();
      items=data.items;search.disabled=!items.length;filterNames();
      name.disabled=!items.length;
      status.textContent=items.length?'เลือกบุคลากรและเดือนเพื่อเปิด PDF ต้นฉบับ':'ไม่มีเอกสาร PA ที่บัญชีนี้เปิดดูได้';
    }catch(e){if(token===generation)status.textContent=e.message==='access'?'บัญชีนี้ยังไม่มีสิทธิ์เปิดรายการเอกสาร PA':'ยังไม่ได้เชื่อมระบบเอกสาร PA หรือระบบไม่พร้อมใช้งาน';}
  }
  name.addEventListener('change',fill);
  month.addEventListener('change',()=>{invalidate();open.disabled=!items.find(i=>i.key===name.value)?.months.includes(month.value);});
  open.addEventListener('click',async()=>{
    const selected=items.find(i=>i.key===name.value);
    if(!selected?.months.includes(month.value))return;
    invalidate();open.disabled=true;controller=new AbortController();const token=generation;
    const pdf=endpoint('original');
    pdf.searchParams.set('employee',selected.key);pdf.searchParams.set('month',month.value);
    status.textContent='กำลังตรวจสิทธิ์เปิดเอกสาร';
    try{
      if(native||api){
        const data=native?await gas('original',selected.key,month.value):await api.run('original',[selected.key,month.value],controller.signal);
        if(token!==generation)return;
        objectUrl=URL.createObjectURL(originalBlob(data));
        frame.src=objectUrl;frame.hidden=false;save.href=objectUrl;
        save.download='PA-'+month.value+'.pdf';save.hidden=false;
        status.textContent='เอกสารต้นฉบับ • หากเบราว์เซอร์ไม่แสดงตัวอย่าง ให้ใช้ปุ่มดาวน์โหลด PDF';
        return;
      }
      const r=await fetch(pdf,{...requestOptions,method:'HEAD',signal:controller.signal});
      if(token!==generation)return;
      if(!r.ok||!/^application\/pdf(?:;|$)/i.test(r.headers.get('Content-Type')||'')||!/^inline(?:;|$)/i.test(r.headers.get('Content-Disposition')||''))throw Error();
      frame.src=pdf.href;frame.hidden=false;
      pdf.searchParams.set('download','1');save.href=pdf.href;save.hidden=false;
      status.textContent='เอกสารต้นฉบับ • หากเบราว์เซอร์ไม่แสดงตัวอย่าง ให้ใช้ปุ่มดาวน์โหลด PDF';
    }catch(_){if(token===generation)status.textContent='ไม่พบเอกสารต้นฉบับ หรือบัญชีนี้เปิดไม่ได้';}
    finally{if(token===generation)open.disabled=false;}
  });
  window.addEventListener('hashchange',enter);
  connect?.addEventListener('click',async()=>{
    const pending=generation;connect.disabled=true;
    try{await api.connect();if(pending===generation)enter();}
    catch(_){if(pending===generation){connect.disabled=false;status.textContent='ยังไม่ได้อนุญาตให้เข้าถึงเอกสาร PA';}}
  });
  window.addEventListener('pagehide',()=>{invalidate();disable();api?.clear();});
  if(isRoute())enter();
})();