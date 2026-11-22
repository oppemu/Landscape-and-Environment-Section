/* ตรวจคุณภาพฮิวมัส: ค่าตรวจ ผลผ่าน/ไม่ผ่านและภาพ; ใช้ร่วมกับตัวเชื่อม API ของแอปรวม ไม่เปิดสคริปต์นี้เดี่ยว */
const RECORDERS_LIST = [
    "นายพรภพ ยาเณร",
    "นายอภิชาติ มอญสะแก",
    "นายศิริ โตโสภณ",
    "นายไตรรงค์ นาคไร่ขิง",
    "นายศุภชัย เนียมสุภาพ",
    "นายมนตรี นาคไร่ขิง",
    "นายวันชนะ พลายจันทร์",
    "นายวิทวัฒน์ กิจคงชีพ",
    "นายอนนท์ ปรางค์แก้ว",
    "นายสมชาย สุวิมล",
    "นายธีรพงษ์ การะเกตุ",
    "นายอนุรักษ์ สีสดใส",
    "นายวีรยุทธ ทัศนดี",
    "นายกฤษณ ทองศรีเมือง",
    "นายอำนาจ ศรีสัมพันธ์",
    "นายสวัสดิ์ อาจมาก",
    "นายเสน่ห์ ทองศรีเมือง",
    "นายวศิน แสวงสุข",
    "นายศิริชัย สว่างชม"
];

// จัดวันที่เลือกเป็นข้อความไทยสำหรับรายงาน
function getFullThaiDate(dateString) {
    if (!dateString) return "";
    const dateObj = new Date(dateString);
    const days = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
    const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    
    return `${days[dateObj.getDay()]} ที่ ${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear() + 543}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('date');
    dateInput.valueAsDate = new Date();

    const form = document.getElementById('humusForm');
    const popup = document.getElementById('successPopup');
    const recorderInput = document.getElementById('recorder');
    const autocompleteList = document.getElementById('autocompleteList');

    if (localStorage.getItem('cached_humus_recorder')) {
        recorderInput.value = localStorage.getItem('cached_humus_recorder');
    }

    // --- ระบบ Autocomplete ค้นหาผู้บันทึกข้อมูล ---
    recorderInput.addEventListener('input', function() {
        const query = this.value.trim();
        autocompleteList.innerHTML = '';

        if (!query) {
            autocompleteList.classList.add('hidden');
            return;
        }

        const matches = RECORDERS_LIST.filter(name => {
            const nameWithoutPrefix = name.replace(/^นาย/, '');
            return name.startsWith(query) || nameWithoutPrefix.startsWith(query);
        });

        if (matches.length > 0) {
            matches.forEach(name => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.textContent = name;
                
                item.addEventListener('click', () => {
                    recorderInput.value = name;
                    autocompleteList.classList.add('hidden');
                });
                
                autocompleteList.appendChild(item);
            });
            autocompleteList.classList.remove('hidden');
        } else {
            autocompleteList.classList.add('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (!recorderInput.contains(e.target) && !autocompleteList.contains(e.target)) {
            autocompleteList.classList.add('hidden');
        }
    });

    // --- ระบบเลือกปุ่ม ผ่าน / ไม่ผ่าน ---
    const qcBtnGroups = document.querySelectorAll('.qc-btn-group');
    qcBtnGroups.forEach(group => {
        const targetId = group.getAttribute('data-target');
        const hiddenInput = document.getElementById(targetId);
        const buttons = group.querySelectorAll('.qc-btn');

        buttons.forEach(btn => {
            btn.setAttribute('aria-pressed', String(!!hiddenInput && hiddenInput.value === btn.getAttribute('data-value')));
            btn.addEventListener('click', () => {
                // ค่าที่เลือกและสีต้องตรงกันเสมอ รวมถึงการใช้แป้นพิมพ์
                if (!hiddenInput || btn.disabled) return;
                buttons.forEach(b => {
                    const selected = b === btn;
                    b.classList.toggle('active', selected);
                    b.setAttribute('aria-pressed', String(selected));
                });
                hiddenInput.value = btn.getAttribute('data-value');
                hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
                hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });
    });

    // --- ส่งข้อมูลฟอร์ม ---
    // ค่าคุณภาพและรูปส่งเป็นรายการเดียว ไม่ยืนยันสำเร็จเมื่ออ่านไฟล์ได้อย่างเดียว
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const checks = {
            sizeCheck: document.getElementById('sizeCheck').value,
            stoneCheck: document.getElementById('stoneCheck').value,
            foreignCheck: document.getElementById('foreignCheck').value,
            phLevel: document.getElementById('phLevel').value,
            moistureCheck: document.getElementById('moistureCheck').value,
            odorCheck: document.getElementById('odorCheck').value
        };


        if (!CONFIG.WEB_APP_URL || CONFIG.WEB_APP_URL === "ใส่_URL_ของ_APPS_SCRIPT_ที่นี่") {
            (window.MUDialog ? MUDialog.alert : window.alert)("กรุณาตั้งค่า WEB_APP_URL ในไฟล์ config_2.js ก่อนใช้งาน");
            return;
        }

        localStorage.setItem('cached_humus_recorder', recorderInput.value.trim());

        const payload = new URLSearchParams();
        payload.append('date', getFullThaiDate(dateInput.value));
        payload.append('sizeCheck', checks.sizeCheck);
        payload.append('stoneCheck', checks.stoneCheck);
        payload.append('foreignCheck', checks.foreignCheck);
        payload.append('phLevel', checks.phLevel);
        payload.append('moistureCheck', checks.moistureCheck);
        payload.append('odorCheck', checks.odorCheck);
        payload.append('volume', document.getElementById('volume').value);
        payload.append('recorder', recorderInput.value.trim());

        const button=form.querySelector('button[type="submit"],button:not([type])');
        if(button && button.disabled) return;
        if(button) button.disabled=true;
        if (window.UnifiedApi) UnifiedApi.submissionStatus('preparing','กำลังส่งข้อมูล');
        try {
          const photo=document.getElementById('qualityPhoto').files.length?await HubFormPhoto.read(document.getElementById('qualityPhoto').files[0]):null;
          // ส่งทั้งชื่อ ชนิด และ bytes จริง ไม่ใช้ชื่อไฟล์แทนหลักฐานภาพ
          if(photo){payload.append('imageName',photo.name);payload.append('mimeType',photo.mimeType);payload.append('imageBase64',photo.base64);}
          await fetch(CONFIG.WEB_APP_URL, {
            method: 'POST',
            body: payload,
            mode: 'no-cors'
        }); if (!window.UnifiedApi) popup.classList.remove('hidden');
            if (window.UnifiedApi) popup.click(); // ตัวเชื่อมกลางเก็บข้อมูลและรูปในคิวถาวรแล้วจึงรีเซ็ต
        } catch(error) { if (window.UnifiedApi) UnifiedApi.submissionStatus('blocked',error.message || 'ส่งข้อมูลไม่สำเร็จ ข้อมูลที่กรอกยังอยู่'); else (window.MUDialog ? MUDialog.alert : window.alert)(error.message || 'บันทึกไม่สำเร็จ'); }
        finally { if(button) button.disabled=false; }
    });

    popup.addEventListener('click', function(e) {
        if (e.target === popup || e.target.closest('.popup-content')) {
            popup.classList.add('hidden');
            form.reset();
            
            document.querySelectorAll('.qc-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
            document.getElementById('sizeCheck').value = '';
            document.getElementById('stoneCheck').value = '';
            document.getElementById('foreignCheck').value = '';
            document.getElementById('phLevel').value = '';
            document.getElementById('moistureCheck').value = '';
            document.getElementById('odorCheck').value = '';
            autocompleteList.classList.add('hidden');

            dateInput.valueAsDate = new Date();
            if (localStorage.getItem('cached_humus_recorder')) {
                recorderInput.value = localStorage.getItem('cached_humus_recorder');
            }
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
});