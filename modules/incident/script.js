/* ตัวควบคุมหน้ารายงานอุบัติการณ์: รูปตัวอย่าง การตรวจฟอร์ม และส่งข้อมูล */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let photos = [];
  const now = new Date();
  $('incidentDate').value =
    now.getFullYear() +
    '-' +
    String(now.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(now.getDate()).padStart(2, '0');
  $('incidentTime').value =
    String(now.getHours()).padStart(2, '0') +
    ':' +
    String(now.getMinutes()).padStart(2, '0');
// ส่งสถานะให้หน้าแม่เฉพาะต้นทางที่เชื่อถือได้ ไม่ใช่การบันทึก
  function tell(message) { UnifiedApi.submissionStatus('blocked',message); }
// วาดภาพตัวอย่างในเครื่องพร้อมปุ่มลบ URL เหล่านี้ยังไม่ใช่ไฟล์ Drive
  function render() {
    $('photo-list').replaceChildren();
    photos.forEach((item, index) => {
      const box = document.createElement('div');
      box.className = 'photo';
      const img = document.createElement('img');
      img.src = item.url;
      img.alt = 'ภาพแนบ ' + (index + 1);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'ลบรูป ' + (index + 1);
      remove.addEventListener('click', () => {
        URL.revokeObjectURL(item.url);
        photos.splice(index, 1);
        render();
      });
      box.append(img, remove);
      $('photo-list').append(box);
    });
  }
// ตรวจรูปเดิมรวมรูปใหม่ก่อนเพิ่ม เพื่อให้จำนวนรวมไม่เกินกำหนด
  $('photos').addEventListener('change', (event) => {
    try {
      const files = Array.from(event.target.files);
      IncidentModel.validateFiles([...photos.map((x) => x.file), ...files]);
      for (const file of files)
        photos.push({ file, url: URL.createObjectURL(file) });
      render();
    } catch (error) {
      tell(error.message);
    }
    event.target.value = '';
  });
  window.addEventListener('message', (event) => {
    if (
      event.source !== parent ||
      event.origin !== location.origin ||
      event.data?.type !== 'HUB_PROFILE'
    )
      return;
    const name = event.data.name || event.data.profile?.name;
    $('reporterName').value = typeof name === 'string' ? name : '';
  });
  $('incident-form').addEventListener('submit', (event) =>
    event.preventDefault(),
  );
// ตรวจข้อมูลและอ่านรูปก่อนส่ง API แสดงยืนยันเฉพาะหลังได้รับผลจริง
  $('review-incident').addEventListener('click', async () => {
    if (!$('incident-form').reportValidity() || $('review-incident').disabled) return;
    $('review-incident').disabled=true;
    const originalLabel=$('review-incident').textContent;
    $('review-incident').textContent='กำลังบันทึก…';
    let saving=false;
    try {
      const data = {};
      for (const key of [
        'incidentDate',
        'incidentTime',
        'workType',
        'problemType',
        'urgency',
        'location',
        'description',
        'workImpact',
        'initialAction',
        'reporterName',
      ])
        data[key] = $(key).value.trim();
      
      IncidentModel.prepare(
        Object.assign({requestId:'validation-only-0000000000000000'}, data),
        photos.map((x) => x.file),
      );

      UnifiedApi.submissionStatus('preparing','กำลังส่งข้อมูล');
      data.photos=await Promise.all(photos.map(item=>HubFormPhoto.read(item.file)));
      saving=true;
      const result=await UnifiedApi.save('incident',data);
      // ป๊อปอัปยืนยันเป็นหน้าที่ของตัวเชื่อมกลาง ไม่แสดงซ้ำ
      clearPhotos(); render(); $('description').value=''; $('workImpact').value=''; $('initialAction').value='';
    } catch (error) {
      if(!saving) tell(error.message); // ข้อผิดพลาดหลัง save ตัวเชื่อมกลางแสดงแล้ว
    } finally { $('review-incident').disabled=false; $('review-incident').textContent=originalLabel; }
  });
// คืนหน่วยความจำ URL preview เมื่อเลิกใช้รูป ไม่ใช้ URL ชั่วคราวเป็นหลักฐานถาวร
  function clearPhotos() {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    photos = [];
  }
  window.addEventListener('pagehide', clearPhotos);
  $('incident-form').addEventListener('reset', clearPhotos);
  if (parent !== window)
    parent.postMessage(
      { type: 'hub:ready' },
      location.origin === 'null' ? '*' : location.origin,
    );
})();
