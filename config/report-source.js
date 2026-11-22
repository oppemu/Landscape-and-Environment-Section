/* อ่านรายงานจากฐานรวมเท่านั้น ลิงก์ Deploy ตั้งใน app-config.js
 * autoRefreshMs เป็นรอบอ่านใหม่หน่วยมิลลิวินาที 60000 คือหนึ่งนาที ไม่ใช่เวลารับประกันการบันทึก
 * Object.freeze ป้องกันการเปลี่ยนค่าของออบเจ็กต์นี้ระหว่างทำงาน ไม่ได้กำหนดสิทธิ์ผู้ใช้
 */
(function(root){root.HubReportSourceConfig=Object.freeze({mode:'unified',autoRefreshMs:60000});})(typeof window==='undefined'?globalThis:window);
