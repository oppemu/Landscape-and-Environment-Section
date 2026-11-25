'use strict';
const lines=s=>s.trim().split('\n');
const tasks=lines(`งานเก็บเศษอาหาร
งานตัดหญ้า
งานตัดแต่ง
งานกำจัดวัชพืช
งานเติมดินผสมปลูก
งานทำความสะอาด
งานรดน้ำ
งานขยายพันธ์พืช
งานจัดการไม้กระถางที่หมดอายุการใช้งาน
งานย้ายไม้กระถางออกแดด
งานจัดต้นไม้ตกแต่งสถานที่
งานจัดเก็บขนย้ายไม้กระถาง
งานประดับธง
งานเก็บธง
งานปลูกต้นไม้/งานย้ายกล้าไม้
งานทาสีค้ำยันต้นไม้
งานใส่ปุ๋ย
งานใช้ลวดสลิงเพื่อยึดโยงต้นไม้ใหญ่
งานขนย้ายวัสดุอุปกรณ์`);
const places=lines(`เรือนเพาะชำ
อาคารบำบัดน้ำเสียรวม
อาคารเจรจานวัตกรรม
คณะวิศวกรรมศาสตร์
สถาบันสิทธิมนุษยชนและสันติศึกษา
อาคารสิริวิทยา
ห้องประชุมอาคารจอดรถ
หอประชุมมหิดลสิทธาคาร
คณะพยาบาลศาสตร์ ศาลายา
สถาบันพัฒนาสุขภาพอาเซียน
สถาบันแห่งชาติเพื่อการพัฒนาเด็กและครอบครัว
สถาบันวิจัยประชากรและสังคม
ถนนสานสัตยา(ข้างหอสมุดฯ)
ลานหน้าหอสมุดและคลังความรู้
สำนักงานอธิการบดี
หอพระพุทธมหาสิริพีรยพัฒน์
อาคารเอนกประสงค์
ลานจอดรถชั่วคราวคณะสัตวแพทย์
ประตู 3
ลานประชากร
ลานมหิดล
สามแยกแปลงผัก
ถนนผสานเทศไทย
อาคารศูนย์การเรียนรู้(MLC)
งานคอนเสิร์ตรักชาติ
กองกายภาพและสิ่งแวดล้อม
อาคารอนุรักษ์สิ่งแวดล้อม
อาคารสิ่งแวดล้อมพัฒนดล
อุทยานธรรมชาติวิทยาสิรีรุกขชาติ
คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)
อาคารทีเซล
อาคารกีฬาโรงช้าง
รั้วเนินดินทิศตะวันตก
จุดพักเศษอาหาร 10 จุด
พื้นที่ทางเดินข้างโรงเรียนสาธิตนานาชาติ`);
const specialPlaces=[9,5,11,10,6,8,3,7,0,14,15,16,17,18,19,20,21,23,25,26,27,28,29,30,31,32,34].map(i=>places[i]).concat('สนามฟุตบอล');
const plants=lines(`ต้นเฟื่องฟ้า
ต้นหมากเหลือง
ต้นหมากผู้หมากเมีย
ต้นเตยด่าง
ต้นฟิโลทอง
ต้นไทรเกาหลี
ต้นฤาษีผสม
ต้นกระดุมทอง
ต้นบุษบาฮาวายด่าง
ต้นผักโขมแดง
ต้นสาวน้อยปะแป้ง
ต้นคาเมรอน
ต้นคอสมอส
ต้นสร้อยไก่
ต้นบานชื่นหนู
ต้นลิ้นมังกร
ดาวเรือง
ต้นมากาเร็ต
ต้นแพงพวย`);
const $=s=>document.querySelector(s);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options=a=>a.map(t=>'<option>'+escapeHtml(t)+'</option>').join('');
const select=(name,label,a)=>'<div class="group"><label for="'+name+'" class="lbl">'+escapeHtml(label)+'</label><select id="'+name+'" name="'+name+'"><option value="">เลือกสถานที่</option>'+options(a)+'</select></div>';
function choices(type,name,label,a,withOther=false){return '<fieldset><legend>'+escapeHtml(label)+'</legend><div class="options">'+a.map(t=>'<label class="choice"><input type="'+type+'" name="'+name+'" value="'+escapeHtml(t)+'"><span>'+escapeHtml(t)+'</span></label>').join('')+(withOther?'<label class="choice"><input type="radio" name="'+name+'" value="__other" aria-controls="'+name+'-other"><span>อื่นๆ</span></label>':'')+'</div>'+(withOther?'<div class="other" id="'+name+'-other" hidden><label class="lbl" for="'+name+'-text">ระบุงานอื่นๆ</label><input type="text" id="'+name+'-text" name="'+name+'Other" disabled></div>':'')+'</fieldset>'}
// ไม่เผยแพร่รายชื่อบุคลากรไว้ในชุดโค้ดสาธารณะ
for(let n=1;n<=5;n++){
  const p='photo'+n;
  $('#activities').insertAdjacentHTML('beforeend','<details class="activity card" id="activity'+n+'"'+(n===1?' open':'')+'><summary><span class="number" aria-hidden="true">'+n+'</span><span class="sum-name">รายการงานที่ '+n+'</span><span class="sum-state" id="status'+n+'">ยังไม่ได้กรอก</span></summary><div class="sectionbody pad">'+choices('radio','task'+n,n+(n===3?'.':'. ')+'รายละเอียดการปฏิบัติงาน',tasks,true)+'<div class="field-row">'+select('place'+n,'สถานที่ ที่ '+n,n===5?places.concat('สนามฟุตบอล'):places)+'<div class="group"><label class="lbl" for="'+p+'">รูปภาพ</label><div class="attachment"><input id="'+p+'" name="'+p+'" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="'+p+'-help '+p+'-status" multiple><p class="hint" id="'+p+'-help">แนบได้ไม่เกิน 5 รูปต่อรายการ รูปใหญ่จะย่อก่อนส่ง</p><p class="file-state" id="'+p+'-status" role="status"></p></div></div></div></div></details>');
}
$('#super-fields').innerHTML='<div class="group"><label class="lbl" for="supervisorName">ผู้ควบคุมงาน (ฟุ้ง/ฟ้ากรอกข้อมูลเอง)</label><input type="text" maxlength="180" id="supervisorName"></div>'+choices('radio','specialTask','รายละเอียดการปฏิบัติงาน (ฟุ้ง/ฟ้ากรอกข้อมูลเอง)',[tasks[10],tasks[7]])+select('specialPlace','ข้อนี้ ฟุ้ง / ฟ้า กรอกข้อมูลเอง',specialPlaces)+choices('checkbox','plant','ชนิดต้นไม้ที่ใช้ประดับ (ฟุ้ง/ฟ้ากรอกข้อมูลเอง)',plants);
const form=$('#preview'), all=Array.from(document.querySelectorAll('.activity')), result=$('#result'), toggle=$('#toggle-activities');
function groupState(n){const t=form.querySelector('[name="task'+n+'"]:checked'), other=t?.value==='__other', desc=$('#task'+n+'-text'); $('#task'+n+'-other').hidden=!other;desc.disabled=!other;const el=$('#status'+n);el.textContent=t?(other?desc.value.trim()||'อื่นๆ':t.value):$('#place'+n).value||($('#photo'+n).files.length?'เลือกไฟล์แล้ว':'ยังไม่ได้กรอก');}
function syncToggle(){toggle.textContent=all.every(d=>d.open)?'พับทุกรายการ':'เปิดทุกรายการ';}
all.forEach((d,i)=>{const n=i+1;d.addEventListener('toggle',syncToggle);d.addEventListener('change',e=>{if(e.target.type==='file'){const input=e.target, s=$('#photo'+n+'-status'), count=input.files.length, invalid=count>5||[...input.files].some(f=>f.size>10*1024*1024);if(invalid)input.value='';s.classList.toggle('bad',invalid);s.textContent=invalid?'เลือกใหม่: ไม่เกิน 5 ไฟล์และ 10 MB ต่อไฟล์':count?'เลือกแล้ว '+count+' รูป':'';} groupState(n);});d.addEventListener('input',()=>groupState(n));});
toggle.addEventListener('click',()=>{const open=!all.every(d=>d.open);all.forEach(d=>{d.open=open});syncToggle();});
// เก็บร่างไว้จนกว่าจะได้รับรหัสรายงานยืนยันจากฐานข้อมูล
let pending=false;
const choose=name=>form.querySelector('[name="'+name+'"]:checked')?.value||'';
const val=id=>$('#'+id).value.trim();
function report(state,message){result.dataset.state=state;result.textContent=message;result.hidden=false;result.focus();}
async function photo(file,api){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>10*1024*1024)throw Error('แนบ JPG, PNG หรือ WEBP ไม่เกิน 10 MB ต่อรูป');
  if(file.size<=250*1024)return HubFormPhoto.validate(await api.readFile(file));
  const bitmap=await createImageBitmap(file);
  try {
    const scale=Math.min(1,1250/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*scale)); canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.72));
    if(!blob||blob.size>1024*1024)throw Error('ย่อรูปไม่สำเร็จ กรุณาเลือกรูปที่เล็กลง');
    return HubFormPhoto.validate(await api.readFile(new File([blob],'evidence.jpg',{type:'image/jpeg'})));
  }finally{bitmap.close();}
}
form.addEventListener('submit',async event=>{
  event.preventDefault();if(pending)return;pending=true;
  const controls=[...form.querySelectorAll('input,select,button,textarea')];const states=controls.map(x=>x.disabled);
  try {
    if(window.parent===window||window.parent.location.origin!==location.origin||!window.parent.UnifiedApi)throw Error('กรุณาเปิดรายงานจากเมนูแบบฟอร์มในแอป');
    const api=window.parent.UnifiedApi;api.endpoint();
    const payload={workDate:val('date'),worker:val('worker'),supervisor:val('supervisorName'),activities:[],specialTask:choose('specialTask'),specialPlace:val('specialPlace'),plants:[...form.querySelectorAll('[name="plant"]:checked')].map(x=>x.value),pots:val('pots'),start:val('start'),end:val('end'),other:val('other')};
    controls.forEach(x=>x.disabled=true);report('pending','กำลังเตรียมรูปและส่งรายงาน…');
    let total=0;
    for(let n=1;n<=5;n++){
      const selected=choose('task'+n);const task=selected==='__other'?val('task'+n+'-text'):selected;
      if(selected==='__other'&&!task){all[n-1].open=true;throw Error('ระบุงานอื่น ๆ ในรายการที่ '+n);}
      const files=[...$('#photo'+n).files];
      if(files.length>5){all[n-1].open=true;throw Error('รายการที่ '+n+' แนบได้ไม่เกิน 5 รูป');}
      const photos=[];
      for(const file of files){const ready=await photo(file,api);total+=ready.base64.length;if(total>6000000)throw Error('รูปทั้งหมดมีขนาดรวมมากเกินไป ลองลดจำนวนรูป');photos.push({mimeType:ready.mimeType,base64:ready.base64});}
      payload.activities.push({task,place:val('place'+n),photos});
    }
    const data=await api.landscapeDaily(payload);
    if(!data||data.status!=='success'||!data.id||!Number.isInteger(data.sourceRow)||data.sourceRow<2)throw Error('ยังยืนยันผลไม่ได้ กรุณากดส่งรายการเดิมอีกครั้งโดยไม่แก้ข้อมูล');
    form.reset();setTimeout(()=>report('success','บันทึกแล้ว รหัสรายงาน '+data.id),10);
  }catch(e){report('error',e.message||'ยังยืนยันผลไม่ได้ กรุณาลองอีกครั้ง');}
  finally{controls.forEach((x,i)=>x.disabled=states[i]);pending=false;}
});
form.addEventListener('reset',()=>{result.hidden=true;setTimeout(()=>all.forEach((_,i)=>{const n=i+1;groupState(n);const s=$('#photo'+n+'-status');s.textContent='';s.classList.remove('bad')}),0);});
form.addEventListener('input',()=>{result.hidden=true});
