(function(root){
'use strict';

// Keep the transport under the unchanged 1 MiB Apps Script limit, with some room for overhead.
const OUTPUT_LIMIT=950*1024, LONG_EDGE=2048;
const JPEG_QUALITY=[0.86,0.72,0.58,0.42];
const field=document.getElementById('orphanPhoto');
const preview=document.getElementById('photoPreview');
// Allow this script to roll out safely if a tab still has the previous HTML cached.
const status=document.getElementById('photoStatus')||document.createElement('p');
const remove=document.getElementById('photoRemove')||document.createElement('button');
if(!status.isConnected){
 status.id='photoStatus';
 status.setAttribute('role','status');
 status.setAttribute('aria-live','polite');
 remove.id='photoRemove';
 remove.type='button';
 remove.textContent='เอารูปออก';
 remove.hidden=true;
 const help=document.getElementById('photoHelp');
 if(help)help.textContent='แนบรูป JPG หรือ PNG ได้ 1 รูป ฟอร์มจะย่อรูปขนาดใหญ่ให้อัตโนมัติก่อนบันทึก';
 preview.before(status,remove);
 field.setAttribute('aria-describedby','photoHelp photoStatus');
}
let sequence=0, rememberedFile=null, rememberedRead=null;

function photoError(message){const e=Error(message);e.code='PHOTO_VALIDATION';return e;}
function errorDecode(){return photoError('เปิดรูปนี้ไม่ได้ กรุณาเลือกไฟล์ JPG หรือ PNG ที่เปิดดูได้ หรือถ่ายรูปใหม่');}

async function originalType(file){
 const b=new Uint8Array(await file.slice(0,8).arrayBuffer());
 if(b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';
 if(b.length===8&&[137,80,78,71,13,10,26,10].every((n,i)=>b[i]===n))return 'image/png';
 throw photoError('ใช้รูป JPG หรือ PNG ครับ ถ้าเป็น HEIC จาก iPhone ให้แปลงหรือส่งออกเป็น JPG ก่อนแนบ');
}

function loadImage(file){
 return new Promise((resolve,reject)=>{
  const objectUrl=URL.createObjectURL(file);
  const img=new Image();
  const release=()=>URL.revokeObjectURL(objectUrl);
  img.onerror=()=>{release();reject(errorDecode());};
  img.onload=()=>resolve({img,release});
  img.src=objectUrl;
 });
}

function encode(canvas,quality){
 return new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
}

async function shrink(img){
 const canvas=document.createElement('canvas');
 const ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx)throw errorDecode();
 const width=img.naturalWidth,height=img.naturalHeight;
 let scale=Math.min(1,LONG_EDGE/Math.max(width,height));
 try{
  for(let round=0;round<7;round++){
   canvas.width=Math.max(1,Math.round(width*scale));
   canvas.height=Math.max(1,Math.round(height*scale));
   ctx.fillStyle='#ffffff';
   ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.imageSmoothingQuality='high';
   ctx.drawImage(img,0,0,canvas.width,canvas.height);
   for(const quality of JPEG_QUALITY){
    const result=await encode(canvas,quality);
    if(result&&result.type==='image/jpeg'&&result.size>0&&result.size<=OUTPUT_LIMIT)return result;
   }
   scale*=0.72;
  }
 }finally{
  canvas.width=1;
  canvas.height=1;
 }
 throw photoError('ย่อรูปนี้ไม่ได้ กรุณาเลือกรูปอื่นหรือย่อรูปในเครื่องก่อนแนบ');
}

function readData(blob){
 return new Promise((resolve,reject)=>{
  const fileReader=new FileReader();
  fileReader.onerror=()=>reject(errorDecode());
  fileReader.onabort=()=>reject(errorDecode());
  fileReader.onload=()=>{
   const data=String(fileReader.result||'').split(',')[1];
   if(!data){reject(errorDecode());return;}
   resolve(data);
  };
  fileReader.readAsDataURL(blob);
 });
}

async function prepare(file){
 try{
  if(!file.size)throw errorDecode();
  const mimeType=await originalType(file);
  // Trust the image signature, not the file-picker MIME field, which may be blank on phones.
  const typed=file.slice(0,file.size,mimeType);
  const {img,release}=await loadImage(typed);
  try{
   if(!img.naturalWidth||!img.naturalHeight)throw errorDecode();
   const blob=file.size<=OUTPUT_LIMIT?typed:await shrink(img);
   return {mimeType:blob.type,data:await readData(blob)};
  }finally{release();}
 }catch(e){
  if(e?.code==='PHOTO_VALIDATION')throw e;
  throw photoError('อุปกรณ์เปิดหรือย่อรูปนี้ไม่ได้ กรุณาเลือกรูปอื่นหรือย่อรูปในเครื่องก่อนแนบ');
 }
}

function read(file){
 if(!file)return Promise.resolve(null);
 if(rememberedFile!==file){
  rememberedFile=file;
  rememberedRead=prepare(file);
 }
 return rememberedRead;
}

function clearPreview(){
 preview.hidden=true;
 preview.removeAttribute('src');
}

function clear(){
 sequence++;
 rememberedFile=null;
 rememberedRead=null;
 clearPreview();
 status.textContent='';
 remove.hidden=true;
}

field.addEventListener('change',async()=>{
 const n=++sequence,file=field.files[0];
 clearPreview();
 status.textContent=file?'กำลังเตรียมรูป กรุณารอสักครู่…':'';
 remove.hidden=!file;
 if(!file)return;
 try{
  const photo=await read(file);
  if(n!==sequence)return;
  preview.src='data:'+photo.mimeType+';base64,'+photo.data;
  preview.hidden=false;
  status.textContent=file.size>OUTPUT_LIMIT?'ย่อรูปแล้ว พร้อมบันทึก':'รูปพร้อมบันทึก';
 }catch(e){
  if(n!==sequence)return;
  // Keep the failed selection so submit never silently discards an intended attachment.
  status.textContent=e.message;
 }
});
remove.addEventListener('click',()=>{
 if(field.disabled)return;
 field.value='';
 clear();
});
field.form.addEventListener('reset',clear);

root.OrphanPhoto={read,clear};
})(globalThis);
