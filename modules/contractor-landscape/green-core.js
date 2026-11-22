/* ตัวช่วยแสดงช่องและรวมยอด ไม่เข้าถึงฐานจริง และไม่เดาปริมาณงานจากภาพ */
(function(root){
 'use strict'; // ไม่ยอมให้สร้างตัวแปร global โดยพิมพ์ชื่อผิดโดยไม่ประกาศ
 // แต่ละช่องเรียงเป็น [ชื่อคีย์, ป้ายภาษาไทย, ชนิด input, บังคับกรอกหรือไม่]
 const spec={
  general:[], // งานทั่วไปใช้ช่องพื้นฐาน ไม่เพิ่มช่องเฉพาะ
  tree:[['treeIds','รหัสต้นไม้ / จุดอ้างอิง','text',true],['treeWork','งานที่ทำกับต้นไม้','text',true]], // ผูกงานกับต้นไม้หรือจุดอ้างอิง
  fertilizer:[['fertilizerType','ชนิดปุ๋ย','text',true],['fertilizerAmount','ปริมาณปุ๋ยที่ใช้','number',true],['fertilizerUnit','หน่วยปุ๋ย','text',true]], // ปริมาณปุ๋ยต้องมีหน่วยของตัวเอง
  water:[['waterFault','จุดเสียและอาการ','text',true],['waterResult','ผลหลังซ่อม','text',true]], // บันทึกปัญหาและผลแก้ ไม่ถือว่าการแจ้งคือซ่อมเสร็จ
  pest:[['pestSymptom','อาการที่พบ','text',true],['pestMethod','วิธีจัดการ / สารที่ใช้ถ้ามี','text',true],['pestApproval','เลขอ้างอิงหรือลิงก์อนุมัติ (เมื่อใช้สาร)','text',false],['pestSds','เลขอ้างอิงหรือลิงก์ SDS (เมื่อใช้สาร)','text',false]], // เอกสารอ้างอิงเป็นข้อความ/ลิงก์ ไม่ใช่ช่องอัปโหลด
  waste:[['wasteDestination','จุดนำส่งเศษกิ่งไม้ / ใบไม้','text',true]], // ระบุปลายทางของเศษวัสดุ
  emergency:[['notifiedAt','วันเวลารับแจ้ง','datetime-local',true],['arrivedAt','วันเวลาถึงพื้นที่','datetime-local',true],['finishedAt','วันเวลาเสร็จ','datetime-local',true]] // ใช้วันเวลาครบเพื่อรองรับงานข้ามวัน
 };
 // รับรายการที่อ่านจากฐานแล้วกับเดือน YYYY-MM; ไม่สร้างคำขอไปฐานในฟังก์ชันนี้
 function summary(records,month){
  const groups=new Map(),points=new Set(); // กลุ่มรวมยอดตามงาน/หน่วย และเซตนับจุดไม่ซ้ำ
  let count=0,unmeasured=0; // แยกจำนวนรายการทั้งหมดจากจำนวนที่ไม่มีค่าปริมาณ
  for(const r of records){ // อ่านแต่ละรายการโดยไม่แก้ข้อมูลต้นฉบับ
   if(r.entryType!=='work'||typeof r.date!=='string'||r.date.slice(0,7)!==month)continue; // ไม่นับหลักฐานเพิ่มหรือเดือนอื่น
   count++; // นับรายการงานที่ตรงเดือน แม้ไม่มีปริมาณ
   points.add(String(r.areaCode)+'|'+String(r.location).trim()); // จุดชื่อเดียวกันคนละพื้นที่ถือเป็นคนละจุด
   if(r.quantity===''||r.quantity==null||!r.unit){unmeasured++;continue;} // ห้ามแปลงช่องว่างเป็นศูนย์หรือรวมจำนวนที่ไม่มีหน่วย
   const n=Number(r.quantity); // แปลงข้อความตัวเลขจากชีตให้คำนวณได้
   if(!Number.isFinite(n)||n<0)throw Error('ข้อมูลปริมาณในชีตไม่ถูกต้อง'); // หยุดแทนการรายงานยอดที่เสีย
   const key=JSON.stringify([r.task,r.unit]); // แยกงานและหน่วยอย่างชัดเจน ไม่ชนกันจากการต่อข้อความ
   const item=groups.get(key)||{task:r.task,unit:r.unit,quantity:0}; // เริ่มยอดใหม่เมื่อยังไม่เคยพบกลุ่มนี้
   item.quantity+=n; // บวกเฉพาะปริมาณที่ผ่านการตรวจและหน่วยเดียวกัน
   groups.set(key,item); // เก็บยอดล่าสุดกลับในกลุ่ม
  }
  return{count,points:points.size,unmeasured,groups:[...groups.values()]}; // ส่งผลพร้อมจำนวนจุดไม่ซ้ำและรายการที่วัดไม่ได้
 }
 root.GreenReport={spec,summary}; // เปิดตัวช่วยให้ prepare.js ใช้ในเบราว์เซอร์
 if(typeof module==='object')module.exports=root.GreenReport; // ให้ชุดทดสอบ Node เรียกตัวช่วยเดียวกับหน้าเว็บ
})(typeof window==='object'?window:globalThis); // ใช้ window ในหน้าเว็บ หรือ globalThis ในชุดทดสอบ
