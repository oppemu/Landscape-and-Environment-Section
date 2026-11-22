/* เก็บบริบทผู้กรอกในฝั่งหน้าเว็บเพื่อเติมข้อมูลและเปลี่ยนหน้าจอ
 * ชื่อหรือบทบาทที่หน้าเว็บเก็บไม่ใช่หลักฐานสิทธิ์ Google การอ่าน/เขียนจริงยังต้องผ่าน backend */
/* Device-remembered display name only; never authentication. */
(function(root){'use strict';
// ตรวจชื่อแสดงผล 1–60 ตัวอักษร ตัดช่องว่างซ้ำและปฏิเสธอักขระควบคุม/HTML
function validateName(value){if(typeof value!=='string')throw Error('กรอกชื่อที่ใช้กรอก');const name=value.trim().replace(/\s+/g,' ');if(!name||name.length>60||/[\x00-\x1f<>]/.test(value)||/^[=+@-]/.test(name))throw Error('ใช้ชื่อ 1–60 ตัวอักษร');return name;}
// เปลี่ยนชื่อเมื่อยืนยันแล้วเท่านั้นถ้ามีงานค้าง เพื่อไม่สลับชื่อเจ้าของแบบร่างโดยเงียบ
function change(current,value,hasWork,confirmed=false){const name=validateName(value);const different=!!current&&current!==name;if(different&&hasWork&&!confirmed)return {name:current,requiresConfirmation:true,reset:false};return {name,requiresConfirmation:false,reset:different};}
// ตรวจ origin และหน้าต่าง iframe ที่ระบบเป็นเจ้าของก่อนรับข้อความ
function trustedMessage(event,frames,origin){return event.origin===origin&&frames.some(frame=>frame.contentWindow===event.source);}
// จำกัดความสูง iframe ให้อยู่ 400–12000 พิกเซล ไม่เชื่อค่าจากข้อความโดยตรง
function frameHeight(value){return typeof value==='number'&&Number.isFinite(value)?Math.max(400,Math.min(12000,Math.ceil(value))):null;}
const STORAGE_KEY='mahidol.landscape.profile.v1';
// ชื่อที่เลือกต้องมีในรายชื่อที่โหลดมา ไม่ใช่ระบบยืนยันตัวตน
function rosterName(value,roster){const name=validateName(value);if(!Array.isArray(roster)||!roster.includes(name))throw Error('กรุณาเลือกชื่อจากรายชื่อ หากไม่พบให้ติดต่อผู้ดูแล');return name;}
// อ่านชื่อเดิมในเครื่อง ถ้า storage ใช้ไม่ได้ยังเปิดแอปได้แต่แจ้งว่าจำชื่อไม่ได้
function load(storage,roster){try{const value=storage.getItem(STORAGE_KEY);return {name:value?validateName(value):'',persistent:true};}catch(e){return {name:'',persistent:false};}}
// เก็บชื่อแสดงผลเฉพาะที่ผ่านรายชื่อ ถ้าเก็บไม่ได้คืน persistent=false
function save(storage,name,roster){name=validateName(name);try{storage.setItem(STORAGE_KEY,name);return {name,persistent:true};}catch(e){return {name,persistent:false};}}
// ลบเฉพาะชื่อที่จำในเครื่อง ไม่ลบรายการงานบนชีต
function forget(storage){try{storage.removeItem(STORAGE_KEY);return true;}catch(e){return false;}}
root.HubProfile=Object.freeze({validateName,change,trustedMessage,frameHeight,rosterName,load,save,forget,STORAGE_KEY});if(typeof module!=='undefined')module.exports=root.HubProfile;
})(typeof window==='undefined'?globalThis:window);
