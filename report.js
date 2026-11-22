/* แกนรายงานคำนวณจากชุดข้อมูลที่ตรวจรูปแบบแล้ว แยกน้ำหนัก ปริมาตร และเงิน
 * ค่าที่หายหรือหน่วยไม่ตรงไม่ใช่ศูนย์ ต้องรักษาสถานะ unknown เพื่อไม่ทำให้รายงานดูครบเกินจริง */
/* รวมรายวัน/เดือน/ปีด้วยหัวคอลัมน์ตรงชื่อ อ่านอย่างเดียว ไม่มีเครือข่ายหรือการบันทึกถาวร */
// แยกขอบเขตตัวแปรของโมดูลและรับ root สำหรับ browser หรือ Node tests
(function (root) {
  // เปิด strict mode เพื่อให้การใช้ตัวแปรผิดรูปแบบแจ้งข้อผิดพลาด
  'use strict';
  // ตารางชื่อแสดงผลและหน่วยของสิบตัวชี้วัด ไม่ใช่เป้าหมาย ISO
  const definitions = {
    // กำหนด foodKg: น้ำหนักเศษอาหารที่เก็บรวบรวม หน่วยกิโลกรัม
    foodKg: ['เศษอาหารที่เก็บรวบรวม', 'กก.'],
    // กำหนด freshKg: น้ำหนักพืชสดรับเข้า หน่วยกิโลกรัม
    freshKg: ['พืชสดรับเข้า', 'กก.'],
    // กำหนด humusKg: ปริมาณฮิวมัสในทะเบียนตรวจคุณภาพ หน่วยกิโลกรัม ไม่ใช่การรับรองผลผลิต
    humusKg: ['ปริมาณฮิวมัสที่บันทึกตรวจคุณภาพ', 'กก.'],
    // กำหนด fertilizerKg: น้ำหนักปุ๋ยที่จำหน่าย หน่วยกิโลกรัม
    fertilizerKg: ['ปุ๋ยที่จำหน่าย', 'กก.'],
    // กำหนด fertilizerBaht: รายได้จำหน่ายปุ๋ย หน่วยบาท ไม่ใช่กำไร
    fertilizerBaht: ['รายได้จำหน่ายปุ๋ย', 'บาท'],
    // กำหนด recycleReceivedKg: น้ำหนักรีไซเคิลรับเข้า หน่วยกิโลกรัม
    recycleReceivedKg: ['รีไซเคิลรับเข้า', 'กก.'],
    // กำหนด recycleReceivedBaht: มูลค่ารีไซเคิลรับเข้า หน่วยบาท
    recycleReceivedBaht: ['มูลค่ารีไซเคิลรับเข้า', 'บาท'],
    // กำหนด recycleSoldKg: น้ำหนักรีไซเคิลขายออก หน่วยกิโลกรัม แยกจากรับเข้า
    recycleSoldKg: ['รีไซเคิลจำหน่าย', 'กก.'],
    // กำหนด recycleSoldBaht: รายได้รีไซเคิลขายออก หน่วยบาท
    recycleSoldBaht: ['รายได้รีไซเคิลจำหน่าย', 'บาท'],
    // กำหนด hazardKg: น้ำหนักขยะอันตรายที่แจ้ง หน่วยกิโลกรัม ยังไม่ยืนยันกำจัดจริง
    hazardKg: ['ขยะอันตรายที่แจ้ง', 'กก.'],
  // ปิดบล็อก/โครงสร้างใน report.js
  };
  // ตารางจับคู่ตัวชี้วัดกับแท็บและหัวคอลัมน์จริงจากฐานข้อมูลเดิม
  const defaultSchema = {
    // กำหนด foodKg: น้ำหนักเศษอาหารที่เก็บรวบรวม หน่วยกิโลกรัม
    foodKg: {
      // ชี้แท็บต้นทาง 'เก็บเศษอาหาร' แบบตรงชื่อ ไม่ใช้ลำดับแท็บ
      tab: 'เก็บเศษอาหาร',
      // ใช้วันที่จากคอลัมน์ 'วันที่บันทึก' สำหรับจัดช่วงรายงาน ไม่ใช้วันที่เครื่องผู้ดู
      dateHeader: 'วันที่บันทึก',
      // เลือกคอลัมน์ค่าที่จะรวม: 'น้ำหนัก (กก.)'
      valueHeader: 'น้ำหนัก (กก.)',
    // ปิดบล็อก/โครงสร้างใน report.js
    },
    // กำหนด freshKg: น้ำหนักพืชสดรับเข้า หน่วยกิโลกรัม
    freshKg: {
      // ชี้แท็บต้นทาง 'ปริมาณการรับเข้าพืชสด' แบบตรงชื่อ ไม่ใช้ลำดับแท็บ
      tab: 'ปริมาณการรับเข้าพืชสด',
      // ใช้วันที่จากคอลัมน์ 'วัน/เดือน/ปี' สำหรับจัดช่วงรายงาน ไม่ใช้วันที่เครื่องผู้ดู
      dateHeader: 'วัน/เดือน/ปี',
      // เลือกคอลัมน์ค่าที่จะรวม: 'น้ำหนัก (กิโลกรัม)'
      valueHeader: 'น้ำหนัก (กิโลกรัม)',
    // ปิดบล็อก/โครงสร้างใน report.js
    },
    // กำหนด humusKg: ปริมาณฮิวมัสในทะเบียนตรวจคุณภาพ หน่วยกิโลกรัม ไม่ใช่การรับรองผลผลิต
    humusKg: {
      // ชี้แท็บต้นทาง 'ข้อมูลฮิวมัส' แบบตรงชื่อ ไม่ใช้ลำดับแท็บ
      tab: 'ข้อมูลฮิวมัส',
      // ใช้วันที่จากคอลัมน์ 'วัน/เดือน/ปี' สำหรับจัดช่วงรายงาน ไม่ใช้วันที่เครื่องผู้ดู
      dateHeader: 'วัน/เดือน/ปี',
      // เลือกคอลัมน์ค่าที่จะรวม: 'ปริมาณการผลิตฮิวมัส'
      valueHeader: 'ปริมาณการผลิตฮิวมัส',
    // ปิดบล็อก/โครงสร้างใน report.js
    },
    // กำหนด fertilizerKg: น้ำหนักปุ๋ยที่จำหน่าย หน่วยกิโลกรัม
    fertilizerKg: {
      // ชี้แท็บต้นทาง 'ยอดจำหน่ายปุ๋ย' แบบตรงชื่อ ไม่ใช้ลำดับแท็บ
      tab: 'ยอดจำหน่ายปุ๋ย',
      // ใช้วันที่จากคอลัมน์ 'วัน/เดือน/ปี' สำหรับจัดช่วงรายงาน ไม่ใช้วันที่เครื่องผู้ดู
      dateHeader: 'วัน/เดือน/ปี',
      // เลือกคอลัมน์ค่าที่จะรวม: 'น้ำหนักรวม (กิโลกรัม)'
      valueHeader: 'น้ำหนักรวม (กิโลกรัม)',
    // ปิดบล็อก/โครงสร้างใน report.js
    },
    // กำหนด fertilizerBaht: รายได้จำหน่ายปุ๋ย หน่วยบาท ไม่ใช่กำไร
    fertilizerBaht: {
      // ชี้แท็บต้นทาง 'ยอดจำหน่ายปุ๋ย' แบบตรงชื่อ ไม่ใช้ลำดับแท็บ
      tab: 'ยอดจำหน่ายปุ๋ย',
      // ใช้วันที่จากคอลัมน์ 'วัน/เดือน/ปี' สำหรับจัดช่วงรายงาน ไม่ใช้วันที่เครื่องผู้ดู
      dateHeader: 'วัน/เดือน/ปี',
      // เลือกคอลัมน์ค่าที่จะรวม: 'ราคาที่จำหน่าย'
      valueHeader: 'ราคาที่จำหน่าย',
    // ปิดบล็อก/โครงสร้างใน report.js
    },
    // กำหนด hazardKg: น้ำหนักขยะอันตรายที่แจ้ง หน่วยกิโลกรัม ยังไม่ยืนยันกำจัดจริง
    hazardKg: {
      // ชี้แท็บต้นทาง 'ข้อมูลขยะอันตรายหน่วยงานแจ้งเข้ามา' แบบตรงชื่อ ไม่ใช้ลำดับแท็บ
      tab: 'ข้อมูลขยะอันตรายหน่วยงานแจ้งเข้ามา',
      // ใช้วันที่จากคอลัมน์ 'วันที่แจ้ง' สำหรับจัดช่วงรายงาน ไม่ใช้วันที่เครื่องผู้ดู
      dateHeader: 'วันที่แจ้ง',
      // เลือกคอลัมน์ค่าที่จะรวม: 'น้ำหนักรวม (กก.)'
      valueHeader: 'น้ำหนักรวม (กก.)',
    // ปิดบล็อก/โครงสร้างใน report.js
    },
  // ปิดบล็อก/โครงสร้างใน report.js
  };
  // วนเฉพาะรายการ for (const [id, kind, money] of [ เพื่อประมวลผลทีละตัวใน report.js
  for (const [id, kind, money] of [
    // กำหนด recycleReceivedKg: น้ำหนักรีไซเคิลรับเข้า หน่วยกิโลกรัม โดยเลือกชนิดรายการและระบุว่าใช้ยอดเงินหรือไม่
    ['recycleReceivedKg', 'รับเข้า', false],
    // กำหนด recycleReceivedBaht: มูลค่ารีไซเคิลรับเข้า หน่วยบาท โดยเลือกชนิดรายการและระบุว่าใช้ยอดเงินหรือไม่
    ['recycleReceivedBaht', 'รับเข้า', true],
    // กำหนด recycleSoldKg: น้ำหนักรีไซเคิลขายออก หน่วยกิโลกรัม แยกจากรับเข้า โดยเลือกชนิดรายการและระบุว่าใช้ยอดเงินหรือไม่
    ['recycleSoldKg', 'ขายออก', false],
    // กำหนด recycleSoldBaht: รายได้รีไซเคิลขายออก หน่วยบาท โดยเลือกชนิดรายการและระบุว่าใช้ยอดเงินหรือไม่
    ['recycleSoldBaht', 'ขายออก', true],
  // ปิดบล็อก/โครงสร้างใน report.js
  ])
    // ใน report.js ใช้ defaultSchema[id] = { เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
    defaultSchema[id] = {
      // ชี้แท็บต้นทาง 'ธนาคารขยะ' แบบตรงชื่อ ไม่ใช้ลำดับแท็บ
      tab: 'ธนาคารขยะ',
      // ใช้วันที่จากคอลัมน์ 'วันที่' สำหรับจัดช่วงรายงาน ไม่ใช้วันที่เครื่องผู้ดู
      dateHeader: 'วันที่',
      // เลือกคอลัมน์ค่าที่จะรวม: money ? 'รวมเป็นเงิน (บาท)' : 'น้ำหนัก (กก.)' แยกเงินกับน้ำหนัก
      valueHeader: money ? 'รวมเป็นเงิน (บาท)' : 'น้ำหนัก (กก.)',
      // แยกเงื่อนไขประเภทธุรกรรมธนาคารขยะออกจากสูตรรวมค่า
      filter: {
        // อ่านหัวประเภทรายการสำหรับกรองรับเข้า/ขายออก
        header: 'ประเภทรายการ',
        // ใช้ค่า รับเข้า หรือ ขายออก ของตัวชี้วัดปัจจุบันเท่านั้น
        equals: kind,
        // อนุญาตเฉพาะประเภทรายการรับเข้าและขายออก; ค่าอื่นถือว่าไม่รู้จัก
        allowed: ['รับเข้า', 'ขายออก'],
      // ปิดบล็อก/โครงสร้างใน report.js
      },
    // ปิดบล็อก/โครงสร้างใน report.js
    };
  // แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ
  // แยกปีเดือนวันจากรูปแบบที่รองรับ ไม่เดาค่าที่ตีความไม่ได้
  function dateParts(value) {
    // ตรวจเงื่อนไข if (typeof value !== 'string') return null; ใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ ก่อนอนุญาตขั้นตอนถัดไป
    if (typeof value !== 'string') return null;
    // กำหนด let text จาก  value สำหรับ แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ
    let text = value
      // ตัดช่องว่างหัวท้ายก่อนตรวจวันที่หรือตัวเลข แต่ไม่แก้ส่วนกลาง
      .trim()
      // แปลงเลขไทยเป็นเลขอารบิกโดยลบ Unicode ของเลขศูนย์ไทย 3664
      .replace(/[๐-๙]/g, (c) => String(c.charCodeAt(0) - 3664));
    // กำหนด const months จาก  [ สำหรับ แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ
    const months = [
      // ชื่อเดือน มกราคม อยู่ลำดับ 1 ใช้แปลงชื่อไทยเป็นเลขเดือน
      'มกราคม',
      // ชื่อเดือน กุมภาพันธ์ อยู่ลำดับ 2 ใช้แปลงชื่อไทยเป็นเลขเดือน
      'กุมภาพันธ์',
      // ชื่อเดือน มีนาคม อยู่ลำดับ 3 ใช้แปลงชื่อไทยเป็นเลขเดือน
      'มีนาคม',
      // ชื่อเดือน เมษายน อยู่ลำดับ 4 ใช้แปลงชื่อไทยเป็นเลขเดือน
      'เมษายน',
      // ชื่อเดือน พฤษภาคม อยู่ลำดับ 5 ใช้แปลงชื่อไทยเป็นเลขเดือน
      'พฤษภาคม',
      // ชื่อเดือน มิถุนายน อยู่ลำดับ 6 ใช้แปลงชื่อไทยเป็นเลขเดือน
      'มิถุนายน',
      // ชื่อเดือน กรกฎาคม อยู่ลำดับ 7 ใช้แปลงชื่อไทยเป็นเลขเดือน
      'กรกฎาคม',
      // ชื่อเดือน สิงหาคม อยู่ลำดับ 8 ใช้แปลงชื่อไทยเป็นเลขเดือน
      'สิงหาคม',
      // ชื่อเดือน กันยายน อยู่ลำดับ 9 ใช้แปลงชื่อไทยเป็นเลขเดือน
      'กันยายน',
      // ชื่อเดือน ตุลาคม อยู่ลำดับ 10 ใช้แปลงชื่อไทยเป็นเลขเดือน
      'ตุลาคม',
      // ชื่อเดือน พฤศจิกายน อยู่ลำดับ 11 ใช้แปลงชื่อไทยเป็นเลขเดือน
      'พฤศจิกายน',
      // ชื่อเดือน ธันวาคม อยู่ลำดับ 12 ใช้แปลงชื่อไทยเป็นเลขเดือน
      'ธันวาคม',
    // ปิดบล็อก/โครงสร้างใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ
    ];
    // กำหนด const thai จาก  text.match( สำหรับ แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ
    const thai = text.match(
      // รับวันที่ชื่อเดือนภาษาไทยเต็ม พร้อมคำนำหน้าวันที่เป็นทางเลือก ไม่รับปีสองหลัก
      /^(?:วัน[ก-๙]+\s+(?:ที่\s+)?)?(\d{1,2})\s+([ก-๙]+)\s+(\d{4})$/,
    // ปิดบล็อก/โครงสร้างใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ
    );
    // ตรวจเงื่อนไข if (thai && months.includes(thai[2])) ใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ ก่อนอนุญาตขั้นตอนถัดไป
    if (thai && months.includes(thai[2]))
      // ใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ ใช้ text = `${thai[3]}-${months.indexOf(thai[2]) + 1}-${thai[1]}`; เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      text = `${thai[3]}-${months.indexOf(thai[2]) + 1}-${thai[1]}`;
    // กำหนด let match จาก  text.match( สำหรับ แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ
    let match = text.match(
      // รับ ISO ปี-เดือน-วัน พร้อมเวลา/offset ทางเลือก โดยห้ามข้อความต่อท้ายอื่น
      /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?)?$/,
    // ปิดบล็อก/โครงสร้างใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ
    );
    // เตรียมส่วนปี เดือน วัน เวลา และ offset แยกกันก่อนตรวจขอบเขต
    let y, mo, d, hour, minute, second, zone;
    // ตรวจเงื่อนไข if (match) { ใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ ก่อนอนุญาตขั้นตอนถัดไป
    if (match) {
      // แตกผลจับคู่ ISO ตามลำดับปี-เดือน-วัน และเวลา/offset โดยข้าม millisecond ที่ไม่เปลี่ยนวัน
      [, y, mo, d, hour, minute, second, , zone] = match;
    // ใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ ใช้ } else { เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
    } else {
      // ใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ ใช้ match = text.match( เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      match = text.match(
        // รับวัน/เดือน/ปีแบบทะเบียนไทยเท่านั้น ไม่เดารูปแบบเดือน/วัน/ปี
        /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?: (\d{2}):(\d{2})(?::(\d{2}))?)?$/,
      // ปิดบล็อก/โครงสร้างใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ
      );
      // ตรวจเงื่อนไข if (!match) return null; ใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ ก่อนอนุญาตขั้นตอนถัดไป
      if (!match) return null;
      // แตกผลจับคู่แบบไทยตามลำดับวัน-เดือน-ปีและเวลาที่อาจมี
      [, d, mo, y, hour, minute, second] = match;
    // ปิดบล็อก/โครงสร้างใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ
    }
    // แปลงส่วน y จากข้อความเป็นตัวเลขก่อนตรวจวันที่
    y = Number(y);
    // แปลงส่วน mo จากข้อความเป็นตัวเลขก่อนตรวจวันที่
    mo = Number(mo);
    // แปลงส่วน d จากข้อความเป็นตัวเลขก่อนตรวจวันที่
    d = Number(d);
    // ปีตั้งแต่ 2400 ถือเป็น พ.ศ. ตามทะเบียนไทย ลบ 543 ก่อนตรวจวันจริง
    if (y >= 2400) y -= 543;
    // เริ่มเงื่อนไขหลายบรรทัดใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ; รายการถัดไปต้องประเมินร่วมกัน
    if (
      // จำกัดปีรายงานให้เป็น ค.ศ. 1900–2399 หลังแปลง พ.ศ. เพื่อไม่รับปีคลุมเครือ
      y < 1900 ||
      // จำกัดปีรายงานให้เป็น ค.ศ. 1900–2399 หลังแปลง พ.ศ. เพื่อไม่รับปีคลุมเครือ
      y > 2399 ||
      // ชั่วโมงต้องไม่เกิน23; เมื่อไม่ระบุเวลาใช้ศูนย์สำหรับการตรวจ
      Number(hour || 0) > 23 ||
      // นาทีต้องไม่เกิน59
      Number(minute || 0) > 59 ||
      // วินาทีต้องไม่เกิน59 ไม่เดา leap second
      Number(second || 0) > 59
    // ปิดบล็อก/โครงสร้างใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ
    )
      // คืน null เพื่อระบุว่าใช้ค่าไม่ได้ ไม่แทนด้วยวันที่หรือยอดศูนย์
      return null;
    // สร้างฐานเวลา UTC เพื่อไม่ขึ้นกับ timezone เครื่อง และตรวจว่า Date ไม่เลื่อนวันผิดไปเดือนถัดไป
    let time = new Date(Date.UTC(y, mo - 1, d));
    // เริ่มเงื่อนไขหลายบรรทัดใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ; รายการถัดไปต้องประเมินร่วมกัน
    if (
      // ตรวจปีที่ Date สร้างได้กลับมาตรงต้นฉบับ ปฏิเสธวันล้นปี
      time.getUTCFullYear() !== y ||
      // ตรวจเดือนกลับมาตรงต้นฉบับ ปฏิเสธวันที่เช่น 30 กุมภาพันธ์
      time.getUTCMonth() !== mo - 1 ||
      // ตรวจเลขวันกลับมาตรงต้นฉบับ รวมกรณีปีอธิกสุรทิน
      time.getUTCDate() !== d
    // ปิดบล็อก/โครงสร้างใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ
    )
      // คืน null เพื่อระบุว่าใช้ค่าไม่ได้ ไม่แทนด้วยวันที่หรือยอดศูนย์
      return null;
    // ตรวจเงื่อนไข if (zone) { ใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ ก่อนอนุญาตขั้นตอนถัดไป
    if (zone) {
      // ตั้ง offset ศูนย์ไว้สำหรับ timestamp ที่ลงท้าย Z
      let offset = 0;
      // Z หมายถึง UTC offset ศูนย์; เฉพาะ offset แบบตัวเลขต้องคำนวณเพิ่ม
      if (zone !== 'Z') {
        // อ่านตัวเลขชั่วโมงจาก offset รูปแบบ ±HH:mm
        const zh = Number(zone.slice(1, 3)),
          // อ่านตัวเลขนาทีจาก offset รูปแบบ ±HH:mm
          zm = Number(zone.slice(4, 6));
        // จำกัด timezone offset ไม่เกิน ±14:00 และนาทีไม่เกิน 59
        if (zh > 14 || zm > 59 || (zh === 14 && zm !== 0)) return null;
        // รวมชั่วโมงกับนาทีของ offset แล้วใส่เครื่องหมายบวก/ลบให้ตรงต้นทาง
        offset = (zh * 60 + zm) * (zone[0] === '-' ? -1 : 1);
      // ปิดบล็อก/โครงสร้างใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ
      }
      // ใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ ใช้ time = new Date( เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      time = new Date(
        // สร้างฐานเวลา UTC เพื่อไม่ขึ้นกับ timezone เครื่อง และตรวจว่า Date ไม่เลื่อนวันผิดไปเดือนถัดไป
        Date.UTC(
          // ส่งปี ค.ศ. ที่แปลงแล้วเข้า Date.UTC
          y,
          // ปรับเดือน1–12เป็น0–11ตาม API Date.UTC
          mo - 1,
          // ส่งวันของเดือนที่ตรวจแล้ว
          d,
          // ใช้ชั่วโมงของ timestamp ต้นทาง
          Number(hour),
          // ใช้นาทีของ timestamp ต้นทาง
          Number(minute),
          // ใช้วินาทีต้นทาง หรือศูนย์เมื่อไม่ระบุ
          Number(second || 0),
        // ใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ ใช้ ) + เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        ) +
          // 420 คือนาที UTC+7 ของกรุงเทพ ลบ offset ต้นทางแล้วคูณ 60000 เป็นมิลลิวินาทีเพื่อเลื่อนวัน
          (420 - offset) * 60000,
      // ปิดบล็อก/โครงสร้างใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ
      );
      // อ่านปีหลังปรับเวลามาเป็นกรุงเทพแล้ว
      y = time.getUTCFullYear();
      // แปลงเดือน JavaScript 0–11 กลับเป็นเดือน 1–12 หลังปรับเวลา
      mo = time.getUTCMonth() + 1;
      // อ่านวันในเดือนหลังปรับเวลามาเป็นกรุงเทพแล้ว
      d = time.getUTCDate();
    // ปิดบล็อก/โครงสร้างใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ
    }
    // สร้างคีย์เดือน YYYY-MM หลังแปลงเป็นวันกรุงเทพแล้ว
    const key = `${y}-${String(mo).padStart(2, '0')}`;
    // คืนผล { จาก แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ
    return {
      // คืนปี ค.ศ. ที่ตรวจและปรับเขตเวลาแล้ว
      year: y,
      // คืนเลขเดือน1–12ที่ตรวจแล้ว
      month: mo,
      // คืนวันของเดือนที่ตรวจแล้ว
      day: d,
      // ใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ ใช้ key, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      key,
      // สร้างคีย์รายวัน YYYY-MM-DD โดยเติมศูนย์เลขวันให้ครบสองหลัก
      dayKey: `${key}-${String(d).padStart(2, '0')}`,
    // ปิดบล็อก/โครงสร้างใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ
    };
  // ปิดบล็อก/โครงสร้างใน แยกวันที่ไทย/ISO ตรวจวันจริง และแปลง offset เป็นวันกรุงเทพ
  }
  // แปลงเดือนแบบเก่าเป็น period และตรวจชนิดช่วง/ปี/วันจริง
  // ตรวจและแปลงช่วงวัน เดือน ปีเป็น schema เดียวก่อนรวม
  function normalizePeriod(value) {
    // กำหนด const period จาก  typeof value === 'string' ? { type: 'month', value } : value สำหรับ แปลงเดือนแบบเก่าเป็น period และตรวจชนิดช่วง/ปี/วันจริง
    const period = typeof value === 'string' ? { type: 'month', value } : value;
    // ตรวจเงื่อนไข if (!period || typeof period.value !== 'string') ใน แปลงเดือนแบบเก่าเป็น period และตรวจชนิดช่วง/ปี/วันจริง ก่อนอนุญาตขั้นตอนถัดไป
    if (!period || typeof period.value !== 'string')
      // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: Error('ช่วงรายงานไม่ถูกต้อง: YYYY-MM-DD / YYYY-MM / YYYY')
      throw Error('ช่วงรายงานไม่ถูกต้อง: YYYY-MM-DD / YYYY-MM / YYYY');
    // กำหนด const patterns จาก  { สำหรับ แปลงเดือนแบบเก่าเป็น period และตรวจชนิดช่วง/ปี/วันจริง
    const patterns = {
      // กำหนดรูปแบบ day ให้ใช้ปี ค.ศ. สี่หลักและส่วนวัน/เดือนตามชนิดช่วง
      day: /^\d{4}-\d{2}-\d{2}$/,
      // กำหนดรูปแบบ month ให้ใช้ปี ค.ศ. สี่หลักและส่วนวัน/เดือนตามชนิดช่วง
      month: /^\d{4}-(0[1-9]|1[0-2])$/,
      // กำหนดรูปแบบ year ให้ใช้ปี ค.ศ. สี่หลักและส่วนวัน/เดือนตามชนิดช่วง
      year: /^\d{4}$/,
    // ปิดบล็อก/โครงสร้างใน แปลงเดือนแบบเก่าเป็น period และตรวจชนิดช่วง/ปี/วันจริง
    };
    // ตรวจเงื่อนไข if (!patterns[period.type] || !patterns[period.type].test(period.value)) ใน แปลงเดือนแบบเก่าเป็น period และตรวจชนิดช่วง/ปี/วันจริง ก่อนอนุญาตขั้นตอนถัดไป
    if (!patterns[period.type] || !patterns[period.type].test(period.value))
      // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: Error('ช่วงรายงานไม่ถูกต้อง: YYYY-MM-DD / YYYY-MM / YYYY')
      throw Error('ช่วงรายงานไม่ถูกต้อง: YYYY-MM-DD / YYYY-MM / YYYY');
    // กำหนด const year จาก  Number(period.value.slice(0, 4)) สำหรับ แปลงเดือนแบบเก่าเป็น period และตรวจชนิดช่วง/ปี/วันจริง
    const year = Number(period.value.slice(0, 4));
    // เริ่มเงื่อนไขหลายบรรทัดใน แปลงเดือนแบบเก่าเป็น period และตรวจชนิดช่วง/ปี/วันจริง; รายการถัดไปต้องประเมินร่วมกัน
    if (
      // จำกัดปีรายงานให้เป็น ค.ศ. 1900–2399 หลังแปลง พ.ศ. เพื่อไม่รับปีคลุมเครือ
      year < 1900 ||
      // จำกัดปีรายงานให้เป็น ค.ศ. 1900–2399 หลังแปลง พ.ศ. เพื่อไม่รับปีคลุมเครือ
      year >= 2400 ||
      // ใน แปลงเดือนแบบเก่าเป็น period และตรวจชนิดช่วง/ปี/วันจริง ใช้ (period.type === 'day' && !dateParts(period.value)) เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      (period.type === 'day' && !dateParts(period.value))
    // ปิดบล็อก/โครงสร้างใน แปลงเดือนแบบเก่าเป็น period และตรวจชนิดช่วง/ปี/วันจริง
    )
      // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: Error('ใช้ช่วงรายงาน ค.ศ. ที่มีอยู่จริง')
      throw Error('ใช้ช่วงรายงาน ค.ศ. ที่มีอยู่จริง');
    // คืนผล { type: period.type, value: period.value } จาก แปลงเดือนแบบเก่าเป็น period และตรวจชนิดช่วง/ปี/วันจริง
    return { type: period.type, value: period.value };
  // ปิดบล็อก/โครงสร้างใน แปลงเดือนแบบเก่าเป็น period และตรวจชนิดช่วง/ปี/วันจริง
  }
  // เทียบวัน เดือน หรือปีของแถวกับช่วงรายงานที่เลือก
  // ตรวจวันที่อยู่ในช่วงที่เลือกโดยไม่แก้ต้นฉบับ
  function matchesPeriod(date, period) {
    // เริ่มเงื่อนไขหลายบรรทัดใน เทียบวัน เดือน หรือปีของแถวกับช่วงรายงานที่เลือก; รายการถัดไปต้องประเมินร่วมกัน
    return (
      // ใน เทียบวัน เดือน หรือปีของแถวกับช่วงรายงานที่เลือก ใช้ !!date && เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      !!date &&
      // ใน เทียบวัน เดือน หรือปีของแถวกับช่วงรายงานที่เลือก ใช้ (period.type === 'day' เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      (period.type === 'day'
        // ใน เทียบวัน เดือน หรือปีของแถวกับช่วงรายงานที่เลือก ใช้ ? date.dayKey === period.value เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        ? date.dayKey === period.value
        // ใน เทียบวัน เดือน หรือปีของแถวกับช่วงรายงานที่เลือก ใช้ : period.type === 'month' เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        : period.type === 'month'
          // ใน เทียบวัน เดือน หรือปีของแถวกับช่วงรายงานที่เลือก ใช้ ? date.key === period.value เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
          ? date.key === period.value
          // ใน เทียบวัน เดือน หรือปีของแถวกับช่วงรายงานที่เลือก ใช้ : String(date.year) === period.value) เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
          : String(date.year) === period.value)
    // ปิดบล็อก/โครงสร้างใน เทียบวัน เดือน หรือปีของแถวกับช่วงรายงานที่เลือก
    );
  // ปิดบล็อก/โครงสร้างใน เทียบวัน เดือน หรือปีของแถวกับช่วงรายงานที่เลือก
  }
  // พิสูจน์ว่าช่วงต้นทางครอบคลุมช่วงที่ขอ ก่อนให้รวมยอด
  // ตรวจขอบเขตข้อมูลครอบคลุมช่วงจริง ไม่แสดงยอดบางส่วนเป็นยอดเต็ม
  function coverageContains(coverage, requested) {
    // coverage ที่ไม่ระบุอนุญาตเฉพาะรายเดือนเพื่อรองรับไฟล์เก่า ไม่ยืนยันวันหรือปี
    if (!coverage) return requested.type === 'month';
    // ใน พิสูจน์ว่าช่วงต้นทางครอบคลุมช่วงที่ขอ ก่อนให้รวมยอด ใช้ try { เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
    try {
      // กำหนด const source จาก  normalizePeriod(coverage) สำหรับ พิสูจน์ว่าช่วงต้นทางครอบคลุมช่วงที่ขอ ก่อนให้รวมยอด
      const source = normalizePeriod(coverage);
      // จัดลำดับขอบเขต ปี=1 เดือน=2 วัน=3 เพื่ออนุญาตกว้างไปแคบเท่านั้น
      const rank = { year: 1, month: 2, day: 3 };
      // เริ่มเงื่อนไขหลายบรรทัดใน พิสูจน์ว่าช่วงต้นทางครอบคลุมช่วงที่ขอ ก่อนให้รวมยอด; รายการถัดไปต้องประเมินร่วมกัน
      return (
        // ช่วงต้นทางต้องกว้างกว่าหรือเท่าช่วงรายงาน จึงห้ามเดือนใช้รับรองยอดปี
        rank[source.type] <= rank[requested.type] &&
        // นอกจากขนาดช่วงแล้ว ปี/เดือนต้องตรงกัน เช่นปี 2024 ไม่ครอบคลุมวันในปี 2025
        requested.value.startsWith(source.value)
      // ปิดบล็อก/โครงสร้างใน พิสูจน์ว่าช่วงต้นทางครอบคลุมช่วงที่ขอ ก่อนให้รวมยอด
      );
    // ใน พิสูจน์ว่าช่วงต้นทางครอบคลุมช่วงที่ขอ ก่อนให้รวมยอด ใช้ } catch (_) { เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
    } catch (_) {
      // ปฏิเสธ coverage ที่ตรวจไม่ได้ จึงไม่อ้างว่าข้อมูลครบช่วง
      return false;
    // ปิดบล็อก/โครงสร้างใน พิสูจน์ว่าช่วงต้นทางครอบคลุมช่วงที่ขอ ก่อนให้รวมยอด
    }
  // ปิดบล็อก/โครงสร้างใน พิสูจน์ว่าช่วงต้นทางครอบคลุมช่วงที่ขอ ก่อนให้รวมยอด
  }
  // รับเฉพาะจำนวนไม่ติดลบที่แปลงได้แน่นอนและไม่เกิน safe integer
  // แปลงจำนวนที่รองรับ แยกไม่ทราบค่าออกจากศูนย์
  function number(value) {
    // ตรวจเงื่อนไข if (typeof value === 'number') ใน รับเฉพาะจำนวนไม่ติดลบที่แปลงได้แน่นอนและไม่เกิน safe integer ก่อนอนุญาตขั้นตอนถัดไป
    if (typeof value === 'number')
      // คืนผล Number.isFinite(value) && จาก รับเฉพาะจำนวนไม่ติดลบที่แปลงได้แน่นอนและไม่เกิน safe integer
      return Number.isFinite(value) &&
        // ใน รับเฉพาะจำนวนไม่ติดลบที่แปลงได้แน่นอนและไม่เกิน safe integer ใช้ value >= 0 && เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        value >= 0 &&
        // ปฏิเสธค่าที่เกินความแม่นยำจำนวนเต็มของ JavaScript แทนการรวมยอดผิด
        value <= Number.MAX_SAFE_INTEGER
        // ใน รับเฉพาะจำนวนไม่ติดลบที่แปลงได้แน่นอนและไม่เกิน safe integer ใช้ ? value เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        ? value
        // ใน รับเฉพาะจำนวนไม่ติดลบที่แปลงได้แน่นอนและไม่เกิน safe integer ใช้ : null; เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        : null;
    // ตรวจเงื่อนไข if (typeof value !== 'string' || !value.trim()) return null; ใน รับเฉพาะจำนวนไม่ติดลบที่แปลงได้แน่นอนและไม่เกิน safe integer ก่อนอนุญาตขั้นตอนถัดไป
    if (typeof value !== 'string' || !value.trim()) return null;
    // กำหนด const s จาก  value สำหรับ รับเฉพาะจำนวนไม่ติดลบที่แปลงได้แน่นอนและไม่เกิน safe integer
    const s = value
      // ตัดช่องว่างหัวท้ายก่อนตรวจวันที่หรือตัวเลข แต่ไม่แก้ส่วนกลาง
      .trim()
      // แปลงเลขไทยเป็นเลขอารบิกโดยลบ Unicode ของเลขศูนย์ไทย 3664
      .replace(/[๐-๙]/g, (c) => String(c.charCodeAt(0) - 3664));
    // ตรวจเงื่อนไข if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(s)) return null; ใน รับเฉพาะจำนวนไม่ติดลบที่แปลงได้แน่นอนและไม่เกิน safe integer ก่อนอนุญาตขั้นตอนถัดไป
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(s)) return null;
    // กำหนด const n จาก  Number(s.replace(/,/g, '')) สำหรับ รับเฉพาะจำนวนไม่ติดลบที่แปลงได้แน่นอนและไม่เกิน safe integer
    const n = Number(s.replace(/,/g, ''));
    // ปฏิเสธค่าที่เกินความแม่นยำจำนวนเต็มของ JavaScript แทนการรวมยอดผิด
    return Number.isFinite(n) && n <= Number.MAX_SAFE_INTEGER ? n : null;
  // ปิดบล็อก/โครงสร้างใน รับเฉพาะจำนวนไม่ติดลบที่แปลงได้แน่นอนและไม่เกิน safe integer
  }
  // รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
  // Hazard rows repeat a submission-wide total for each category. Never infer identity
  // from timestamp, date, weight, contact or category. Only an explicit stable ID counts.
  // รวมขยะอันตรายด้วยรหัสแจ้ง/mapping ป้องกันยอดรายละเอียดซ้ำ
  function aggregateHazard(ds, map, period, out) {
    const header = map.submissionIdHeader || 'รหัสการแจ้ง';
    const hasId = ds.headers.filter(h => h === header).length === 1;
    const groups = new Map();
    let uncertain = 0, matched = 0;
    for (const row of ds.rows) {
      if ((Array.isArray(row) ? row : Object.values(row || {})).every(v => v == null || String(v).trim() === '')) continue;
      const get = h => Array.isArray(row) ? row[ds.headers.indexOf(h)] : row && row[h];
      const date = dateParts(get(map.dateHeader));
      const inPeriod = date && matchesPeriod(date, period);
      if (inPeriod) matched++;
      const rawId = hasId ? get(header) : null;
      const id = typeof rawId === 'string' ? rawId.trim() : '';
      const weight = number(get(map.valueHeader));
      if (!id) {
        if (!date || inPeriod) uncertain++;
        continue;
      }
      const prior = groups.get(id);
      const entry = { date: date?.dayKey || null, weight, inPeriod: Boolean(inPeriod), invalid: !date || weight === null, unknownDate: !date };
      if (!prior) groups.set(id, entry);
      else {
        prior.invalid ||= entry.invalid || prior.date !== entry.date || prior.weight !== entry.weight;
        prior.inPeriod ||= entry.inPeriod;
        prior.unknownDate ||= entry.unknownDate;
      }
    }
    let total = 0;
    for (const entry of groups.values()) {
      if (entry.invalid && (entry.unknownDate || entry.inPeriod)) { uncertain++; continue; }
      if (!entry.inPeriod) continue;
      if (!Number.isFinite(total + entry.weight) || total + entry.weight > Number.MAX_SAFE_INTEGER) { uncertain++; continue; }
      total += entry.weight;
      out.rows++;
    }
    out.sourceRows = matched;
    out.invalid = uncertain;
    out.status = uncertain ? 'unresolved' : matched ? 'ok' : 'no-records';
    out.value = uncertain ? null : Math.round((total + Number.EPSILON) * 1000000) / 1000000;
    if (uncertain) out.reason = 'ขาดรหัสการแจ้งที่ยืนยันได้ หรือรหัสเดียวกันมีข้อมูลขัดกัน จึงยังสรุปยอดไม่ได้';
    return out;
  }
  // Synchronous SHA-256 over UTF-8 keeps snapshot imports and live reads subject
  // to the same content check. This is an integrity checksum, not authentication.
  // ตรวจความตรงกันของชุดธนาคารขยะด้วย SHA-256 ไม่ใช่ปกปิดข้อมูล
  function bankSha256(text) {
    const bytes = new TextEncoder().encode(text), size = Math.ceil((bytes.length + 9) / 64) * 64;
    const buffer = new Uint8Array(size); buffer.set(bytes); buffer[bytes.length] = 128;
    const view = new DataView(buffer.buffer); view.setUint32(size - 8, Math.floor(bytes.length / 0x20000000)); view.setUint32(size - 4, (bytes.length * 8) >>> 0);
    const hash = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const k = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const rotate = (x, n) => (x >>> n) | (x << (32 - n)), words = new Uint32Array(64);
    for (let offset = 0; offset < size; offset += 64) {
      for (let i = 0; i < 16; i++) words[i] = view.getUint32(offset + i * 4);
      for (let i = 16; i < 64; i++) {
        const x = words[i - 15], y = words[i - 2];
        words[i] = (words[i - 16] + (rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3)) + words[i - 7] + (rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10))) >>> 0;
      }
      let [a,b,c,d,e,f,g,h] = hash;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (rotate(e,6) ^ rotate(e,11) ^ rotate(e,25)) + ((e & f) ^ (~e & g)) + k[i] + words[i]) >>> 0;
        const t2 = ((rotate(a,2) ^ rotate(a,13) ^ rotate(a,22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
      }
      [a,b,c,d,e,f,g,h].forEach((value, i) => { hash[i] = (hash[i] + value) >>> 0; });
    }
    return hash.map(value => value.toString(16).padStart(8, '0')).join('');
  }

  const BANK_MONTHLY = Object.freeze({
    dataSheet: 'BankMonthly_v1', journalSheet: 'BankImportJournal_v1',
    dataHeaders: Object.freeze(['schema_version', 'import_id', 'period_start', 'period_end', 'quantity_meaning', 'source_category_code', 'source_category_label', 'unit', 'quantity_minor', 'purchase_satang', 'sales_satang', 'profit_satang', 'canonical_sha256', 'accepted_at_utc']),
    journalHeaders: Object.freeze(['reservation_json', 'commit_json']),
  });
  const BANK_DIRECT = Object.freeze({
    sheet: 'ธนาคารขยะ', gid: '184283453', sourceMode: 'bank-direct-v1',
    headers: Object.freeze(["เดือนรายงาน","วันที่เริ่มงวด","วันที่สิ้นสุดงวด","รหัสประเภท","ประเภทขยะ","หน่วย","ปริมาณรับซื้อ","จำนวนเงินรับซื้อ (บาท)","จำนวนเงินขาย (บาท)","ผลต่างขาย − ซื้อ (บาท)","ความหมายปริมาณ","รุ่นโครงสร้างข้อมูล","รหัสนำเข้า","รหัสตรวจสอบข้อมูล","เวลารับข้อมูล (เวลาสากล)","ปริมาณรับซื้อ (หน่วยย่อย 1/100)","ยอดรับซื้อ (สตางค์)","ยอดขาย (สตางค์)","ผลต่างขาย − ซื้อ (สตางค์)","บันทึกจองรายการ","บันทึกยืนยันรายการ"]),
    legacyHeaders: Object.freeze(["เดือนรายงาน","วันที่เริ่มงวด","วันที่สิ้นสุดงวด","รหัสประเภท","ประเภทขยะ","หน่วย","ปริมาณรับซื้อ","จำนวนเงินรับซื้อ (บาท)","จำนวนเงินขาย (บาท)","กำไรจากการขาย (บาท)","ความหมายปริมาณ","schema_version","import_id","canonical_sha256","accepted_at_utc","quantity_hundredths","purchase_satang","sales_satang","profit_satang","reservation_json","commit_json"]),
  });
  function inspectBankMonthly(input) {
    const datasets = input.datasets || {};
    return inspectBankMonthlyTables(datasets[BANK_MONTHLY.dataSheet], datasets[BANK_MONTHLY.journalSheet]);
  }
  // The journal in T:U is independent of category rows in A:S. Split only in
  // memory and reuse the canonical validator; no extra physical tabs are read.
  // ตรวจชุดอ่านธนาคารขยะโดยตรงก่อนนำยอดไปใช้
  function inspectBankDirect(input) {
    const fail = message => { throw Error('ตรวจธนาคารขยะโดยตรงไม่ผ่าน: ' + message); };
    try {
      const datasets = input.datasets || {}, source = datasets[BANK_DIRECT.sheet];
      if ([BANK_MONTHLY.dataSheet, BANK_MONTHLY.journalSheet].some(name => datasets[name] && datasets[name].status !== 'missing')) fail('ระบุแหล่งรายเดือนซ้ำกับแท็บเดิม');
      if (!source || source.status !== 'loaded') fail('อ่านแท็บธนาคารขยะไม่สำเร็จ');
      if (!Array.isArray(source.headers) || source.headers.length !== BANK_DIRECT.headers.length || ![BANK_DIRECT.headers, BANK_DIRECT.legacyHeaders].some(known => known.every((header, i) => source.headers[i] === header)) || !Array.isArray(source.rows)) fail('หัวคอลัมน์หรือโครงสร้างไม่ตรงรุ่น');
      const data = { status: 'loaded', headers: BANK_MONTHLY.dataHeaders, rows: [] };
      const journal = { status: 'loaded', headers: BANK_MONTHLY.journalHeaders, rows: [] };
      const blank = value => value === '' || value === null;
      for (const row of source.rows) {
        if (!Array.isArray(row) || row.length !== BANK_DIRECT.headers.length) fail('คอลัมน์ในแถวไม่ครบ');
        if (!row.slice(19).every(blank)) journal.rows.push(row.slice(19));
        if (row.slice(0, 19).every(blank)) continue;
        // The human-readable numeric columns must agree with the exact integer
        // strings. Never hash rounded display text or silently ignore an edit.
        for (let i = 0; i < 4; i++) {
          const minor = row[15 + i], visible = row[6 + i];
          const pattern = i === 3 ? /^(?:0|[1-9]\d*|-[1-9]\d*)$/ : /^(?:0|[1-9]\d*)$/;
          if (typeof minor !== 'string' || !pattern.test(minor) || !Number.isSafeInteger(Number(minor))) fail('จำนวนหน่วยย่อยต้องเป็นข้อความจำนวนเต็มที่ปลอดภัย');
          if (typeof visible !== 'number' || !Number.isFinite(visible) || visible !== Number(minor) / 100) fail('ยอดที่แสดงไม่ตรงกับจำนวนหน่วยย่อย');
        }
        if (typeof row[0] !== 'string' || !/^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])$/.test(row[0]) || typeof row[1] !== 'string' || row[0] !== row[1].slice(0, 7) || typeof row[3] !== 'string') fail('เดือนหรือรหัสประเภทไม่ตรงรูปแบบ');
        data.rows.push([row[11], row[12], row[1], row[2], row[10], row[3], row[4], row[5], row[15], row[16], row[17], row[18], row[13], row[14]]);
      }
      const state = inspectBankMonthlyTables(data, journal, true);
      if (state.status === 'error') return state;
      // Match the direct writer's physical reservation contract as well as the
      // content hash. A moved row must not look healthy when the writer would
      // reject it on its next read-back. Legacy two-tab behavior is unchanged.
      const entries = [...state.months.values()];
      if (journal.rows.length !== entries.length) fail('journal มีรหัสนำเข้าซ้ำ');
      let nextDataRow = 2, nextJournalRow = 2;
      const ranges = entries.map(entry => {
        const reservation = entry.reservation;
        if (reservation.dataStartRow !== nextDataRow) fail('ช่วงแถวที่จองไว้ไม่ต่อเนื่องหรือทับกัน');
        const start = nextDataRow, end = start + reservation.rowCount;
        if (!Number.isSafeInteger(end) || end > 100002) fail('ช่วงแถวเกินขอบเขตอ่าน');
        nextDataRow = end;
        return { start, end, entry };
      });
      for (let index = 0; index < source.rows.length; index++) {
        const row = source.rows[index], physicalRow = index + 2;
        if (!row.slice(19).every(blank) && physicalRow !== nextJournalRow++) fail('ตำแหน่ง journal ไม่ต่อเนื่องจากแถว 2');
        if (row.slice(0, 19).every(blank)) continue;
        const range = ranges.find(range => physicalRow >= range.start && physicalRow < range.end);
        if (!range || row[12] !== range.entry.importId) fail('รายละเอียดอยู่นอกช่วงแถวที่จองไว้');
      }
      for (const { start, entry } of ranges) {
        if (entry.status !== 'committed') continue;
        const ordered = [...entry.rows.values()].sort((a, b) => Number(a.categoryCode) - Number(b.categoryCode));
        for (let index = 0; index < entry.rowCount; index++) {
          const row = source.rows[start - 2 + index];
          if (!row || row[12] !== entry.importId || row[3] !== ordered[index].categoryCode) fail('แถวที่ commit แล้วหายหรือถูกย้ายตำแหน่ง');
        }
      }
      return state;
    } catch (error) { return { status: 'error', reason: error.message, months: new Map() }; }
  }
  function inspectBankImports(input) {
    return input.bankSourceMode === BANK_DIRECT.sourceMode ? inspectBankDirect(input) : inspectBankMonthly(input);
  }
  // ตรวจข้อมูลกับ journal ทั้งรหัส ช่วง แถว และหน่วยย่อยให้ตรงกัน
  function inspectBankMonthlyTables(data, journal, direct = false) {
    const absent = dataset => !dataset || dataset.status === 'missing';
    if (absent(data) && absent(journal)) return { status: 'absent', months: new Map() };
    const fail = message => { throw Error('ตรวจชุดนำเข้าธนาคารขยะไม่ผ่าน: ' + message); };
    const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    const exact = (value, keys) => plain(value) && Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
    const json = value => { if (typeof value !== 'string' || !value.trim()) fail('ข้อมูล journal ว่าง'); try { return JSON.parse(value); } catch (_) { fail('รูปแบบ JSON ของ journal ไม่ถูกต้อง'); } };
    const integer = (value, signed = false) => { const text = String(value); if (!(signed ? /^(?:0|[1-9]\d*|-[1-9]\d*)$/ : /^(?:0|[1-9]\d*)$/).test(text) || !Number.isSafeInteger(Number(text))) fail('จำนวนหน่วยย่อยไม่ใช่จำนวนเต็มที่ปลอดภัย'); return Number(text); };
    const decimal = value => (value < 0 ? '-' : '') + Math.floor(Math.abs(value) / 100) + '.' + String(Math.abs(value) % 100).padStart(2, '0');
    const add = (a, b) => { const result = a + b; if (!Number.isSafeInteger(result)) fail('ยอดรวมเกินขอบเขต'); return result; };
    const periodOf = value => {
      if (!exact(value, ['month', 'startDate', 'endDate']) || typeof value.month !== 'string' || !/^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])$/.test(value.month)) fail('ไม่มีเดือนเต็มที่ยืนยันได้');
      const lastDay = new Date(Date.UTC(Number(value.month.slice(0, 4)), Number(value.month.slice(5, 7)), 0)).getUTCDate();
      if (value.startDate !== value.month + '-01' || value.endDate !== value.month + '-' + lastDay) fail('ช่วงข้อมูลไม่ใช่เดือนเต็ม');
      return value.month;
    };
    const iso = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value));
    const table = (dataset, headers) => {
      if (!dataset || dataset.status !== 'loaded') fail('อ่านชีตใหม่ไม่ครบทั้งสองแท็บ');
      if (!Array.isArray(dataset.headers) || dataset.headers.length !== headers.length || headers.some((header, i) => dataset.headers[i] !== header) || !Array.isArray(dataset.rows)) fail('หัวคอลัมน์หรือโครงสร้างชีตไม่ตรงรุ่น');
      return dataset.rows.map(row => { if (!Array.isArray(row) || row.length !== headers.length) fail('คอลัมน์ในแถวไม่ครบ'); return row; });
    };
    try {
      const reservations = new Map(), months = new Map();
      for (const row of table(journal, BANK_MONTHLY.journalHeaders)) {
        if (row.every(value => value === '' || value === null)) continue;
        const a = json(row[0]), month = periodOf(a.period);
        if (!exact(a, ['version', 'importId', 'canonicalSha256', 'period', 'quantityMeaning', 'sourceSystem', 'rowCount', 'dataStartRow', 'acceptedAt']) || a.version !== (direct ? 'bank-direct-reservation/v1' : 'bank-monthly-reservation/v1') || a.quantityMeaning !== 'purchased' || a.sourceSystem !== 'waste-bank-export' || !/^[a-f0-9]{64}$/.test(a.canonicalSha256) || a.importId !== (direct ? 'bd1_' : 'bm1_') + a.canonicalSha256 || !Number.isSafeInteger(a.rowCount) || a.rowCount < 1 || a.rowCount > 1000 || !Number.isSafeInteger(a.dataStartRow) || a.dataStartRow < 2 || !iso(a.acceptedAt)) fail('reservation ไม่ครบหรือไม่ตรงรุ่น');
        const fingerprint = JSON.stringify(row);
        if (reservations.has(a.importId)) { if (reservations.get(a.importId).fingerprint !== fingerprint) fail('รหัสนำเข้าซ้ำแต่เนื้อหาขัดกัน'); continue; }
        if (months.has(month)) fail('มีชุดนำเข้าทับเดือนเดียวกัน');
        let receipt = null;
        if (row[1] !== '' && row[1] !== null) {
          receipt = json(row[1]);
          if (!exact(receipt, ['schemaVersion', 'importId', 'canonicalSha256', 'period', 'quantityMeaning', 'rowCount', 'quantityTotals', 'moneyTotals', 'acceptedAt', 'committedAt']) || receipt.schemaVersion !== 'bank-monthly-receipt/v1' || receipt.importId !== a.importId || receipt.canonicalSha256 !== a.canonicalSha256 || periodOf(receipt.period) !== month || receipt.quantityMeaning !== 'purchased' || receipt.rowCount !== a.rowCount || receipt.acceptedAt !== a.acceptedAt || (!iso(receipt.committedAt) || receipt.committedAt < a.acceptedAt)) fail('commit ไม่ตรงกับ reservation');
        }
        const entry = { status: receipt ? 'committed' : 'pending', importId: a.importId, reservation: a, receipt, fingerprint, rows: new Map(), rowCount: a.rowCount };
        reservations.set(a.importId, entry); months.set(month, entry);
      }
      for (const row of table(data, BANK_MONTHLY.dataHeaders)) {
        if (row.every(value => value === '' || value === null)) continue;
        const [version, importId, start, end, meaning, rawCode, label, unit, rawQuantity, rawPurchase, rawSale, rawProfit, hash, accepted] = row;
        const entry = reservations.get(importId);
        if (!entry) fail('พบรายละเอียดที่ไม่มี reservation');
        const a = entry.reservation, code = String(rawCode);
        if (version !== 'waste-bank-monthly-summary/v1' || start !== a.period.startDate || end !== a.period.endDate || meaning !== 'purchased' || hash !== a.canonicalSha256 || accepted !== a.acceptedAt || !/^[1-9]\d{0,8}$/.test(code) || typeof label !== 'string' || !label.trim() || !['กิโลกรัม', 'ลัง'].includes(unit)) fail('รายละเอียดไม่ตรงกับเดือนหรือชุดนำเข้า');
        const quantity = integer(rawQuantity), purchase = integer(rawPurchase), sale = integer(rawSale), profit = integer(rawProfit, true);
        if (sale - purchase !== profit) fail('ผลต่างเงินรายหมวดไม่ตรง');
        const normalized = { categoryCode: code, categoryName: label, unit, quantity: decimal(quantity), purchaseAmount: decimal(purchase), saleAmount: decimal(sale), profitAmount: decimal(profit), quantityHundredths: String(quantity), purchaseSatang: String(purchase), saleSatang: String(sale), profitSatang: String(profit) };
        if (entry.rows.has(code)) { if (JSON.stringify(entry.rows.get(code)) !== JSON.stringify(normalized)) fail('หมวดเดียวกันมีข้อมูลขัดกัน'); continue; }
        entry.rows.set(code, normalized);
      }
      for (const entry of reservations.values()) {
        // A reserved write can be partially present. It never contributes to a total.
        if (entry.status === 'pending') continue;
        if (entry.rows.size !== entry.rowCount) fail('จำนวนหมวดของชุดที่ commit แล้วไม่ครบ');
        let purchase = 0, sale = 0, profit = 0;
        const quantityByUnit = {};
        const rows = [...entry.rows.values()].sort((a, b) => Number(a.categoryCode) - Number(b.categoryCode));
        for (const row of rows) {
          purchase = add(purchase, integer(row.purchaseSatang)); sale = add(sale, integer(row.saleSatang)); profit = add(profit, integer(row.profitSatang, true));
          quantityByUnit[row.unit] = add(quantityByUnit[row.unit] || 0, integer(row.quantityHundredths));
        }
        const quantityTotals = Object.keys(quantityByUnit).sort((a, b) => a === 'กิโลกรัม' ? -1 : b === 'กิโลกรัม' ? 1 : a.localeCompare(b)).map(unit => ({ unit, quantity: decimal(quantityByUnit[unit]), quantityHundredths: String(quantityByUnit[unit]) }));
        const moneyTotals = { purchaseAmount: decimal(purchase), saleAmount: decimal(sale), profitAmount: decimal(profit), purchaseSatang: String(purchase), saleSatang: String(sale), profitSatang: String(profit) };
        if (JSON.stringify(entry.receipt.quantityTotals) !== JSON.stringify(quantityTotals) || JSON.stringify(entry.receipt.moneyTotals) !== JSON.stringify(moneyTotals)) fail('ยอดรายละเอียดไม่ตรงกับ commit');
        const canonical = JSON.stringify({ schemaVersion: 'waste-bank-monthly-summary/v1', recordType: 'monthly_category_summary', period: entry.reservation.period, quantityMeaning: 'purchased', currency: 'THB', rows, quantityTotals, moneyTotals });
        if (bankSha256(canonical) !== entry.reservation.canonicalSha256) fail('เนื้อหารายละเอียดไม่ตรงกับลายนิ้วมือชุดนำเข้า');
        Object.assign(entry, { quantityByUnit, purchaseSatang: purchase, saleSatang: sale, profitSatang: profit });
      }
      return { status: 'loaded', months };
    } catch (error) { return { status: 'error', reason: error.message, months: new Map() }; }
  }

  // Imported summaries are month-level observations. They replace, never add to,
  // transactional bank rows in the same month; no synthetic transaction dates.
  const BANK_IDS = ['recycleReceivedKg', 'recycleReceivedBaht', 'recycleSoldKg', 'recycleSoldBaht'];
  // ใช้ยอดรายเดือนเฉพาะช่วงที่ตรวจครบ แยกเดือนที่ยังไม่พร้อมออกจากศูนย์
  function applyMonthlyBank(input, period, metrics) {
    const direct = input.bankSourceMode === BANK_DIRECT.sourceMode;
    const state = inspectBankImports(input);
    if (state.status === 'absent') return;
    const activeIds = BANK_IDS.filter(id => !Object.prototype.hasOwnProperty.call(input.schema || {}, id));
    const unavailable = (id, status, reason, extra = {}) => Object.assign(metrics[id], { status, reason, value: null, rows: 0, invalid: 0, ...extra });
    if (state.status === 'error') {
      for (const id of activeIds) unavailable(id, 'schema-error', state.reason);
      return;
    }
    const importedMonths = [...state.months.keys()].filter(month => month.startsWith(period.value.slice(0, 4)));
    if (!importedMonths.length && !direct) return;
    const source = input.sourcePeriod || input.sourceMonth;
    const importCoverage = (direct ? [BANK_DIRECT.sheet] : [BANK_MONTHLY.dataSheet, BANK_MONTHLY.journalSheet]).every(name => coverageContains(input.datasets[name].coveragePeriod || input.datasets[name].coverageMonth || source, period));
    if (!importCoverage || (source && !coverageContains(source, period))) {
      for (const id of activeIds) unavailable(id, 'not-loaded', 'ชุดข้อมูลไม่ครอบคลุมช่วงที่เลือก');
      return;
    }
    function importedMetric(id, month) {
      const entry = state.months.get(month);
      const meta = { sourceMode: direct ? BANK_DIRECT.sourceMode : 'monthly-import', importedMonths: [month], knownMonths: [month], unknownMonths: [], coverageComplete: true, importIds: [entry.importId] };
      if (entry.status !== 'committed') return { status: 'incomplete', value: null, reason: 'ชุดนำเข้ารายเดือนยังบันทึกไม่เสร็จ จึงไม่ใช้ข้อมูลเดิมแทนยอดเต็มเดือน', rows: 0, ...meta, coverageComplete: false };
      if (period.type === 'day') return { status: 'monthly-only', value: null, reason: 'ต้นทางมีเฉพาะยอดรวมรายเดือน ไม่มีรายการรายวัน จึงไม่แบ่งยอดลงวันที่', rows: 0, ...meta, coverageComplete: false };
      if (id === 'recycleSoldKg') return { status: 'unavailable', value: null, reason: 'ไฟล์ระบุปริมาณรับซื้อเท่านั้น ไม่มีน้ำหนักขายออก', rows: 0, ...meta };
      const quantityByUnit = Object.fromEntries(Object.entries(entry.quantityByUnit).map(([unit, value]) => [unit, value / 100]));
      const value = id === 'recycleReceivedKg' ? (entry.quantityByUnit['กิโลกรัม'] ?? null) : id === 'recycleReceivedBaht' ? entry.purchaseSatang : entry.saleSatang;
      return { status: value === null ? 'unavailable' : 'ok', value: value === null ? null : value / 100, rows: entry.rowCount, ...meta,
        quantityByUnit, quantityScope: 'known-kg-only',
        reason: id === 'recycleReceivedKg' ? 'รวมเฉพาะรายการหน่วยกิโลกรัม; หน่วยลังแยกต่างหาก ไม่แปลงเป็นน้ำหนัก' : direct ? 'ใช้ยอดรายเดือนที่บันทึกสำเร็จในแท็บธนาคารขยะโดยตรง' : 'ใช้ยอดรวมเดือนที่นำเข้าสำเร็จแทนรายการธนาคารขยะเดิมในเดือนเดียวกัน' };
    }
    const unknownMetric = month => ({ status: 'no-records', value: null, rows: 0, invalid: 0, reason: 'ยังไม่มีชุดนำเข้าที่บันทึกสำเร็จสำหรับเดือนนี้ ไม่ถือเป็นศูนย์', sourceMode: BANK_DIRECT.sourceMode, importedMonths: [], knownMonths: [], unknownMonths: [month], coverageComplete: false });
    if (period.type !== 'year') {
      const month = period.value.slice(0, 7);
      if (!state.months.has(month)) {
        if (direct) for (const id of activeIds) Object.assign(metrics[id], unknownMetric(month));
        return;
      }
      for (const id of activeIds) {
        Object.assign(metrics[id], importedMetric(id, month), { invalid: 0 });
        if (id === 'recycleReceivedKg') metrics[id].label = 'รีไซเคิลรับเข้า (เฉพาะกิโลกรัม)';
      }
      return;
    }
    const legacyInput = { ...input, datasets: { ...(input.datasets || {}) } };
    delete legacyInput.datasets[BANK_MONTHLY.dataSheet];
    delete legacyInput.datasets[BANK_MONTHLY.journalSheet];
    const byMonth = Array.from({ length: 12 }, (_, index) => {
      const month = period.value + '-' + String(index + 1).padStart(2, '0');
      return { month, metrics: state.months.has(month) ? Object.fromEntries(activeIds.map(id => [id, importedMetric(id, month)])) : direct ? Object.fromEntries(activeIds.map(id => [id, unknownMetric(month)])) : aggregate({ ...legacyInput, period: { type: 'month', value: month }, month: undefined }).metrics };
    });
    for (const id of activeIds) {
      const known = byMonth.filter(row => row.metrics[id].status === 'ok' && Number.isFinite(row.metrics[id].value));
      const missing = byMonth.filter(row => !known.includes(row));
      const blocked = missing.find(row => ['partial', 'schema-error', 'incomplete', 'unavailable', 'unresolved'].includes(row.metrics[id].status));
      const metadata = { sourceMode: direct ? BANK_DIRECT.sourceMode : 'monthly-import-and-transactions', importedMonths, knownMonths: known.map(row => row.month), unknownMonths: missing.map(row => row.month), coverageComplete: missing.length === 0 };
      if (blocked) { unavailable(id, blocked.metrics[id].status === 'unavailable' ? 'unavailable' : 'incomplete', blocked.metrics[id].reason || 'มีเดือนที่ข้อมูลไม่ครบ จึงยังสรุปยอดรายปีไม่ได้', metadata); continue; }
      if (!known.length) { unavailable(id, 'no-records', 'ยังไม่มีข้อมูลที่ยืนยันได้ในปีนี้', metadata); continue; }
      const total = known.reduce((sum, row) => sum + row.metrics[id].value, 0);
      if (!Number.isFinite(total) || total > Number.MAX_SAFE_INTEGER) { unavailable(id, 'incomplete', 'ยอดรวมเกินขอบเขตตัวเลขที่รองรับ', metadata); continue; }
      Object.assign(metrics[id], metadata, { value: Number(total.toFixed(6)), status: 'ok', rows: known.reduce((sum, row) => sum + row.metrics[id].rows, 0), invalid: 0,
        reason: missing.length ? 'ยอดรวมเฉพาะเดือนที่มีข้อมูล ไม่ใช่ยอดครบทั้งปี; เดือนที่ไม่มีข้อมูลไม่ถือเป็นศูนย์' : 'ใช้ชุดนำเข้าเต็มเดือนร่วมกับรายการเดิมเฉพาะเดือนที่ไม่ทับซ้อน' });
      if (id === 'recycleReceivedKg') {
        metrics[id].quantityScope = 'known-kg-only';
        metrics[id].label = 'รีไซเคิลรับเข้า (เฉพาะกิโลกรัมและช่วงที่มีข้อมูล)';
        const quantities = { 'กิโลกรัม': metrics[id].value };
        for (const row of known) for (const [unit, value] of Object.entries(row.metrics[id].quantityByUnit || {})) if (unit !== 'กิโลกรัม') quantities[unit] = (quantities[unit] || 0) + value;
        metrics[id].quantityByUnit = quantities;
      }
    }
  }

  // รวมตัวชี้วัดพร้อมสถานะความครบตาม mapping และช่วงที่ตรวจแล้ว
  function aggregate(input = {}) {
    // กำหนด const period จาก  normalizePeriod(input.period || input.month) สำหรับ รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
    const period = normalizePeriod(input.period || input.month);
    // กำหนด const metrics จาก  {} สำหรับ รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
    const metrics = {};
    // วนเฉพาะรายการ for (const [id, [label, unit]] of Object.entries(definitions)) { เพื่อประมวลผลทีละตัวใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
    for (const [id, [label, unit]] of Object.entries(definitions)) {
      // กำหนด const out จาก  (metrics[id] = { สำหรับ รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
      const out = (metrics[id] = {
        // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ label, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        label,
        // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ unit, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        unit,
        // เริ่มตัวชี้วัดว่าไม่มี mapping จนกว่าจะเลือก schema ได้
        status: 'unconfigured',
        // ยังไม่มีตัวเลขที่ยืนยันได้ จึงเริ่มด้วย null
        value: null,
        // เริ่มนับแถวที่นำมารวมจริงจากศูนย์
        rows: 0,
        // เริ่มนับข้อผิดพลาดของตัวชี้วัดนี้จากศูนย์
        invalid: 0,
      // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
      });
      // กำหนด const map จาก  Object.prototype.hasOwnProperty.call(input.schema || {}, id) สำหรับ รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
      const map = Object.prototype.hasOwnProperty.call(input.schema || {}, id)
        // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ ? input.schema[id] เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        ? input.schema[id]
        // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ : defaultSchema[id]; เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        : defaultSchema[id];
      // ตรวจเงื่อนไข if (!map) continue; ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ก่อนอนุญาตขั้นตอนถัดไป
      if (!map) continue;
      // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ out.tab = map.tab; เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      out.tab = map.tab;
      // กำหนด const ds จาก  (input.datasets || {})[map.tab] สำหรับ รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
      const ds = (input.datasets || {})[map.tab];
      // ตรวจเงื่อนไข if (!ds) { ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ก่อนอนุญาตขั้นตอนถัดไป
      if (!ds) {
        // ไม่พบ dataset ของแท็บนี้ แสดง missing ไม่ใช่ยอดศูนย์
        out.status = 'missing';
        // ข้ามแถวหรือตัวชี้วัดที่เข้าเงื่อนไขก่อนหน้า ไม่เพิ่มยอดรวม
        continue;
      // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
      }
      // เริ่มเงื่อนไขหลายบรรทัดใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม; รายการถัดไปต้องประเมินร่วมกัน
      if (
        // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ !coverageContains( เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        !coverageContains(
          // ให้ช่วงที่ระบุรายแท็บเป็นแหล่งตรวจ coverage อันดับแรก
          ds.coveragePeriod ||
            // รองรับ coverageMonth จากไฟล์รายเดือนรุ่นเก่า
            ds.coverageMonth ||
            // ตรวจช่วงที่ติดมากับไฟล์ต้นทางเพิ่มเติม แม้ผู้ใช้เปลี่ยนช่วงรายงานแล้วก็ขยาย coverage ไม่ได้
            input.sourcePeriod ||
            // ใช้เดือนต้นทางรุ่นเก่าเมื่อยังไม่มี sourcePeriod
            input.sourceMonth,
          // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ period, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
          period,
        // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ ) || เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        ) ||
        // ตรวจช่วงที่ติดมากับไฟล์ต้นทางเพิ่มเติม แม้ผู้ใช้เปลี่ยนช่วงรายงานแล้วก็ขยาย coverage ไม่ได้
        ((input.sourcePeriod || input.sourceMonth) &&
          // ตรวจช่วงที่ติดมากับไฟล์ต้นทางเพิ่มเติม แม้ผู้ใช้เปลี่ยนช่วงรายงานแล้วก็ขยาย coverage ไม่ได้
          !coverageContains(input.sourcePeriod || input.sourceMonth, period))
      // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ ) { เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      ) {
        // ยังไม่รับรองว่าข้อมูลช่วงนี้โหลดครบ จึงใช้ not-loaded ไม่อ้างยอดรวม
        out.status = 'not-loaded';
        // ข้ามแถวหรือตัวชี้วัดที่เข้าเงื่อนไขก่อนหน้า ไม่เพิ่มยอดรวม
        continue;
      // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
      }
      // ตรวจเงื่อนไข if (ds.status !== 'loaded') { ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ก่อนอนุญาตขั้นตอนถัดไป
      if (ds.status !== 'loaded') {
        // ยังไม่รับรองว่าข้อมูลช่วงนี้โหลดครบ จึงใช้ not-loaded ไม่อ้างยอดรวม
        out.status = 'not-loaded';
        // ข้ามแถวหรือตัวชี้วัดที่เข้าเงื่อนไขก่อนหน้า ไม่เพิ่มยอดรวม
        continue;
      // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
      }
      // ตรวจเงื่อนไข if (!Array.isArray(ds.headers) || !Array.isArray(ds.rows)) { ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ก่อนอนุญาตขั้นตอนถัดไป
      if (!Array.isArray(ds.headers) || !Array.isArray(ds.rows)) {
        // หัวตารางหรือโครงสร้างแถวไม่ตรง จึงไม่รวมค่า
        out.status = 'schema-error';
        // ข้ามแถวหรือตัวชี้วัดที่เข้าเงื่อนไขก่อนหน้า ไม่เพิ่มยอดรวม
        continue;
      // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
      }
      // กำหนด const headers จาก  ds.headers สำหรับ รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
      const headers = ds.headers;
      // กำหนด const required จาก  [ สำหรับ รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
      const required = [
        // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ map.dateHeader, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        map.dateHeader,
        // รองรับการนับแถวเมื่อ schema กำหนด มิฉะนั้นใช้คอลัมน์ค่าตัวชี้วัด
        ...(map.countRows ? [] : [map.valueHeader]),
        // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ ...(map.filter ? [map.filter.header] : []), เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        ...(map.filter ? [map.filter.header] : []),
      // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
      ];
      // เริ่มเงื่อนไขหลายบรรทัดใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม; รายการถัดไปต้องประเมินร่วมกัน
      if (
        // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ required.some( เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        required.some(
          // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ (h) => เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
          (h) =>
            // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ typeof h !== 'string' || เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
            typeof h !== 'string' ||
            // หัวคอลัมน์ที่ต้องใช้ต้องพบเพียงหนึ่งตำแหน่ง เพื่อไม่จับข้อมูลผิดคอลัมน์
            headers.filter((v) => v === h).length !== 1,
        // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
        )
      // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ ) { เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      ) {
        // หัวตารางหรือโครงสร้างแถวไม่ตรง จึงไม่รวมค่า
        out.status = 'schema-error';
        // ข้ามแถวหรือตัวชี้วัดที่เข้าเงื่อนไขก่อนหน้า ไม่เพิ่มยอดรวม
        continue;
      // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
      }
      // ตรวจเงื่อนไข if (!ds.rows.length) { ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ก่อนอนุญาตขั้นตอนถัดไป
      if (!ds.rows.length) {
        // โหลดแท็บแล้วแต่ไม่มีแถว; UI ต้องแยกจากรายการที่บันทึกศูนย์จริง
        out.status = 'empty';
        // คงค่า0ภายในสำหรับ empty เพื่อ compatibility แต่ UI ใช้สถานะเพื่อแสดงขีด
        out.value = 0;
        // ข้ามแถวหรือตัวชี้วัดที่เข้าเงื่อนไขก่อนหน้า ไม่เพิ่มยอดรวม
        continue;
      // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
      }
      // เริ่มยอดรวมใหม่สำหรับตัวชี้วัดนี้ ไม่ปะปนกับตัวชี้วัดก่อนหน้า
      if (map.tab === 'ข้อมูลขยะอันตรายหน่วยงานแจ้งเข้ามา' && map.valueHeader === 'น้ำหนักรวม (กก.)') {
        aggregateHazard(ds, map, period, out);
        continue;
      }
      let sum = 0,
        // เริ่มจำนวนแถวที่วันที่ตรงช่วงนี้จากศูนย์
        matched = 0;
      // วนเฉพาะรายการ for (const row of ds.rows) { เพื่อประมวลผลทีละตัวใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
      for (const row of ds.rows) {
        // เริ่มเงื่อนไขหลายบรรทัดใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม; รายการถัดไปต้องประเมินร่วมกัน
        if (
          // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ (Array.isArray(row) ? row : Object.values(row || {})).every( เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
          (Array.isArray(row) ? row : Object.values(row || {})).every(
            // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ (v) => v === null || v === undefined || String(v).trim() === '', เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
            (v) => v === null || v === undefined || String(v).trim() === '',
          // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
          )
        // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
        )
          // ข้ามแถวหรือตัวชี้วัดที่เข้าเงื่อนไขก่อนหน้า ไม่เพิ่มยอดรวม
          continue;
        // กำหนด const get จาก  (h) => สำหรับ รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
        const get = (h) =>
          // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ Array.isArray(row) ? row[headers.indexOf(h)] : row && row[h]; เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
          Array.isArray(row) ? row[headers.indexOf(h)] : row && row[h];
        // ตรวจเงื่อนไข if (map.filter) { ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ก่อนอนุญาตขั้นตอนถัดไป
        if (map.filter) {
          // อ่านประเภทรายการธนาคารขยะก่อนตัดสินใจรวมแถว
          const type = get(map.filter.header);
          // ประเภทรีไซเคิลต้องอยู่ในรายการที่รู้จัก ไม่ถือประเภทแปลกเป็นยอดศูนย์
          if (map.filter.allowed && !map.filter.allowed.includes(type)) {
            // เพิ่มจำนวนแถวที่ใช้ไม่ได้ เพื่อให้สถานะรายงานแสดงความไม่แน่นอน
            out.invalid++;
            // ข้ามแถวหรือตัวชี้วัดที่เข้าเงื่อนไขก่อนหน้า ไม่เพิ่มยอดรวม
            continue;
          // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
          }
          // รับเฉพาะฝั่งรับเข้าหรือขายออกตามตัวชี้วัดปัจจุบัน ป้องกันนับซ้ำ
          if (type !== map.filter.equals) continue;
        // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
        }
        // แปลงวันที่ของแถวตามหัวคอลัมน์วันที่ที่ schema ระบุ
        const date = dateParts(get(map.dateHeader));
        // ตรวจเงื่อนไข if (!date) { ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ก่อนอนุญาตขั้นตอนถัดไป
        if (!date) {
          // เพิ่มจำนวนแถวที่ใช้ไม่ได้ เพื่อให้สถานะรายงานแสดงความไม่แน่นอน
          out.invalid++;
          // ข้ามแถวหรือตัวชี้วัดที่เข้าเงื่อนไขก่อนหน้า ไม่เพิ่มยอดรวม
          continue;
        // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
        }
        // ข้ามแถววันที่ถูกต้องแต่ไม่อยู่ในช่วงรายงาน
        if (!matchesPeriod(date, period)) continue;
        // นับแถวที่วันที่อยู่ในช่วงก่อนตรวจตัวเลข เพื่อแยกไม่มีรายการจากรายการผิด
        matched++;
        // รองรับการนับแถวเมื่อ schema กำหนด มิฉะนั้นใช้คอลัมน์ค่าตัวชี้วัด
        const n = map.countRows ? 1 : number(get(map.valueHeader));
        // ตรวจเงื่อนไข if (n === null) { ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ก่อนอนุญาตขั้นตอนถัดไป
        if (n === null) {
          // เพิ่มจำนวนแถวที่ใช้ไม่ได้ เพื่อให้สถานะรายงานแสดงความไม่แน่นอน
          out.invalid++;
          // ข้ามแถวหรือตัวชี้วัดที่เข้าเงื่อนไขก่อนหน้า ไม่เพิ่มยอดรวม
          continue;
        // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
        }
        // ปฏิเสธค่าที่เกินความแม่นยำจำนวนเต็มของ JavaScript แทนการรวมยอดผิด
        if (!Number.isFinite(sum + n) || sum + n > Number.MAX_SAFE_INTEGER) {
          // เพิ่มจำนวนแถวที่ใช้ไม่ได้ เพื่อให้สถานะรายงานแสดงความไม่แน่นอน
          out.invalid++;
          // ถ้าผลรวมล้นขอบเขตให้ value=null ไม่โชว์ยอดบางส่วนว่าเป็นยอดครบ
          out.overflow = true;
          // ข้ามแถวหรือตัวชี้วัดที่เข้าเงื่อนไขก่อนหน้า ไม่เพิ่มยอดรวม
          continue;
        // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
        }
        // เพิ่มตัวเลขที่ตรวจแล้วลงยอดรวมของตัวชี้วัดเดียว ไม่รวมคนละหน่วย
        sum += n;
        // นับเฉพาะแถวที่ผ่านการตรวจและนำค่ามารวมจริง
        out.rows++;
      // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
      }
      // มีแถวผิดให้ partial; มีแถวตรงช่วงและไม่ผิดให้ ok; ไม่พบแถวให้ no-records
      out.status = out.invalid ? 'partial' : matched ? 'ok' : 'no-records';
      // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ out.value = เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      out.value =
        // ถ้าผลรวมล้นขอบเขตให้ value=null ไม่โชว์ยอดบางส่วนว่าเป็นยอดครบ
        out.overflow || (out.invalid && out.rows === 0)
          // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ ? null เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
          ? null
          // ปัดผลรวมที่หกตำแหน่งทศนิยม ลดเศษ floating-point โดยยังเก็บหน่วยเดิม
          : Math.round((sum + Number.EPSILON) * 1000000) / 1000000;
    // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
    }
    applyMonthlyBank(input, period, metrics);
    // คืนผล { จาก รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
    return {
      // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ period, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      period,
      // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ month: period.type === 'month' ? period.value : null, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      month: period.type === 'month' ? period.value : null,
      // ระบุเขตเวลารายงานเป็นกรุงเทพ UTC+7 ไม่ตาม timezone เครื่องผู้ใช้
      timezone: 'Asia/Bangkok',
      // ส่งต่อเวลาส่งออกต้นทาง; ไม่ใช้เป็นหลักฐานว่าต้นทางกรอกครบ
      sourceDate: input.sourceDate || null,
      // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ metrics, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      metrics,
    // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
    };
  // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
  }
  // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ root.ReportEngine = { เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
  root.ReportEngine = {
    BANK_MONTHLY, BANK_DIRECT, inspectBankMonthly, inspectBankDirect, inspectBankImports, bankSha256,
    // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ aggregate, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
    aggregate,
    // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ dateParts, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
    dateParts,
    // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ normalizePeriod, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
    normalizePeriod,
    // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ matchesPeriod, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
    matchesPeriod,
    // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ coverageContains, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
    coverageContains,
    // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ number, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
    number,
    // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ definitions, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
    definitions,
    // ใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม ใช้ defaultSchema, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
    defaultSchema,
  // ปิดบล็อก/โครงสร้างใน รวมสิบตัวชี้วัดโดยแยก coverage/ข้อมูลผิด/หน่วย/ประเภทธุรกรรม
  };
  // ส่งออก API สำหรับ Node tests โดยไม่เปลี่ยนวิธีทำงานใน browser
  if (typeof module !== 'undefined') module.exports = root.ReportEngine;
// เลือก window ใน browser หรือ globalThis ใน Node โดยไม่เรียกเครือข่าย
})(typeof window !== 'undefined' ? window : globalThis);
