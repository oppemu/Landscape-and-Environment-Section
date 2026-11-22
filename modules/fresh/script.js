/* รับพืชสด: หน่วยงานผู้ให้ ชนิดพืช ปริมาณและรูป; ใช้ร่วมกับตัวเชื่อม API ของแอปรวม ไม่เปิดสคริปต์นี้เดี่ยว */
// รายชื่อส่วนงานทั้งหมด
const facultyList = [
    "คณะกายภาพบำบัด (PT) 1 (วิทยาเขตศาลายา)",
    "คณะกายภาพบำบัด (PT) 2 (วิทยาเขตบางกอกน้อย)",
    "คณะทันตแพทยศาสตร์(DT)",
    "คณะเทคนิคการแพทย์ (MT)",
    "คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)",
    "คณะพยาบาลศาสตร์ (NS) 1 (วิทยาเขตศาลายา)",
    "คณะพยาบาลศาสตร์ (NS) 2 (วิทยาเขตบางกอกน้อย)",
    "คณะแพทยศาสตร์โรงพยาบาลรามาธิบดี (RAMA) 1 (วิทยาเขตศาลายา)",
    "คณะแพทยศาสตร์โรงพยาบาลรามาธิบดี (RAMA) 2 (วิทยาเขตพญาไท)",
    "คณะแพทยศาสตร์ศิริราชพยาบาล (SI)",
    "คณะเภสัชศาสตร์ (PY) 1 (วิทยาเขตพญาไท)",
    "คณะเภสัชศาสตร์ (PY) 2 (วิทยาเขตศาลายา)",
    "คณะวิทยาศาสตร์ (SC) 1 (วิทยาเขตศาลายา)",
    "คณะวิทยาศาสตร์ (SC) 2 (วิทยาเขตพญาไท)",
    "คณะวิศวกรรมศาสตร์ (EG)",
    "คณะเวชศาสตร์เขตร้อน (TM)",
    "คณะศิลปศาสตร์ (LA)",
    "คณะสังคมศาสตร์และมนุษยศาสตร์ (SH)",
    "คณะสัตวแพทยศาสตร์ (VS)",
    "คณะสาธารณสุขศาสตร์ (PH)",
    "คณะสิ่งแวดล้อมและทรัพยากรศาสตร์ (EN)",
    "โครงการจัดตั้งวิทยาเขตนครสวรรค์ (NA)",
    "โครงการจัดตั้งวิทยาเขตอำนาจเจริญ (AM)",
    "โครงการจัดตั้งศูนย์พัฒนาอุตสาหกรรมชีวภาพ (Pilot Plant)",
    "โครงการจัดตั้งสถาบันสิทธิมนุษยชนและสันติศึกษา (IHRP)",
    "โครงการจัดตั้งสถาบันอุทยานธรรมสิรีรุกขชาติ (Siree)",
    "บัณฑิตวิทยาลัย (GR)",
    "โรงเรียนสาธิตนานาชาติ (MUIDS)",
    "วิทยาเขตกาญจนบุรี (KA)",
    "วิทยาลัยการจัดการ (CMMU)",
    "วิทยาลัยดุริยางคศิลป์ (MS)",
    "วิทยาลัยนานาชาติ (IC)",
    "วิทยาลัยราชสุดา (RS)",
    "วิทยาลัยวิทยาศาสตร์และเทคโนโลยีการกีฬา (SS)",
    "วิทยาลัยศาสนศึกษา (CRS)",
    "ศูนย์การแพทย์กาญจนาภิเษก (GJ)",
    "ศูนย์จิตตปัญญาศึกษา (CE)",
    "ศูนย์ตรวจสอบภายใน (OPIA )",
    "ศูนย์ธรรมาภิบาลข้อมูลและยุทธศาสตร์อัจฉริยะ (DGSI)",
    "ศูนย์บริการสนับสนุนสำหรับนักศึกษาพิการ (Mahidol DSS)",
    "ศูนย์บริหารความปลอดภัยอาชีวอนามัยและสภาพแวดล้อมในการทำงาน (COSHEM)",
    "ศูนย์บริหารจัดการความเสี่ยง (OPRM)",
    "ศูนย์บริหารสินทรัพย์ (OPAM)",
    "ศูนย์ส่งเสริมการเรียนรู้แบบบรูณาการชีวิต (CLiL)",
    "ศูนย์ส่งเสริมจริยธรรมการวิจัยในคน (SP)",
    "ศูนย์ส่งเสริมจริยธรรมการวิจัย (OPSP)",
    "ศูนย์สัตว์ทดลองแห่งชาติ (NLAC)",
    "ศูนย์อำนวยการด้านข้อมูลส่วนบุคคลมหาวิทยาลัยมหิดล (PDPA)",
    "สถาบันชีววิทยาศาสตร์โมเลกุล (MB)",
    "สถาบันนวัตกรรมการเรียนรู้ (IL)",
    "สถาบันบริหารจัดการเทคโนโลยีและนวัตกรรม (iNT)",
    "สถาบันพัฒนาสุขภาพอาเซียน (AIHD)",
    "สถาบันโภชนาการ (INMU)",
    "สถาบันวิจัยประชากรและสังคม (IPSR)",
    "สถาบันวิจัยภาษาและวัฒนธรรมเอเชีย (RILCA)",
    "สถาบันวิทยาศาสตร์การวิเคราะห์และตรวจสารในการกีฬา (ANDI)",
    "สถาบันแห่งชาติเพื่อการพัฒนาเด็กและครอบครัว (CF)",
    "สภาคณาจารย์ (FS)",
    "สำนักงานสภามหาวิทยาลัย (UC)",
    "สำนักงานอธิการบดี กองกฎหมาย (ORLA)",
    "สำนักงานอธิการบดี กองกายภาพแล้วสิ่งแวดล้อม (OPPE)",
    "สำนักงานอธิการบดี กองกิจการนักศึกษา (OPSA)",
    "สำนักงานอธิการบดี กองคลัง (OPFA)",
    "สำนักงานอธิการบดี กองทรัพยากรบุคคล (OPHR)",
    "สำนักงานอธิการบดี กองเทคโนโลยีสารสนเทศ (OPIT)",
    "สำนักงานอธิการบดี กองบริหารการศึกษา (OPEA)",
    "สำนักงานอธิการบดี กองบริหารงานทั่วไป (OPGA)",
    "สำนักงานอธิการบดี กองบริหารงานวิจัย (OPRA)",
    "สำนักงานอธิการบดี กองแผนงาน (OPPL)",
    "หอสมุดและคลังความรู้มหาวิทยาลัยมหิดล (MULKC)",
    "บุคคลภายนอก / ผู้รับเหมา",
    "บริษัทไม้เดิม",
    "เพาะชำงานภูมิทัศน์และสิ่งแวดล้อม"
];

// รายชื่อชนิดของพืชทั้งหมด
const plantList = [
    "กระถินณรงค์", "กระทิง", "กระทุ่มนา", "กระพี้จั่น", "กระดังงาต้น", "กร่าง", "กัลปพฤกษ์", "กาฝาก",
    "ขนุน", "ขานาง", "ขี้เหล็ก", "แคนา", "แคแสด", "แคบ้าน", "คูน", "คราม", "งิ้ว",
    "จันทร์หอม", "จามจุรี", "จามจุรีสีทอง", "จิก", "จิกน้ำ", "จิกนา", "จิกทะเล", "แจง", "จาน", "จำปี", "จำปีสีทอง",
    "ชงโค", "ชมพูพันธุ์ทิพย์", "ชัยพฤกษ์", "ฉนวนเงิน",
    "ตะค้อ", "ตะแบก", "ตะเคียน", "ตาล", "ตีนเป็ด", "ตีนเป็ดน้ำ", "ตีนเป็ดฝรั่ง",
    "ทองกวาว", "ทองหลาง", "ทองหลางน้ำ", "ทองอุไร", "นนทรี", "นางกวัก", "น้ำเต้าต้น",
    "บุนนาค", "บุษราคำ", "ใบไม้", "ใบไผ่", "ใบลีลาวดี", "ประดู่", "ปาล์ม", "ปาล์มน้ำมัน", "ปาล์มขวด", "ปีบ",
    "พะยอม", "พิกุล", "พุดป่า", "เพกา", "โพธิ์", "โพธิ์ทอง",
    "มะกอกป่า", "มะกอกเกลื้อน", "มะขาม", "มะขามเทศ", "มะค่าโมง", "มะดัน", "มะรุม", "มะยม", "มะม่วง", "มะพลับ", "มะพร้าว", "มะหวด", "มะฮอกกานี", "มะเกลือ", "มหาโชค", "โมกหลวง",
    "ยางนา", "ยางอินเดีย", "ราชพฤกษ์", "ลำดวน", "ลำพู", "ลีลาวดี", "เลี่ยน", "แวกซ์ปาล์ม", "ศรีตรัง", "ศุภโชค",
    "สัก", "สาละ", "สาละลังกา", "สารภี", "สำโรง", "เสลา", "สะตอ", "สะเดา", "สน", "สนปฏิพัทธ์", "สุพรรณิการ์", "เสี่ยวป้า",
    "หว้า", "หางนกยูง", "หางนกยูงฝรั่ง", "หูกระจง", "หูกวาง", "หมากเหลือง", "เหลืองปรีดียาธร", "เหลืองสิรินธร",
    "อโศก", "อโศกน้ำ", "อินจัน", "อินทนิล", "อินทผลัม"
];

// จัดวันที่เลือกเป็นข้อความไทยสำหรับรายงาน
function getFullThaiDate(dateString) {
    if (!dateString) return "";
    const dateObj = new Date(dateString);
    const days = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
    const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    
    return `${days[dateObj.getDay()]} ที่ ${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear() + 543}`;
}

// ฟังก์ชันดึงข้อมูลจาก Cache มาใส่ฟอร์ม
function loadCachedData() {
    if (localStorage.getItem('cached_provider')) {
        document.getElementById('provider').value = localStorage.getItem('cached_provider');
    }
    if (localStorage.getItem('cached_fullName')) {
        document.getElementById('fullName').value = localStorage.getItem('cached_fullName');
    }
    if (localStorage.getItem('cached_department')) {
        document.getElementById('department').value = localStorage.getItem('cached_department');
    }
    if (localStorage.getItem('cached_phone')) {
        document.getElementById('phone').value = localStorage.getItem('cached_phone');
    }
    if (localStorage.getItem('cached_licensePlate')) {
        document.getElementById('licensePlate').value = localStorage.getItem('cached_licensePlate');
    }
}

// ฟังก์ชันบันทึกข้อมูลลง Cache
function saveCachedData() {
    localStorage.setItem('cached_provider', document.getElementById('provider').value);
    localStorage.setItem('cached_fullName', document.getElementById('fullName').value);
    localStorage.setItem('cached_department', document.getElementById('department').value);
    localStorage.setItem('cached_phone', document.getElementById('phone').value);
    localStorage.setItem('cached_licensePlate', document.getElementById('licensePlate').value);
}

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('date');
    dateInput.valueAsDate = new Date();

    const departmentInput = document.getElementById('department');
    const departmentDropdown = document.getElementById('departmentDropdown');
    const plantTypeInput = document.getElementById('plantType');
    const plantTypeDropdown = document.getElementById('plantTypeDropdown');
    const form = document.getElementById('plantIntakeForm');
    const popup = document.getElementById('successPopup');

    const providerInput = document.getElementById('provider');
    const providerPopup = document.getElementById('providerPopup');
    const providerBtns = document.querySelectorAll('.provider-btn');
    const closeProviderPopupBtn = document.getElementById('closeProviderPopup');

    // Element สำหรับ Popup ประเภทพืชสด (อัปเดตใหม่ตามธีม)
    const plantCategoryInput = document.getElementById('plantCategory');
    const categoryPopup = document.getElementById('categoryPopup');
    const confirmCategoryBtn = document.getElementById('confirmCategoryBtn');
    const categoryRadios = document.querySelectorAll('input[name="categorySelect"]');

    // โหลดข้อมูลที่เคยแคชไว้ทันทีที่หน้าเว็บโหลดเสร็จ
    loadCachedData();

    // 1. Popup ผู้ให้ข้อมูล
    providerInput.addEventListener('click', () => {
        providerPopup.classList.remove('hidden');
    });

    providerBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            providerInput.value = e.target.getAttribute('data-value');
            providerPopup.classList.add('hidden');
        });
    });

    closeProviderPopupBtn.addEventListener('click', () => {
        providerPopup.classList.add('hidden');
    });

    // 2. Popup ประเภทพืชสด (อัปเดตใหม่)
    plantCategoryInput.addEventListener('click', () => {
        categoryPopup.classList.remove('hidden');
    });

    // เมื่อกดปุ่ม "ตกลง" ใน Popup ประเภทพืชสด
    confirmCategoryBtn.addEventListener('click', () => {
        const checkedBoxes = document.querySelectorAll('input[name="categorySelect"]:checked');
        const selectedValues = Array.from(checkedBoxes).map(cb => cb.value);
        
        if (selectedValues.length > 0) {
            plantCategoryInput.value = selectedValues.join(', ');
            categoryPopup.classList.add('hidden');
        } else {
            (window.MUDialog ? MUDialog.alert : window.alert)("กรุณาเลือกประเภทพืชสดอย่างน้อย 1 รายการครับ");
        }
    });

    // Autocomplete ค้นหาส่วนงาน
    departmentInput.addEventListener('input', function() {
        const val = this.value.trim();
        departmentDropdown.innerHTML = '';
        
        if (!val) {
            departmentDropdown.classList.add('hidden');
            return;
        }

        const filtered = facultyList.filter(item => item.includes(val));
        if (filtered.length > 0) {
            filtered.forEach(item => {
                const li = document.createElement('li');
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

    // Autocomplete ค้นหาชนิดของพืช
    plantTypeInput.addEventListener('input', function() {
        const fullText = this.value;
        const terms = fullText.split(',');
        const currentTerm = terms[terms.length - 1].trim();

        plantTypeDropdown.innerHTML = '';

        if (!currentTerm) {
            plantTypeDropdown.classList.add('hidden');
            return;
        }

        const filtered = plantList.filter(item => item.startsWith(currentTerm));
        if (filtered.length > 0) {
            filtered.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                li.addEventListener('click', function() {
                    terms[terms.length - 1] = " " + item;
                    plantTypeInput.value = terms.join(',').trim() + ', ';
                    plantTypeDropdown.classList.add('hidden');
                    plantTypeInput.focus();
                });
                plantTypeDropdown.appendChild(li);
            });
            plantTypeDropdown.classList.remove('hidden');
        } else {
            plantTypeDropdown.classList.add('hidden');
        }
    });

    // ปิด Dropdown เมื่อคลิกที่อื่น
    document.addEventListener('click', function(e) {
        if (e.target !== departmentInput && e.target !== departmentDropdown) {
            departmentDropdown.classList.add('hidden');
        }
        if (e.target !== plantTypeInput && e.target !== plantTypeDropdown) {
            plantTypeDropdown.classList.add('hidden');
        }
    });

    // ส่งข้อมูลเข้า Google Sheet
    form.addEventListener('submit', async (e) => { // อย่าลืมใส่ async
        e.preventDefault();
        
        if (!CONFIG.WEB_APP_URL || CONFIG.WEB_APP_URL === "ใส่_URL_ของ_APPS_SCRIPT_ที่นี่") {
            (window.MUDialog ? MUDialog.alert : window.alert)("กรุณาตั้งค่า WEB_APP_URL ในไฟล์ config.js ก่อนใช้งาน");
            return;
        }

        // จำค่าผู้ส่งเพื่อกรอกครั้งถัดไป ไม่ใช่หลักฐานว่ารายการนี้เข้าชีตแล้ว
        saveCachedData();

        // ปิดปุ่มและเปลี่ยนข้อความระหว่างรอ
        const submitBtn = document.getElementById('submitBtn');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        if (window.UnifiedApi) UnifiedApi.submissionStatus('preparing','กำลังส่งข้อมูล');
        submitBtn.textContent = 'กำลังอัปโหลดข้อมูลและรูปภาพ...';
        try {

        // เก็บเบอร์โทรเป็นข้อความเพื่อรักษาเลขศูนย์นำหน้า ไม่ใช้คำนวณ
        let phoneNumber = document.getElementById('phone').value.trim();
        if (phoneNumber && !phoneNumber.startsWith("'")) {
            phoneNumber = "'" + phoneNumber;
        }

        // รักษาชื่อช่องฟอร์มเดิม ตัว bridge จะแปลงเป็น payload ของ backend รวมและตรวจรูปก่อนเข้าคิว
        const payload = new URLSearchParams();
        payload.append('date', getFullThaiDate(dateInput.value));
        payload.append('provider', document.getElementById('provider').value.trim());
        payload.append('fullName', document.getElementById('fullName').value.trim());
        payload.append('department', document.getElementById('department').value.trim());
        payload.append('licensePlate', document.getElementById('licensePlate').value.trim());
        payload.append('phone', phoneNumber);
        payload.append('activity', document.getElementById('activity').value.trim());
        payload.append('plantCategory', plantCategoryInput.value); 
        payload.append('plantType', document.getElementById('plantType').value.trim());
        payload.append('weight', document.getElementById('weight').value);

        // จัดการไฟล์รูปภาพ
        const fileInput = document.getElementById('plantImage');
        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            payload.append('imageName', file.name);
            payload.append('mimeType', file.type);
            
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });
            payload.append('imageBase64', base64);
        }

        await fetch(CONFIG.WEB_APP_URL, {
            method: 'POST',
            body: payload,
            mode: 'no-cors'
        }).then(() => {
            if (!window.UnifiedApi) popup.classList.remove('hidden');
            if (window.UnifiedApi) popup.click(); // ตัวเชื่อมกลางเก็บข้อมูลและรูปในคิวถาวรแล้วจึงรีเซ็ต
        }).catch(error => {
            console.error('Error:', error);
            if (window.UnifiedApi) UnifiedApi.submissionStatus('blocked',error.message || 'ส่งข้อมูลไม่สำเร็จ ข้อมูลที่กรอกยังอยู่'); else (window.MUDialog ? MUDialog.alert : window.alert)(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }).finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        });
        } catch(error) {
            if (window.UnifiedApi) UnifiedApi.submissionStatus('blocked',error.message || 'อ่านไฟล์แนบไม่ได้ กรุณาเลือกไฟล์ใหม่');
            else (window.MUDialog ? MUDialog.alert : window.alert)(error.message || 'อ่านไฟล์แนบไม่ได้');
            submitBtn.disabled=false; submitBtn.textContent=originalBtnText;
        }
    });

    // ในฟังก์ชัน popup.addEventListener (ปิดหน้าจอสำเร็จ) ให้เพิ่มการล้างค่าไฟล์ด้วย:
    popup.addEventListener('click', function(e) {
        if (e.target === popup || e.target.closest('.popup-content')) {
            popup.classList.add('hidden');
            form.reset(); 
            
            dateInput.valueAsDate = new Date();
            loadCachedData();
            plantCategoryInput.value = ''; 

            const fileInput = document.getElementById('plantImage');
            if (fileInput) fileInput.value = '';
            
            for (const radio of categoryRadios) {
                radio.checked = false;
            }
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
});