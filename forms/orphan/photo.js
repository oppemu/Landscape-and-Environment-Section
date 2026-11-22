(function(root){
'use strict';
function photoError(message){const e=Error(message);e.code='PHOTO_VALIDATION';return e;}
function read(file){if(!file)return Promise.resolve(null);if(!['image/jpeg','image/png'].includes(file.type)||file.size>1048576||file.size===0)return Promise.reject(photoError('เลือก JPG หรือ PNG 1 รูป ขนาดไม่เกิน 1 MB'));return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(photoError('อ่านรูปไม่ได้ กรุณาเลือกรูปใหม่'));r.onload=()=>resolve({mimeType:file.type,data:String(r.result).split(',')[1]});r.readAsDataURL(file);});}
function clear(){const p=document.getElementById('photoPreview');p.hidden=true;p.removeAttribute('src');}
const field=document.getElementById('orphanPhoto');let sequence=0;
field.addEventListener('change',async()=>{const n=++sequence;clear();try{const photo=await read(field.files[0]);if(n!==sequence||!photo)return;const p=document.getElementById('photoPreview');p.src='data:'+photo.mimeType+';base64,'+photo.data;p.hidden=false;}catch(e){field.value='';const box=document.getElementById('orphanNotice');box.textContent=e.message;box.hidden=false;}});
root.OrphanPhoto={read,clear};
})(globalThis);
