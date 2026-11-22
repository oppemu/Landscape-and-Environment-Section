// ใช้ลิงก์ส่วนกลางจาก config/app-config.js ร่วมกัน ไม่สร้าง backend แยกต่อหน้า
// All writes are routed by common/bridge.js to the unified backend.
const CONFIG = Object.freeze({ WEB_APP_URL: 'unified://save' });
