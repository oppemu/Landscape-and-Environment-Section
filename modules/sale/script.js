/* จำหน่ายผลผลิต: แยกน้ำหนักหน่วยกิโลกรัมออกจากน้ำหมักหน่วยลิตร; ใช้ร่วมกับตัวเชื่อม API ของแอปรวม ไม่เปิดสคริปต์นี้เดี่ยว */
const RECORDERS_LIST = [
    "นายพรภพ ยาเณร", "นายอภิชาติ มอญสะแก", "นายศิริ โตโสภณ", "นายไตรรงค์ นาคไร่ขิง",
    "นายศุภชัย เนียมสุภาพ", "นายมนตรี นาคไร่ขิง", "นายวันชนะ พลายจันทร์", "นายวิทวัฒน์ กิจคงชีพ",
    "นายอนนท์ ปรางค์แก้ว", "นายสมชาย สุวิมล", "นายธีรพงษ์ การะเกตุ", "นายอนุรักษ์ สีสดใส",
    "นายวีรยุทธ ทัศนดี", "นายกฤษณ ทองศรีเมือง", "นายอำนาจ ศรีสัมพันธ์", "นายสวัสดิ์ อาจมาก",
    "นายเสน่ห์ ทองศรีเมือง", "นายวศิน แสวงสุข", "นายศิริชัย สว่างชม"
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

    const form = document.getElementById('salesForm');
    const successPopup = document.getElementById('successPopup');
    const recorderInput = document.getElementById('recorder');
    const autocompleteList = document.getElementById('autocompleteList');
    
    const totalWeightGroup = document.getElementById('totalWeightGroup');
    const totalWeightInput = document.getElementById('totalWeight');
    const priceInput = document.getElementById('price');

    const buyerTypeInput = document.getElementById('buyerType');
    const buyerTypePopup = document.getElementById('buyerTypePopup');
    const buyerTypeRadios = buyerTypePopup.querySelectorAll('input[type="radio"]');

    const bagSizeInput = document.getElementById('bagSize');
    const bagSizePopup = document.getElementById('bagSizePopup');
    const confirmBagSizeBtn = document.getElementById('confirmBagSizeBtn');
    const bagOptions = bagSizePopup.querySelectorAll('.bag-option');

    // ฟังก์ชันคำนวณน้ำหนักและราคาอัตโนมัติ 
    // รวมราคาและน้ำหนักตามผลิตภัณฑ์ที่รองรับ โดยไม่รวมลิตรเป็นกิโลกรัม
function autoCalculate(source) {
        let totalWeight = 0;
        let totalPrice = 0;
        
        let solidSelected = false;
        let liquidSelected = false;

        bagOptions.forEach(option => {
            const cb = option.querySelector('input[type="checkbox"]');
            const qtyInput = option.querySelector('.bag-qty');
            if (cb.checked) {
                const type = option.getAttribute('data-type');
                
                // เช็คว่าเลือกประเภทไหนบ้าง
                if (type === 'liquid') {
                    liquidSelected = true;
                } else {
                    solidSelected = true;
                }

                let qty = parseFloat(qtyInput.value) || 0;
                
                if (qty > 0) {
                    switch(type) {
                        case 'pellet-unbagged': // เม็ด ไม่บรรจุ (กก.) 
                            totalWeight += qty;
                            totalPrice += (qty * 30);
                            break;
                        case 'pellet-2kg': // เม็ด ถุง 2 กก.
                            totalWeight += (qty * 2);
                            totalPrice += (qty * 60);
                            break;
                        case 'powder-unbagged': // ผง ไม่บรรจุ (กก.)
                            totalWeight += qty;
                            totalPrice += (qty * 7);
                            break;
                        case 'powder-bagged-weighed': // ผง บรรจุถุงชั่งน้ำหนัก (กก.)
                            totalWeight += qty;
                            totalPrice += (qty * 8);
                            break;
                        case 'powder-small': // ผง ถุงเล็ก (คำนวณเป็น 4 กก.)
                            totalWeight += (qty * 4);
                            totalPrice += (qty * 32);
                            break;
                        case 'powder-large': // ผง ถุงใหญ่ (คำนวณเป็น 10 กก.)
                            totalWeight += (qty * 10);
                            totalPrice += (qty * 80);
                            break;
                        case 'liquid': // น้ำหมัก (ลิตร) - ไม่รวมในน้ำหนัก กก.
                            totalPrice += (qty * 5);
                            break;
                    }
                }
            }
        });

        if (source === 'popup') {
            totalWeightInput.value = totalWeight > 0 ? totalWeight.toFixed(2) : '';
            priceInput.value = totalPrice > 0 ? totalPrice.toFixed(2) : '';
        }

        // ลอจิกซ่อน/แสดง ฟิลด์น้ำหนักรวม
        // ถ้าน้ำหมักถูกเลือก และไม่มีของแข็งถูกเลือกเลย ให้ซ่อนฟิลด์น้ำหนัก
        if (liquidSelected && !solidSelected) {
            totalWeightGroup.style.display = 'none';
            totalWeightInput.required = false;
            totalWeightInput.value = ''; // เคลียร์ค่าออก
        } else {
            // กรณีอื่นๆ (รวมถึงยังไม่เลือกอะไรเลย) ให้แสดงปกติ
            totalWeightGroup.style.display = 'block';
            totalWeightInput.required = false;
        }
    }

    // กรณีผู้ใช้แก้ไขน้ำหนักเอง จะไม่คำนวณราคาใหม่ทับ
    totalWeightInput.addEventListener('input', () => autoCalculate('manual'));

    // Autocomplete ผู้บันทึกข้อมูล
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

    // ประเภทผู้ซื้อ
    buyerTypeInput.addEventListener('click', () => {
        buyerTypePopup.classList.remove('hidden');
    });

    buyerTypePopup.addEventListener('click', (e) => {
        if (e.target === buyerTypePopup) {
            buyerTypePopup.classList.add('hidden');
        }
    });

    const buyerTypeCards = buyerTypePopup.querySelectorAll('.option-card');
    buyerTypeCards.forEach(card => {
        const radio = card.querySelector('input[type="radio"]');
        if (radio) {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const val = card.getAttribute('data-value');
                radio.checked = true;
                buyerTypeInput.value = val;
                setTimeout(() => {
                    buyerTypePopup.classList.add('hidden');
                }, 150);
            });
        }
    });

    // สินค้าและขนาดถุง
    bagSizeInput.addEventListener('click', () => {
        bagSizePopup.classList.remove('hidden');
    });

    bagSizePopup.addEventListener('click', (e) => {
        if (e.target === bagSizePopup) {
            bagSizePopup.classList.add('hidden');
        }
    });

    bagOptions.forEach(option => {
        const checkbox = option.querySelector('input[type="checkbox"]');
        const qtyInput = option.querySelector('.bag-qty');

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                qtyInput.classList.remove('hidden');
                qtyInput.focus();
            } else {
                qtyInput.classList.add('hidden');
                qtyInput.value = '';
                autoCalculate('popup'); 
            }
        });

        // เมื่อพิมพ์ตัวเลข ให้คำนวณและแสดงผลทันที
        qtyInput.addEventListener('input', () => autoCalculate('popup'));
    });

    // ยืนยันการเลือกสินค้าและสร้างข้อความ
    confirmBagSizeBtn.addEventListener('click', () => {
        const selectedSizes = [];
        bagOptions.forEach(option => {
            const cb = option.querySelector('input[type="checkbox"]');
            const qty = option.querySelector('.bag-qty');
            
            if (cb.checked) {
                let text = cb.value;
                if (qty.value && parseFloat(qty.value) > 0) {
                    const type = option.getAttribute('data-type');
                    const unit = (type.includes('2kg') || type === 'powder-small' || type === 'powder-large') ? 'ถุง' : (type === 'liquid' ? 'ลิตร' : 'กก.');
                    text += ` (${qty.value} ${unit})`; 
                }
                selectedSizes.push(text);
            }
        });
        bagSizeInput.value = selectedSizes.join(', ');
        bagSizePopup.classList.add('hidden');
        autoCalculate('popup');
    });

    // ดึงชื่อผู้บันทึกล่าสุด
    if (localStorage.getItem('cached_sales_recorder')) {
        recorderInput.value = localStorage.getItem('cached_sales_recorder');
    }

    // Submit ฟอร์ม
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!CONFIG.WEB_APP_URL || CONFIG.WEB_APP_URL === "ใส่_URL_ของ_APPS_SCRIPT_ที่นี่") {
            (window.MUDialog ? MUDialog.alert : window.alert)("กรุณาตั้งค่า WEB_APP_URL ในไฟล์ config.js ก่อนใช้งาน");
            return;
        }



        const submitBtn = document.getElementById('submitBtn');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        if (window.UnifiedApi) UnifiedApi.submissionStatus('preparing','กำลังส่งข้อมูล');
        submitBtn.textContent = 'กำลังอัปโหลดข้อมูลและรูปภาพ...';
        try {

        localStorage.setItem('cached_sales_recorder', recorderInput.value.trim());

        // bagSize เก็บรายละเอียดสินค้าแต่ละชนิด; totalWeight เป็นน้ำหนักรวมที่ผู้กรอกตรวจได้ ไม่ใช่จำนวนถุงทุกชนิด
        const payload = new URLSearchParams();
        payload.append('date', getFullThaiDate(dateInput.value));
        payload.append('buyerName', document.getElementById('buyerName').value.trim());
        payload.append('buyerType', buyerTypeInput.value);
        payload.append('fertilizerType', ""); // ส่งค่าว่างไปเผื่อ Google Sheet ยังต้องการ Column นี้
        payload.append('bagSize', bagSizeInput.value); 
        payload.append('totalWeight', totalWeightInput.value);
        // ส่งยอดหัวรายการเพียงครั้งเดียว ฝั่งเซิร์ฟเวอร์ตรวจเทียบผลรวมราคาย่อยก่อนบันทึก
        payload.append('price', priceInput.value);
        payload.append('recorder', recorderInput.value.trim());

        // จัดการไฟล์รูปภาพ
        // ภาพหลักฐานเป็นของทั้งรายการขาย ไม่ทำสำเนารูปซ้ำต่อสินค้าแต่ละชนิด
        const fileInput = document.getElementById('receiptImage');
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
            if (!window.UnifiedApi) successPopup.classList.remove('hidden');
            if (window.UnifiedApi) successPopup.click(); // ตัวเชื่อมกลางเก็บข้อมูลและรูปในคิวถาวรแล้วจึงรีเซ็ต
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

    // รีเซ็ตหลังบันทึก
    successPopup.addEventListener('click', function(e) {
        if (e.target === successPopup || e.target.closest('.popup-content')) {
            successPopup.classList.add('hidden');
            form.reset();
            
            buyerTypeRadios.forEach(r => r.checked = false);
            buyerTypeInput.value = '';
            
            bagOptions.forEach(option => {
                const cb = option.querySelector('input[type="checkbox"]');
                const qty = option.querySelector('.bag-qty');
                cb.checked = false;
                qty.value = '';
                qty.classList.add('hidden');
            });
            bagSizeInput.value = '';
            
            const fileInput = document.getElementById('receiptImage');
            if (fileInput) fileInput.value = '';
            
            autocompleteList.classList.add('hidden');
            dateInput.valueAsDate = new Date();
            
            // รีเซ็ตฟิลด์น้ำหนักให้กลับมาแสดง
            totalWeightGroup.style.display = 'block';
            totalWeightInput.required = false;

            if (localStorage.getItem('cached_sales_recorder')) {
                recorderInput.value = localStorage.getItem('cached_sales_recorder');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
});