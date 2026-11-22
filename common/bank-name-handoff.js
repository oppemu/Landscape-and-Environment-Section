/* Same exact bank deployment only. Personal data travels in authenticated RPC,
 * never URL/history/referrer. An opaque, actor-bound one-use ticket is a fragment.
 * Failure falls back to manual selection, never impersonates/authenticates anyone.
 */
(function(root){'use strict';
const GOOGLE=/^https:\/\/(?:[a-z0-9-]+\.)?script\.googleusercontent\.com$|^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/;
const SHEET=String(window.HubConfig?.api?.spreadsheetId||'');
function id(){return Array.from(root.crypto.getRandomValues(new Uint32Array(4)),x=>x.toString(16).padStart(8,'0')).join('');}
function deployment(value){const u=new URL(value);const m=u.pathname.match(/^\/(?:a\/macros\/mahidol\.ac\.th\/s|macros\/s)\/([A-Za-z0-9_-]+)\/exec$/);if(u.origin!=='https://script.google.com'||!m)throw Error('ปลายทางไม่ถูกต้อง');return m[1];}
function connect(target){
 return new Promise((resolve,reject)=>{
  const channel=id(),frame=root.document.createElement('iframe'),pending=new Map();let peer=null,origin='',closed=false;
  const u=new URL(target);deployment(target);u.hash='';u.search='';u.searchParams.set('mode','relay');u.searchParams.set('origin',root.location.origin);u.searchParams.set('channel',channel);
  frame.hidden=true;frame.title='ส่งต่อชื่อผู้กรอก';frame.referrerPolicy='no-referrer';
  function close(){if(closed)return;closed=true;clearTimeout(timer);root.removeEventListener('message',receive);frame.remove();pending.forEach(p=>{clearTimeout(p.timer);p.reject(Error('ปิดช่องส่งต่อชื่อ'));});pending.clear();}
  const timer=setTimeout(()=>{close();reject(Error('เชื่อมต่อชื่อไม่ได้'));},8000);
  function rpc(request){return new Promise((res,rej)=>{const requestId=id(),t=setTimeout(()=>{pending.delete(requestId);rej(Error('หมดเวลาส่งต่อชื่อ'));},8000);pending.set(requestId,{resolve:res,reject:rej,timer:t});peer.postMessage({type:'mu:request',channel,id:requestId,request},origin);});}
  function ownedSource(source){try{for(let depth=0;source&&depth<8;depth++){if(source===frame.contentWindow)return true;const parent=source.parent;if(parent===source)return false;source=parent;}}catch(_){}return false;}
  function receive(event){
   const m=event.data;if(closed||!m||m.channel!==channel||!event.source)return;
   if(!peer){
    if(!GOOGLE.test(event.origin)||!ownedSource(event.source)||!['mu:ready','mu:error'].includes(m.type))return;
    if(m.type==='mu:error'){close();reject(Error('Google ไม่อนุญาตส่งต่อชื่อ'));return;}
    peer=event.source;origin=event.origin;clearTimeout(timer);resolve({rpc,close});return;
   }
   if(event.source!==peer||event.origin!==origin||m.type!=='mu:response')return;
   const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);
   if(!m.response||m.response.ok!==true)p.reject(Error('Google ไม่ยืนยันการส่งต่อชื่อ'));else p.resolve(m.response.result);
  }
  root.addEventListener('message',receive);frame.src=u.href;root.document.body.appendChild(frame);
 });
}
async function prepare(target,person){
 if(!person||!person.name||(person.source!=='public-name'&&!person.email))throw Error('ยังไม่มีชื่อผู้กรอก');
 const snapshot={name:person.name,email:person.email,source:person.source||'staff'},session=id(),client=await connect(target);
 try{
  const info=await client.rpc({action:'bankHandoffInfo'});
  if(!info||info.capability!=='bank-name-handoff/v1'||!info.actor||info.spreadsheetId!==SHEET||deployment(info.serviceUrl)!==deployment(target))throw Error('ปลายทางยังไม่พร้อมส่งต่อชื่อ');
  const r=await client.rpc({action:'bankHandoffCreate',target,session,selectedReporter:snapshot,expectedActor:info.actor,expectedSpreadsheetId:SHEET});
  if(!r||!/^[a-f0-9]{64}$/.test(r.token)||r.session!==session||r.expires<=Date.now())throw Error('ยังไม่ยืนยันการส่งต่อชื่อ');
  const u=new URL(target);u.hash='handoff='+r.token+'.'+session;return u.href;
 }finally{client.close();}
}
// แสดงหน้ารอทันที ไม่ปล่อยแท็บขาวระหว่างตรวจการส่งต่อชื่อกับ Google
function waitingPage(popup,target,onManual){
 try{
  const doc=popup.document;if(!doc||!doc.body||!doc.createElement)return;
  doc.title='กำลังเปิดหน้านำเข้า Excel';
  const box=doc.createElement('main'),title=doc.createElement('h1'),detail=doc.createElement('p'),link=doc.createElement('a');
  box.style.cssText='max-width:34rem;margin:12vh auto;padding:24px;font-family:system-ui,sans-serif;line-height:1.7;color:#19352b';
  title.textContent='กำลังเปิดหน้านำเข้า Excel';
  detail.textContent='กำลังส่งต่อชื่อผู้กรอก กรุณารอสักครู่ หากไม่เปิดอัตโนมัติ กดลิงก์ด้านล่างได้เลย';
  link.textContent='เปิดหน้านำเข้า Google ทันที';link.href=target;link.rel='noreferrer';
  link.addEventListener('click',onManual);
  box.append(title,detail,link);doc.body.replaceChildren(box);
 }catch(_){/* หากเบราว์เซอร์ไม่ให้จัดหน้ารอ ยังมีตัวจับเวลาเปิด Google ต่อ */}
}
function open(target,say){
 deployment(target);
 const popup=root.open('about:blank','_blank');
 if(!popup){say('เบราว์เซอร์บล็อกแท็บใหม่ กรุณาอนุญาตป๊อปอัปแล้วกดอีกครั้ง');return;}
 popup.opener=null;
 const fallback=new URL(target);fallback.hash='handoff-unavailable';
 let finished=false,deadline;
 waitingPage(popup,fallback.href,()=>{finished=true;clearTimeout(deadline);});
 function navigate(url,message){
  if(finished)return;finished=true;clearTimeout(deadline);
  if(!popup.closed){try{popup.location.replace(url);}catch(_){say('กรุณากดเปิดหน้านำเข้า Google ในแท็บที่เปิดไว้');return;}}
  if(message)say(message);
 }
 function fallbackNow(){navigate(fallback.href,'เปิดหน้านำเข้าแล้ว กรุณาตรวจชื่อผู้กรอกก่อนส่งไฟล์');}
 // จำกัดเวลารอรวม ไม่บวกเวลารอแต่ละขั้นจนผู้ใช้เห็นหน้าเปล่านาน
 deadline=setTimeout(fallbackNow,8000);
 say('กำลังเปิดหน้านำเข้า Google');
 try{
  const p=root.HubSelectedProfile&&root.HubSelectedProfile.get();
  const snapshot=p?{name:p.name,email:p.email,source:p.source}:null;
  prepare(target,snapshot).then(url=>navigate(url)).catch(fallbackNow);
 }catch(_){fallbackNow();}
}

root.HubBankNameHandoff={open,prepare};
if(typeof module!=='undefined')module.exports={deployment};
})(typeof window==='undefined'?globalThis:window);
