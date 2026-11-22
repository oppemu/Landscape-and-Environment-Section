/* ลงทะเบียน service worker เพื่อใช้ทรัพยากรหน้าเว็บที่แคชไว้
 * การเปิดหน้าออฟไลน์ไม่ได้แปลว่าส่งข้อมูลเข้าชีตได้ และไม่รับประกันว่าคิวทำงานเมื่อปิดเบราว์เซอร์ */
/* Installation is progressive enhancement. Registration never enables offline form writes. */
(function () {
  'use strict';
  const base = new URL('../', document.currentScript.src);
  const install = document.getElementById('install-app');
  const help = document.getElementById('install-help');
  const message = document.getElementById('pwa-status');
  const update = document.getElementById('update-app');
  let deferredPrompt = null;
  let registration = null;
  let prompting = false;
  let reloadApproved = false;
  install.addEventListener('click', async () => {
    if (prompting) return;
    if (!deferredPrompt) {
      if (!help.open) help.showModal();
      return;
    }
    const prompt = deferredPrompt;
    deferredPrompt = null;
    prompting = true;
    install.disabled = true;
    // Attach rejection handling immediately, including while the browser prompt is pending.
    const outcome = Promise.resolve(prompt.userChoice).then(
      (choice) => ({ choice }),
      (error) => ({ error }),
    );
    try {
      await prompt.prompt();
      const result = await outcome;
      if (result.error) throw result.error;
      const choice = result.choice;
      message.textContent =
        choice.outcome === 'accepted'
          ? 'รับคำขอติดตั้งแล้ว ตรวจสอบการติดตั้งบนอุปกรณ์'
          : 'ยังไม่ได้ติดตั้ง สามารถใช้ผ่านเว็บต่อได้';
    } catch (error) {
      message.textContent =
        'ยังติดตั้งไม่ได้ ลองผ่านเมนูเบราว์เซอร์ หรือใช้ผ่านเว็บต่อได้';
    } finally {
      prompting = false;
      install.disabled = false;
    }
  });
  document
    .getElementById('close-install-help')
    .addEventListener('click', () => help.close());
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    install.textContent = 'ติดตั้งแอพ';
  });
  window.addEventListener('appinstalled', () => {
    message.textContent = 'ติดตั้งแอพบนอุปกรณ์แล้ว';
    install.hidden = true;
    deferredPrompt = null;
  });
  if (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true
  )
    install.hidden = true;
  // แจ้งมีเวอร์ชันใหม่ แต่ให้ผู้ใช้ยืนยันก่อนสลับเพื่อไม่เสียแบบร่าง
  function showUpdate() {
    if (!registration?.waiting) return;
    update.hidden = false;
    message.textContent =
      'มีรุ่นใหม่ อัปเดตเมื่อบันทึกงานเรียบร้อยแล้ว ร่างในหน้านี้จะหายเมื่อโหลดใหม่';
  }
  update.addEventListener('click', async () => {
    if (!registration?.waiting) return;
    if (
      !(window.MUDialog ? await window.MUDialog.confirm('อัปเดตและโหลดหน้าใหม่? ร่างแบบฟอร์ม รูปแนบ และรายงานที่นำเข้าในหน้านี้จะหาย ตรวจสอบงานก่อนดำเนินการ') : window.confirm('อัปเดตและโหลดหน้าใหม่? ร่างแบบฟอร์ม รูปแนบ และรายงานที่นำเข้าในหน้านี้จะหาย ตรวจสอบงานก่อนดำเนินการ'))
    )
      return;
    if (!registration?.waiting) return;
    reloadApproved = true;
    registration.waiting.postMessage({ type: 'APPLY_CONFIRMED_UPDATE' });
  });
  if (
    !('serviceWorker' in navigator) ||
    !window.isSecureContext ||
    location.protocol !== 'https:'
  ) {
    message.textContent =
      'ติดตั้งได้หลังเปิดเว็บที่เผยแพร่ผ่าน HTTPS ในเบราว์เซอร์ที่รองรับ';
    return;
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadApproved) {
      reloadApproved = false;
      window.location.reload();
    }
  });
  navigator.serviceWorker
    .register(new URL('service-worker.js', base).href, { scope: base.href })
    .then((value) => {
      registration = value;
      showUpdate();
      value.addEventListener('updatefound', () => {
        const worker = value.installing;
        worker?.addEventListener('statechange', () => {
          if (
            worker.state === 'installed' &&
            navigator.serviceWorker.controller
          )
            showUpdate();
        });
      });
    })
    .catch(() => {
      message.textContent =
        'ยังเตรียมการติดตั้งไม่ได้ ใช้งานออนไลน์ผ่านเว็บได้ตามเดิม';
    });
})();
