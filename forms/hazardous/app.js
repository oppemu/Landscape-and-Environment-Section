/* ขยะอันตรายเดิม: จำนวนแยกประเภท น้ำหนักรวมและรูป; ใช้ร่วมกับตัวเชื่อม API ของแอปรวม ไม่เปิดสคริปต์นี้เดี่ยว */
// รายชื่อส่วนงานทั้งหมด
const facultyList = [
    "คณะกายภาพบำบัด (PT) 1 (วิทยาเขตศาลายา)", "คณะกายภาพบำบัด (PT) 2 (วิทยาเขตบางกอกน้อย)", 
    "คณะทันตแพทยศาสตร์(DT)", "คณะเทคนิคการแพทย์ (MT)", "คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)", 
    "คณะพยาบาลศาสตร์ (NS) 1 (วิทยาเขตศาลายา)", "คณะพยาบาลศาสตร์ (NS) 2 (วิทยาเขตบางกอกน้อย)", 
    "คณะแพทยศาสตร์โรงพยาบาลรามาธิบดี (RAMA) 1 (วิทยาเขตศาลายา)", "คณะแพทยศาสตร์โรงพยาบาลรามาธิบดี (RAMA) 2 (วิทยาเขตพญาไท)", 
    "คณะแพทยศาสตร์ศิริราชพยาบาล (SI)", "คณะเภสัชศาสตร์ (PY) 1 (วิทยาเขตพญาไท)", "คณะเภสัชศาสตร์ (PY) 2 (วิทยาเขตศาลายา)", 
    "คณะวิทยาศาสตร์ (SC) 1 (วิทยาเขตศาลายา)", "คณะวิทยาศาสตร์ (SC) 2 (วิทยาเขตพญาไท)", "คณะวิศวกรรมศาสตร์ (EG)", 
    "คณะเวชศาสตร์เขตร้อน (TM)", "คณะศิลปศาสตร์ (LA)", "คณะสังคมศาสตร์และมนุษยศาสตร์ (SH)", "คณะสัตวแพทยศาสตร์ (VS)", 
    "คณะสาธารณสุขศาสตร์ (PH)", "คณะสิ่งแวดล้อมและทรัพยากรศาสตร์ (EN)", "โครงการจัดตั้งวิทยาเขตนครสวรรค์ (NA)", 
    "โครงการจัดตั้งวิทยาเขตอำนาจเจริญ (AM)", "โครงการจัดตั้งศูนย์พัฒนาอุตสาหกรรมชีวภาพ (Pilot Plant)", 
    "โครงการจัดตั้งสถาบันสิทธิมนุษยชนและสันติศึกษา (IHRP)", "โครงการจัดตั้งสถาบันอุทยานธรรมสิรีรุกขชาติ (Siree)", 
    "บัณฑิตวิทยาลัย (GR)", "โรงเรียนสาธิตนานาชาติ (MUIDS)", "วิทยาเขตกาญจนบุรี (KA)", "วิทยาลัยการจัดการ (CMMU)", 
    "วิทยาลัยดุริยางคศิลป์ (MS)", "วิทยาลัยนานาชาติ (IC)", "วิทยาลัยราชสุดา (RS)", "วิทยาลัยวิทยาศาสตร์และเทคโนโลยีการกีฬา (SS)", 
    "วิทยาลัยศาสนศึกษา (CRS)", "ศูนย์การแพทย์กาญจนาภิเษก (GJ)", "ศูนย์จิตตปัญญาศึกษา (CE)", "ศูนย์ตรวจสอบภายใน (OPIA )", 
    "ศูนย์ธรรมาภิบาลข้อมูลและยุทธศาสตร์อัจฉริยะ (DGSI)", "ศูนย์บริการสนับสนุนสำหรับนักศึกษาพิการ (Mahidol DSS)", 
    "ศูนย์บริหารความปลอดภัยอาชีวอนามัยและสภาพแวดล้อมในการทำงาน (COSHEM)", "ศูนย์บริหารจัดการความเสี่ยง (OPRM)", 
    "ศูนย์บริหารสินทรัพย์ (OPAM)", "ศูนย์ส่งเสริมการเรียนรู้แบบบรูณาการชีวิต (CLiL)", "ศูนย์ส่งเสริมจริยธรรมการวิจัยในคน (SP)", 
    "ศูนย์ส่งเสริมจริยธรรมการวิจัย (OPSP)", "ศูนย์สัตว์ทดลองแห่งชาติ (NLAC)", "ศูนย์อำนวยการด้านข้อมูลส่วนบุคคลมหาวิทยาลัยมหิดล (PDPA)", 
    "สถาบันชีววิทยาศาสตร์โมเลกุล (MB)", "สถาบันนวัตกรรมการเรียนรู้ (IL)", "สถาบันบริหารจัดการเทคโนโลยีและนวัตกรรม (iNT)", 
    "สถาบันพัฒนาสุขภาพอาเซียน (AIHD)", "สถาบันโภชนาการ (INMU)", "สถาบันวิจัยประชากรและสังคม (IPSR)", 
    "สถาบันวิจัยภาษาและวัฒนธรรมเอเชีย (RILCA)", "สถาบันวิทยาศาสตร์การวิเคราะห์และตรวจสารในการกีฬา (ANDI)", 
    "สถาบันแห่งชาติเพื่อการพัฒนาเด็กและครอบครัว (CF)", "สภาคณาจารย์ (FS)", "สำนักงานสภามหาวิทยาลัย (UC)", 
    "สำนักงานอธิการบดี กองกฎหมาย (ORLA)", "สำนักงานอธิการบดี กองกายภาพแล้วสิ่งแวดล้อม (OPPE)", 
    "สำนักงานอธิการบดี กองกิจการนักศึกษา (OPSA)", "สำนักงานอธิการบดี กองคลัง (OPFA)", "สำนักงานอธิการบดี กองทรัพยากรบุคคล (OPHR)", 
    "สำนักงานอธิการบดี กองเทคโนโลยีสารสนเทศ (OPIT)", "สำนักงานอธิการบดี กองบริหารการศึกษา (OPEA)", 
    "สำนักงานอธิการบดี กองบริหารงานทั่วไป (OPGA)", "สำนักงานอธิการบดี กองบริหารงานวิจัย (OPRA)", 
    "สำนักงานอธิการบดี กองแผนงาน (OPPL)", "หอสมุดและคลังความรู้มหาวิทยาลัยมหิดล (MULKC)", 
    "บุคคลภายนอก / ผู้รับเหมา", "บริษัทไม้เดิม", "เพาะชำงานภูมิทัศน์และสิ่งแวดล้อม"
];

// ฐานข้อมูลขยะอันตรายทั่วไป
const globalHazardousWasteList = [
    "กระป๋องยาฆ่าแมลง", "ขวดน้ำยาล้างห้องน้ำ", "ขวดน้ำยาทำความสะอาด", "กระป๋องสีทาบ้าน",
    "ทินเนอร์ / น้ำมันสน", "น้ำมันเครื่องเก่า", "แบตเตอรี่รถยนต์", "ยางรถยนต์เก่า",
    "กาว / สารยึดติด", "น้ำยาซักแห้ง", "เทอร์โมมิเตอร์ (ปรอท)", "ยาฆ่าหญ้า / สารกำจัดศัตรูพืช",
    "สารเคมีทางการเกษตร", "แผงวงจรอิเล็กทรอนิกส์", "แผ่นซีดี / ดีวีดี", "ตลับหมึกพรินเตอร์ (Ink/Toner)",
    "ไฟแช็กเก่า", "แบตเตอรี่สำรอง (Power Bank)", "บุหรี่ไฟฟ้า", "น้ำยาล้างรูป",
    "ฟิล์มเอ็กซเรย์", "ปุ๋ยเคมี", "น้ำยากำจัดปลวก", "น้ำยาฟอกขาว", "น้ำยาล้างเล็บ",
    "สเปรย์ปรับอากาศ", "กระป๋องแก๊สปิกนิก", "โซดาไฟ", "กรดกำมะถัน / กรดแบตเตอรี่"
];

// จัดวันที่เลือกเป็นข้อความไทยสำหรับรายงาน
function getFullThaiDate(dateString) {
    if (!dateString) return "";
    const dateObj = new Date(dateString);
    const days = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
    const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    return `${days[dateObj.getDay()]} ที่ ${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear() + 543}`;
}

function loadCachedAgencyData() {
    if (localStorage.getItem('cached_building_haz')) document.getElementById('buildingName').value = localStorage.getItem('cached_building_haz');
    if (localStorage.getItem('cached_contact_haz')) document.getElementById('contactName').value = localStorage.getItem('cached_contact_haz');
    if (localStorage.getItem('cached_phone_haz')) document.getElementById('phone').value = localStorage.getItem('cached_phone_haz');
}

function saveCachedAgencyData() {
    localStorage.setItem('cached_building_haz', document.getElementById('buildingName').value);
    localStorage.setItem('cached_contact_haz', document.getElementById('contactName').value);
    localStorage.setItem('cached_phone_haz', document.getElementById('phone').value);
}

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('date');
    dateInput.valueAsDate = new Date();

    loadCachedAgencyData();

    const form = document.getElementById('hazardousForm');
    document.getElementById('hazardousImage').addEventListener('change', function () {
        document.getElementById('hazardousFileName').textContent = this.files && this.files[0] ? this.files[0].name : 'ยังไม่ได้เลือกภาพ';
    });
    const wasteInput = document.getElementById('wasteType');
    const wastePopup = document.getElementById('wastePopup');
    const wasteCheckboxes = document.querySelectorAll('input[name="wasteSelect"]');
    const confirmWasteBtn = document.getElementById('confirmWasteBtn');
    
    const otherWasteGroup = document.getElementById('otherWasteGroup');
    const otherWasteInput = document.getElementById('otherWaste');
    const otherWasteDropdown = document.getElementById('otherWasteDropdown');
    const dynamicAmountContainer = document.getElementById('dynamicAmountContainer');
    
    const successPopup = document.getElementById('successPopup');
    const closePopupBtn = document.getElementById('closePopupBtn');
    
    const departmentInput = document.getElementById('buildingName');
    const departmentDropdown = document.getElementById('departmentDropdown');

    // ฟังก์ชันสร้างช่องกรอกจำนวนแบบไดนามิก
    function updateDynamicAmounts() {
        // เก็บค่าเก่าที่เคยกรอกไว้ เพื่อไม่ให้หายตอนรีเฟรชกล่อง
        let currentValues = Object.create(null);
        dynamicAmountContainer.querySelectorAll('.dynamic-amount').forEach(el => {
            let item = el.getAttribute('data-item');
            let unitEl = dynamicAmountContainer.querySelector(`.dynamic-unit[data-item="${CSS.escape(item)}"]`);
            if (unitEl) {
                currentValues[item] = { amount: el.value, unit: unitEl.value, weightKg: el.closest(".form-group").querySelector(".dynamic-weight").value };
            }
        });

        // รวบรวมรายชื่อขยะทั้งหมดที่เลือก/พิมพ์
        let types = [];
        if (wasteInput.value) {
            types = types.concat(wasteInput.value.split(',').map(t => t.trim()));
        }
        if (otherWasteInput.value) {
            types = types.concat(otherWasteInput.value.split(',').map(t => t.trim()));
        }

        // กรองค่าว่างและคำว่า "อื่นๆ" ทิ้ง พร้อมตัดตัวซ้ำ
        types = [...new Set(types.filter(t => t !== '' && t !== 'อื่นๆ'))];

        dynamicAmountContainer.innerHTML = ''; // เคลียร์กล่องเดิม

        const unitOptions = `
            <option value="ชิ้น / อัน">ชิ้น / อัน</option>
            <option value="หลอด">หลอด</option>
            <option value="กล่อง">กล่อง</option>
            <option value="ถุง">ถุง</option>
            <option value="กระสอบ">กระสอบ</option>
            <option value="ถัง">ถัง</option>
            <option value="ขวด">ขวด</option>
            <option value="กระป๋อง">กระป๋อง</option>
            <option value="ตลับ">ตลับ</option>
            <option value="แพ็ค">แพ็ค</option>
            <option value="พาเลท">พาเลท</option>
        `;

        // สร้างช่องกรอกใหม่ตามรายชื่อขยะ
        types.forEach((rawItem, itemIndex) => {
            const item = rawItem.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c]));
            const row = document.createElement('div');
            row.className = 'form-group waste-item-card';
            
            const prevAmount = currentValues[rawItem] ? currentValues[rawItem].amount : '';
            const prevWeight = currentValues[rawItem] ? currentValues[rawItem].weightKg : '';
            const prevUnit = currentValues[rawItem] ? currentValues[rawItem].unit : 'ชิ้น / อัน';

            row.innerHTML = `
                <h3 class="waste-item-heading"><span class="waste-item-number">${itemIndex + 1}</span><span>${item}</span></h3>
                <div class="waste-item-fields">
                    <div><label for="waste-amount-${itemIndex}">จำนวน</label>
                    <input id="waste-amount-${itemIndex}" type="number" class="dynamic-amount" data-item="${item}" placeholder="0" min="1" step="1" inputmode="numeric" value="${prevAmount}" required></div>
                    <div><label for="waste-unit-${itemIndex}">หน่วย</label>
                    <select id="waste-unit-${itemIndex}" class="dynamic-unit" data-item="${item}" required>
                        ${unitOptions}
                    </select></div>
                </div>
                <label class="waste-weight-label" for="waste-weight-${itemIndex}">น้ำหนัก (กิโลกรัม)</label>
                <input id="waste-weight-${itemIndex}" type="number" class="dynamic-weight" aria-label="น้ำหนัก ${item} (กิโลกรัม)" placeholder="0.00" min="0.01" max="100000000" step="0.01" inputmode="decimal" value="${prevWeight}" required>
            `;
            dynamicAmountContainer.appendChild(row);

            // เซ็ตค่าหน่วยกลับเป็นตัวเดิมที่เคยเลือกไว้
            if (currentValues[rawItem]) {
                const select = row.querySelector('.dynamic-unit');
                select.value = prevUnit;
            }
        });
        updateTotalWeight();
    }

    // รวมหน่วยร้อยส่วนของกิโลกรัม เพื่อลดปัญหาทศนิยมในการบวก
    function updateTotalWeight() {
        const total = Array.from(dynamicAmountContainer.querySelectorAll(".dynamic-weight")).reduce((sum, el) => {
            const n=Number(el.value); return sum + (Number.isFinite(n) && n>0 ? Math.round(n*100) : 0);
        }, 0);
        document.getElementById("totalWeight").value=(total/100).toFixed(2);
        return total/100;
    }
    dynamicAmountContainer.addEventListener("input", updateTotalWeight);

    // Autocomplete ค้นหาส่วนงาน
    departmentInput.addEventListener('input', function() {
        const val = this.value.trim();
        departmentDropdown.innerHTML = '';
        if (!val) { departmentDropdown.classList.add('hidden'); return; }

        const filtered = facultyList.filter(item => item.includes(val));
        if (filtered.length > 0) {
            filtered.forEach(item => {
                const li = document.createElement('li');
                li.className = 'autocomplete-item';
                li.textContent = item;
                li.addEventListener('click', function() {
                    departmentInput.value = item;
                    departmentDropdown.classList.add('hidden');
                });
                departmentDropdown.appendChild(li);
            });
            departmentDropdown.classList.remove('hidden');
        } else {
            departmentDropdown.classList.add('hidden');
        }
    });

    // Autocomplete ค้นหาขยะอันตรายอื่นๆ
    otherWasteInput.addEventListener('input', function() {
        const terms = this.value.split(',');
        const currentTerm = terms[terms.length - 1].trim(); 

        otherWasteDropdown.innerHTML = '';
        
        if (!currentTerm) {
            otherWasteDropdown.classList.add('hidden');
            return;
        }

        const filtered = globalHazardousWasteList.filter(item => item.includes(currentTerm));
        
        if (filtered.length > 0) {
            filtered.forEach(item => {
                const li = document.createElement('li');
                li.className = 'autocomplete-item';
                li.textContent = item;
                
                li.addEventListener('click', function() {
                    terms.pop();
                    terms.push(item);
                    otherWasteInput.value = terms.map(t => t.trim()).filter(t => t).join(', ') + ', ';
                    otherWasteDropdown.innerHTML = '';
                    otherWasteDropdown.classList.add('hidden');
                    otherWasteInput.focus();
                    
                    updateDynamicAmounts(); // อัปเดตช่องกรอกจำนวน
                });
                otherWasteDropdown.appendChild(li);
            });
            otherWasteDropdown.classList.remove('hidden');
        } else {
            otherWasteDropdown.classList.add('hidden');
        }
    });

    // ตรวจจับเมื่อผู้ใช้พิมพ์และคลิกออกจากช่องอื่นๆ (เพื่ออัปเดตช่องกรอกจำนวนแบบ manual)
    otherWasteInput.addEventListener('change', updateDynamicAmounts);

    document.addEventListener('click', function(e) {
        if (e.target !== departmentInput && e.target !== departmentDropdown) {
            departmentDropdown.classList.add('hidden');
        }
        if (e.target !== otherWasteInput && e.target !== otherWasteDropdown) {
            otherWasteDropdown.classList.add('hidden');
        }
    });

    // Popup เลือกประเภทขยะ
    wasteInput.addEventListener('click', () => {
        wastePopup.classList.remove('hidden');
    });

    // ยืนยันการเลือกประเภทขยะอันตรายในการ์ด
    confirmWasteBtn.addEventListener('click', () => {
        let selectedValues = [];
        let hasOther = false;

        for (const checkbox of wasteCheckboxes) {
            if (checkbox.checked) {
                selectedValues.push(checkbox.value);
                if (checkbox.value === 'อื่นๆ') hasOther = true;
            }
        }
        
        if (selectedValues.length > 0) {
            wasteInput.value = selectedValues.join(', ');
            wastePopup.classList.add('hidden');
            
            if (hasOther) {
                otherWasteGroup.classList.remove('hidden');
                otherWasteInput.setAttribute('required', 'required');
            } else {
                otherWasteGroup.classList.add('hidden');
                otherWasteInput.removeAttribute('required');
                otherWasteInput.value = '';
            }
            
            updateDynamicAmounts(); // อัปเดตช่องกรอกจำนวน
        } else {
            (window.MUDialog ? MUDialog.alert : window.alert)("กรุณาเลือกประเภทขยะอันตรายอย่างน้อย 1 รายการครับ");
        }
    });

    // ส่งข้อมูลลง Google Sheets
    let requestId = crypto.randomUUID();
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn=document.getElementById('submitBtn');
      if(btn.disabled)return;
      btn.disabled=true;btn.innerHTML='<span class="spinner"></span> กำลังส่ง';
      try {
        const items=Array.from(document.querySelectorAll('.dynamic-amount')).map(el=>({type:el.dataset.item,amount:Number(el.value),unit:el.closest('.form-group').querySelector('.dynamic-unit').value,weightKg:Number(el.closest('.form-group').querySelector('.dynamic-weight').value)}));
        const file=document.getElementById('hazardousImage').files[0];
        if(!file)throw Error('กรุณาแนบรูปภาพ');
        if(!['image/jpeg','image/png'].includes(file.type)||file.size>5*1024*1024)throw Error('ใช้รูป JPG/PNG ไม่เกิน 5 MB');
        const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(file)});
        const payload={requestId,date:dateInput.value,buildingName:document.getElementById('buildingName').value.trim(),contactName:document.getElementById('contactName').value.trim(),phone:document.getElementById('phone').value.trim(),totalWeight:updateTotalWeight(),items,image:{base64,mimeType:file.type}};
        await HazardConnection.submit(payload);
        requestId=crypto.randomUUID();saveCachedAgencyData();successPopup.classList.remove('hidden');
      } catch(err){alert(err.message||'ส่งไม่สำเร็จ กรุณาลองใหม่ ข้อมูลในฟอร์มยังอยู่');}
      finally{btn.disabled=false;btn.textContent='ส่งข้อมูล';}
    });

    // ปิด Popup เมื่อบันทึกสำเร็จ
    closePopupBtn.addEventListener('click', function() {
        successPopup.classList.add('hidden');
        
        wasteInput.value = '';
        otherWasteGroup.classList.add('hidden');
        otherWasteInput.value = '';
        dynamicAmountContainer.innerHTML = ''; // ล้างช่องกรอกจำนวน
        document.getElementById('totalWeight').value = '0.00'; // ล้างช่องน้ำหนัก
        
        // ล้างช่องรูปภาพ
        const fileInput = document.getElementById('hazardousImage');
        if (fileInput) fileInput.value = '';
        document.getElementById('hazardousFileName').textContent = 'ยังไม่ได้เลือกภาพ';

        for (const checkbox of wasteCheckboxes) {
            checkbox.checked = false;
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});