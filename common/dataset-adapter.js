/* ขอบเขตรับชุดข้อมูลรายงานจาก JSON: ตรวจ schema และช่วงเวลาก่อนคืนวัตถุให้ระบบคำนวณ
 * โมดูลนี้ไม่อ่านเครือข่าย ไม่แก้ชีต และไม่บันทึกไฟล์ จึงไม่ใช่ตัวเชื่อมฐานข้อมูล */
/* Local JSON boundary only. No network, persistence, or source-sheet edits. */
// แยกขอบเขตตัวแปรของโมดูลและรับ root สำหรับ browser หรือ Node tests
(function (root) {
  // เปิด strict mode เพื่อให้การใช้ตัวแปรผิดรูปแบบแจ้งข้อผิดพลาด
  'use strict';
  // กำหนด const monthPattern จาก  /^\d{4}-(0[1-9]|1[0-2])$/ สำหรับ common/dataset-adapter.js
  const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
  // กำหนด const object จาก  (v) => สำหรับ common/dataset-adapter.js
  const object = (v) =>
    // ใน common/dataset-adapter.js ใช้ v !== null && typeof v === 'object' && !Array.isArray(v); เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
    v !== null && typeof v === 'object' && !Array.isArray(v);
  // ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ.
  function period(value) {
    // ตรวจเงื่อนไข if (value == null) return null; ใน ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ. ก่อนอนุญาตขั้นตอนถัดไป
    if (value == null) return null;
    // กำหนด const p จาก  typeof value === 'string' ? { type: 'month', value } : value สำหรับ ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ.
    const p = typeof value === 'string' ? { type: 'month', value } : value;
    // กำหนด const patterns จาก  { สำหรับ ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ.
    const patterns = {
      // กำหนดรูปแบบ day ให้ใช้ปี ค.ศ. สี่หลักและส่วนวัน/เดือนตามชนิดช่วง
      day: /^\d{4}-\d{2}-\d{2}$/,
      // กำหนดรูปแบบ month ให้ใช้ปี ค.ศ. สี่หลักและส่วนวัน/เดือนตามชนิดช่วง
      month: /^\d{4}-(0[1-9]|1[0-2])$/,
      // กำหนดรูปแบบ year ให้ใช้ปี ค.ศ. สี่หลักและส่วนวัน/เดือนตามชนิดช่วง
      year: /^\d{4}$/,
    // ปิดบล็อก/โครงสร้างใน ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ.
    };
    // เริ่มเงื่อนไขหลายบรรทัดใน ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ.; รายการถัดไปต้องประเมินร่วมกัน
    if (
      // ใน ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ. ใช้ !object(p) || เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      !object(p) ||
      // ใน ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ. ใช้ typeof p.value !== 'string' || เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      typeof p.value !== 'string' ||
      // ใน ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ. ใช้ !patterns[p.type] || เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      !patterns[p.type] ||
      // ใน ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ. ใช้ !patterns[p.type].test(p.value) เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      !patterns[p.type].test(p.value)
    // ปิดบล็อก/โครงสร้างใน ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ.
    )
      // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: Error('ช่วงข้อมูลไม่ถูกต้อง')
      throw Error('ช่วงข้อมูลไม่ถูกต้อง');
    // กำหนด const year จาก  Number(p.value.slice(0, 4)) สำหรับ ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ.
    const year = Number(p.value.slice(0, 4));
    // จำกัดปีรายงานให้เป็น ค.ศ. 1900–2399 หลังแปลง พ.ศ. เพื่อไม่รับปีคลุมเครือ
    if (year < 1900 || year >= 2400) throw Error('ช่วงข้อมูลต้องใช้ ค.ศ.');
    // ตรวจเงื่อนไข if (p.type === 'day') { ใน ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ. ก่อนอนุญาตขั้นตอนถัดไป
    if (p.type === 'day') {
      // กำหนด const date จาก  new Date(p.value + 'T00:00:00Z') สำหรับ ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ.
      const date = new Date(p.value + 'T00:00:00Z');
      // เริ่มเงื่อนไขหลายบรรทัดใน ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ.; รายการถัดไปต้องประเมินร่วมกัน
      if (
        // ใน ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ. ใช้ !Number.isFinite(date.getTime()) || เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        !Number.isFinite(date.getTime()) ||
        // ใน ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ. ใช้ date.toISOString().slice(0, 10) !== p.value เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        date.toISOString().slice(0, 10) !== p.value
      // ปิดบล็อก/โครงสร้างใน ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ.
      )
        // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: Error('วันที่ไม่มีจริง')
        throw Error('วันที่ไม่มีจริง');
    // ปิดบล็อก/โครงสร้างใน ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ.
    }
    // คืนผล { type: p.type, value: p.value } จาก ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ.
    return { type: p.type, value: p.value };
  // ปิดบล็อก/โครงสร้างใน ตรวจและคัดลอก period จากไฟล์นำเข้าโดยไม่เดาปี พ.ศ.
  }
  // ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
  function parse(value) {
    // แปลงข้อความ JSON เป็น object ก่อนตรวจ schema; ไม่ทำ eval
    const data = typeof value === 'string' ? JSON.parse(value) : value;
    // ตรวจเงื่อนไข if (!object(data) || !object(data.datasets)) ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ก่อนอนุญาตขั้นตอนถัดไป
    if (!object(data) || !object(data.datasets))
      // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: new Error('รูปแบบข้อมูลต้องมี datasets แยกตามชื่อแท็บ')
      throw new Error('รูปแบบข้อมูลต้องมี datasets แยกตามชื่อแท็บ');
    // เริ่มเงื่อนไขหลายบรรทัดใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต; รายการถัดไปต้องประเมินร่วมกัน
    if (
      // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ data.month != null && เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      data.month != null &&
      // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ (typeof data.month !== 'string' || !monthPattern.test(data.month)) เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      (typeof data.month !== 'string' || !monthPattern.test(data.month))
    // ปิดบล็อก/โครงสร้างใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
    )
      // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: new Error('เดือนของชุดข้อมูลไม่ถูกต้อง')
      throw new Error('เดือนของชุดข้อมูลไม่ถูกต้อง');
    // เริ่มเงื่อนไขหลายบรรทัดใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต; รายการถัดไปต้องประเมินร่วมกัน
    if (
      // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ data.sourceDate != null && เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      data.sourceDate != null &&
      // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ (typeof data.sourceDate !== 'string' || เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      (typeof data.sourceDate !== 'string' ||
        // จำกัดข้อความเวลาต้นทางไม่เกิน 120 ตัวอักษร
        data.sourceDate.length > 120 ||
        // ปฏิเสธ newline/control characters ในข้อความเวลาต้นทาง
        /[\r\n\x00-\x1f]/.test(data.sourceDate))
    // ปิดบล็อก/โครงสร้างใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
    )
      // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: new Error(
      throw new Error(
        // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ 'วันที่แหล่งข้อมูลต้องเป็นข้อความหนึ่งบรรทัดไม่เกิน 120 ตัวอักษร', เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        'วันที่แหล่งข้อมูลต้องเป็นข้อความหนึ่งบรรทัดไม่เกิน 120 ตัวอักษร',
      // ปิดบล็อก/โครงสร้างใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
      );
    if (data.bankSourceMode != null && data.bankSourceMode !== 'bank-direct-v1') throw Error('โหมดข้อมูลธนาคารขยะไม่ถูกต้อง');
    // จำกัดจำนวนแท็บนำเข้าไม่เกิน 50 เพื่อไม่รับไฟล์โครงสร้างใหญ่ผิดปกติ
    if (Object.keys(data.datasets).length > 50)
      // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: new Error('จำนวนชุดข้อมูลมากเกินไป')
      throw new Error('จำนวนชุดข้อมูลมากเกินไป');
    // อ่านช่วงจริงที่ไฟล์นำเข้าประกาศ ไม่ใช่ช่วงที่ผู้ใช้เลือกบนหน้ารายงาน
    const sourcePeriod = period(data.period || data.month);
    // เริ่มเงื่อนไขหลายบรรทัดใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต; รายการถัดไปต้องประเมินร่วมกัน
    if (
      // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ data.period && เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      data.period &&
      // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ data.month && เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      data.month &&
      // คง month เฉพาะเมื่อ sourcePeriod เป็นรายเดือน หรือตรวจความขัดแย้งกับ month เก่า
      (sourcePeriod.type !== 'month' || sourcePeriod.value !== data.month)
    // ปิดบล็อก/โครงสร้างใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
    )
      // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: Error('ช่วงข้อมูลขัดกับเดือนเดิม')
      throw Error('ช่วงข้อมูลขัดกับเดือนเดิม');
    // ตรวจเงื่อนไข if (data.timezone && data.timezone !== 'Asia/Bangkok') ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ก่อนอนุญาตขั้นตอนถัดไป
    if (data.timezone && data.timezone !== 'Asia/Bangkok')
      // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: Error('เขตเวลาต้องเป็น Asia/Bangkok')
      throw Error('เขตเวลาต้องเป็น Asia/Bangkok');
    // กำหนด const safe จาก  { สำหรับ ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
    const safe = {
      // ระบุ schema version2 ที่เพิ่ม period และ coveragePeriod
      version: 2,
      // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ period: sourcePeriod, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      period: sourcePeriod,
      // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ month: เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      month:
        // คง month เฉพาะเมื่อ sourcePeriod เป็นรายเดือน หรือตรวจความขัดแย้งกับ month เก่า
        sourcePeriod && sourcePeriod.type === 'month'
          // ใช้ค่าช่วงต้นทางที่ผ่านการตรวจแล้ว ไม่สร้างช่วงใหม่จากแถวที่มี
          ? sourcePeriod.value
          // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ : null, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
          : null,
      // ระบุเขตเวลารายงานเป็นกรุงเทพ UTC+7 ไม่ตาม timezone เครื่องผู้ใช้
      timezone: 'Asia/Bangkok',
      // ส่งต่อเวลาส่งออกต้นทาง; ไม่ใช้เป็นหลักฐานว่าต้นทางกรอกครบ
      sourceDate: data.sourceDate || null,
      // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ datasets: {}, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      datasets: {},
    // ปิดบล็อก/โครงสร้างใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
    };
    // วนเฉพาะรายการ for (const [name, dataset] of Object.entries(data.datasets)) { เพื่อประมวลผลทีละตัวใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
    for (const [name, dataset] of Object.entries(data.datasets)) {
      // ตรวจเงื่อนไข if (!object(dataset)) throw new Error('ชุดข้อมูลของแท็บไม่ถูกต้อง'); ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ก่อนอนุญาตขั้นตอนถัดไป
      if (!object(dataset)) throw new Error('ชุดข้อมูลของแท็บไม่ถูกต้อง');
      // เริ่มเงื่อนไขหลายบรรทัดใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต; รายการถัดไปต้องประเมินร่วมกัน
      if (
        // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ !name || เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        !name ||
        // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ name.length > 200 || เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        name.length > 200 ||
        // ห้ามชื่อแท็บที่ชน prototype เพื่อลดความเสี่ยง prototype pollution
        ['__proto__', 'constructor', 'prototype'].includes(name)
      // ปิดบล็อก/โครงสร้างใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
      )
        // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: new Error('ชื่อชุดข้อมูลไม่ถูกต้อง')
        throw new Error('ชื่อชุดข้อมูลไม่ถูกต้อง');
      // เริ่มเงื่อนไขหลายบรรทัดใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต; รายการถัดไปต้องประเมินร่วมกัน
      if (
        // ยังไม่รับรองว่าข้อมูลช่วงนี้โหลดครบ จึงใช้ not-loaded ไม่อ้างยอดรวม
        !['loaded', 'not-loaded', 'missing', 'pending', 'error'].includes(
          // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ dataset.status, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
          dataset.status,
        // ปิดบล็อก/โครงสร้างใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
        )
      // ปิดบล็อก/โครงสร้างใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
      )
        // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: new Error('สถานะชุดข้อมูลไม่ถูกต้อง')
        throw new Error('สถานะชุดข้อมูลไม่ถูกต้อง');
      // กำหนด const coverageMonth จาก  สำหรับ ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
      const coverageMonth =
        // เมื่อแท็บไม่บอกเดือน coverage ให้ใช้เดือนระดับไฟล์ ไม่เดาจากวันที่แถวแรก
        dataset.coverageMonth == null ? safe.month : dataset.coverageMonth;
      // เริ่มเงื่อนไขหลายบรรทัดใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต; รายการถัดไปต้องประเมินร่วมกัน
      if (
        // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ coverageMonth != null && เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        coverageMonth != null &&
        // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ (typeof coverageMonth !== 'string' || !monthPattern.test(coverageMonth)) เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        (typeof coverageMonth !== 'string' || !monthPattern.test(coverageMonth))
      // ปิดบล็อก/โครงสร้างใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
      )
        // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: new Error('เดือนความครอบคลุมไม่ถูกต้อง')
        throw new Error('เดือนความครอบคลุมไม่ถูกต้อง');
      // กำหนด const coveragePeriod จาก  period( สำหรับ ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
      const coveragePeriod = period(
        // เลือก coverage รายแท็บก่อน แล้วจึง fallback เดือนเก่าหรือช่วงระดับไฟล์
        dataset.coveragePeriod || coverageMonth || sourcePeriod,
      // ปิดบล็อก/โครงสร้างใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
      );
      // เริ่มเงื่อนไขหลายบรรทัดใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต; รายการถัดไปต้องประเมินร่วมกัน
      if (
        // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ dataset.coveragePeriod && เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        dataset.coveragePeriod &&
        // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ coverageMonth && เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        coverageMonth &&
        // หากส่งทั้ง period และเดือนเก่า ชนิดช่วงต้องเป็นเดือนและค่าตรงกัน
        (coveragePeriod.type !== 'month' ||
          // ห้าม coveragePeriod กับ coverageMonth ระบุคนละเดือน
          coveragePeriod.value !== coverageMonth)
      // ปิดบล็อก/โครงสร้างใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
      )
        // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: Error('ช่วงครอบคลุมขัดกับเดือนเดิม')
        throw Error('ช่วงครอบคลุมขัดกับเดือนเดิม');
      // กำหนด const headers จาก  สำหรับ ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
      const headers =
        // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ dataset.headers == null && dataset.status !== 'loaded' เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        dataset.headers == null && dataset.status !== 'loaded'
          // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ ? [] เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
          ? []
          // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ : dataset.headers; เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
          : dataset.headers;
      // กำหนด const rows จาก  สำหรับ ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
      const rows =
        // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ dataset.rows == null && dataset.status !== 'loaded' ? [] : dataset.rows; เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        dataset.rows == null && dataset.status !== 'loaded' ? [] : dataset.rows;
      // เริ่มเงื่อนไขหลายบรรทัดใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต; รายการถัดไปต้องประเมินร่วมกัน
      if (
        // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ !Array.isArray(headers) || เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        !Array.isArray(headers) ||
        // จำกัดจำนวนหัวคอลัมน์ไม่เกิน 100 ต่อแท็บ
        headers.length > 100 ||
        // ชื่อหัวต้องเป็นข้อความไม่ว่างและยาวไม่เกิน 200 ตัวอักษร
        headers.some((h) => typeof h !== 'string' || !h || h.length > 200)
      // ปิดบล็อก/โครงสร้างใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
      )
        // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: new Error('หัวคอลัมน์ต้องเป็นข้อความ')
        throw new Error('หัวคอลัมน์ต้องเป็นข้อความ');
      // ตรวจว่าจำนวนชื่อหัวไม่ลดลงเมื่อทำ unique เพื่อปฏิเสธหัวซ้ำ
      if (new Set(headers).size !== headers.length)
        // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: new Error('หัวคอลัมน์ซ้ำ')
        throw new Error('หัวคอลัมน์ซ้ำ');
      // จำกัดจำนวนแถวนำเข้าไม่เกิน 100000 ต่อแท็บ
      if (!Array.isArray(rows) || rows.length > 100000)
        // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: new Error('แถวข้อมูลไม่ถูกต้อง')
        throw new Error('แถวข้อมูลไม่ถูกต้อง');
      // กำหนด const copiedRows จาก  rows.map((row) => { สำหรับ ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
      const copiedRows = rows.map((row) => {
        // จำนวนค่าแต่ละแถวต้องตรงจำนวนหัว ป้องกันคอลัมน์เหลื่อม
        if (!Array.isArray(row) || row.length !== headers.length)
          // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: new Error('จำนวนค่าต่อแถวไม่ตรงกับหัวคอลัมน์')
          throw new Error('จำนวนค่าต่อแถวไม่ตรงกับหัวคอลัมน์');
        // คืนผล row.map((cell) => { จาก ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
        return row.map((cell) => {
          // เริ่มเงื่อนไขหลายบรรทัดใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต; รายการถัดไปต้องประเมินร่วมกัน
          if (
            // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ cell === null || เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
            cell === null ||
            // รับข้อความเซลล์ไม่เกิน 1000 ตัวอักษร ไม่รับ object หรือข้อมูลไบนารี
            (typeof cell === 'string' && cell.length <= 1000)
          // ปิดบล็อก/โครงสร้างใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
          )
            // คืนเซลล์ที่ผ่านชนิด/ขนาดที่อนุญาต โดยไม่แก้ค่าดิบ
            return cell;
          // เริ่มเงื่อนไขหลายบรรทัดใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต; รายการถัดไปต้องประเมินร่วมกัน
          if (
            // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ typeof cell === 'number' && เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
            typeof cell === 'number' &&
            // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ Number.isFinite(cell) && เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
            Number.isFinite(cell) &&
            // ปฏิเสธค่าที่เกินความแม่นยำจำนวนเต็มของ JavaScript แทนการรวมยอดผิด
            Math.abs(cell) <= Number.MAX_SAFE_INTEGER
          // ปิดบล็อก/โครงสร้างใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
          )
            // คืนเซลล์ที่ผ่านชนิด/ขนาดที่อนุญาต โดยไม่แก้ค่าดิบ
            return cell;
          // ปฏิเสธข้อมูลและส่งข้อผิดพลาด: new Error('ค่าเซลล์ต้องเป็นข้อความหรือตัวเลขที่มีขนาดปลอดภัย')
          throw new Error('ค่าเซลล์ต้องเป็นข้อความหรือตัวเลขที่มีขนาดปลอดภัย');
        // ปิดบล็อก/โครงสร้างใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
        });
      // ปิดบล็อก/โครงสร้างใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
      });
      // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ safe.datasets[name] = { เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
      safe.datasets[name] = {
        // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ status: dataset.status, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        status: dataset.status,
        // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ coveragePeriod, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        coveragePeriod,
        // ใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต ใช้ coverageMonth, เป็นส่วนของเงื่อนไขหรือผลลัพธ์ตามบรรทัดรอบข้าง
        coverageMonth,
        // คัดลอกหัวใหม่ ไม่ใช้ array ที่ผู้เรียกอาจแก้หลัง parse
        headers: headers.slice(),
        // เก็บเฉพาะสำเนาแถวที่ผ่านการตรวจชนิดและขนาดเซลล์
        rows: copiedRows,
      // ปิดบล็อก/โครงสร้างใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
      };
    // ปิดบล็อก/โครงสร้างใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
    }
    if (data.bankSourceMode === 'bank-direct-v1') safe.bankSourceMode = data.bankSourceMode;
    // คืนผล safe จาก ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
    // v2.4.28: เก็บข้อมูลเทศบาลผ่านขอบเขตตรวจ schema เพื่อให้กราฟ/รายงานใช้ข้อมูลเดียวกัน
    // คัดลอกเฉพาะวันที่ สถานะ และค่าน้ำหนัก ไม่ส่งรูปหรือข้อมูลส่วนบุคคลไปยังตัวคำนวณ
    if (data.municipalRecords !== undefined) {
      if (!Array.isArray(data.municipalRecords)) throw Error('รายการขยะทั่วไปต้องเป็นรายการข้อมูล');
      safe.municipalIssues = [];
      const normalizeDate = value => {
        const raw=String(value??'').trim().replace(/[๐-๙]/g,c=>String('๐๑๒๓๔๕๖๗๘๙'.indexOf(c)));
        let iso=raw;
        // Sheets อาจคืนเลข serial เมื่อรูปแบบวันที่ถูกเปลี่ยนเป็น NUMBER
        if(/^\d{5}(?:\.0+)?$/.test(raw)){const n=Number(raw);if(n>=36526&&n<=109574)iso=new Date(Date.UTC(1899,11,30)+n*86400000).toISOString().slice(0,10);}
        const thai=/^(\d{1,2})\s+(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s+(?:พ\.ศ\.\s*)?(\d{4})$/.exec(raw);
        if(thai){const months=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];const year=Number(thai[3])-(Number(thai[3])>=2400?543:0);iso=year+'-'+String(months.indexOf(thai[2])+1).padStart(2,'0')+'-'+thai[1].padStart(2,'0');}
        if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))throw Error('วันที่อ่านไม่ได้');
        const d=new Date(iso+'T00:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==iso)throw Error('วันที่ไม่ถูกต้อง');return iso;
      };
      safe.municipalRecords = data.municipalRecords.flatMap((row,index) => {
        try {
          if(!object(row))throw Error('รูปแบบข้อมูลไม่ถูกต้อง');
          const date=normalizeDate(row.date);
          if(!['เข้า','ไม่เข้า'].includes(row.entryStatus))throw Error('สถานะเข้าเก็บไม่ถูกต้อง');
          const numberOrNull=value=>{if(value===null||value===undefined||value==='')return null;if(!['number','string'].includes(typeof value)||!String(value).trim()||!Number.isFinite(Number(value))||Number(value)<0)throw Error('น้ำหนักไม่ถูกต้อง');return Number(value);};
          return [{date,entryStatus:row.entryStatus,beforeWeight:numberOrNull(row.beforeWeight),afterWeight:numberOrNull(row.afterWeight)}];
        } catch(error) {
          const rowNo=Number.isInteger(row?.row)&&row.row>=2?row.row:index+2;
          safe.municipalIssues.push('ขยะทั่วไป แถว '+rowNo+': '+error.message+' · ยังไม่รวมในยอด');return [];
        }
      });
    }
    return safe;
  // ปิดบล็อก/โครงสร้างใน ตรวจไฟล์ JSON ที่ผู้ใช้นำเข้าแล้วคัดลอกเฉพาะ schema ที่อนุญาต
  }
  // ตรึง API adapter ไม่ให้แทนที่ตัว parse โดยไม่ตั้งใจ
  root.HubDatasetAdapter = Object.freeze({ parse });
  // ส่งออก API สำหรับ Node tests โดยไม่เปลี่ยนวิธีทำงานใน browser
  if (typeof module !== 'undefined') module.exports = root.HubDatasetAdapter;
// เลือก window ใน browser หรือ globalThis ใน Node โดยไม่เรียกเครือข่าย
})(typeof window === 'undefined' ? globalThis : window);
