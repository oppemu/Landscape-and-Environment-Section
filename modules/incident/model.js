/* กติกาตรวจฟอร์มอุบัติการณ์ แยกจากส่วนแสดงผลและการเชื่อมฐานข้อมูล */
(function (root) {
  'use strict';
// ความยาวสูงสุดแยกตามชื่อช่อง ต้องตรง payload และตัวตรวจฝั่งเซิร์ฟเวอร์
  const LIMITS = Object.freeze({
    requestId: 80,
    incidentDate: 10,
    incidentTime: 5,
    workType: 100,
    problemType: 100,
    urgency: 100,
    location: 500,
    description: 4000,
    workImpact: 1000,
    reporterName: 120,
    initialAction: 1000,
  });
// ช่องจำเป็น ไม่รวมการแก้ไขเบื้องต้นซึ่งเป็นช่องเสริม
  const REQUIRED_FIELDS = Object.freeze([
    'requestId',
    'incidentDate',
    'incidentTime',
    'workType',
    'problemType',
    'urgency',
    'location',
    'description',
    'workImpact',
    'reporterName',
  ]);
  const REQUEST_ID_PATTERN = '^[A-Za-z0-9_-]{16,80}$';
  const types = ['image/jpeg', 'image/png', 'image/webp'];
// ตรวจไม่เกินสามรูป ชนิด JPG/PNG/WEBP และขนาด 5 MB ต่อรูป ก่อนอ่านไฟล์
  function validateFiles(files) {
    if (files.length > 3) throw Error('แนบได้ไม่เกิน 3 รูป');
    for (const f of files)
      if (
        !types.includes(f.type) ||
        !Number.isFinite(f.size) ||
        f.size <= 0 ||
        f.size > 5 * 1024 * 1024
      )
        throw Error('ใช้รูป JPG PNG WEBP ขนาดไม่เกิน 5 MB ต่อรูป');
    return true;
  }
// ตรวจข้อมูลอย่างเดียว ไม่เขียนชีตและไม่ส่งเครือข่าย คืนชุดเตรียมส่งให้หน้าเว็บ
  function prepare(data, files) {
    validateFiles(files);
    for (const k of REQUIRED_FIELDS)
      if (
        typeof data[k] !== 'string' ||
        
        data[k].length > LIMITS[k]
      )
        throw Error('กรอกข้อมูลที่จำเป็นให้ครบ');
// ตรวจรหัสคำขอก่อนใช้เป็นตัวอ้างอิงการส่ง
    if (!new RegExp(REQUEST_ID_PATTERN).test(data.requestId))
      throw Error('รหัสคำขอไม่ถูกต้อง');
    if (
      data.initialAction != null &&
      (typeof data.initialAction !== 'string' ||
        data.initialAction.length > LIMITS.initialAction)
    )
      throw Error('การแก้ไขเบื้องต้นไม่เกิน 1000 ตัวอักษร');
    if (
      (data.incidentDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.incidentDate)) ||
      (data.incidentDate && Number.isNaN(Date.parse(data.incidentDate))) ||
      (data.incidentDate && new Date(data.incidentDate).toISOString().slice(0, 10) !==
        data.incidentDate) ||
      (data.incidentTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.incidentTime))
    )
      throw Error('วันหรือเวลาไม่ถูกต้อง');
// คืนสำเนาข้อมูลพร้อมรายการรูปว่าง ตัวหน้าเว็บเติมรูปจริงภายหลัง previewOnly ไม่ใช่ผลบันทึก
    return { ...data, photos: [], previewOnly: true };
  }
  root.IncidentModel = {
    validateFiles,
    prepare,
    LIMITS,
    REQUIRED_FIELDS,
    REQUEST_ID_PATTERN,
  };
  if (typeof module !== 'undefined') module.exports = root.IncidentModel;
})(typeof window === 'undefined' ? globalThis : window);
