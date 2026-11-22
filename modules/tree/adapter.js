/* ตัวแปลงทะเบียนต้นไม้ ตัดแถวผิดพร้อมนับเหตุผล ไม่เดาพิกัด */
(function (root) {
  "use strict";
  const SOURCE = "unified-tree-registry";
  /**
   * Validate the v1 tree export without mutating the caller's data.
   * Rows are [id, name, description, area, latitude, longitude].
   * @param {string|Object} input JSON text (max 10 MB) or decoded export.
   * @returns {{trees: Object[], invalid: number, blank: number,
   * duplicate: number, omitted: number, sourceDate: string,
   * coverage: Object, total: number}} Valid trees and explicit omission counts.
   * @throws {SyntaxError|Error} Invalid JSON, source, coverage or row structure.
   * Invalid coordinates are counted, not replaced with invented coordinates.
   * Duplicate IDs among otherwise valid rows are all omitted.
   */
// ตรวจโครงสร้าง แหล่งข้อมูล วันที่ และจำนวนแถว โดยไม่แก้ต้นฉบับของผู้เรียก
  function parse(input) {
    if (
      typeof input === "string" &&
      new TextEncoder().encode(input).length > 10 * 1024 * 1024
    )
      throw Error("ไฟล์ใหญ่เกิน 10 MB");
    const d = typeof input === "string" ? JSON.parse(input) : input;
    if (
      !d ||
      d.version !== 1 ||
      d.sourceSpreadsheetId !== SOURCE ||
      d.sourceSheet !== "ทะเบียนต้นไม้" ||
      !Array.isArray(d.rows) ||
      d.rows.length > 100000
    )
      throw Error("รูปแบบหรือแหล่งข้อมูลต้นไม้ไม่ตรงกับฐานข้อมูลที่ตรวจสอบ");
    if (
      typeof d.sourceDate !== "string" ||
      d.sourceDate.length > 100 ||
      !Number.isFinite(Date.parse(d.sourceDate))
    )
      throw Error("วันที่ข้อมูลไม่ถูกต้อง");
    if (
      !d.coverage ||
      d.coverage.startRow !== 2 ||
      !Number.isInteger(d.coverage.endRow) ||
      d.coverage.endRow < 1 ||
      d.rows.length !== Math.max(0, d.coverage.endRow - 1)
    )
      throw Error("จำนวนแถวไม่ตรงกับขอบเขตข้อมูล");
// นับแถวผิด แถวว่าง และรหัสซ้ำแยก เพื่อรายงานจุดที่ไม่แสดงอย่างตรงไปตรงมา
    let invalid = 0,
      blank = 0,
      duplicate = 0;
    const reasons = {
      missingIdentity: 0,
      unavailableCoordinates: 0,
      invalidCoordinates: 0,
    };
    const counts = new Map(),
      valid = [];
// แถวต้องมีหกช่อง: รหัส ชื่อ รายละเอียด พื้นที่ ละติจูด ลองจิจูด
    for (const row of d.rows) {
      if (!Array.isArray(row) || row.length !== 6)
        throw Error("แถวข้อมูลต้องมี 6 คอลัมน์");
      if (
        row.slice(0, 4).some((v) => typeof v !== "string" || v.length > 2000) ||
        row.slice(4).some((v) => v !== null && typeof v !== "number")
      )
        throw Error("ชนิดข้อมูลในแถวไม่ถูกต้อง");
      if (row.every((v) => v === "" || v === null)) {
        blank++;
        continue;
      }
      const [id, name, description, area, lat, lng] = row;
      // Mutually exclusive precedence: identity, unavailable, then invalid range.
      let reason = null;
      if (!id.trim() || !name.trim()) reason = "missingIdentity";
      else if (lat === null || lng === null) reason = "unavailableCoordinates";
      else if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        Math.abs(lat) > 90 ||
        Math.abs(lng) > 180
      )
        reason = "invalidCoordinates";
      if (reason) {
        reasons[reason]++;
        invalid++;
        continue;
      }
      const tree = {
        id: id.trim(),
        name: name.trim(),
        description: description.trim(),
        area: area.replace(/\s+/g, "").trim(),
        lat,
        lng,
      };
      counts.set(tree.id, (counts.get(tree.id) || 0) + 1);
      valid.push(tree);
    }
// ตัดทุกรายการที่มีรหัสซ้ำ ไม่สุ่มเลือกเพียงแถวแรก
    const trees = valid.filter((t) => {
      if (counts.get(t.id) > 1) {
        duplicate++;
        return false;
      }
      return true;
    });
    return {
      trees,
      invalid,
      reasons,
      blank,
      duplicate,
      omitted: invalid + blank + duplicate,
      sourceDate: d.sourceDate,
      coverage: { ...d.coverage },
      total: d.rows.length,
    };
  }
// แปลงรายการฐานรวมเป็นหกคอลัมน์แล้วตรวจด้วย parse ไม่สร้างพิกัดทดแทนช่องว่าง
  function fromRecords(records, sourceDate = new Date().toISOString()) {
    if (!Array.isArray(records)) throw Error("ระบบไม่คืนทะเบียนต้นไม้");
    const coordinate = value => value === '' || value == null ? null : typeof value === 'number' ? value : /^-?\d+(?:\.\d+)?$/.test(String(value).trim()) ? Number(value) : NaN;
    return parse({version:1,sourceSpreadsheetId:SOURCE,sourceSheet:'ทะเบียนต้นไม้',sourceDate,
      coverage:{startRow:2,endRow:records.length+1},rows:records.map(record=>{
        if (!record || typeof record!=='object' || Array.isArray(record)) throw Error('ข้อมูลต้นไม้ผิดรูปแบบ');
        return [String(record.id||''),String(record.name||''),String(record.note||''),String(record.location||''),coordinate(record.lat),coordinate(record.lng)];
      })});
  }
  root.HubTreeAdapter = { parse, fromRecords, SOURCE };
  if (typeof module !== "undefined") module.exports = root.HubTreeAdapter;
})(typeof window === "undefined" ? globalThis : window);
