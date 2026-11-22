/* ตัวเลือกแบบป๊อปอัป: เก็บ select เดิมเพื่อรักษาค่า validation และสัญญา change ของทุกฟอร์ม */
(function (root) {
  'use strict';
  const doc = root.document;
  if (!doc || !root.MutationObserver || typeof doc.createElement('dialog').showModal !== 'function') return;
 // Map จับคู่ select เดิมกับปุ่มใหม่; ตัว select ยังเป็นเจ้าของค่าและ validation
  const entries = new Map();
  let active = null;
  const dialog = doc.createElement('dialog');
  dialog.className = 'mu-choice-dialog';
  dialog.setAttribute('aria-labelledby', 'mu-choice-title');
  const title = doc.createElement('h2'); title.id = 'mu-choice-title';
  const options = doc.createElement('div'); options.className = 'mu-choice-options';
  const close = doc.createElement('button'); close.type = 'button'; close.textContent = 'เสร็จสิ้น';
  close.className = 'mu-choice-close';
  dialog.append(title, options, close);
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { if (active && active.button.isConnected) active.button.focus(); active = null; });
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });

  function label(select) {
    const explicit = select.getAttribute('aria-label');
    if (explicit) return explicit;
    const labelled = select.labels && select.labels[0];
    if (labelled) {
      const copy = labelled.cloneNode(true);
      copy.querySelectorAll('select,button,input').forEach(el => el.remove());
      if (copy.textContent.trim()) return copy.textContent.trim();
    }
    return select.name || 'เลือกข้อมูล';
  }
 // อัปเดตป้ายและสถานะปุ่มจาก select จริง ไม่แปลงชนิดข้อมูลหรือเปลี่ยนค่าที่ส่ง
  function refresh(entry) {
    const { select, button } = entry;
    const text = Array.from(select.selectedOptions).map(o => o.textContent).join(', ') || 'เลือกข้อมูล';
    if (button.textContent !== text) button.textContent = text;
    button.disabled = select.disabled || Boolean(select.closest('fieldset[disabled]'));
    button.hidden = select.hidden || select.style.display === 'none';
    button.setAttribute('aria-label', label(select) + ': ' + button.textContent);
    button.setAttribute('aria-required', String(select.required));
  }
  // สร้างรายการจาก option สดทุกครั้ง ไม่คัดลอกข้อมูลธุรกิจหรือรายการตัวอย่างค้างไว้
  function renderChoices() {
    if (!active) return;
    const select = active.select;
    title.textContent = label(select);
    options.replaceChildren();
    Array.from(select.options).forEach(option => {
      const item = doc.createElement('button'); item.type = 'button';
      item.textContent = option.textContent;
      item.disabled = option.disabled || (option.parentElement.tagName === 'OPTGROUP' && option.parentElement.disabled);
      item.setAttribute('aria-pressed', String(option.selected));
      item.addEventListener('click', () => {
        if (select.disabled || select.closest('fieldset[disabled]') || option.disabled || (option.parentElement.tagName === 'OPTGROUP' && option.parentElement.disabled)) return;
        if (select.multiple) option.selected = !option.selected;
        else select.selectedIndex = option.index;
        // ส่งเหตุการณ์เดิมให้โค้ดคำนวณ/ตัวเลือกต่อเนื่องและระบบบันทึกทำงานเหมือนเดิม
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        refresh(active);
        if (select.multiple) renderChoices(); else dialog.close();
      });
      options.append(item);
    });
  }
 // ติดตั้งครั้งเดียวต่อ select และเก็บ native control ไว้ให้โค้ดฟอร์มเดิมใช้งานได้
  function attach(select) {
    if (entries.has(select) || select.dataset.nativeSelect === 'true') return;
    const button = doc.createElement('button'); button.type = 'button';
    button.className = 'mu-choice-trigger'; button.setAttribute('aria-haspopup', 'dialog');
    const entry = { select, button }; entries.set(select, entry);
    select.classList.add('mu-choice-native');
    select.tabIndex = -1;
    select.insertAdjacentElement('afterend', button);
    button.addEventListener('click', () => {
      refresh(entry); if (button.disabled) return;
      active = entry; renderChoices(); dialog.showModal();
      (options.querySelector('[aria-pressed="true"]:not(:disabled)') || options.querySelector('button:not(:disabled)') || close).focus();
    });
    select.addEventListener('change', () => refresh(entry));
    // validation ยังเป็นของ select จริง แต่โฟกัสส่งไปยังปุ่มที่มองเห็นได้
    select.addEventListener('invalid', () => { refresh(entry); button.focus(); });
    select.addEventListener('focus', () => button.focus());
    refresh(entry);
  }
 // ค้นหา select ที่เพิ่มใหม่และเก็บกวาดปุ่มของช่องที่ถูกนำออก ป้องกันตัวเลือกค้างจากโมดูลเก่า
  function scan() {
    doc.querySelectorAll('select').forEach(attach);
    entries.forEach((entry, select) => {
      if (!select.isConnected) { entry.button.remove(); entries.delete(select); }
      else refresh(entry);
    });
  }
  function start() {
    doc.body.append(dialog); scan();
    // รองรับฟอร์มใน iframe และฟอร์มที่สร้าง DOM ภายหลัง รวม disabled/required/options
    new MutationObserver(records => {
      if (records.some(r => !dialog.contains(r.target) && !r.target.closest?.('.mu-choice-trigger'))) scan();
    }).observe(doc.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled','required','hidden','style','selected','label'] });
    doc.addEventListener('reset', () => root.setTimeout(scan, 0), true);
    // การตั้ง select.value ด้วย JavaScript ไม่เกิด mutation จึงซิงก์เฉพาะค่าที่แสดงเป็นระยะ
    root.setInterval(() => entries.forEach(refresh), 400);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})(window);
