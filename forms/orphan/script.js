/* เว็บแยกขยะกำพร้า: ไม่พึ่งเมนูหรือ session ภายในแอปหลัก */
(function(){
 'use strict';
 const $=id=>document.getElementById(id),form=$('orphanForm'),key='mu-orphan-attempt-v1';
 const ids={date:'orphanDate',provider:'orphanProvider',department:'orphanDepartment',wasteType:'orphanWasteType',totalWeightKg:'orphanTotalWeight',otherDetails:'orphanOther'};
 let attempt=null,ready=false,busy=false,confirmed=false;
 function currentBangkokDate(now=new Date()){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));return p.year+'-'+p.month+'-'+p.day;}
 function refreshCurrentDate(){if(!attempt)$('orphanDate').value=currentBangkokDate();}
 // Preserve an uncertain in-flight request exactly; new records always use today's Bangkok date.
 setInterval(refreshCurrentDate,1000);
 window.addEventListener('focus',refreshCurrentDate);
 window.addEventListener('pageshow',refreshCurrentDate);
 document.addEventListener('visibilitychange',refreshCurrentDate);
 form.addEventListener('reset',()=>setTimeout(refreshCurrentDate,0));

 const notice=text=>{const box=$('orphanNotice');box.textContent=text;box.hidden=!text;}; // ไม่แสดงสถานะเชื่อมต่อหรือรายละเอียดระบบเมื่อใช้งานปกติ
 function controls(){OrphanWeights.setDisabled(busy||!!attempt);$('orphanSubmit').classList.toggle('is-busy',busy);$('orphanSubmit').setAttribute('aria-busy',String(busy));for(const id of Object.values(ids))$(id).disabled=busy||!!attempt;if($('orphanPhoto'))$('orphanPhoto').disabled=busy||!!attempt;$('orphanSubmit').disabled=busy||!ready||!!attempt;}
 function persist(){sessionStorage.setItem(key,JSON.stringify(attempt));} // ไม่ส่งจนเก็บรหัสคำขอไว้ในแท็บนี้สำเร็จ
 function verifyReceipt(r){if(!r||r.requestId!==attempt.id||r.committed!==true)throw Error('ยังยืนยันการบันทึกไม่ได้');sessionStorage.removeItem(key);attempt=null;confirmed=false;form.reset();OrphanPhoto.clear();refreshCurrentDate();notice('บันทึกข้อมูลเรียบร้อยแล้ว');}
 function sameTarget(){if(!attempt||attempt.endpoint!==OrphanTransport.endpoint())throw Error('ลิงก์ปลายทางเปลี่ยน หยุดเพื่อป้องกันรายการซ้ำ ให้ผู้ดูแลตรวจรหัส '+(attempt&&attempt.id||''));}
 async function send(){if(busy||!attempt)return;busy=true;controls();try{sameTarget();notice('กำลังบันทึกข้อมูล');const r=await OrphanTransport.request({action:'save',requestId:attempt.id,payload:attempt.payload},attempt.endpoint);verifyReceipt(r);}catch(e){if(e.code==='VALIDATION'){sessionStorage.removeItem(key);attempt=null;notice('ข้อมูลยังไม่ถูกบันทึก: '+(e.message||'ตรวจน้ำหนักแต่ละประเภทและข้อมูลที่กรอก'));}else{notice('ยังยืนยันการบันทึกไม่ได้ ['+(e.code||'SERVER_ERROR')+'] ข้อมูลที่กรอกยังเก็บไว้ ไม่ส่งซ้ำอัตโนมัติ กรุณาส่งภาพข้อความนี้พร้อมรหัสรายการ '+attempt.id+' ให้ผู้ดูแลตรวจสอบ');}}finally{busy=false;controls();}}
 form.addEventListener('submit',async event=>{event.preventDefault();refreshCurrentDate();if(busy||!ready||attempt||!form.reportValidity())return;busy=true;controls();try{const payload={};for(const [k,id] of Object.entries(ids))payload[k]=$(id).value;payload.wasteItems=OrphanWeights.read();payload.totalWeightKg=$('orphanTotalWeight').value;payload.wasteType=Array.from(new Set(payload.wasteType.split(',').map(s=>s.trim()).filter(Boolean))).join(', ');const photo=await OrphanPhoto.read($('orphanPhoto').files[0]);if(photo)payload.photo=photo;attempt={id:OrphanTransport.uid(),endpoint:OrphanTransport.endpoint(),payload};persist();}catch(e){attempt=null;busy=false;notice(['PHOTO_VALIDATION','WEIGHT_VALIDATION'].includes(e.code)?e.message:'ยังส่งข้อมูลไม่ได้ ข้อมูลยังไม่ถูกส่ง กรุณาตรวจพื้นที่จัดเก็บของเบราว์เซอร์หรือติดต่อผู้ดูแล');controls();return;}busy=false;await send();});
 try{const saved=sessionStorage.getItem(key);if(saved){attempt=JSON.parse(saved);if(!attempt||!/^[a-f0-9]{32}$/.test(attempt.id)||!attempt.payload||!attempt.endpoint)throw Error('ข้อมูลรอส่งผิดรูปแบบ');for(const [k,id] of Object.entries(ids))$(id).value=attempt.payload[k]??'';if(attempt.payload.wasteItems)OrphanWeights.restore(attempt.payload.wasteItems);notice('เก็บข้อมูลรายการที่ยังไม่ยืนยันไว้แล้ว ไม่ตรวจสอบหรือส่งซ้ำอัตโนมัติ');}}catch(e){notice('มีรายการเดิมที่ยังตรวจไม่ได้ กรุณาติดต่อผู้ดูแลก่อนกรอกใหม่');return;} // ไม่ลบข้อมูลค้างเองเมื่ออ่านไม่ได้
 refreshCurrentDate();controls();
 function connectionError(e){
 const messages={BAD_ORIGIN:'เปิดจากไฟล์ในเครื่องจึงยังส่งไม่ได้ ให้คลิกขวา index.html ใน VS Code แล้วเลือก Open with Live Server หรือเปิดลิงก์ GitHub Pages',UNSAFE_ORIGIN:'หน้านี้ใช้ HTTP ที่ไม่ใช่ localhost ให้เปิดด้วย HTTPS หรือ Live Server บน localhost',NOT_CONFIGURED:'ลิงก์เชื่อมต่อหายหรือไม่ถูกต้อง กรุณาใช้ไฟล์หน้าบ้านชุดล่าสุด',CONNECT_TIMEOUT:'ยังเชื่อมต่อ Google ไม่สำเร็จภายใน 20 วินาที ตรวจอินเทอร์เน็ตแล้วกดลองเชื่อมต่ออีกครั้ง หากยังไม่ได้ให้ส่งภาพหน้านี้พร้อมลิงก์ที่เปิดมาให้ตรวจ',ACCESS_DENIED:'การตั้งค่าผู้รัน Apps Script ไม่ถูกต้อง ต้องดำเนินการในนามเจ้าของ โปรดแจ้งผู้ดูแลแก้ Deployment',SCHEMA_NOT_READY:'หัวคอลัมน์ในชีทไม่ตรงกับฟอร์ม โปรดแจ้งผู้ดูแลตรวจคอลัมน์ก่อนบันทึก',WRONG_APP:'ลิงก์กำลังเชื่อมต่อกับฟอร์มคนละรุ่น กรุณาใช้ไฟล์หน้าบ้านล่าสุดและรีเฟรช'};
 if(e.code==='ORIGIN_NOT_ALLOWED'||e.code==='CONNECT_TIMEOUT')return e.message;
 return messages[e.code]||'เชื่อมต่อ Google ไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วกดลองเชื่อมต่ออีกครั้ง หากยังไม่ได้ให้ส่งภาพหน้านี้พร้อมลิงก์ที่เปิดมาให้ตรวจ';
 }
 async function connect(){const retry=$('retryConnection');retry.hidden=true;retry.disabled=true;try{const info=await OrphanTransport.request({action:'info'});if(!info||info.app!=='mahidol-orphan-standalone'||info.contract!=='pages-mahidol-single-row-v1'){const e=Error();e.code='WRONG_APP';throw e;}ready=true;if(attempt)notice('รายการเดิมยังไม่ยืนยัน ไม่ตรวจสอบหรือส่งซ้ำอัตโนมัติ กรุณาแจ้งผู้ดูแลพร้อมรหัส '+attempt.id);else notice('');}catch(e){ready=false;notice(connectionError(e));retry.hidden=['BAD_ORIGIN','UNSAFE_ORIGIN','NOT_CONFIGURED'].includes(e.code);}finally{retry.disabled=false;controls();}}
 $('retryConnection').addEventListener('click',connect);connect();
})();
