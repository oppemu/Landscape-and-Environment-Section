/* ตัวควบคุมหน้าแอปหลัก: route เมนู iframe และการเปลี่ยนบริบทผู้กรอก
 * หน้ารายงานและฟอร์มมีตัวควบคุมแยกกัน การแสดงเมนูไม่ใช่สิทธิ์เข้าถึงฐานข้อมูล */
/* Application bootstrap. Configuration and behavior live in purpose-specific files. */
(async function () {
  'use strict';
  // สร้างตัวควบคุมรายงานหนึ่งชุด แล้วใช้ร่วมกันกับทุกหน้า
  const report = HubReportController.create();
  let host;
  // ชื่อโปรไฟล์ใช้แสดงในฟอร์ม ไม่ใช่หลักฐานสิทธิ์บัญชี Google
  const profile = HubProfileController.create({
    hasWork: () => host.hasDrafts() || report.hasData(),
    resetWork: () => {
      host.reset();
      report.reset();
      if (window.HubLandscapeReport) window.HubLandscapeReport.reset();
      if (window.HubDashboard && window.HubDashboard.reset) window.HubDashboard.reset();
    },
    onChange: (reset) => {
      if (reset) location.hash = 'overview';
      else host.broadcastProfile();
      host.route();
      window.dispatchEvent(new Event('mu:profile-changed'));
      if (window.HubDashboard && window.HubDashboard.activate) window.HubDashboard.activate();
    },
  });
  // เชื่อมหน้าฟอร์มย่อยกับรายงานและตัวเลือกผู้กรอก
  host = HubModuleHost.create({
    report,
    getName: profile.getName,
    openProfile: profile.open,
  });
  if (window.HubDashboard) window.HubDashboard.mount();
  host.route();
  window.dispatchEvent(new Event('mu:profile-changed'));
  const api=window.HubConfig?.api;
  if (!api?.webAppUrl || !api?.spreadsheetId) {
    const notice=document.getElementById('profile-storage-status');
    notice.textContent='โหมดดูหน้าเว็บ: ยังไม่เชื่อมฐานข้อมูล ตั้ง Web App URL และรหัสฐานใน config/app-config.js ก่อนใช้งานจริง';
    notice.hidden=false;
    document.body.classList.remove('profile-required');
  } else if (!profile.getName()) profile.open();
})();
