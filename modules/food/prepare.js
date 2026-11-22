/* Nine explicit site weights form one server-confirmed batch. Never clear an uncertain draft. */
'use strict';
(function(){
 const $=id=>document.getElementById(id),now=new Date(),pad=v=>String(v).padStart(2,'0');
 const locations=HubFoodModel.locations;
 $('foodDate').value=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate());
 const values=()=>locations.map((_,i)=>({weight:$('foodWeight'+i).value,bins:$('foodBins'+i).value,time:$('foodTime'+i).value,problem:$('foodProblem'+i).value}));
 const totals=()=>{const data=values();data.forEach((v,i)=>$('foodToggle'+i).classList.toggle('is-complete',HubFoodModel.complete(v)));$('foodBinsTotal').value=HubFoodModel.total(data,'bins');$('foodWeightTotal').value=HubFoodModel.total(data,'weight');};
 locations.forEach((_,i)=>['foodWeight','foodBins','foodTime'].forEach(k=>$(k+i).addEventListener('input',totals)));
 locations.forEach((_,i)=>{
  const toggle=$('foodToggle'+i),panel=$('foodPanel'+i);
  toggle.addEventListener('click',()=>{const expanded=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!expanded));panel.hidden=expanded;});
 });
 $('foodPrepareForm').addEventListener('invalid',event=>{
  const panel=event.target.closest('.food-point-panel');if(panel){panel.hidden=false;document.querySelector('[aria-controls="'+panel.id+'"]').setAttribute('aria-expanded','true');}
 },true);
 totals();
 $('foodPrepareButton').addEventListener('click',async function(){
  if(this.disabled||!$('foodPrepareForm').reportValidity())return;
  const controls=Array.from($('foodPrepareForm').querySelectorAll('input,textarea,button')),prior=controls.map(n=>n.disabled);
  let saving=false,uncertain=false;
  try{
   UnifiedApi.endpoint(); // ตรวจลิงก์และวิธีเปิดเว็บก่อนอ่านรูปหรือปิดปุ่ม
   const points=HubFoodModel.points(values());
   const payload={date:$('foodDate').value,recorder:$('foodRecorder').value.trim(),locations:points};
   controls.forEach(n=>n.disabled=true);this.textContent='กำลังบันทึก…';this.classList.add('is-loading');this.setAttribute('aria-busy','true');
   UnifiedApi.submissionStatus('preparing','กำลังรับข้อมูล');
   payload.photos=await HubFormPhoto.readMany($('foodPhoto').files);
   saving=true;
   await UnifiedApi.save('food',payload); // Promise resolves only after confirmed Sheet receipt. No automatic retry is started here.
   locations.forEach((_,i)=>['foodWeight','foodBins','foodTime','foodProblem'].forEach(k=>$(k+i).value=''));$('foodPhoto').value='';totals();
  }catch(error){uncertain=saving&&['FOOD_BATCH_UNCONFIRMED','CONFLICT','SERVICE_ERROR','VERIFY_FAILED','VIEW_REFRESH_FAILED','TIMEOUT'].includes(error.code);if(uncertain){const message='ยังยืนยันรายการนี้ไม่ได้ ข้อมูลที่กรอกยังอยู่ กรุณาอย่ากรอกชุดใหม่ ให้ตรวจรายการเดิมกับผู้ดูแลก่อน';$('foodBatchNotice').textContent=message;$('foodBatchNotice').hidden=false;UnifiedApi.submissionStatus('blocked',message);}else UnifiedApi.submissionStatus('blocked',error.message);}
  finally{this.classList.remove('is-loading');this.removeAttribute('aria-busy');if(!uncertain)controls.forEach((n,i)=>n.disabled=prior[i]);this.textContent=uncertain?'รอการตรวจสอบรายการเดิม':'บันทึกข้อมูล';}
 });
})();
