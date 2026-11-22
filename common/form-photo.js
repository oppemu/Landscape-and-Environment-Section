/* รูปหลักฐานจำเป็นสำหรับฟอร์มงาน: ตรวจเนื้อหาไฟล์ก่อนส่งเข้าคิว ไม่เชื่อเพียงชื่อไฟล์ */
(function(root){'use strict';
 // ขีดจำกัดนับจากไบต์ภาพจริง; Base64 มีขนาดใหญ่กว่าไบต์ต้นฉบับประมาณหนึ่งในสาม
 const MAX=5*1024*1024;
 function fail(message){const e=Error(message);e.code='PHOTO_REQUIRED';throw e;}
 // ตรวจชนิด MIME โครงสร้าง Base64 ขนาดจริง และลายเซ็นต้นไฟล์ก่อนคืนภาพเดิม
 function validate(file){
  if(!file||typeof file.base64!=='string'||!file.base64.length)fail('กรุณาแนบรูปหลักฐานอย่างน้อย 1 รูปก่อนส่งข้อมูล');
  if(!['image/jpeg','image/png','image/webp'].includes(file.mimeType))fail('ใช้รูป JPG PNG หรือ WEBP เท่านั้น');
  if(file.base64.length>Math.ceil(MAX/3)*4||file.base64.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(file.base64))fail('ข้อมูลรูปไม่ถูกต้อง หรือรูปมีขนาดเกิน 5 MB');
  let raw;try{raw=root.atob(file.base64);}catch(_){fail('อ่านเนื้อหารูปไม่ได้ กรุณาเลือกไฟล์รูปใหม่');}
  if(!raw.length||raw.length>MAX)fail('รูปต้องมีข้อมูลและขนาดไม่เกิน 5 MB');
 // อ่านเพียงส่วนหัวเพื่อแยก JPG/PNG/WEBP; ไม่ถือว่านามสกุลไฟล์เป็นหลักฐานชนิดภาพ
  const bytes=Array.from(raw.slice(0,12),c=>c.charCodeAt(0));
  const match=file.mimeType==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:file.mimeType==='image/png'?bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':raw.slice(0,4)==='RIFF'&&raw.slice(8,12)==='WEBP';
  if(!match)fail('เนื้อหาไฟล์ไม่ตรงกับชนิดรูป กรุณาแนบไฟล์ภาพจริง');
  return file;
 }
 // ตรวจ File จากตัวเลือกไฟล์ก่อนอ่านเข้า Base64 แล้วตรวจเนื้อหาซ้ำ
 async function read(file){if(!file||!file.size)fail('กรุณาแนบรูปหลักฐานก่อนส่งข้อมูล');if(file.size>MAX)fail('รูปแต่ละไฟล์ต้องไม่เกิน 5 MB');if(!['image/jpeg','image/png','image/webp'].includes(file.type))fail('ใช้รูป JPG PNG หรือ WEBP เท่านั้น');return validate(await root.UnifiedApi.readFile(file));}
 // รองรับทั้ง imageBase64 ของฟอร์มเดิมและ photos ของฟอร์มใหม่ โดยจำกัดจำนวนภาพรวม
 function payload(data){const images=[];if(data.imageBase64)images.push({name:data.imageName,mimeType:data.mimeType,base64:data.imageBase64});if(Array.isArray(data.photos))images.push(...data.photos);if(images.length>3)fail('แนบได้ไม่เกิน 3 รูป');images.forEach(validate);return data;}
 async function readMany(files){const list=Array.from(files||[]);if(list.length>3)fail('แนบได้ไม่เกิน 3 รูป');return Promise.all(list.map(read));}
 root.HubFormPhoto={validate,read,readMany,payload};if(typeof module!=='undefined')module.exports=root.HubFormPhoto;
})(typeof window==='undefined'?globalThis:window);
