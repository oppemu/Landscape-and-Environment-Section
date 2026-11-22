/* ผลิตฮิวมัส: เลือกผลผลิต วัตถุดิบ ส่วนผสมและรูป; ใช้ร่วมกับตัวเชื่อม API ของแอปรวม ไม่เปิดสคริปต์นี้เดี่ยว */
document.addEventListener('DOMContentLoaded', function() {
    // 1. ตั้งค่าวันที่เริ่มต้นเป็นวันปัจจุบัน
    const dateInput = document.getElementById('date');
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    if (dateInput) {
        dateInput.value = todayString;
    }

    // 2. จัดการ Popup ประเภทผลิตภัณฑ์
    const productTypeInput = document.getElementById('productType');
    const productPopup = document.getElementById('productPopup');
    
    productTypeInput.addEventListener('click', function() {
        productPopup.classList.remove('hidden');
    });

    const productSelects = document.querySelectorAll('input[name="productSelect"]');
    productSelects.forEach(radio => {
        radio.addEventListener('change', function() {
            productTypeInput.value = this.value;
            productPopup.classList.add('hidden');
            updateFormByProduct(this.value);
        });
    });

    // 3. ฟังก์ชันปรับฟอร์มตามประเภทผลิตภัณฑ์ที่เลือก
    function updateFormByProduct(selectedValue) {
        const unitSelect = document.getElementById('unit');
        const rawMaterialInput = document.getElementById('rawMaterial');
        const rawMaterialAmount = document.getElementById('rawMaterialAmount');
        const ingredientName = document.getElementById('ingredientName');
        const ingredientAmount = document.getElementById('ingredientAmount');

        const rmBranch = document.getElementById('rm-branch');
        const rmLeaf = document.getElementById('rm-leaf');
        const rmGrass = document.getElementById('rm-grass');
        const rmFoodWaste = document.getElementById('rm-foodwaste');
        const rmFruitPeel = document.getElementById('rm-fruitpeel'); // เพิ่มตัวแปรเปลือกผลไม้

        // รีเซ็ตการเลือกวัตถุดิบและล้างค่าเดิมก่อน
        document.querySelectorAll('input[name="rawMaterialSelect"]').forEach(cb => {
            cb.checked = false;
            cb.closest('.rm-multi-option').classList.remove('selected');
        });
        rawMaterialInput.value = '';
        rawMaterialAmount.value = '';
        
        // รีเซ็ตหน่วยของส่วนผสมกลับเป็น (กก.) เป็นค่าเริ่มต้น
        ingredientAmount.placeholder = "ระบุจำนวน (กก.)"; 

        if (selectedValue === "ฮิวมัส") {
            unitSelect.value = "กิโลกรัม";
            rmFoodWaste.style.display = 'none'; 
            if(rmFruitPeel) rmFruitPeel.style.display = 'none';
            rmBranch.style.display = 'flex';
            rmLeaf.style.display = 'flex';
            rmGrass.style.display = 'flex';
            
            ingredientName.value = "ขี้วัวแห้ง";
            ingredientAmount.required = false;
            ingredientAmount.disabled = false;
            ingredientAmount.value = "";

        } else if (selectedValue === "ปุ๋ยเศษอาหาร") {
            unitSelect.value = "กิโลกรัม";
            rmBranch.style.display = 'none';
            rmLeaf.style.display = 'none';
            rmGrass.style.display = 'none';
            if(rmFruitPeel) rmFruitPeel.style.display = 'none';
            rmFoodWaste.style.display = 'flex';

            rawMaterialInput.value = "เศษอาหาร";
            ingredientName.value = "ขุยมะพร้าว"; 
            ingredientAmount.required = false;
            ingredientAmount.disabled = false;
            ingredientAmount.value = "";

            const fwCheckbox = rmFoodWaste.querySelector('input[type="checkbox"]');
            fwCheckbox.checked = true;
            fwCheckbox.dispatchEvent(new Event('change'));

        } else if (selectedValue === "น้ำหมักชีวภาพ") {
            unitSelect.value = "ลิตร";
            
            // ซ่อนวัตถุดิบอื่น และแสดงเฉพาะเปลือกผลไม้
            rmBranch.style.display = 'none';
            rmLeaf.style.display = 'none';
            rmGrass.style.display = 'none';
            rmFoodWaste.style.display = 'none';
            if(rmFruitPeel) rmFruitPeel.style.display = 'flex';

            // ตั้งค่าวัดถุดิบหลักและส่วนผสมอัตโนมัติ
            rawMaterialInput.value = "เปลือกผลไม้";
            ingredientName.value = "กากน้ำตาล"; 
            ingredientAmount.required = false;
            ingredientAmount.disabled = false;
            ingredientAmount.value = "";
            ingredientAmount.placeholder = "ระบุจำนวน (ลิตร)"; // เปลี่ยน placeholder เป็นลิตร

            // ติ๊กเลือกเปลือกผลไม้ใน Popup ล่วงหน้า
            if(rmFruitPeel) {
                const fpCheckbox = rmFruitPeel.querySelector('input[type="checkbox"]');
                fpCheckbox.checked = true;
                fpCheckbox.dispatchEvent(new Event('change'));
            }
        }
    }

    // 4. จัดการ Popup วัตถุดิบหลัก
    const rawMaterialInput = document.getElementById('rawMaterial');
    const rawMaterialPopup = document.getElementById('rawMaterialPopup');
    
    rawMaterialInput.addEventListener('click', function() {
        if (!productTypeInput.value) {
            (window.MUDialog ? MUDialog.alert : window.alert)('กรุณาเลือกประเภทผลิตภัณฑ์ก่อน');
            return;
        }
        rawMaterialPopup.classList.remove('hidden');
    });

    document.querySelectorAll('.rm-multi-option').forEach(option => {
        const checkbox = option.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    });

    const confirmRawMaterialBtn = document.getElementById('confirmRawMaterialBtn');
    if (confirmRawMaterialBtn) {
        confirmRawMaterialBtn.addEventListener('click', function() {
            const selectedOptions = document.querySelectorAll('input[name="rawMaterialSelect"]:checked');
            if (selectedOptions.length === 0) {
                (window.MUDialog ? MUDialog.alert : window.alert)('กรุณาเลือกวัตถุดิบอย่างน้อย 1 รายการ');
                return;
            }

            let selectedTexts = [];
            selectedOptions.forEach(checkbox => {
                selectedTexts.push(checkbox.value); 
            });

            rawMaterialInput.value = selectedTexts.join(', ');
            rawMaterialPopup.classList.add('hidden');
        });
    }

    // 5. ปิด Popup เมื่อคลิกพื้นที่ว่าง
    document.querySelectorAll('.popup-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.add('hidden');
            }
        });
    });

    // 6. จัดการชื่อไฟล์อัปโหลด
    const productImage = document.getElementById('productImage');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    // ใช้ปุ่มจริงเพื่อเปิดตัวเลือกไฟล์ด้วยเมาส์ Enter หรือ Space; ไม่ล้างไฟล์เดิมเมื่อผู้ใช้ยกเลิก
    document.getElementById('chooseProductImage').addEventListener('click', function () { productImage.click(); });
    
    productImage.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            fileNameDisplay.textContent = this.files[0].name;
            fileNameDisplay.style.color = '#1e5631';
            fileNameDisplay.style.fontWeight = '600';
        } else {
            fileNameDisplay.textContent = 'ยังไม่ได้เลือกไฟล์';
            fileNameDisplay.style.color = '#888';
            fileNameDisplay.style.fontWeight = 'normal';
        }
    });

    // 7. จัดการ Submit Form (ยิงไป Google Apps Script)
    const productionForm = document.getElementById('productionForm');
    const successPopup = document.getElementById('successPopup');

    // อ่านรูปเป็น Data URL แบบ async ยังไม่ใช่การอัปโหลดจนกว่าส่งคำขอ
// อ่านไฟล์ในเครื่องยังไม่ถือว่าบันทึก Drive; bridge จะตรวจชนิด/ลายเซ็นรูปก่อนฝากข้อมูล
function getBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
    
    // ล็อกปุ่มระหว่างรอผล ข้อมูลฟอร์มยังอยู่จนได้รับคำยืนยันจากช่องส่งกลาง
    productionForm.addEventListener('submit', async function(e) {
        e.preventDefault(); 
        
        const submitBtn = productionForm.querySelector('.btn-submit');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'กำลังบันทึกข้อมูล...';
        submitBtn.disabled = true;
        if (window.UnifiedApi) UnifiedApi.submissionStatus('preparing','กำลังส่งข้อมูล');

        try {
            const formData = new FormData();
            // ตัวอย่างส่วนที่ใช้ดึงข้อมูลใน script.js ก่อนส่งเข้า Google Script
formData.append('date', document.getElementById('date').value);
formData.append('operatorName', document.getElementById('operatorName').value);
formData.append('productType', document.getElementById('productType').value);
formData.append('unit', document.getElementById('unit').value);
formData.append('rawMaterial', document.getElementById('rawMaterial').value);
formData.append('rawMaterialAmount', document.getElementById('rawMaterialAmount').value); // เพิ่ม
formData.append('ingredientName', document.getElementById('ingredientName').value); // เพิ่ม
formData.append('ingredientAmount', document.getElementById('ingredientAmount').value); // เพิ่ม
// ... (ส่วนของรูปภาพตามเดิม) ...

            const fileInput = document.getElementById('productImage');
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const base64Str = await getBase64(file);
                const base64Data = base64Str.split(',')[1];
                formData.append('imageBase64', base64Data);
                formData.append('imageName', file.name);
                formData.append('mimeType', file.type);
            }

            await fetch(CONFIG.WEB_APP_URL, {
                method: 'POST',
                body: formData,
                mode: 'no-cors'
            });

            if (!window.UnifiedApi) successPopup.classList.remove('hidden');
            
            setTimeout(() => {
                successPopup.classList.add('hidden');
                
                productionForm.reset();
                document.getElementById('date').value = todayString; 
                
                fileNameDisplay.textContent = 'ยังไม่ได้เลือกไฟล์';
                fileNameDisplay.style.color = '#888';
                fileNameDisplay.style.fontWeight = 'normal';
                
                document.querySelectorAll('input[name="rawMaterialSelect"]').forEach(cb => {
                    cb.checked = false;
                    cb.closest('.rm-multi-option').classList.remove('selected');
                });
                document.getElementById('rawMaterialAmount').value = '';
                
            }, window.UnifiedApi ? 0 : 2000);

        } catch (error) {
            console.error('Error:', error);
            if (window.UnifiedApi) UnifiedApi.submissionStatus('blocked',error.message || 'ส่งข้อมูลไม่สำเร็จ ข้อมูลที่กรอกยังอยู่'); else (window.MUDialog ? MUDialog.alert : window.alert)('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // 8. ระบบ Autocomplete ชื่อผู้ปฏิบัติงาน
    // ผูกคำแนะนำชื่อกับช่องและรายการที่ระบุ
function setupAutocomplete(inputId, listId, dataArray) {
        const input = document.getElementById(inputId);
        const list = document.getElementById(listId);
        
        if(!input || !list) return;

        input.addEventListener('input', function() {
            const val = this.value;
            list.innerHTML = '';
            
            if (!val) {
                list.classList.add('hidden');
                return;
            }
            
            let hasMatches = false;
            dataArray.forEach(item => {
                if (item.toLowerCase().includes(val.toLowerCase())) {
                    hasMatches = true;
                    const div = document.createElement('div');
                    div.classList.add('autocomplete-item');
                    
                    const regex = new RegExp(`(${val})`, "gi");
                    div.innerHTML = item.replace(regex, "<strong style='color:#1e5631;'>$1</strong>");
                    
                    div.addEventListener('click', function() {
                        input.value = item;
                        list.innerHTML = '';
                        list.classList.add('hidden');
                    });
                    list.appendChild(div);
                }
            });
            
            if (hasMatches) {
                list.classList.remove('hidden');
            } else {
                list.classList.add('hidden');
            }
        });

        document.addEventListener('click', function(e) {
            if (e.target !== input && e.target !== list) {
                list.classList.add('hidden');
            }
        });
    }

    const operatorsData = [
        "นายพรภพ ยาเณร", "นายอภิชาติ มอญสะแก", "นายศิริ โตโสภณ", 
        "นายไตรรงค์ นาคไร่ขิง", "นายศุภชัย เนียมสุภาพ", "นายมนตรี นาคไร่ขิง", 
        "นายวันชนะ พลายจันทร์", "นายวิทวัฒน์ กิจคงชีพ", "นายอนนท์ ปรางค์แก้ว", 
        "นายสมชาย สุวิมล", "นายธีรพงษ์ การะเกตุ", "นายอนุรักษ์ สีสดใส", 
        "นายวีรยุทธ ทัศนดี", "นายกฤษณ ทองศรีเมือง", "นายอำนาจ ศรีสัมพันธ์", 
        "นายสวัสดิ์ อาจมาก", "นายเสน่ห์ ทองศรีเมือง", "นายวศิน แสวงสุข", 
        "นายศิริชัย สว่างชม"
    ];

    setupAutocomplete('operatorName', 'autocomplete-list', operatorsData);
});