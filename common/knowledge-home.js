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
    'landscape-daily': ['ติดตามงาน','บันทึกรายงานประจำวันของงานภูมิทัศน์'],
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

/* Public, editor-curated homepage feed. The rest of the app stays independent. */
(() => {
'use strict';
const fallback=[{"date":"","tag":"พื้นที่สีเขียว","title":"เติมร่มเงาให้ศาลายา","description":"งานภูมิทัศน์ดูแลต้นไม้ สนามหญ้า และพื้นที่ส่วนกลาง เพื่อให้มหาวิทยาลัยร่มรื่นและใช้งานได้ทุกวัน","image":"https://science.mahidol.ac.th/news/wp-content/uploads/2021/05/May64-19-09-768x576.jpg","alt":"กิจกรรมปลูกต้นไม้ที่มหาวิทยาลัยมหิดล ศาลายา","link":"https://science.mahidol.ac.th/news/may64-19-01/","credit":"ภาพจากคณะวิทยาศาสตร์ มหาวิทยาลัยมหิดล"},{"date":"","tag":"กิจกรรม","title":"ปลูกต้นไม้ร่วมกับชุมชนมหิดล","description":"การเพิ่มพื้นที่สีเขียวเป็นงานที่หลายส่วนงานร่วมกันทำ ตั้งแต่การปลูกต้นไม้ไปจนถึงการดูแลให้เติบโต","image":"https://inmu.mahidol.ac.th/th/wp-content/uploads/2024/06/050667_2-1024x683.jpg","alt":"กิจกรรมปลูกต้นไม้เนื่องในวันสิ่งแวดล้อมโลก","link":"https://inmu.mahidol.ac.th/th/10080/","credit":"ภาพจากสถาบันโภชนาการ มหาวิทยาลัยมหิดล"},{"date":"","tag":"จัดการขยะ","title":"คัดแยกตั้งแต่ต้นทาง","description":"ทีมงานแบ่งเก็บขยะตามประเภท ขยะรีไซเคิลเข้าสู่ธนาคารขยะ ส่วนเศษอาหารและเศษพืชนำไปใช้ประโยชน์ตามกระบวนการของมหาวิทยาลัย","image":"","alt":"","link":"https://ns.mahidol.ac.th/nurse_th/annual_activities/2568/11/green.html","credit":""}];
const $=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt)e.textContent=txt;return e;};
function safe(value,photo=false){
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port)return '';
 if(u.hostname==='mahidol.ac.th'||u.hostname.endsWith('.mahidol.ac.th'))return u.href;
 if(u.hostname==='drive.google.com'){
  const id=u.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]{20,})(?:\/view)?\/?$/)?.[1];
  if(id)return photo?'https://drive.google.com/thumbnail?id='+id+'&sz=w1200':u.href;
 }return '';}catch(_){return '';}
}
function clean(rows){return rows.slice(0,12).map(r=>{if(!r||typeof r.title!=='string')return null;const bounded=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';return {title:bounded(r.title,100),tag:bounded(r.tag,35),date:bounded(r.date,40),description:bounded(r.description,390),alt:bounded(r.alt,140),credit:bounded(r.credit,110),image:safe(r.image,true),link:safe(r.link)};}).filter(x=>x&&x.title);}
function start(){
 const target=document.getElementById('overview');if(!target||target.querySelector('.lh-news'))return;
 const root=$('div','lh-news');root.setAttribute('aria-label','ข่าวสารงานภูมิทัศน์และสิ่งแวดล้อม');
 const top=$('div','lh-intro'), brand=$('span','lh-kicker','มหาวิทยาลัยมหิดล · ศาลายา');
 top.append(brand,$('h1','','งานภูมิทัศน์และสิ่งแวดล้อม'),$('p','','รู้จักงานที่ดูแลศาลายาให้น่าอยู่ ตั้งแต่พื้นที่สีเขียวไปจนถึงการจัดการขยะ'));
 const quick=$('div','lh-quick');
 for(const [label,href] of [['ไปที่แบบฟอร์ม','#forms'],['ดูแดชบอร์ด','#tree']]){
   const nav=$('a','',label);nav.href=href;if(href==='#tree')nav.className='lh-desktop';quick.append(nav);
 }
 top.append(quick);
 const hero=$('section','lh-hero');hero.setAttribute('aria-label','สไลด์ภาพกิจกรรม');
 const media=$('div','lh-media'), copy=$('div','lh-copy');
 const chip=$('span','lh-tag'), h=$('h2'), desc=$('p'), credit=$('small');
 const read=$('a','lh-read','อ่านเรื่องนี้'), controls=$('div','lh-controls'), counter=$('span','lh-counter'), prev=$('button','','‹'), next=$('button','','›'), play=$('button','','หยุด');
 prev.setAttribute('aria-label','สไลด์ก่อนหน้า');next.setAttribute('aria-label','สไลด์ถัดไป');play.setAttribute('aria-label','หยุดการเปลี่ยนสไลด์อัตโนมัติ');
 for(const el of [prev,next,play])el.type='button';
 read.target='_blank';read.rel='noopener noreferrer';
 controls.append(prev,counter,next,play);copy.append(chip,h,desc,credit,read,controls);hero.append(media,copy);
 const notices=$('section','lh-board');notices.append($('h2','','ข่าวสารและเรื่องน่ารู้'));const grid=$('div','lh-grid');notices.append(grid);
 root.append(top,hero,notices);target.prepend(root);
 let feed=[],slides=[],i=0,timer=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,hover=false,focused=false,loaded=0,busy=false;
 function img(data,lazy){const el=$('img');el.alt=data.alt||'';el.loading=lazy?'lazy':'eager';el.decoding='async';el.referrerPolicy='no-referrer';el.addEventListener('error',()=>el.remove(),{once:true});el.src=data.image;return el;}
 function show(){
  const r=slides[i];hero.hidden=!r;if(!r)return;
  media.replaceChildren();if(r.image)media.append(img(r,false));
  chip.textContent=r.tag||'กิจกรรมภูมิทัศน์'; h.textContent=r.title;desc.textContent=r.description;credit.textContent=r.credit;
  credit.hidden=!r.credit;read.hidden=!r.link;if(r.link)read.href=r.link;else read.removeAttribute('href');
  counter.textContent=String(i+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');controls.hidden=slides.length<2;
  play.textContent=paused?'เล่น':'หยุด';play.setAttribute('aria-label',paused?'เล่นสไลด์อัตโนมัติ':'หยุดการเปลี่ยนสไลด์อัตโนมัติ');
 }
 function arm(){clearTimeout(timer);if(!paused&&!hover&&!focused&&!document.hidden&&!target.hidden&&slides.length>1)timer=setTimeout(()=>step(1),6500);}
 function step(n){i=(i+n+slides.length)%slides.length;show();arm();}
 function render(r){
  feed=clean(r);slides=feed.filter(x=>x.image);if(!slides.length)slides=feed;i=0;show();arm();
  grid.replaceChildren();
  if(!feed.length){grid.append($('p','lh-empty','ยังไม่มีข่าวที่เผยแพร่'));return;}
  for(const r of feed.slice(0,6)){
   const a=$('article','lh-card'), mark=$('span','lh-kicker',[r.tag,r.date].filter(Boolean).join(' · '));
   a.append(mark,$('h3','',r.title),$('p','',r.description));
   if(r.link){const l=$('a','lh-card-link','อ่านต่อ ↗');l.href=r.link;l.target='_blank';l.rel='noopener noreferrer';a.append(l);}
   grid.append(a);
  }
 }
 function update(){if(target.hidden||busy||Date.now()-loaded<60000||!window.UnifiedApi?.request)return;
  busy=true;window.UnifiedApi.request({action:'landscapeHomeNewsRead'}).then(x=>{if(Array.isArray(x?.items)){loaded=Date.now();render(x.items);}}).catch(()=>{}).finally(()=>{busy=false;});
 }
 prev.addEventListener('click',()=>step(-1));next.addEventListener('click',()=>step(1));play.addEventListener('click',()=>{paused=!paused;show();arm();});
 hero.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hover=true;arm();}});hero.addEventListener('pointerleave',()=>{hover=false;arm();});
 hero.addEventListener('focusin',()=>{focused=true;arm();});hero.addEventListener('focusout',e=>{focused=hero.contains(e.relatedTarget);arm();});
 let swipe=null;media.addEventListener('touchstart',e=>{swipe=e.changedTouches[0].screenX;},{passive:true});
 media.addEventListener('touchend',e=>{if(swipe!==null&&slides.length>1){const dx=e.changedTouches[0].screenX-swipe;if(Math.abs(dx)>45)step(dx<0?1:-1);}swipe=null;},{passive:true});
 const wake=()=>{arm();if(!document.hidden)update();};
 new MutationObserver(wake).observe(target,{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('visibilitychange',wake);window.addEventListener('pageshow',wake);
 render(fallback);update();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
