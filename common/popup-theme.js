/* กล่องแจ้งเตือน/ยืนยันร่วม: ข้อความใช้ textContent, ยกเลิกไม่อนุมัติการกระทำ, คืน focus เมื่อปิด */
(function(root){
 'use strict';const doc=root.document;if(!doc)return;
 function message(text,confirm){
  const dialog=doc.createElement('dialog');
  if(typeof dialog.showModal!=='function')return Promise.resolve(confirm?root.confirm(String(text)):root.alert(String(text)));
  const before=doc.activeElement;
  return new Promise(resolve=>{
   dialog.className='mu-message-dialog';dialog.setAttribute('aria-label',confirm?'ยืนยันการดำเนินการ':'แจ้งให้ทราบ');
   const title=doc.createElement('h2');title.textContent=confirm?'ยืนยันการดำเนินการ':'แจ้งให้ทราบ';
   const detail=doc.createElement('p');detail.textContent=String(text);detail.style.whiteSpace='pre-line';
   const actions=doc.createElement('div');actions.className='mu-dialog-actions';
   let accepted=false;const ok=doc.createElement('button');ok.type='button';ok.textContent=confirm?'ยืนยัน':'ตกลง';ok.onclick=()=>{accepted=true;dialog.close();};
   if(confirm){const cancel=doc.createElement('button');cancel.type='button';cancel.className='secondary';cancel.textContent='ยกเลิก';cancel.onclick=()=>dialog.close();actions.append(cancel);}
   actions.append(ok);dialog.append(title,detail,actions);doc.body.append(dialog);
   dialog.addEventListener('close',()=>{dialog.remove();if(before&&before.isConnected&&typeof before.focus==='function')before.focus();resolve(accepted);},{once:true});
   dialog.showModal();(confirm?actions.firstElementChild:ok).focus();
  });
 }
 root.MUDialog=Object.freeze({alert:text=>message(text,false),confirm:text=>message(text,true)});
})(typeof window==='undefined'?globalThis:window);
