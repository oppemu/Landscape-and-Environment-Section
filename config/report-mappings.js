/* ผังช่องข้อมูลที่ตัวแปลงฐานรวมส่งให้รายงาน ไม่ใช่การเดาคอลัมน์จากข้อมูลดิบ */
(function(root){
  // ปิดยอดจำหน่ายรายสินค้าที่ไม่มีข้อมูล และระบุช่องวันที่/น้ำหนักของขยะทั่วไป
  const mappings={humusItemSales:false,generalKg:{tab:'ขยะทั่วไป',dateHeader:'วันที่',valueHeader:'น้ำหนัก'}};
  // สร้างผังผลผลิต ยอดขาย และรายรับแยกสามผลิตภัณฑ์ โดยไม่เอาหน่วยมารวมกัน
  ['humus','soil','liquid'].forEach(key=>{
    mappings[key+'Produced']={tab:'ผลิต-'+key,dateHeader:'วันที่',valueHeader:'ปริมาณ'};
    mappings[key+'Sold']={tab:'ขาย-'+key,dateHeader:'วันที่',valueHeader:'ปริมาณ'};
    mappings[key+'Revenue']={tab:'ขาย-'+key,dateHeader:'วันที่',valueHeader:'เงิน'};
  });
  // เผยแพร่ผังอ่านอย่างเดียวให้หน้ารายงานใช้ร่วมกัน
  root.HubReportMappings=Object.freeze(mappings);
})(typeof window==='undefined'?globalThis:window);
