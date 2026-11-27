(() => {
  'use strict';
  const mount = document.getElementById('pa-layout-pages');
  const name = document.getElementById('pa-layout-name');
  const viewPeriod=document.getElementById('pa-layout-period');
  if (!mount || !name || !viewPeriod || !window.PaPagination || !window.PaEvidence) return;
  const reportPeriod=()=>window.PaEvidence.periodFor(viewPeriod.value)||window.PaEvidence.period(new Date(),0);
  function defaultPeriod(){viewPeriod.value=window.PaEvidence.period(new Date(),0).month;}
  defaultPeriod();
  const sections = [
    ['1.1 ยกระดับการคัดแยกขยะ'],
    ['1.2 Digital Transformation'],
    ['2. ภาระงานประจำ','2.1 ปฏิบัติงานให้บริการ','2.2.1 รับกิ่งไม้สดและบดหย่อย'],
    ['2.2.2 ขึ้นกองปุ๋ย'],
    ['2.2.3 ดูแลกองปุ๋ย'],
    ['2.2.4 ย่อยกองปุ๋ยและตากแดด'],
    ['2.2.5 เก็บปุ๋ยที่ตากแห้ง'],
    ['2.2.6 บรรจุปุ๋ยเพื่อจำหน่าย'],
    ['2.2.7 ดูแลความเรียบร้อยของพื้นที่'],
    ['2.3 ผลิตน้ำหมักชีวภาพ'],
    ['2.4 สนับสนุนภารกิจและการออกกำลังกาย'],
    ['2.5 กำจัดเศษอาหาร'],
    ['3.1 จัดการขยะอันตราย','4.1 ช่วยงานกิจกรรมส่วนกลาง']
  ];
  const titles = ['ภาระงานตามข้อตกลงการปฏิบัติงาน','รายงานความก้าวหน้าการปฏิบัติงานตามตัวชี้วัดเป้าหมายความสำเร็จของภาระงาน','ปัญหา/อุปสรรค'];
  const node = (tag, attrs = {}, label = '') => {
    const element = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => element.setAttribute(k, v));
    if (label) element.textContent = label;
    return element;
  };
  let identity;
  const signerPositions=new Map(), signerRequests=new Map();
  const thaiDate=new Intl.DateTimeFormat('th-TH-u-ca-buddhist',{timeZone:'Asia/Bangkok',day:'numeric',month:'long',year:'numeric'});
  function signatureDate(now=new Date()){
    const parts=Object.fromEntries(thaiDate.formatToParts(now).map(p=>[p.type,p.value]));
    return parts.day+' '+parts.month+' พ.ศ. '+parts.year;
  }
  function updateSignatureDate(){for(const el of mount.querySelectorAll('[data-pa-signature-date]'))el.textContent='วันที่ '+signatureDate();}
  function updateSignerPosition(person){
    const section=mount.querySelector('.pa-signatures');
    if(section?.dataset.reportOwner!==person)return;
    const field=section.querySelector('[data-pa-signature-position]');
    if(field&&signerPositions.get(person))field.textContent='ตำแหน่ง '+signerPositions.get(person);
  }
  function loadSignerPosition(person){
    if(!publicOrigin||typeof window.UnifiedApi?.request!=='function'||signerPositions.has(person)||signerRequests.has(person))return;
    const reply=window.UnifiedApi.request({action:'paReportSignerPosition',selectedName:person});
    signerRequests.set(person,reply);
    reply.then(r=>{
      if(r?.name===person&&typeof r.position==='string'&&r.position.trim()&&r.position.length<=160&&!/[<>]/.test(r.position)){
        signerPositions.set(person,r.position.trim());updateSignerPosition(person);
      }
    }).catch(()=>{}).finally(()=>signerRequests.delete(person));
  }
  const blank=sections.map((topics,i)=>({rows:(i===2?[topics.slice(0,2),topics.slice(2)]:i===12?topics.map(t=>[t]):[topics]).map(group=>({
      agreement:[...group.map(text=>({text,bold:true})),{text:'เป้าหมาย',bold:false}],
      target:[{text:group[group.length-1],bold:true},{text:'เป้าหมาย',bold:false}]
    }))}));
  function pageWidths(widths){
    return Array.isArray(widths)&&widths.length===3&&widths.every(x=>Number.isFinite(x)&&x>=8&&x<=75)&&
      Math.abs(widths.reduce((a,b)=>a+b,0)-100)<=.5?widths:[33,51,16];
  }
  function renderPages(definitions,template=null,evidenceByTopic=null){
    mount.paPdfSnapshot=null;
    mount.dataset.documentMonth=(template?._renderPeriod||reportPeriod()).month;
    const pages=document.createDocumentFragment();
    const paperForm=template?.paperForm;
    const mainLayout=paperForm?[...definitions.map((p,i)=>({...p,number:i+1})),...window.PaPagination.paperEvidenceAppendix(definitions,evidenceByTopic)]:window.PaPagination.paginate(definitions,evidenceByTopic);
    const layout=[...mainLayout,...window.PaPagination.sourceEvidenceAppendix(evidenceByTopic,mainLayout.length)];
    layout.forEach(({rows,widths,topic,continuation,photos,captionOnly,evidence,number,appendix},i)=>{
    const page=node('article',{class:'pa-paper'+(paperForm?' pa-paper-personal-source':''),'aria-label':'หน้า '+number,'data-topic':topic||'', 'data-continuation':String(Boolean(continuation))});
    if(i===0&&paperForm){
      const heading=node('div',{class:'pa-source-cover'});
      heading.append(node('div',{class:'pa-source-annex'},'เอกสารแนบท้าย 2'),node('h3',{class:'pa-paper-title'},'แบบติดตามผลการปฏิบัติงาน'),node('p',{class:'pa-paper-period'},(template?._renderPeriod||reportPeriod()).label.replace('ประจำเดือน','รอบการประเมินเดือน')),
        node('strong',{},'ส่วนที่ 1 ข้อมูลของผู้รับการประเมิน'));
      identity=node('div',{class:'pa-paper-name'},'ชื่อผู้รับการประเมิน: '+template.name);
      identity.dataset.sourceName=paperForm.fullName;
      const fields=node('div',{class:'pa-source-identity'});
      fields.append(identity,node('div',{},'ตำแหน่ง '+paperForm.position),node('div',{},'สังกัดภาควิชา '+paperForm.unit),node('div',{},'คณะ / เทียบเท่า '+paperForm.division));
      heading.append(fields,node('p',{class:'pa-source-guide'},'ส่วนที่ 2 รายงานความก้าวหน้าผลการปฏิบัติงานตามข้อตกลงการปฏิบัติงาน : ให้ผู้รับการประเมินรายงานความก้าวหน้าของภาระงานที่ทำข้อตกลงการปฏิบัติงาน โดยเทียบกับตัวชี้วัดเป้าหมายผลสำเร็จของภาระงานตามเกณฑ์การประเมิน หากมีปัญหา/อุปสรรคให้ระบุรายละเอียด พร้อมให้ผู้รับการประเมินและผู้บังคับบัญชาชั้นต้นลงลายมือชื่อไว้ด้วย'));
      page.append(heading);
    }else if(i===0){
      identity=node('div',{class:'pa-paper-name'},'ชื่อผู้รับการประเมิน: ____________________');
      page.append(node('img',{class:'pa-paper-logo',src:'assets/report-reference/logo-MU_blackwhite.png',alt:'ตรามหาวิทยาลัยมหิดล'}));
      const cover=node('div',{class:'pa-paper-cover-line'});
      cover.append(node('h3',{class:'pa-paper-title'},template?.title||'รายงานความก้าวหน้าการปฏิบัติงาน'),node('span',{class:'pa-paper-period'},(template?._renderPeriod||reportPeriod()).label));
      page.append(cover,identity);
    }
    if(appendix)page.append(node('h3',{class:'pa-paper-title'},'ภาคผนวกภาพหลักฐาน'));
    const cols=node('colgroup');
    pageWidths(widths).forEach(width=>{const col=node('col');col.style.width=width+'%';cols.append(col);});
    const head=node('thead'), headRow=node('tr');
    titles.forEach(t=>headRow.append(node('th',{scope:'col'},t)));
    head.append(headRow);
    const body=node('tbody');
    rows.forEach(def=>{
      const row=node('tr'), task=node('td'), progress=node('td'), issues=node('td');
      def.agreement.forEach(line=>task.append(node(line.bold?'strong':'div',{},line.text)));
      (def.target||[]).forEach(line=>progress.append(node(line.bold?'strong':'div',{},line.text)));
      const rowPhotos=paperForm&&!appendix?[]:photos;
      if(evidence||paperForm){
        const proof=node('div',{class:'pa-proof','data-count':String(rowPhotos.length),role:'group','aria-label':'พื้นที่ภาพหลักฐาน'});
        if(captionOnly)progress.append(node('div',{class:'pa-proof-caption'},captionOnly));
        if(rowPhotos.length){
          const geometry=window.PaPagination.photoSlot(rowPhotos.length);
          const validWidths=pageWidths(widths), maxWidth=258*validWidths[1]/validWidths.reduce((a,b)=>a+b,0)-3.175;
          Object.entries({'--pa-proof-width':Math.min(geometry.widthMm,maxWidth),'--pa-proof-height':geometry.heightMm,'--pa-proof-gap':window.PaPagination.PHOTO_LAYOUT.gapMm})
            .forEach(([key,value])=>proof.style.setProperty(key,(value/258*100)+'cqw'));
          rowPhotos.forEach((photo,i)=>{
            const item=node('figure',{class:'pa-proof-item'});
            if(photo.caption)item.append(node('figcaption',{class:'pa-proof-caption'},photo.caption));
            if(photo.drivePreview){
              const id=/^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{20,100})\/view$/.exec(photo.driveViewer)?.[1];
              if(!id)return;
              const frame=node('img',{src:'https://drive.google.com/thumbnail?id='+id+'&sz=w1000',alt:'ภาพหลักฐาน '+(i+1),loading:'lazy',decoding:'async',referrerpolicy:'no-referrer'});
              const hint=node('span',{class:'pa-proof-load-error',role:'status',hidden:''},'แสดงรูปนี้ไม่ได้ ตรวจสิทธิ์หรือลองเปิดใน Google Drive');
              frame.addEventListener('error',()=>{hint.hidden=false;});
              const open=node('a',{class:'pa-proof-drive-link',href:photo.driveViewer,target:'_blank',rel:'noopener noreferrer'},'เปิดรูปใน Google Drive');
              item.classList.add('pa-proof-drive');item.append(frame,open,hint);
            }else item.append(node('img',{src:photo.src,alt:'ภาพหลักฐาน '+(i+1)}));
            proof.append(item);
          });
        }
        progress.append(proof);
      }
      row.append(task,progress,issues);body.append(row);
    });
    const table=node('table');table.append(cols,head,body);
    page.append(table,node('footer',{class:'pa-paper-foot'},String(number)));
    pages.append(page);
  });
    if(template?.name&&pages.lastElementChild){
      let last=paperForm?pages.children[definitions.length-1]:pages.lastElementChild;
      if(!paperForm&&(last.querySelector('.pa-proof-item')||last.querySelectorAll('tbody td > :not(.pa-proof)').length>12)){
        last=node('article',{class:'pa-paper pa-signature-only','aria-label':'หน้าลงนาม','data-topic':'signature','data-continuation':'false'});
        last.append(node('footer',{class:'pa-paper-foot'},String(layout.length+1)));pages.append(last);
      }
      const signatures=node('section',{class:'pa-signatures','aria-label':'ส่วนลงนาม'});
      signatures.dataset.reportOwner=template.name;
      const ownerPosition=paperForm?.position||signerPositions.get(template.name)||window.HubStaffByName?.(template.name)?.position||'';
      const ownerName=paperForm?.fullName||(template.name==='กรรณิการ์ ศรีราณี'?'นางสาวกรรณิการ์ ศรีราณี':template.name);
      const signers=[
        ['ผู้รับการประเมิน',ownerName,ownerPosition,true],
        [paperForm?'ผู้ประเมิน (ผู้บังคับบัญชาชั้นต้น)':'ผู้ประเมิน','นายมนัสชาย ประเดิมชัย','หัวหน้างานภูมิทัศน์และสิ่งแวดล้อม',false]
      ];
      for(const [role,person,position,owner] of signers){
        const signer=node('div',{class:'pa-signature-person'});
        signer.append(node('div',owner?{'data-pa-signature-fixed':''}:{},owner?'ลงชื่อ '+person+' '+role:'ลงชื่อ ..................................................... '+role),node('div',{'data-pa-signature-fixed':''},'('+person+')'),
          node('div',owner?{'data-pa-signature-fixed':'','data-pa-signature-position':''}:{'data-pa-signature-fixed':''},'ตำแหน่ง '+(position||'__________________________________')),
          node('div',owner?{'data-pa-signature-fixed':'','data-pa-signature-date':''}:{},owner?'วันที่ '+signatureDate():'วันที่ ______ / ______ / ______'));
        signatures.append(signer);
      }
      last.querySelector('.pa-paper-foot').before(signatures);
    }
    mount.replaceChildren(pages);
    if(template?.name&&!template?.paperForm?.position)loadSignerPosition(template.name);
    window.PaDraft?.activate(mount,template?.name?template.name+"|"+mount.dataset.documentMonth:"");
    mount.closest('.pa-paper-view')?.setAttribute('aria-label','ตัวอย่างแบบรายงาน PA '+layout.length+' หน้า');
  }

  const options=document.getElementById('pa-layout-options');
  const normal=value=>String(value).normalize('NFC').trim().replace(/\s+/gu,' ');
  const privateOrigin=location.origin==='http://127.0.0.1:5500';
  const publicOrigin=location.origin==='https://oppemu.github.io'&&/^\/Landscape-and-Environment-Section(?:\/|$)/.test(location.pathname);
  const catalogUrl='https://oppemu.github.io/Landscape-and-Environment-Section/assets/pa-public-catalog.json';
  let publicCatalog=null,catalogPending=null,catalogFailed=false;
  function decodePublicCatalog(data){
    const byName=new Map();
    const fields=(obj,keys)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&Object.keys(obj).sort().join(',')===keys;
    const runs=(list,required)=>Array.isArray(list)&&(!required||list.length>0)&&list.length<=24&&list.every(run=>
      fields(run,'bold,text')&&typeof run.bold==='boolean'&&typeof run.text==='string'&&run.text.trim()&&run.text.length<=900&&
      !/[<>\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/u.test(run.text));
    if(!fields(data,'templates,version')||data.version!==1||!Array.isArray(data.templates)||!data.templates.length||data.templates.length>100)throw Error('Invalid PA catalog');
    for(const entry of data.templates){
      if(!fields(entry,'displayName,native')||!safeName(entry.displayName)||/[<>]/.test(entry.displayName)||!fields(entry.native,'pages'))throw Error('Invalid PA profile');
      const {pages}=entry.native;
      if(!Array.isArray(pages)||!pages.length||pages.length>32||pages.some(page=>
        !fields(page,'rows,widths')||pageWidths(page.widths)!==page.widths||
        !Array.isArray(page.rows)||!page.rows.length||page.rows.length>8||page.rows.some(row=>
          !fields(row,'agreement,target')||!runs(row.agreement,true)||!runs(row.target,false))))throw Error('Invalid PA page');
      const displayName=normal(entry.displayName);
      if(!displayName||byName.has(displayName))throw Error('Duplicate PA profile');
      byName.set(displayName,pages);
    }
    return byName;
  }
  function loadPublicCatalog(){
    if(!publicOrigin||location.hash!=='#pa-online'||publicCatalog||catalogPending||catalogFailed)return;
    const ctl=new AbortController(), timer=setTimeout(()=>ctl.abort(),4000);
    catalogPending=fetch(catalogUrl,{credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',signal:ctl.signal})
      .then(r=>{if(!r.ok)throw Error('PA catalog unavailable');return r.json();})
      .then(data=>{publicCatalog=decodePublicCatalog(data);if(location.hash==='#pa-online'&&document.activeElement===name)show();})
      .catch(()=>{catalogFailed=true;if(location.hash==='#pa-online'&&document.activeElement===name)show();}).finally(()=>{clearTimeout(timer);catalogPending=null;});
  }
  const savedKey='waste-pa-landscape-names-v1';
  let localNames=[], pending, lastFailure=0;
  const safeName=value=>typeof value==='string'&&value.length<=120&&value.length>0&&!/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069,@;\t|]/.test(value);
  if(privateOrigin)try{const saved=JSON.parse(window.localStorage.getItem(savedKey)||'[]');if(Array.isArray(saved)&&saved.length<=300&&saved.every(safeName)) localNames=saved;}catch(_){}
  const status=document.getElementById('pa-template-status'), download=document.getElementById('pa-layout-download');
  const printButton=document.getElementById('pa-layout-print');
  let personalReports=null,personalPending=null,personalRetryAfter=0;
  function loadPersonalReports(){
    if(!publicOrigin||location.hash!=='#pa-online'||personalReports||personalPending||Date.now()<personalRetryAfter||typeof window.UnifiedApi?.request!=='function')return;
    personalPending=window.UnifiedApi.request({action:'paPersonalBlankReportCatalog'}).then(data=>{
      if(data?.version!==2||!Array.isArray(data.items)||data.items.length>7)throw Error('Invalid PA report catalog');
      const entries=new Map();for(const item of data.items){
        if(!safeName(item?.name)||/[<>]/u.test(item.name)||entries.has(item.name)||typeof item.reporting!=='boolean'||!Array.isArray(item.topics)||!item.topics.length||item.topics.length>60)throw Error('Invalid PA profile');
        const unique=new Set();
        for(const t of item.topics){
          if(typeof t?.key!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(t.key)||unique.has(t.key)||typeof t.label!=='string'||!t.label.trim()||t.label.length>240||/[<>\u0000-\u001f\u202a-\u202e\u2066-\u2069]/u.test(t.label))throw Error('Invalid PA topic');
          unique.add(t.key);
        }
        const heading=t=>/^\d+(?:\.\d+)+/.exec(t.label)?.[0];
        let pages=item.topics.map(t=>({rows:[{agreement:[{text:t.label,bold:true,reportKey:t.key}],target:[]}]})), paperForm=null;
        if(item.paperForm?.version===1){
          const form=item.paperForm, fields=['fullName','position','unit','division','reviewer','reviewerPosition'];
          const text=t=>typeof t==='string'&&t.length>0&&t.length<=240&&!/[<>]/.test(t);
          if(fields.some(k=>!text(form[k]))||!Array.isArray(form.pages)||form.pages.length!==7)throw Error('Invalid source form');
          const byCode=new Map(item.topics.map(t=>[heading(t),t]));
          const grouped=new Set();
          pages=form.pages.map(p=>({widths:[29,51,20],rows:p.map(r=>{
            const t=byCode.get(r.code);if(!t||!Array.isArray(r.notes)||r.notes.length>12||!r.notes.every(text)||typeof r.continued!=='boolean')throw Error('Invalid source row');
            if(!r.continued)grouped.add(t.key);
            const notes=r.notes.map(text=>({text,bold:false}));
            const agreement=r.continued?[{text:r.code+' (ต่อ)',bold:true}]:[{text:t.label,bold:true,reportKey:t.key},...notes];
            return {agreement,target:[],reportKey:t.key,continued:r.continued};
          })}));
          if(grouped.size!==item.topics.length)throw Error('Incomplete source form');
          paperForm=form;
        }
        entries.set(item.name,{pages,reporting:item.reporting,paperForm});
      }
      personalReports=entries;if(location.hash==='#pa-online'&&document.activeElement===name)show();
    }).catch(()=>{personalRetryAfter=Date.now()+10000;}).finally(()=>{personalPending=null;});
  }
  if(!publicOrigin)renderPages(blank);
  else setAvailability(false,'พิมพ์ชื่อและเลือกต้นแบบ PA ที่พบ');
  let selectedName='',templateAbort,epoch=0,printing=false;
  const clearPrint=()=>{document.body.classList.remove('pa-print-active');printing=false;};
  addEventListener('afterprint',clearPrint);
  addEventListener('beforeprint',updateSignatureDate);
  printButton?.addEventListener('click',async()=>{
    if(printing||location.hash!=='#pa-online'||mount.dataset.templateAvailable!=='true')return;
    const choice=epoch;
    printing=true;
    const images=[...mount.querySelectorAll('.pa-proof-item img')];
    if(images.length){
      images.forEach(image=>{image.loading='eager';});
      let timer;
      const decoded=await Promise.race([Promise.all(images.map(async image=>{
        try{await image.decode();return image.naturalWidth>0;}catch(_){return false;}
      })).then(states=>states.every(Boolean)),new Promise(ok=>{timer=setTimeout(()=>ok(false),7000);})]);
      clearTimeout(timer);
      if(epoch!==choice||location.hash!=='#pa-online'){clearPrint();return;}
      if(!decoded){clearPrint();setAvailability(true,'รูปยังไม่พร้อมพิมพ์ กรุณากดบันทึก PDF ใหม่');return;}
    }
    const pendingPosition=signerRequests.get(selectedName);
    if(pendingPosition){let timer;await Promise.race([pendingPosition.catch(()=>{}),new Promise(r=>{timer=setTimeout(r,4500);})]);clearTimeout(timer);}
    if(epoch!==choice||location.hash!=='#pa-online'){clearPrint();return;}
    updateSignatureDate();
    document.body.classList.add('pa-print-active');
    try{window.print();}catch(_){clearPrint();}
  });
  function invalidate(){
    const wasSelected=Boolean(selectedName);
    if(download)download.textContent='ดาวน์โหลด PDF (ไม่รวมรูป)';
    epoch++; templateAbort?.abort();templateAbort=null;selectedName='';
    mount.dataset.templateAvailable='';
    if(publicOrigin&&download)download.hidden=false;
    if(publicOrigin){mount.replaceChildren();mount.paPdfSnapshot=null;setAvailability(false,'พิมพ์ชื่อและเลือกต้นแบบ PA ที่พบ');return;}
    if(wasSelected)renderPages(blank);
    if(status){status.hidden=true;status.textContent='';}
    if(download)download.disabled=false;
    if(printButton)printButton.disabled=false;
  }
  function setTemplateOnly(message){
    const first=mount.querySelector('.pa-paper-name');
    if(first&&!mount.querySelector('.pa-paper-template-notice'))first.after(node('div',{class:'pa-paper-name pa-paper-template-notice'},'เฉพาะแบบ PA • ไม่รวมข้อมูลรายงานปฏิบัติงาน'));
    setAvailability(true,message);
  }
  function setAvailability(available,message){
    mount.dataset.templateAvailable=available?'true':'false';
    if(download)download.disabled=!available;
    if(printButton)printButton.disabled=!available;
    if(status){status.hidden=!message;status.textContent=message;}
  }
  function setDocumentName(value){if(!identity||identity.dataset.paDraftEdited==='true')return;identity.textContent='ชื่อผู้รับการประเมิน: '+(identity.dataset.sourceName||value);}
  async function selectTemplate(value){
    invalidate();
    selectedName=value;
    const turn=epoch, selectedPeriod=reportPeriod();
    mount.dataset.templateAvailable='false';
    if(download)download.disabled=true;
    if(printButton)printButton.disabled=true;
    if(publicOrigin){
      const personal=personalReports?.get(value);
      if(personal){
        renderPages(personal.pages,{name:value,pages:personal.pages,_renderPeriod:selectedPeriod,paperForm:personal.paperForm});setDocumentName(value);
        setAvailability(true,personal.reporting?'กำลังอ่านรูปจากรายงาน':'แบบรายงานเปล่า ยังไม่พบประวัติการส่งรายงานของชื่อนี้');
        void loadSelectedPhotoMedia(value,personal.pages,selectedPeriod,turn,personal.paperForm);
        return;
      }
      const pages=publicCatalog?.get(value);
      if(!pages){setAvailability(false,'ยังไม่มีต้นแบบ PA สาธารณะที่ยืนยันสำหรับชื่อนี้');return;}

      renderPages(pages,{name:value,pages,_renderPeriod:selectedPeriod});setDocumentName(value);
      setTemplateOnly('แบบเปล่าสาธารณะ ไม่รวมผลการประเมินหรือหลักฐาน');
      void loadSelectedPhotoMedia(value,pages,selectedPeriod,turn);
      return;
    }
    if(!privateOrigin){setAvailability(false,'ยังไม่มีต้นแบบ PA ของชื่อนี้ในเว็บที่เปิดอยู่');return;}
    setAvailability(false,'กำลังอ่านต้นแบบ PA ของบุคลากร');
    const ctl=new AbortController();templateAbort=ctl;
    const timer=setTimeout(()=>ctl.abort(),4000);
    try{
      const r=await fetch('http://127.0.0.1:17843/pa-template',{
        method:'POST',headers:{'Content-Type':'application/json','X-Waste-PA-Local':'names-v1'},
        body:JSON.stringify({name:value}),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:ctl.signal
      });
      if(epoch!==turn||location.hash!=='#pa-online')return;
      if(r.status===404){setAvailability(false,'ยังไม่มีต้นแบบที่ยืนยันว่าเป็นของชื่อนี้');return;}
      if(!r.ok)throw Error('local PA source unavailable');
      const data=await r.json();
      if(epoch!==turn||location.hash!=='#pa-online')return;
      const isLines=array=>Array.isArray(array)&&array.length<=24&&array.every(line=>typeof line?.text==='string'&&line.text.length>0&&line.text.length<=900&&typeof line.bold==='boolean');
      if(data?.version!==1||data.name!==value||!Array.isArray(data.pages)||!data.pages.length||data.pages.length>32||data.pages.some(page=>!Array.isArray(page?.rows)||!page.rows.length||page.rows.length>8||page.rows.some(row=>!isLines(row?.agreement)||!row.agreement.length||!isLines(row.target||[]))))throw Error('invalid PA template');
      data._renderPeriod=selectedPeriod;
      renderPages(data.pages,data);setDocumentName(value);
      const publicSummary=window.HubConfig?.paPublicSummaryEnabled===true;
      const verified=window.HubConfig?.paVerifiedEvidenceEnabled===true;
      const protectedDrive=!publicSummary&&!verified&&privateOrigin&&typeof window.UnifiedApi?.request==='function';
      if((!publicSummary&&!verified&&!protectedDrive)||!window.isSecureContext){setAvailability(true,'');return;}
      setAvailability(false,publicSummary?'กำลังอ่านสรุปรายงานที่ผู้รายงานระบุ':'กำลังอ่านรายงานการปฏิบัติงานที่ยืนยันสิทธิ์แล้ว');
      clearTimeout(timer);
      const evidenceTimer=setTimeout(()=>ctl.abort(),12000);
      try{
        let loaded;
        if(publicSummary){
          const endpoint=window.UnifiedApi.endpoint();
          loaded=await window.UnifiedApi.request({action:'paWorkReportPublicEvidence',selectedName:value,month:data._renderPeriod.month},endpoint);
        }else if(protectedDrive){
          const endpoint=window.UnifiedApi.endpoint();
          let privateTimer;
          try{
            const timedOut=new Promise((_,reject)=>{privateTimer=setTimeout(()=>reject(Error('PA private metadata timeout')),12000);});
            loaded=await Promise.race([window.UnifiedApi.request({action:'paWorkReportPrivateEvidence',selectedName:value,month:data._renderPeriod.month},endpoint),timedOut]);
          }finally{clearTimeout(privateTimer);}
        }else{
          const endpoint=new URL('./api/pa/report-evidence',location.href);
          endpoint.searchParams.set('month',data._renderPeriod.month);
          const result=await fetch(endpoint,{credentials:'same-origin',mode:'same-origin',redirect:'error',cache:'no-store',signal:ctl.signal});
          if(epoch!==turn||location.hash!=='#pa-online')return;
          if(!result.ok||!/^application\/json(?:;|$)/i.test(result.headers.get('Content-Type')||''))throw Error('evidence access');
          loaded=await result.json();
        }
        if(epoch!==turn||location.hash!=='#pa-online')return;
        const evidence=window.PaEvidence.group(loaded,{month:data._renderPeriod.month,displayName:value,pages:data.pages,publicSummary:publicSummary||protectedDrive});
        renderPages(data.pages,data,evidence);setDocumentName(value);setAvailability(true,'');
        if(protectedDrive&&evidence.size){
          if(printButton)printButton.disabled=true;
          try{await renderDrivePhotos(evidence,data,value,turn);}
          catch(_){if(epoch===turn&&location.hash==='#pa-online')setAvailability(true,'โหลดรูปไม่ได้ แต่ยังดาวน์โหลดรายงานเฉพาะข้อความได้');}
        }

       }catch(error){
         if(epoch===turn&&location.hash==='#pa-online'){
           if(publicSummary||protectedDrive)setTemplateOnly(error?.code==='PA_WORK_LIMIT'?'รายงานเดือนนี้เกินจำนวนที่แสดงได้ ดาวน์โหลดได้เฉพาะแบบ PA':'ยังโหลดข้อมูลรายงานของเดือนนี้ไม่ได้ ดาวน์โหลดได้เฉพาะแบบ PA');
           else setAvailability(false,'ยังยืนยันข้อมูลรายงานของเดือนนี้ไม่ได้ จึงยังดาวน์โหลดไม่ได้');
         }
       }
      finally{clearTimeout(evidenceTimer);}
    }catch(_){if(epoch===turn&&location.hash==='#pa-online')setAvailability(false,'เปิดต้นแบบ PA ไม่สำเร็จ กรุณาลองเลือกชื่ออีกครั้ง');}
    finally{clearTimeout(timer);if(epoch===turn)templateAbort=null;}
  }

  const evidenceRequests=new Map();
  function requestEvidence(api,key,value,month,endpoint,pages,current){
    if(evidenceRequests.has(key))return evidenceRequests.get(key);
    const pending=window.PaEvidence.monthlyPhotoMedia((offset,snapshot)=>{
      let timer;
      const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('PA photo batch timeout')),22000);});
      return Promise.race([api.request({action:'paWorkReportPhotoMedia',selectedName:value,month,
        photoPageVersion:2,includeWorkDetails:true,photoOffset:offset,photoSnapshot:snapshot},endpoint),timeout]).finally(()=>clearTimeout(timer));
    },{month,displayName:value,pages,continueLoading:current}).finally(()=>{
      if(evidenceRequests.get(key)===pending)evidenceRequests.delete(key);
    });
    evidenceRequests.set(key,pending);return pending;
  }
  function paintEvidence(pages,data,decoded,complete){
    renderPages(pages,data,decoded);setDocumentName(data.name);
    const cover=mount.querySelector('.pa-paper-name');
    if(cover)cover.after(node('div',{class:'pa-paper-template-notice'},complete?'แบบ PA พร้อมรูปประกอบงาน ไม่รวมผลประเมิน':'คำเตือน: รูปหลักฐานเดือนนี้แสดงไม่ครบ • ไม่รวมผลประเมิน'));
    if(download){download.disabled=true;download.hidden=true;}
  }
  async function loadSelectedPhotoMedia(value,pages,selectedPeriod,turn,paperForm=null){
    if(!publicOrigin||location.hash!=='#pa-online'||!pages||selectedName!==value||epoch!==turn)return;
    const api=window.UnifiedApi;
    if(typeof api?.request!=='function'||typeof api.endpoint!=='function'){setTemplateOnly('ยังเปิดรูปไม่ได้ แบบเปล่ายังใช้งานได้');return;}
    const endpoint=api.endpoint(), month=selectedPeriod.month, key=JSON.stringify([endpoint,value,month]);
    const current=()=>epoch===turn&&location.hash==='#pa-online'&&selectedName===value&&reportPeriod().month===month&&api.endpoint()===endpoint;
    const data={name:value,pages,_renderPeriod:selectedPeriod,paperForm};
    setAvailability(false,'กำลังตรวจสิทธิ์บัญชีมหิดลและโหลดรูป…');
    const blank=message=>setTemplateOnly(message);
    try{
      const result=await requestEvidence(api,key+'|'+turn,value,month,endpoint,pages,current);
      if(!current())return;
      if(!result.count){
        if(result.complete)blank('เดือนที่เลือกยังไม่มีรายงานที่แนบรูป');
        else setAvailability(false,'ยังโหลดรูปไม่ครบ กรุณาเลือกชื่อหรือเดือนอีกครั้งก่อนบันทึก PDF');
        return;
      }
      const images=[...result.photos.values()].flat(), ready=new Set();
      let decodeTimer;
      await Promise.race([Promise.allSettled(images.map(async ref=>{
        const image=new Image();
        image.src=ref.src;await image.decode();
        if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>20000000)throw Error('PA photo dimensions');
        ready.add(ref);
      })),new Promise(resolve=>{decodeTimer=setTimeout(resolve,7000);})]);
      clearTimeout(decodeTimer);
      if(!current())return;
      const decoded=new Map();
      for(const [where,refs] of result.photos){const keep=refs.filter(ref=>ready.has(ref));if(keep.length)decoded.set(where,keep);}
      if(!decoded.size){setAvailability(false,'เปิดรูปในเดือนนี้ไม่ได้ กรุณาลองใหม่ก่อนบันทึก PDF');return;}
      const complete=result.complete&&ready.size===images.length;
      paintEvidence(pages,data,decoded,complete);
      setAvailability(complete,complete?'พร้อมบันทึก PDF รวม '+result.count+' รูปจากรายงานในเดือนที่เลือก':'ยังโหลดรูปไม่ครบ กรุณาเลือกชื่อหรือเดือนอีกครั้งก่อนบันทึก PDF');
      if(download)download.disabled=true;
    }catch(error){
      if(!current())return;
      if(error?.code==='PA_WORK_PHOTOS_UNAVAILABLE'){blank('แบบเปล่า • ใช้บัญชีมหิดลเพื่อเปิดรูปหลักฐาน');return;}
      if(error?.code==='PA_WORK_NOT_FOUND'){blank('แบบเปล่า • ยังไม่พบข้อมูลรายงานที่ผูกกับชื่อนี้');return;}

      setAvailability(false,'ยังยืนยันรูปของเดือนนี้ไม่ได้ กรุณาเลือกชื่อหรือเดือนอีกครั้งก่อนบันทึก PDF');
    }
  }
  if(publicOrigin){
    addEventListener('mu:profile-changed',()=>{evidenceRequests.clear();if(selectedName&&location.hash==='#pa-online')selectTemplate(selectedName);});
    addEventListener('pagehide',()=>{evidenceRequests.clear();if(selectedName)invalidate();});
  }

  async function renderDrivePhotos(evidence,data,value,turn){
    const month=data._renderPeriod.month, endpoint=window.UnifiedApi.endpoint();
    const jobs=[...evidence].flatMap(([topic,list])=>list.map(report=>({topic,report})));
    const refs=new Map();
    let missing=0, cursor=0, stopped=false, timer;
    const current=()=>epoch===turn&&location.hash==='#pa-online';
    async function receive(){
      while(!stopped&&current()&&cursor<jobs.length){
        const {topic,report}=jobs[cursor++];
        try{
          const response=await window.UnifiedApi.request({action:'paWorkReportPhotoLinks',selectedName:value,month,reportId:report.reportId,assignmentKey:report.assignmentKey},endpoint);
          if(!current()||stopped)return;
          const photos=window.PaEvidence.previewLinks(response,report,month);
          if(photos.length)refs.set(report.reportId,photos);else missing++;
        }catch(_){if(current()&&!stopped)missing++;}
      }
    }
    const deadline=new Promise(resolve=>{timer=setTimeout(()=>{stopped=true;resolve();},12000);});
    await Promise.race([Promise.all(Array.from({length:Math.min(3,jobs.length)},receive)),deadline]);
    clearTimeout(timer);
    if(!current())return;
    if(refs.size){
      const snapshot=mount.cloneNode(true), enriched=new Map();
      for(const [topic,list] of evidence)enriched.set(topic,list.flatMap(report=>[report,...(refs.get(report.reportId)||[])]));
      renderPages(data.pages,data,enriched);setDocumentName(value);
      const first=snapshot.querySelector('.pa-paper-name');
      if(first)first.after(node('div',{class:'pa-paper-template-notice'},'PDF นี้ไม่รวมรูปจาก Drive'));
      mount.paPdfSnapshot=snapshot;
      download.textContent='ดาวน์โหลด PDF (ไม่รวมรูป)';
    }
    setAvailability(true,missing||stopped?'บางรูปยังเปิดไม่ได้ ใช้ปุ่มพิมพ์เพื่อบันทึกหน้าที่เปิดรูปได้':'ตรวจว่ารูปปรากฏในตัวอย่างก่อนบันทึกเป็น PDF');
  }
  function hide(){options.replaceChildren();options.hidden=true;name.setAttribute('aria-expanded','false');}
  function fillName(){const value=normal(name.value);if(identity)identity.textContent='ชื่อผู้รับการประเมิน: '+(value||'____________________');}
  function show(){
    hide();
    const query=normal(name.value).toLocaleLowerCase('th');
    const directory=window.HubStaffDirectory;
    if(!query)return;
    const profile=window.HubSelectedProfile?.get?.()?.name;
    const entries=new Map();
    if(publicOrigin){for(const value of publicCatalog?.keys()||[])entries.set(value,'public');for(const value of personalReports?.keys()||[])entries.set(value,'personal');}
    else if(safeName(profile))entries.set(normal(profile),'profile');
    if(!publicOrigin&&Array.isArray(directory))for(const p of directory)if(safeName(p?.name))entries.set(normal(p.name),'directory');
    for(const value of localNames)entries.set(value,'local');
    const names=[...entries.keys()].filter(n=>n.toLocaleLowerCase('th').includes(query)).slice(0,12);
    for(const value of names){
      const button=node('button',{type:'button'},value+(entries.get(value)==='profile'?' (ชื่อที่ใช้ในแอป)':''));
      button.addEventListener('click',()=>{name.value=value;hide();name.focus();selectTemplate(value);});
      button.addEventListener('keydown',event=>{
        if(event.key==='ArrowDown'){event.preventDefault();(button.nextElementSibling||button).focus();}
        else if(event.key==='ArrowUp'){event.preventDefault();(button.previousElementSibling||name).focus();}
        else if(event.key==='Escape'){event.preventDefault();hide();name.focus();}
      });
      options.append(button);
    }
    if(publicOrigin&&!names.length&&!publicCatalog&&status){status.hidden=false;status.textContent=catalogFailed?'ยังไม่มีรายการต้นแบบ PA สาธารณะให้ค้นหา':'กำลังตรวจรายการต้นแบบ PA สาธารณะ';}
    if(publicOrigin&&publicCatalog&&!names.length&&!selectedName)setAvailability(false,personalPending?'กำลังค้นหาแบบรายงาน PA…':'ไม่พบเอกสาร PA ตรงกับชื่อที่พิมพ์');
    if(names.length){options.hidden=false;name.setAttribute('aria-expanded','true');}
  }
  function localRoster(){
    if(!privateOrigin||location.hash!=='#pa-online'||pending||Date.now()-lastFailure<1500)return;
    const ctl=new AbortController();
    const timer=setTimeout(()=>ctl.abort(),3500);
    pending=fetch('http://127.0.0.1:17843/pa-roster',{method:'GET',headers:{'X-Waste-PA-Local':'names-v1'},credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:ctl.signal})
      .then(r=>{if(!r.ok)throw Error('Local roster unavailable');return r.json();})
      .then(data=>{
        if(data?.version!==1||!Array.isArray(data.names)||data.names.length!==43||!data.names.every(safeName))throw Error('Invalid local roster');
        localNames=[...new Set(data.names.map(normal))];lastFailure=0;
        if(location.hash==='#pa-online')show();
      }).catch(()=>{lastFailure=Date.now();}).finally(()=>{clearTimeout(timer);pending=null;});
  }
  viewPeriod.addEventListener('change',()=>{
    if(location.hash!=='#pa-online')return;
    if(!window.PaEvidence.periodFor(viewPeriod.value))viewPeriod.value=mount.dataset.documentMonth||window.PaEvidence.period(new Date(),0).month;
    if(selectedName)selectTemplate(selectedName);else{invalidate();if(!publicOrigin)renderPages(blank);fillName();}
  });
  name.addEventListener('input',()=>{invalidate();fillName();show();if(!localNames.length)localRoster();loadPublicCatalog();loadPersonalReports();});
  name.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'){show();if(options.firstElementChild){event.preventDefault();options.firstElementChild.focus();}}
    else if(event.key==='Escape')hide();
  });
  document.getElementById('pa-layout').addEventListener('focusout',event=>{
    if(event.target!==name&&!options.contains(event.target))return;
    if(event.relatedTarget!==name&&!options.contains(event.relatedTarget))hide();
  });
  addEventListener('hashchange',()=>{
    if(location.hash==='#pa-online'){localRoster();loadPublicCatalog();loadPersonalReports();if(selectedName)selectTemplate(selectedName);return;}
    defaultPeriod();if(!publicOrigin)renderPages(blank);
    clearPrint();invalidate();name.value='';if(!privateOrigin)localNames=[];fillName();hide();
  });
  localRoster();loadPublicCatalog();loadPersonalReports();
})();
