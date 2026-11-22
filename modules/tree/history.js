/* แนวทางอ่านไฟล์นี้
 * dateKey/ sorted: เรียงประวัติด้วยวันที่ไทยและ พ.ศ. ไม่ใช้ลำดับแถวแทนวันรายงาน
 * photoUrl: รับเฉพาะลิงก์ Drive ที่ตรวจรูปแบบได้ ไม่แปลง path AppSheet เป็น URL เดา
 * photo: ขอ bytes ผ่าน RPC ที่ตรวจสิทธิ์ ไม่ให้ browser เปิดรูปส่วนตัวผ่าน proxy สาธารณะ
 * token: ถ้าผู้ใช้ปิดหรือเปลี่ยนต้นไม้ ผลตอบกลับของต้นเก่าต้องไม่ทับหน้าปัจจุบัน
 * open: อ่านเฉพาะประวัติรหัสที่เลือก แล้ววางภาพล่าสุด/ก่อนหน้าและรายการย้อนหลัง
 * bindSearch: ชื่อต้นไม้อาจซ้ำ จึงเลือกด้วยรหัสร่วมชื่อ ไม่ค้นประวัติด้วยชื่ออย่างเดียว
 */
/* ประวัติงานต้นไม้: ใช้รหัสจริง ไม่จับคู่จากชื่อที่อาจซ้ำ ไม่เดา URL รูปเก่า */
(function(root){'use strict';
  let token=0,selectedTree=null,selectedPreview=null; const historyCache=new Map(),photoCache=new Map();
  function dateKey(value){let text=String(value).replace(/\s*น\.$/,'').trim();const months=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];const thai=text.match(/^(\d{1,2})\s+([ก-๙]+)\s+(\d{4})(?:\s+(?:เวลา\s+)?(\d{1,2}:\d{2}(?::\d{2})?))?/);if(thai&&months.includes(thai[2]))text=thai[1]+'/'+(months.indexOf(thai[2])+1)+'/'+thai[3]+(thai[4]?' '+thai[4]:'');const m=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);if(!m)return null;let year=+m[3];if(year>2400)year-=543;return Date.UTC(year,+m[2]-1,+m[1],+(m[4]||0),+(m[5]||0),+(m[6]||0));}
  // วันที่เดิม d/m/พ.ศ. แสดงชื่อเดือนไทยเต็ม โดยไม่เขียนทับต้นทาง
  function displayDate(value){const key=dateKey(value);if(key===null)return String(value||'—');const d=new Date(key),months=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];const base=d.getUTCDate()+' '+months[d.getUTCMonth()]+' '+(d.getUTCFullYear()+543);return /\d{1,2}:\d{2}/.test(String(value))?base+' เวลา '+[d.getUTCHours(),d.getUTCMinutes(),d.getUTCSeconds()].map(n=>String(n).padStart(2,'0')).join(':')+' น.':base;}
  function displayTime(value){const s=String(value||'').trim();return s?s.replace(/\s*น\.$/,'')+' น.':'—';}
  function photoUrl(value){try{const u=new URL(String(value));return u.protocol==='https:'&&u.hostname==='drive.google.com'&&/^\/file\/d\/[\w-]+\/view$/.test(u.pathname)?u.href:null;}catch(_){return null;}}
  function sorted(records){return records.slice().sort((a,b)=>{const x=dateKey(a.date),y=dateKey(b.date);if(x===null&&y===null)return b.sourceRow-a.sourceRow;if(x===null)return 1;if(y===null)return -1;return y-x||b.sourceRow-a.sourceRow;});}
  const api={dateKey,photoUrl,sorted,displayDate,displayTime};
  if(typeof module!=='undefined')module.exports=api;
  if(!root.document)return;
  const $=id=>document.getElementById(id),node=(tag,text)=>{const e=document.createElement(tag);e.textContent=text||'';return e;};
  function photo(row,label,auto=false){const box=node('div');box.append(node('strong',label));if(!row){box.append(node('p','ไม่มีรูปในรายการนี้'));return box;}const field=row.workPhoto?'workPhoto':'treePhoto',value=row[field],urls=String(value||'').split('\n').filter(Boolean);if(!urls.length){box.append(node('p','ไม่มีรูปในรายการนี้'));return box;}urls.forEach((url,index)=>{const link=photoUrl(url),slot=node('div');box.append(slot);if(!link){slot.append(node('p','รูปเดิมเป็นเส้นทาง AppSheet ยังเชื่อมโฟลเดอร์ต้นฉบับไม่ได้'));return;}const a=node('a','เปิดต้นฉบับ');a.href=link;a.target='_blank';a.rel='noopener noreferrer';const button=node('button','แสดงภาพ '+(index+1)),status=node('p');button.type='button';slot.append(button,a,status);let loading=false;button.onclick=async()=>{if(loading)return;loading=true;button.disabled=true;const mine=token;status.textContent='กำลังอ่านภาพที่มีสิทธิ์เข้าถึง…';try{const cacheKey=row.treeId+'|'+row.sourceRow+'|'+field+'|'+index+'|'+url;const r=photoCache.get(cacheKey)||await UnifiedApi.request({action:'treePhotoRead',treeId:row.treeId,sourceRow:row.sourceRow,photoField:field,index});photoCache.set(cacheKey,r);if(mine!==token)return;if(!['image/jpeg','image/png','image/webp'].includes(r.mimeType)||typeof r.base64!=='string'||r.base64.length>7000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(r.base64)||r.sourceRow!==row.sourceRow||r.index!==index||r.photoField!==field)throw Error('ผลรูปภาพไม่ตรงคำขอ');const img=node('img');img.alt=label+' · '+displayDate(row.date);img.src='data:'+r.mimeType+';base64,'+r.base64;img.style.maxWidth='100%';slot.append(img);status.textContent='';button.hidden=true;}catch(e){if(mine===token){status.textContent='ยังแสดงภาพไม่ได้: '+e.message;button.disabled=false;loading=false;}}};if(auto&&index===0)button.onclick();});return box;}

  api.open=async function(tree,preview){selectedTree=tree;selectedPreview=preview||null;if(root.TreeReportForm)root.TreeReportForm.select(tree);const current=++token,panel=$('tree-history');panel.hidden=false;$('history-title').textContent=tree.id+' · '+tree.name;const summary=node('section');summary.className='tree-summary';[['รหัสต้นไม้',tree.id],['ชื่อต้นไม้',tree.name],['พื้นที่',tree.area],['รายละเอียดทะเบียน',tree.description],['พิกัด',tree.lat+', '+tree.lng]].forEach(([label,value])=>summary.append(node('p',label+': '+(value||'—'))));$('history-content').replaceChildren(summary,node('p','กำลังอ่านประวัติจาก Detail…'));
    try{const cached=historyCache.get(tree.id);const response=cached&&Date.now()-cached.at<60000?cached.value:await UnifiedApi.request({action:'treeHistoryRead',treeId:tree.id});historyCache.set(tree.id,{at:Date.now(),value:response});if(current!==token)return;if(response.treeId!==tree.id||response.sourceSheet!=='Detail'||!Array.isArray(response.records))throw Error('ประวัติไม่ตรงรหัสต้นไม้');const rows=sorted(response.records),content=$('history-content');content.replaceChildren(summary);if(!rows.length){content.append(node('p','ยังไม่มีประวัติใน Detail สำหรับรหัสนี้'));if(preview)preview.replaceChildren(node('p','ยังไม่มีรูปประวัติของต้นนี้'));return;}
      const comparison=node('section');comparison.className='tree-compare';const withPhoto=rows.filter(r=>r.workPhoto||r.treePhoto);if(preview)preview.replaceChildren(photo(withPhoto[0],'ภาพล่าสุด',true));comparison.append(photo(withPhoto[0],'ภาพล่าสุดตามวันรายงาน',true));if(withPhoto.length>1)comparison.append(photo(withPhoto[1],'ภาพก่อนหน้า · '+displayDate(withPhoto[1].date),true));content.append(comparison);
      rows.forEach(r=>{const item=node('article');item.append(node('h3',displayDate(r.date)+' · '+(r.workType||'ไม่ระบุประเภทงาน')),node('p',r.workDetail||'ไม่ระบุรายละเอียดงาน'),node('p','พื้นที่: '+(r.area||'ไม่ระบุ')+' · รูปทรง/ความสูง: '+(r.shapeHeight||'ไม่ระบุ')),node('p','เริ่ม '+displayTime(r.startTime)+' · เสร็จ '+displayTime(r.endTime)+' · ระยะเวลา '+(r.duration||'—')),photo(r,'ภาพประกอบ'));[['รหัสต้นไม้',r.treeId],['ชื่อต้นไม้',r.name],['รายละเอียด',r.description],['พิกัด',r.position],['เอกสารประกอบ',r.document]].forEach(([label,value])=>item.append(node('p',label+': '+(value||'—'))));content.append(item);});
    }catch(e){if(current===token){$('history-content').replaceChildren(summary,node('p','อ่านประวัติไม่สำเร็จ: '+e.message));if(preview)preview.replaceChildren(node('p','ยังโหลดรูปไม่ได้: '+e.message));}}
  };
  function closeHistory(){token++;$('tree-history').hidden=true;}
  $('history-close').onclick=closeHistory;
  // Capture before map markers open a new tree: the opening click must not close it again.
  function outsideHistory(event){const panel=$('tree-history');if(!panel.hidden&&!panel.contains(event.target))closeHistory();}
  document.addEventListener('pointerdown',outsideHistory,true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('tree-history').hidden)closeHistory();});
  // The dashboard embeds the map. Clicks elsewhere in the host page also dismiss it.
  try{if(root.parent!==root&&root.parent.location.origin===root.location.origin){
    root.parent.document.addEventListener('pointerdown',outsideHistory,true);
  }}catch(_){}
  api.bindSearch=function(trees,onSelect){
    const input=$('tree-search'),list=$('tree-options');
    if(!input||!list)return;
    const normalize=value=>String(value??'').normalize('NFC').trim().toLocaleLowerCase('th');
    const label=tree=>tree.id+' · '+tree.name;
    const items=trees.map(tree=>({tree,id:normalize(tree.id),name:normalize(tree.name),label:normalize(label(tree))}));
    let matching=[],active=-1,lastSelected='',typed=false,escaped=false;
    function hide(){
      matching=[];active=-1;list.replaceChildren();list.hidden=true;
      input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');
    }
    function exact(){
      const q=normalize(input.value);
      return items.find(item=>item.id===q||item.label===q);
    }
    function choose(item){
      if(!item)return;
      input.value=label(item.tree);hide();
      if(lastSelected===item.id)return;
      lastSelected=item.id;onSelect(item.tree);api.open(item.tree);
    }
    function move(next){
      if(!matching.length)return;
      active=Math.max(0,Math.min(matching.length-1,next));
      Array.from(list.children).forEach((o,i)=>o.setAttribute('aria-selected',String(i===active)));
      const option=list.children[active];
      input.setAttribute('aria-activedescendant',option.id);
      option.scrollIntoView?.({block:'nearest'});
    }
    function show(){
      hide();
      const q=normalize(input.value);if(!q)return;
      const idMatches=items.filter(o=>o.id.startsWith(q)), seen=new Set(idMatches);
      matching=idMatches.concat(items.filter(o=>!seen.has(o)&&(o.name.includes(q)||o.label.includes(q)))).slice(0,12);
      if(!matching.length)return;
      matching.forEach((item,i)=>{
        const opt=node('div',label(item.tree));opt.id='tree-suggestion-'+i;
        opt.setAttribute('role','option');opt.setAttribute('aria-selected','false');
        opt.onpointerdown=e=>e.preventDefault();
        opt.onclick=()=>choose(item);
        list.append(opt);
      });
      list.hidden=false;input.setAttribute('aria-expanded','true');
    }
    input.oninput=event=>{lastSelected='';typed=Boolean(normalize(input.value));escaped=false;if(!event.isComposing)show();};
    input.oncompositionend=()=>{typed=Boolean(normalize(input.value));escaped=false;show();};
    input.onkeydown=event=>{
      if(event.isComposing)return;
      if(event.key==='Escape'&&!list.hidden){event.preventDefault();escaped=true;hide();}
      else if(event.key==='ArrowDown'&&typed){if(list.hidden)show();if(!list.hidden){event.preventDefault();escaped=false;move(active+1);}}
      else if(event.key==='ArrowUp'&&!list.hidden){event.preventDefault();move(active===-1?matching.length-1:active-1);}
      else if(event.key==='Enter'){
        const item=active>=0?matching[active]:exact();
        if(item){event.preventDefault();choose(item);}
      }
    };
    input.onchange=()=>{if(!escaped)choose(exact());};
    const shell=input.closest('.tree-search');
    if(root.TreeSearchOutside)document.removeEventListener('pointerdown',root.TreeSearchOutside,true);
    root.TreeSearchOutside=event=>{if(!list.hidden&&!shell?.contains(event.target))hide();};
    document.addEventListener('pointerdown',root.TreeSearchOutside,true);
    input.onblur=hide;
    hide();
  };
  // บันทึกยืนยันแล้วล้าง cache เพื่อให้รูปใหม่แสดงล่าสุด โดยไม่แตะฟอร์มที่กำลังกรอก
  function refreshConfirmed(){historyCache.clear();photoCache.clear();if(selectedTree&&!$('tree-history').hidden)api.open(selectedTree,selectedPreview&&selectedPreview.isConnected?selectedPreview:null);}
  root.addEventListener('mu:data-changed',refreshConfirmed);
  try{if(root.parent!==root&&root.parent.location.origin===root.location.origin)root.parent.addEventListener('mu:data-changed',refreshConfirmed);}catch(_){}
  root.TreeHistory=api;
})(typeof window==='undefined'?globalThis:window);
