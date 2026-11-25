/* รายการ route และหมวดใช้จัดเมนูเท่านั้น ไม่ใช่กฎการอนุญาตเข้าถึงข้อมูล
 * การซ่อนลิงก์ไม่ป้องกันคำขอโดยตรง จึงต้องตรวจสิทธิ์ฝั่งเซิร์ฟเวอร์เสมอ */
// ตั้งเมนูที่แสดงในแอป ไม่ใช่สิทธิ์ฝั่งเซิร์ฟเวอร์ การซ่อนเมนูไม่ทดแทนการตรวจบัญชี
/* Public navigation: add a module here, not in individual controllers. */
(function (root) {
  'use strict';
  const modules = [
    ['general', 'ขยะทั่วไป · เทศบาล', 'general/index.html', 'report'],
    ['food', 'เก็บเศษอาหาร', 'food/index.html?v=20261125-food10-label', 'bowl'],
    ['fresh', 'รับพืชสด', 'fresh/index.html', 'leaf'],
    ['humusquality', 'ผลิตฮิวมัส', 'humusquality/index.html', 'check'],
    ['sale', 'จำหน่ายผลผลิต', 'sale/index.html', 'bag'],
    ['inventory', 'คลังและยืมคืน', 'inventory/index.html', 'inventory'],
    ['landscape-daily', 'รายงานประจำวันภูมิทัศน์', 'landscape-daily/index.html?v=20261125-daily1', 'report'],
    ['incident', 'รายงานเหตุการณ์', 'incident/index.html', 'report'],
    ['tree', 'แดชบอร์ด', 'tree/index.html', 'map'],
  ];
  root.HubConfig = Object.freeze({
    api: root.HubConfig.api,
    paApiExecutable: root.HubConfig.paApiExecutable,
    paOAuthClientId: root.HubConfig.paOAuthClientId,
    paReportEnabled: root.HubConfig.paReportEnabled===true,
    paPublicSummaryEnabled: root.HubConfig.paPublicSummaryEnabled===true,
    paVerifiedEvidenceEnabled: root.HubConfig.paVerifiedEvidenceEnabled===true,
    bankImportUrl: root.HubConfig.bankImportUrl, // คงลิงก์หน้านำเข้า Excel จาก config เดิม
    modules: Object.freeze(modules.map(Object.freeze)),
    dashboardRoute: 'tree',
    bankImport: Object.freeze({
      route: 'bank-import',
      title: 'นำเข้า Excel ธนาคารขยะ',
    }),
  });
})(window);
