/* Editorial card metadata only; no state, route, authorization or API changes. */
(() => {
  'use strict';
  const covers = Object.freeze({
    // Add approved local files by route, e.g. food: 'assets/knowledge/food.webp'.
  });
  const content = Object.freeze({
    general: ['จัดการขยะ','บันทึกชั่งและส่งขยะทั่วไปกับเทศบาล'],
    food: ['จัดการขยะ','บันทึกน้ำหนักเศษอาหารตามจุดเก็บ'],
    fresh: ['วัสดุอินทรีย์','บันทึกการรับพืชสดและวัสดุสีเขียว'],
    humusquality: ['ผลิตปุ๋ย','บันทึกการผลิตและตรวจคุณภาพฮิวมัส'],
    sale: ['ผลผลิต','บันทึกยอดจำหน่ายผลผลิต'],
    inventory: ['บริการ','ดูคลังและบันทึกการยืมคืนอุปกรณ์'],
    incident: ['ติดตามงาน','บันทึกเหตุการณ์และรายละเอียดที่พบ'],
    'pa-work-report': ['ติดตามงาน','รายงานตามสายงานและแนบรูปหลักฐานสำหรับ PA'],
    'bank-import': ['ธนาคารขยะ','นำเข้ารายการผ่านไฟล์ Excel'],
  });
  const add = (cls, text) => {
    const n = document.createElement('span');
    n.className = cls; n.textContent = text; return n;
  };
  function start() {
    const formsView = document.getElementById('forms-view');
    if (!formsView) return;
    for (const link of formsView.querySelectorAll('#cards a.card[href^="#"]')) {
      const route = link.getAttribute('href').slice(1);
      const row = content[route], title = link.querySelector('h3'), cover = link.querySelector('.card-icon');
      if (!row || !title || !cover || link.classList.contains('kc-card')) continue;
      link.classList.add('kc-card');
      link.dataset.kcRoute = route;
      const copy = document.createElement('div'); copy.className = 'kc-card-copy';
      copy.append(add('kc-tag',row[0]),title);
      link.append(copy);
      const src = covers[route];
      if (typeof src === 'string' && /^assets\/knowledge\/[a-z0-9_-]+\.(?:avif|webp|png|jpe?g)$/i.test(src)) {
        const img = document.createElement('img'); img.className='kc-cover-image'; img.alt=''; img.loading='lazy'; img.decoding='async';
        img.addEventListener('load',() => cover.classList.add('kc-has-image'),{once:true});
        img.addEventListener('error',() => img.remove(),{once:true}); img.src=src; cover.append(img);
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
