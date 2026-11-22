(function (root) { // ห่อโมดูลรายงานและรับ window หรือ globalThis เป็น root
  'use strict'; // เปิดการตรวจจาวาสคริปต์แบบเคร่งครัด
  function createImportGuard() { // สร้างตัวนับรุ่นเพื่อกันไฟล์ที่อ่านค้างกลับมาเติมหลังเปลี่ยนผู้กรอก
    let generation = 0; // เริ่มตัวนับรุ่นนำเข้าที่ศูนย์
    return { // คืนชุดฟังก์ชันอ่าน ตรวจ และเปลี่ยนรุ่นนำเข้า
      capture: () => generation, // จำหมายเลขรุ่นก่อนเริ่มอ่านไฟล์
      current: (value) => value === generation, // ตรวจว่าผลอ่านไฟล์ยังเป็นรุ่นปัจจุบัน
      reset: () => generation++, // เพิ่มรุ่นเพื่อทำให้ผลอ่านไฟล์เดิมหมดสิทธิ์ใช้งาน
    }; // จบชุดฟังก์ชันตัวกันการนำเข้าเก่า
  } // จบ createImportGuard
  function thaiDate(value, type = 'day') { // แปลงค่าปี เดือน หรือวันเป็นข้อความไทยด้วยปีพุทธศักราช
    const suffix = type === 'year' ? '-01-01' : type === 'month' ? '-01' : ''; // เติมวันแรกของปีหรือเดือนเพื่อสร้างวันที่ที่ Intl อ่านได้
    const options = // เลือกส่วนวันเดือนปีที่จะแสดงตามชนิดรายงาน
      type === 'year' // ตรวจว่าเป็นรายงานรายปี
        ? { year: 'numeric' } // รายปีแสดงเฉพาะปีพุทธศักราช
        : type === 'month' // ถ้าไม่ใช่ปี ให้ตรวจว่าเป็นรายเดือน
          ? { month: 'long', year: 'numeric' } // รายเดือนแสดงชื่อเดือนเต็มกับปี
          : { day: 'numeric', month: 'long', year: 'numeric' }; // รายวันแสดงวันที่ ชื่อเดือนเต็ม และปี
    return new Intl.DateTimeFormat('th-TH', { // สร้างตัวจัดรูปวันที่ภาษาไทย
      ...options, // ใช้รูปแบบรายวัน รายเดือน หรือรายปีที่เลือกข้างต้น
      timeZone: 'Asia/Bangkok', // ตรึงการแสดงวันที่ไว้ที่เขตเวลาไทย
    }).format(new Date(value + suffix + 'T12:00:00+07:00')); // ใช้เที่ยงวันเวลาไทยเพื่อไม่ให้การแปลงเขตเวลาขยับวันที่
  } // จบ thaiDate
  function thaiSourceDate(value) {
    if(!value)return 'ไม่ระบุ';
    const parts=(root.ReportEngine || (typeof require==='function' ? require('../report.js') : null))?.dateParts(value);
    if(!parts)return 'ไม่ระบุ';
    return thaiDate(parts.dayKey);
  }
  function periodLabel(period) { // สร้างข้อความนำหน้าช่วงรายงานสำหรับช่องเรื่องและขอบเขตข้อมูล
    return ( // คืนข้อความช่วงรายงานที่ประกอบเสร็จ
      { day: 'ประจำวันที่ ', month: 'ประจำเดือน ', year: 'ประจำปี ' }[ // กำหนดคำนำหน้ารายวัน รายเดือน และรายปี
        period.type // เลือกคำนำหน้าตาม period.type
      ] + thaiDate(period.value, period.type) // ต่อคำนำหน้ากับวันที่ไทยจาก period.value
    ); // จบการต่อข้อความช่วงรายงาน
  } // จบ periodLabel
function previousMonth(now=new Date()){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',calendar:'gregory',numberingSystem:'latn',year:'numeric',month:'2-digit'}).formatToParts(now);let y=Number(parts.find(p=>p.type==='year').value),m=Number(parts.find(p=>p.type==='month').value)-1;if(m===0){m=12;y--;}return y+'-'+String(m).padStart(2,'0');}
  // เก็บปีเป็นค่าจริง ไม่ใช่เพียง placeholder และกู้คืนปีหากเบราว์เซอร์รีเซ็ตช่องว่าง
  function ensureReportYear(field, monthValue) {
    if (!field.value && /^\d{4}-\d{2}$/.test(monthValue)) field.value = String(Number(monthValue.slice(0,4)) + 543);
    return Number(field.value) - 543;
  }
  function create() { // สร้างตัวควบคุมหน้ารายงานหนึ่งชุดพร้อมสถานะนำเข้า
    const $ = (id) => document.getElementById(id); // ย่อการค้นหา DOM ด้วย id เพื่อใช้กับช่องและตารางรายงาน
    const reportTemplate=$('report-page')?.innerHTML;
    const simpleMonthly = Boolean($('report-month-choice')); // หน้าจริงมีเพียงเดือน ปี และ PDF
    let entered=false;let periodChosen = true; // เลือกเดือนก่อนอ่านข้อมูล ไม่โหลดเครือข่ายเพียงเพราะเปิดหน้า
    let liveReady = false; // ห้ามพิมพ์ข้อมูลเก่าหรือชุดตัวอย่างแทนการอ่านชีตสำเร็จ
    const DEFAULT_RECIPIENT = 'ผู้อำนวยการกองกายภาพและสิ่งแวดล้อม'; // ผู้รับเริ่มต้นที่ผู้ใช้ระบุ ต้องคืนค่านี้เมื่อเปลี่ยนผู้กรอก
    const guard = createImportGuard(); // ให้ตัวควบคุมนี้มีตัวกันไฟล์ค้างของตนเอง
    let sessionGeneration = 0; // แยกรุ่นผู้กรอกออกจากรุ่นไฟล์ เพื่อยกเลิกการพิมพ์หลังล้างรายงาน
    let liveLoading = false; // ใช้ร่วมกับ printing เพื่อไม่เปิดพิมพ์ระหว่างอ่านชีต
    const wasteDraftKey=()=>{const p=selectedPeriod();return 'waste:'+p.type+':'+p.value;};
    const hasDraft=()=>simpleMonthly&&Boolean(root.HubReportEdit?.hasNumeric(wasteDraftKey()));
    let printing = false; // กันกดพิมพ์ซ้ำระหว่างรอโหลดฟอนต์จริง
    let input = { datasets: {} }; // เริ่มต้นว่างก่อนอ่านสำเนาจริงที่แนบมา (ถ้ามี)
    let snapshot = null, snapshotError = ''; // ไม่ให้สำเนาที่เสียหายทำให้ทั้งแอพหยุด
    try { if (!simpleMonthly && root.HubReportSnapshotData && root.HubReportSnapshot) snapshot = root.HubReportSnapshot.create(root.HubReportSnapshotData); }
    catch (error) { snapshotError = 'อ่านสำเนาชีตไม่ได้: ' + error.message; }
    let snapshotActive = Boolean(snapshot); // การนำเข้า รีเซ็ต หรือใช้ข้อมูลสดจะยกเลิกสำเนานี้
    const statuses = { // แปลงสถานะจากเครื่องคำนวณเป็นคำอธิบายในคอลัมน์ความครอบคลุม
      unconfigured: 'ยังไม่กำหนดแหล่ง', // ระบุว่ายังไม่ได้กำหนดแหล่งข้อมูล
      missing: 'ไม่มีชุดข้อมูล', // ระบุว่าไม่มีชุดข้อมูล ห้ามตีความเป็นศูนย์
      'not-loaded': 'ขอบเขตข้อมูลไม่ครบ / ยังไม่โหลด', // ระบุว่ายังโหลดไม่ครบตามช่วงเวลาที่เลือก
      'schema-error': 'หัวคอลัมน์ไม่ตรง', // ระบุว่าหัวคอลัมน์ไม่ตรงสัญญาข้อมูล
      empty: 'ชุดข้อมูลว่าง', // ระบุว่าชุดข้อมูลว่าง ไม่ใช่ค่าศูนย์ที่วัดได้
      'no-records': 'ไม่พบรายการในช่วงนี้', // ระบุว่าไม่พบรายการในช่วงเวลา
      unresolved: 'รอยืนยันรหัสการแจ้ง / ยังสรุปยอดไม่ได้',
      partial: 'ข้อมูลบางส่วน', // ระบุว่ามีข้อมูลใช้ได้เพียงบางส่วน
      'monthly-only': 'มีเฉพาะยอดรายเดือน ไม่สามารถแจกแจงรายวัน',
      unavailable: 'ต้นทางไม่มีข้อมูลรายการนี้',
      incomplete: 'ชุดนำเข้าหรือข้อมูลช่วงนี้ยังไม่ครบ',
      ok: 'อ่านข้อมูลได้', // ระบุว่ารายการอ่านได้ตามโครงสร้าง
    }; // จบพจนานุกรมข้อความสถานะ
    function selectedPeriod() { // อ่านชนิดและค่าช่วงรายงานจากช่องที่กำลังเลือก
      if (simpleMonthly) return {type:'month',value:$('month').value};
      const type = $('period-type').value; // อ่าน day, month หรือ year จากช่อง period-type
      return { // คืนวัตถุ period ที่เครื่องคำนวณรองรับ
        type, // ส่งชนิดช่วงเวลาโดยไม่เปลี่ยนค่า
        value: $( // เลือก id ของช่องที่จะอ่านค่า period.value
          type === 'month' // ตรวจกรณีรายเดือน
            ? 'month' // รายเดือนอ่านช่อง month ซึ่งคงชื่อเดิมไว้
            : type === 'day' // ถ้าไม่ใช่เดือนให้ตรวจกรณีรายวัน
              ? 'report-day' // รายวันอ่านช่อง report-day
              : 'report-year', // รายปีอ่านช่อง report-year
        ).value, // อ่านค่าจากช่องที่เลือกเป็น period.value
      }; // จบวัตถุช่วงเวลาที่อ่านจากหน้า
    } // จบ selectedPeriod
    function selectPeriod(period) { // ปรับช่องควบคุมให้ตรงช่วงเวลาใหม่หลังเลือกหรือนำเข้า
      if(simpleMonthly){const value=period.value.slice(0,7);if(period.type!=='month')throw Error('หน้ารายงานนี้เลือกเป็นรายเดือนเท่านั้น');$('report-month-choice').value=value.slice(5,7);$('report-year-choice').value=String(Number(value.slice(0,4))+543);}
      $('period-type').value = period.type; // ตั้ง dropdown ชนิดช่วงให้ตรง period.type
      $( // ค้นหาช่องวันที่ที่จะเติมค่าช่วงใหม่
        period.type === 'month' // ตรวจว่าช่วงใหม่เป็นเดือน
          ? 'month' // เลือกช่อง month สำหรับรายเดือน
          : period.type === 'day' // ตรวจว่าช่วงใหม่เป็นวัน
            ? 'report-day' // เลือกช่อง report-day สำหรับรายวัน
            : 'report-year', // กรณีที่เหลือเลือกช่อง report-year
      ).value = period.value; // เติมค่าช่วงเวลาใหม่ลงในช่องที่เลือก
      for (const type of ['day', 'month', 'year']) // วนผ่านกล่องวัน เดือน และปีทั้งสามกล่อง
        $('period-' + type).hidden = type !== period.type; // เปิดเฉพาะกล่อง period-type ที่ตรงชนิดช่วง และซ่อนอีกสองกล่อง
    } // จบ selectPeriod
    function render() {
      if(reportTemplate&&$('report-page'))$('report-page').innerHTML=reportTemplate; // คำนวณและสร้างเอกสารใหม่จากข้อมูลนำเข้ากับช่องปัจจุบัน
      if(simpleMonthly&&$('report-document')) {
        $('print').disabled=printing||liveLoading||(!liveReady&&!hasDraft());
        $('report-document').hidden=false; // แสดงโครงรายงานเสมอ ระหว่างรอและเมื่อโหลดผิดพลาด
        $('report-document').setAttribute?.('aria-busy',String(liveLoading));
      }
      const period = selectedPeriod(); // อ่านช่วงเวลาที่ต้องการแสดงก่อนคำนวณ
      if (snapshotActive) input = snapshot.forPeriod(period); // เลือกปีจากสำเนาที่อ่านจริง รองรับรายวัน/เดือน/ปีโดยไม่ใช้ข้อมูลปีเก่าค้าง
      const result = ReportEngine.aggregate({ // ส่งข้อมูลให้ ReportEngine โดยไม่อ่านหรือเขียนชีท
        ...input, // แนบ datasets และวันที่ข้อมูลจากไฟล์ที่ตรวจแล้ว
        period, // ส่งช่วงเวลาที่ต้องการรายงาน
        sourcePeriod: input.period, // ส่งขอบเขต period ของไฟล์เพื่อป้องกันสรุปช่วงเกินข้อมูล
        sourceMonth: input.month, // แนบขอบเขต month สำหรับไฟล์รุ่นเก่า
        month: period.type === 'month' ? period.value : undefined, // ส่ง month แบบเดิมเฉพาะเมื่อผู้ใช้เลือกรายเดือน
      }); // รับผลตัวชี้วัดและสถานะความครอบคลุมจากเครื่องคำนวณ
      if (root.HubReportAnalytics && root.HubReportCharts) root.HubReportCharts.render($('report-analytics'), root.HubReportAnalytics.build(input, period, root.HubReportMappings)); // อัปเดตกราฟทุกส่วนพร้อมช่วงและข้อมูลล่าสุด
      const opening=$('report-page')?.querySelectorAll('.letter-intro');if(opening?.length>=2){opening[0].textContent='ตามที่งานภูมิทัศน์และสิ่งแวดล้อม ได้ดำเนินงานบริหารจัดการขยะอย่างยั่งยืน ผ่านการคัดแยกขยะ อีกทั้งจัดโครงการธนาคารขยะรีไซเคิล และการผลิตฮิวมัสจากเศษพืช พร้อมทั้งบันทึกสถิติผลการดำเนินงานไว้ในฐานข้อมูลของหน่วยงาน นั้น';const span=$('report-intro-period');opening[1].replaceChildren(document.createTextNode('ในการนี้ งานภูมิทัศน์และสิ่งแวดล้อมจึงขอรายงานสรุปผลการดำเนินงาน '),span,document.createTextNode(' ตามข้อมูลที่รวบรวมได้จากฐานข้อมูลปัจจุบัน เพื่อโปรดพิจารณา โดยมีรายละเอียดดังนี้'));}
      $('report-intro-period').textContent = simpleMonthly&&!periodChosen ? 'เลือกเดือนและปี' : periodLabel(period); // ให้ช่วงเวลาในย่อหน้า ในการนี้ ตรงกับบรรทัดเรื่องทุกครั้ง
      $('report-month').textContent = simpleMonthly&&!periodChosen ? 'เลือกเดือนและปี' : periodLabel(period).replace('ประจำเดือน ','ประจำเดือน').replace(' พ.ศ. ',' '); // เขียนช่วงเวลาไทยในช่อง report-month ซึ่งชื่อ id เดิมยังใช้ร่วมกัน
      $('report-number').textContent = // เตรียมแสดงเลขที่หนังสือในเอกสาร
        $('document-number').value.trim(); // ใช้เลขที่ผู้ใช้กรอก หรือเว้นว่างจริงโดยไม่เติมเส้นประ
      $('report-letter-date').textContent = $('document-date').value // ตรวจว่าผู้ใช้มีวันที่หนังสือหรือไม่
        ? thaiDate($('document-date').value) // ถ้ามีวันที่ ให้แปลงเป็นวันที่ไทย
        : ''; // เว้นช่องวันที่ว่างเพื่อออกเลขหนังสือภายหลัง
      $('report-recipient').textContent = // เตรียมเติมผู้รับในบรรทัด เรียน
        $('document-recipient').value.trim() || // ใช้ผู้รับที่แก้เองเมื่อมีข้อความ
        DEFAULT_RECIPIENT; // ถ้าช่องว่างให้ใช้ผู้อำนวยการกองตามคำสั่งผู้ใช้
      const signName=$('document-signatory').value.trim()||'นายมนัสชาย ประเดิมชัย';
      const signSpan=$('report-signatory');if(signSpan)signSpan.textContent=signName;else{const block=$('report-page').querySelector('.letter-signature');if(block)block.textContent='('+signName+')\nหัวหน้างานภูมิทัศน์และสิ่งแวดล้อม';}
      const coverage = // หาขอบเขตข้อมูลต้นทางเพื่อแจ้งใต้ย่อหน้ารายงาน
        input.period || // ใช้ period ของไฟล์รุ่นใหม่ก่อน
        (input.month ? { type: 'month', value: input.month } : null); // ถ้าเป็นไฟล์เก่าให้แปลง month เป็น period; ถ้าไม่มีทั้งคู่ถือว่าไม่ระบุ
      $('report-source').textContent = // เริ่มประกอบบรรทัดวันที่และขอบเขตข้อมูล
        (snapshotActive ? snapshot.sourceLabel : 'วันที่ข้อมูล: ' + thaiSourceDate(result.sourceDate)) + // ใช้ sourceDate จากผลคำนวณ หรือคำว่าไม่ระบุ
        ' | ขอบเขตชุดข้อมูล: ' + // แยกส่วนข้อความขอบเขตชุดข้อมูลออกจากวันที่ข้อมูล
        (coverage ? periodLabel(coverage) : 'ไม่ระบุ'); // แสดงช่วงข้อมูลเป็นภาษาไทย หรือไม่ระบุเมื่อไม่มี metadata
      $('report-metrics').replaceChildren(); // ล้างแถวเก่าก่อนสร้างตารางใหม่เพื่อไม่ให้รายการซ้ำ
      const groups = [ // กำหนดลำดับกลุ่มปริมาณกับมูลค่าโดยไม่คำนวณยอดรวมข้ามกลุ่ม
        [ // เริ่มคำอธิบายกลุ่มปริมาณ
          'ปริมาณการจัดการขยะและวัสดุ', // ข้อความหัวกลุ่มสำหรับเจ็ดตัวชี้วัดน้ำหนัก
          [ // เริ่มรายการรหัสตัวชี้วัดปริมาณตามลำดับแสดง
            'foodKg', // แสดงน้ำหนักเศษอาหารที่เก็บรวบรวม
            'freshKg', // แสดงน้ำหนักพืชสดรับเข้า
            'humusKg', // แสดงฮิวมัสที่บันทึกตรวจคุณภาพ ไม่ใช่วัตถุดิบผลิต
            'fertilizerKg', // แสดงน้ำหนักปุ๋ยที่จำหน่าย
            'recycleReceivedKg', // แสดงน้ำหนักรีไซเคิลรับเข้าแยกจากขายออก
            'recycleSoldKg', // แสดงน้ำหนักรีไซเคิลขายออกแยกจากรับเข้า
            'hazardKg', // แสดงน้ำหนักขยะอันตรายที่แจ้ง ไม่ใช่ยอดกำจัด
          ], // จบรายชื่อเจ็ดตัวชี้วัดปริมาณ
        ], // จบกลุ่มปริมาณ
        [ // เริ่มคำอธิบายกลุ่มมูลค่า
          'มูลค่าตามรายการที่บันทึก', // ข้อความหัวกลุ่มสำหรับสามตัวชี้วัดเงินบาท
          ['fertilizerBaht', 'recycleReceivedBaht', 'recycleSoldBaht'], // เรียงมูลค่าขายปุ๋ย รีไซเคิลรับเข้า และรีไซเคิลขายออก
        ], // จบกลุ่มมูลค่า
      ]; // จบการกำหนดสองกลุ่มรายงาน
      for (const [heading, keys] of groups) { // สร้างหัวกลุ่มและรายการย่อยตามลำดับที่กำหนด
        const groupRow = document.createElement('tr'); // สร้างแถวใหม่สำหรับหัวกลุ่ม
        const groupCell = document.createElement('th'); // สร้างเซลล์หัวกลุ่มแทนเซลล์ข้อมูลปกติ
        groupCell.colSpan = 3; // ขยายหัวกลุ่มให้ครอบคลุมทั้งสามคอลัมน์
        groupCell.scope = 'rowgroup'; // ระบุความหมายหัวกลุ่มแถวให้เครื่องมือช่วยอ่าน
        groupCell.textContent = heading; // ใส่ชื่อกลุ่มเป็นข้อความ ไม่แปลเป็น HTML
        groupRow.className = 'report-group'; // ให้แถวหัวกลุ่มใช้รูปแบบ report-group ใน report.css
        groupRow.append(groupCell); // วางเซลล์หัวกลุ่มในแถว
        $('report-metrics').append(groupRow); // เพิ่มแถวหัวกลุ่มลงในเนื้อหาตาราง
        for (const key of keys) { // วนแต่ละรหัสตัวชี้วัดภายในกลุ่มปัจจุบัน
          const item = result.metrics[key]; // อ่านผลตัวชี้วัดจาก metrics ด้วยรหัสที่กำหนดไว้
          const row = document.createElement('tr'); // สร้างแถวข้อมูลสำหรับตัวชี้วัดนี้
          const unknown = // กำหนดว่าควรแสดงขีดแทนตัวเลขหรือไม่
            item.value === null || // ค่าที่เป็น null หมายถึงไม่มีค่าที่ใช้สรุปได้
            [ // เริ่มรายการสถานะที่ห้ามแสดงเป็นค่าศูนย์
              'empty', // ชุดข้อมูลว่างต้องแสดงขีด ไม่ใช่ค่าศูนย์ที่วัดได้
              'no-records', // ไม่พบรายการในช่วงนี้ต้องแสดงขีด
              'missing', // ไม่มีชุดข้อมูลต้องแสดงขีด
              'not-loaded', // ยังโหลดไม่ครบหรือขอบเขตไม่พอต้องแสดงขีด
              'unconfigured', // ยังไม่กำหนดแหล่งข้อมูลต้องแสดงขีด
              'schema-error', // หัวคอลัมน์ผิดสัญญาต้องแสดงขีด
            ].includes(item.status); // ตรวจว่าสถานะของตัวชี้วัดตรงรายการข้างต้นหรือไม่
          const amount = unknown ? '' : root.HubWasteReportDisplay.number(item.value) + ' ' + item.unit;
          const cells = [ // เรียงข้อความสามคอลัมน์สำหรับแถวนี้
            item.label, // คอลัมน์แรกเป็นชื่อรายการ
            amount, // คอลัมน์ที่สองเป็นปริมาณพร้อมหน่วยหรือขีด
            (statuses[item.status] || 'ยังสรุปไม่ได้') +
              (item.reason ? ' · ' + item.reason : '') +
              (item.quantityByUnit?.['ลัง'] !== undefined ? ' · รับซื้อ ' + item.quantityByUnit['ลัง'] + ' ลัง (แยกจากกิโลกรัม)' : '') + // คอลัมน์ที่สามเริ่มด้วยคำอธิบายสถานะ
              (item.rows ? ' · ' + item.rows + ' รายการ' : '') + // ต่อจำนวนรายการที่อ่านได้เมื่อมากกว่าศูนย์
              (item.invalid ? ' · ตรวจสอบ ' + item.invalid : ''), // ต่อจำนวนรายการที่ต้องตรวจสอบเมื่อมีค่าผิดรูปแบบ
          ]; // จบข้อความสามคอลัมน์
          for (const text of cells) { // สร้างเซลล์ตามข้อความแต่ละคอลัมน์
            const cell = document.createElement('td'); // ใช้ td สำหรับเซลล์ข้อมูล ไม่ใช่หัวตาราง
            cell.textContent = text; // เขียน textContent เพื่อไม่ให้ข้อความนำเข้ากลายเป็นโค้ด
            row.append(cell); // ใส่เซลล์ลงในแถวตามลำดับคอลัมน์
          } // จบการสร้างสามเซลล์ของตัวชี้วัด
          $('report-metrics').append(row); // เพิ่มแถวตัวชี้วัดที่สร้างเสร็จลงในตาราง
        } // จบการวนตัวชี้วัดในกลุ่ม
      } // จบการสร้างสองกลุ่มรายงาน
      // คงโครง HTML และกราฟเดิม ผูกการแก้สำเนารายงานกับข้อมูลส่งออกเท่านั้น
      if(simpleMonthly&&periodChosen&&root.HubReportEdit&&root.HubReportPdf){
        const model=root.HubReportAnalytics.build(input,period,root.HubReportMappings);
        root.HubReportEdit.attachWaste($('report-page'),model,{number:$('document-number').value.trim(),date:$('document-date').value?thaiDate($('document-date').value):'',recipient:$('document-recipient').value.trim()||DEFAULT_RECIPIENT,signatory:$('document-signatory').value.trim()},'waste:'+period.type+':'+period.value);
      }
    } // จบ render
    function setData(value, options = {}) { // รับ JSON หรือวัตถุข้อมูลจากการนำเข้าหรือ API ภายในแอพ
      if(simpleMonthly&&!options.live)throw Error('หน้ารายงานนี้อ่านข้อมูลจริงจากชีตเท่านั้น');
      const data = HubDatasetAdapter.parse(value); // ตรวจโครงสร้างและชนิดค่าด้วย adapter ก่อนเปลี่ยนข้อมูลที่แสดง
      const incomingPeriod = // หาช่วงเวลาที่ควรเลือกหลังนำเข้า
        data.period || // ใช้ period ของไฟล์ใหม่ถ้ามี
        (data.month ? { type: 'month', value: data.month } : selectedPeriod()); // รองรับ month รุ่นเดิม มิฉะนั้นคงช่วงที่ผู้ใช้เลือกไว้
      ReportEngine.aggregate({ // ทดลองคำนวณเพื่อตรวจว่าข้อมูลใหม่ใช้กับช่วงนั้นได้
        ...data, // ส่ง datasets และ metadata ที่ผ่าน adapter แล้ว
        period: incomingPeriod, // ใช้ช่วงจากไฟล์หรือค่าปัจจุบันในการตรวจ
        sourcePeriod: data.period, // แนบขอบเขตไฟล์ใหม่สำหรับตรวจความครอบคลุม
        month: // เตรียมค่า month เพื่อรองรับส่วนเชื่อมต่อเดิม
          incomingPeriod.type === 'month' ? incomingPeriod.value : undefined, // ให้ month มีค่าเฉพาะไฟล์ที่เลือกรายเดือน
      }); // จบการตรวจข้อมูลใหม่กับเครื่องคำนวณ
      snapshotActive = false; // ไฟล์นำเข้าหรือข้อมูลสดมีสิทธิเหนือสำเนาเริ่มต้น
      input = { ...data, foodPartial: options.live === true && value.foodPartial === true }; if(simpleMonthly){liveLoading=false;liveReady=true;periodChosen=true;} // เปลี่ยนสถานะ input หลังผ่านการตรวจเท่านั้น
      selectPeriod(options.period || incomingPeriod); // ปรับตัวเลือกวัน เดือน หรือปีตามข้อมูลใหม่
      render(); // วาดเอกสารด้วยชุดข้อมูลที่เพิ่งรับ
      $('import-status').textContent = // เตรียมแจ้งสถานะการโหลด
        options.live ? (data.municipalIssues?.length?'อ่านข้อมูลแล้ว · ขยะทั่วไปมี '+data.municipalIssues.length+' แถวรอตรวจ ดูรายละเอียดในรายงาน':'อ่านข้อมูลล่าสุดจากชีตแล้ว') : 'โหลดชุดข้อมูลจากไฟล์แล้ว · ไม่ใช่ข้อมูลสด'; // บอกว่าโหลดข้อมูลแล้ว แต่ยังไม่ใช่การเชื่อมข้อมูลสด
    } // จบ setData
    function reset() { root.HubReportEdit?.clear('waste'); // ล้างข้อมูลรายงานและข้อมูลหนังสือเมื่อเปลี่ยนผู้กรอก
      entered=false;autoStartAllowed = true; liveReady=false;periodChosen=true; // หลังล้างข้อมูล ให้ผู้ใช้เริ่มอ่านใหม่เอง
      snapshotActive = false; // ไม่คืนสำเนาอัตโนมัติหลังผู้ใช้ล้างข้อมูล
      live?.disconnect(); // ล้างสิทธิ์ Google และคำขอค้างเมื่อเปลี่ยนผู้กรอก
      sessionGeneration++; // ยกเลิกคำขอพิมพ์ของผู้กรอกก่อนหน้าโดยไม่พิมพ์ข้อมูลคนใหม่แทน
      guard.reset(); // ยกเลิกสิทธิ์ของไฟล์ที่ยังอ่านค้างอยู่
      input = { datasets: {} }; // นำชุดข้อมูลทั้งหมดออกจากหน่วยความจำของรายงาน
      if(simpleMonthly)selectPeriod({type:'month',value:previousMonth()});
      $('import').value = ''; // ล้างค่าช่องเลือกไฟล์เพื่อไม่ให้ค้างชื่อไฟล์เดิม
      $('document-recipient').value = DEFAULT_RECIPIENT; // คืนผู้รับเริ่มต้นแทนการทำให้ว่างหลังเปลี่ยนผู้กรอก
      for (const id of [ // ล้างเลขหนังสือและผู้ลงนาม ส่วนผู้รับคืนค่าเริ่มต้นแล้วด้านบน
        'document-number', // ระบุช่องเลขหนังสือที่จะล้าง
        'document-date', // คืนวันที่หนังสือเป็นช่องว่างด้วย
        'document-signatory', // ระบุช่องผู้ลงนามที่จะล้าง
      ]) // จบรายชื่อช่องที่ต้องล้าง
        $(id).value = ''; // ตั้งค่าช่องปัจจุบันเป็นข้อความว่าง
      $('import-status').textContent = // เตรียมคืนสถานะแจ้งว่าไม่มีชุดข้อมูล
        simpleMonthly?'เลือกเดือนและปีเพื่ออ่านข้อมูลจริงจากชีต':'ยังไม่มีข้อมูล · กดเริ่มอ่านฐานข้อมูลใหม่'; // บอกผู้ใช้ให้นำเข้า JSON เมื่อจะเริ่มรายงานใหม่
      render(); // วาดรายงานว่างใหม่ทันทีหลังล้างข้อมูล
    } // จบ reset
    const directMode = root.HubReportSourceConfig?.mode === 'unified' && root.HubReportUnified;
    let autoStartAllowed = true; // เริ่มอัตโนมัติครั้งแรก แต่เคารพการหยุดและการนำเข้าไฟล์
    const snapshotStatus = () => snapshot.status + (directMode && root.location?.protocol === 'file:' ? ' · ต้องเปิดเว็บผ่าน HTTPS จึงจะอ่านชีตอัตโนมัติได้' : '');
    const liveProvider = directMode;
    const live = liveProvider ? liveProvider.create({ // ต่อแหล่ง Google Sheets โดยตรงเมื่อโหลดโมดูลแล้ว
      clientId: root.HubReportSourceConfig?.googleClientId || '',
      autoRefreshMs: root.HubReportSourceConfig?.autoRefreshMs || 60000, // ช่วงอ่านใหม่อัตโนมัติขณะหน้าเว็บมองเห็น
      getPeriod: selectedPeriod, // อ่านช่วงจาก UI ตอนเริ่มคำขอ
      clearData: () => { liveReady=false; sessionGeneration++; snapshotActive = false; guard.reset(); input = { datasets: {} }; render(); }, // ไม่ให้ข้อมูลเก่าค้างขณะโหลดหรือตัดเชื่อม
      onData: (data, period) => setData(data, { live: true, period }), // เก็บ coverage ทั้งปี แต่รายงานยังอยู่เดือน/วันที่เลือก
      onState: (text, connected) => { // แสดงสถานะตามผลจริง ไม่อ้างว่า preview คือระบบสด
        $('import-status').textContent = text+(liveReady&&input.municipalIssues?.length?' · มี '+input.municipalIssues.length+' แถวรอตรวจ ดูรายละเอียดในรายงาน':''); // แจ้ง error หรือเวลาที่อ่านจริง
        $('report-refresh').disabled = !connected; // อ่านซ้ำได้เมื่อยังมีสิทธิ์
        liveLoading = text.startsWith('กำลังอ่าน'); $('print').disabled = printing || liveLoading || (simpleMonthly&&!liveReady&&!hasDraft()); // ไม่เปิด PDF ระหว่างข้อมูลกำลังถูกแทนที่
        $('report-disconnect').disabled = !connected && !(directMode && liveLoading); // ยกเลิกการอ่านตรงได้แม้คำขอยังไม่เสร็จ
      }, // จบตัวแสดงสถานะ
    }) : null; // ให้ tests/รุ่นเดิมที่ไม่มีโมดูลยังทำงานได้
    if (live) { // ผูกปุ่มเฉพาะเมื่อโมดูลพร้อม
      $('report-connect').addEventListener('click', () => { autoStartAllowed = true; return live.connect(); }); // เริ่มอ่านอีกครั้งตามคำสั่งผู้ใช้
      $('report-refresh').addEventListener('click', live.refresh); // อ่านฐานข้อมูลล่าสุดใหม่ทั้งปี
      $('report-disconnect').addEventListener('click', () => { autoStartAllowed = false; live.disconnect(); }); // หยุดอ่านและไม่เริ่มใหม่เพียงเพราะเปลี่ยนหน้า
    } // จบปุ่มเชื่อมข้อมูล
    const todayParts = new Intl.DateTimeFormat('en-CA', { // อ่านส่วนปี เดือน วันแยกกัน ไม่พึ่งลำดับหรือเครื่องหมายคั่นของ Safari
      timeZone: 'Asia/Bangkok', // ใช้วันที่ปัจจุบันในประเทศไทย ไม่ใช่เขตเวลาของเครื่อง
      calendar: 'gregory', // บังคับปีคริสต์ศักราชให้ตรงสัญญาค่าช่อง HTML
      numberingSystem: 'latn', // บังคับเลขอารบิกเพื่อไม่ให้ค่าช่องวันที่เป็นเลขท้องถิ่น
      year: 'numeric', // แสดงปีเต็มสำหรับค่า input
      month: '2-digit', // เติมเดือนเป็นสองหลัก
      day: '2-digit', // เติมวันเป็นสองหลัก
    }).formatToParts(new Date()); // รับชิ้นส่วนวันที่ตามเวลาไทยโดยไม่ใช้สตริงแสดงผลสำเร็จรูป
    const datePart = (type) => todayParts.find((part) => part.type === type).value; // ค้นค่าตามชื่อชนิดแทนการเดาว่าปีอยู่ตำแหน่งใด
    const today = ['year', 'month', 'day'].map(datePart).join('-'); // ประกอบ YYYY-MM-DD เองให้ช่องวันและเดือนรับค่าได้ทุกเบราว์เซอร์
    $('month').value = today.slice(0, 7); // ตั้งเดือนเริ่มต้นด้วยเจ็ดอักขระ YYYY-MM
    $('report-day').value = today; // เตรียมวันปัจจุบันไว้ในช่องรายวัน
    $('report-year').value = today.slice(0, 4); // เตรียมปีปัจจุบันไว้ในช่องรายปี
    if(simpleMonthly){
      const months=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
      const choose=document.createElement('option');choose.value='';choose.textContent='เลือกเดือน';$('report-month-choice').append(choose);
      months.forEach((name,index)=>{const option=document.createElement('option');option.value=String(index+1).padStart(2,'0');option.textContent=name;$('report-month-choice').append(option);});
      const changeMonth=()=>{
        try {
          const year=ensureReportYear($('report-year-choice'),$('month').value),month=$('report-month-choice').value;
          if(!month){live?.disconnect();periodChosen=false;liveReady=false;input={datasets:{}};render();$('import-status').textContent='เลือกเดือนเพื่อแสดงข้อมูล';return;}
          if(!Number.isInteger(year)||year<1900||year>2399||! /^(0[1-9]|1[0-2])$/.test(month))throw Error('กรุณาเลือกเดือนและปี พ.ศ. ให้ถูกต้อง');
          periodChosen=true;
          $('month').value=String(year)+'-'+month;
          selectPeriod({type:'month',value:$('month').value});
          liveReady=false;input={datasets:{}};$('print').disabled=true;render();
          if(live?.connected())live.refresh();
          else if(live&&root.location?.protocol!=='file:')live.connect();
          else $('import-status').textContent='เปิดแอปผ่านเว็บไซต์เพื่ออ่านข้อมูลจากชีต';
        } catch(e) {
          live?.disconnect();liveReady=false;periodChosen=false;input={datasets:{}};$('print').disabled=true;render();
          $('import-status').textContent=e.message;
        }
      };
      $('report-month-choice').addEventListener('change',changeMonth);$('report-year-choice').addEventListener('change',changeMonth);
    }
    $('document-recipient').value = DEFAULT_RECIPIENT; // ตั้งผู้รับหนังสือเป็นผู้อำนวยการกองตั้งแต่เปิดแอพ
    $('document-date').value = ''; // เว้นวันที่หนังสือว่างให้ผู้ใช้ออกเลขภายหลัง ไม่ใส่วันที่ปัจจุบัน
    selectPeriod({ type: 'month', value: previousMonth() });
    // form.reset() ต้องไม่ล้างปีที่เลือกไว้ตั้งแต่เปิดหน้า
    if(simpleMonthly)$('report-year-choice').defaultValue=$('report-year-choice').value;
    if(simpleMonthly){$('import-status').textContent='เลือกเดือนและปีเพื่อเปลี่ยนข้อมูลรายงาน';} // เปิดรายเดือนเป็นค่าเริ่มต้นและซ่อนช่องวันกับปี
    if (snapshotActive) { input = snapshot.forPeriod(selectedPeriod()); $('import-status').textContent = snapshotStatus(); }
    else if (snapshotError) $('import-status').textContent = snapshotError; // แสดงสำเนาข้อมูลจริงพร้อมเวลาที่อ่าน ไม่อ้างว่าเชื่อมสด
    for (const id of [ // รวบรวมช่องที่ต้องวาดรายงานใหม่เมื่อเปลี่ยนค่า
      'period-type', // ติดตามการเปลี่ยนชนิดช่วงรายงาน
      'month', // ติดตามการเปลี่ยนเดือน
      'report-day', // ติดตามการเปลี่ยนวันที่รายงาน
      'report-year', // ติดตามการเปลี่ยนปีรายงาน
      'document-number', // ติดตามการแก้เลขหนังสือ
      'document-date', // ติดตามการแก้วันที่หนังสือ
      'document-recipient', // ติดตามการแก้ผู้รับหนังสือ
      'document-signatory', // ติดตามการแก้ชื่อหรือตำแหน่งผู้ลงนาม
    ]) { // เริ่มผูกเหตุการณ์ให้แต่ละช่องในรายการ
      $(id).addEventListener('change', () => { // เรียกขั้นตอนปรับรายงานเมื่อช่องนั้นมีเหตุการณ์ change
        try { // ดักข้อผิดพลาดจากช่วงเวลาหรือข้อมูลที่ไม่ถูกต้อง
          selectPeriod(selectedPeriod()); // อัปเดตช่องที่ต้องเปิดให้ตรงชนิดช่วงปัจจุบัน
          render(); // วาดเอกสารใหม่หลังเปลี่ยนค่าช่อง
          if (snapshotActive) $('import-status').textContent = snapshotStatus(); // คงคำบอกสถานะสำเนาและข้อจำกัด HTTPS เมื่อเปลี่ยนช่วง
          if (['period-type', 'month', 'report-day', 'report-year'].includes(id) && live?.connected()) live.refresh(); // เปลี่ยนช่วงแล้วอ่านฐานข้อมูลใหม่ ไม่ใช้ปีเก่าค้าง
        } catch (error) { // รับข้อผิดพลาดแทนปล่อยให้หน้าหยุดทำงาน
          $('import-status').textContent = error.message; // แสดงข้อความผิดพลาดในแถบสถานะนำเข้า
        } // จบส่วนตรวจข้อผิดพลาดของการเปลี่ยนช่อง
      }); // จบตัวรับเหตุการณ์ change ของช่องหนึ่งช่อง
    } // จบการติดตามช่องควบคุมรายงานทั้งหมด
    root.addEventListener('mu:report-draft',()=>{if(simpleMonthly)$('print').disabled=printing||liveLoading||(!liveReady&&!hasDraft());});
    $('print').addEventListener('click', async () => { // รอ TH Sarabun New จริงก่อนเปิดหน้าพิมพ์
      if (printing || liveLoading) return;
      if(simpleMonthly&&!liveReady&&!hasDraft()){$('import-status').textContent='ยังสร้าง PDF ไม่ได้ กรุณารอข้อมูลจากชีตหรือเปลี่ยนเดือนเพื่อลองอ่านใหม่';return;} // ไม่เปิดหน้าพิมพ์ซ้ำเมื่อกดระหว่างโหลดฟอนต์
      printing = true; // ล็อกขั้นตอนพิมพ์จนสำเร็จหรือผิดพลาด
      $('print').disabled = true; // ปิดปุ่มชั่วคราวให้ผู้ใช้เห็นว่ากำลังเตรียม
      const printSession = sessionGeneration; // จำรุ่นผู้กรอกก่อนเริ่มรอฟอนต์
      try { // จัดการกรณีช่วงข้อมูลผิดหรือไฟล์ฟอนต์โหลดไม่ได้
        render(); // ตรวจช่วงและข้อมูลปัจจุบันก่อนเริ่มโหลดฟอนต์
        if(simpleMonthly){
          // ใช้ชุดข้อมูลสดเดิมตลอดการสร้างไฟล์ และยกเลิกหากเปลี่ยนบัญชี/เดือนระหว่างรอ
          if(!root.HubReportPdf)throw Error('โหลดเครื่องมือ PDF ไม่ครบ กรุณาเปิดหน้าใหม่');
          const pdfInput=input,pdfPeriod=selectedPeriod(),periodKey=JSON.stringify(pdfPeriod);
          $('import-status').textContent='กำลังสร้าง PDF จากข้อมูลในชีต';
          const downloadResult=await root.HubReportPdf.download({input:pdfInput,allowManualDraft:!liveReady&&hasDraft(),period:pdfPeriod,mappings:root.HubReportMappings,ready:(liveReady||hasDraft())&&!liveLoading,
            letter:{number:$('document-number').value.trim(),date:$('document-date').value?thaiDate($('document-date').value):'',recipient:$('document-recipient').value.trim()||DEFAULT_RECIPIENT,signatory:$('document-signatory').value.trim()},
            isCurrent:()=>printSession===sessionGeneration&&input===pdfInput&&JSON.stringify(selectedPeriod())===periodKey&&(liveReady||hasDraft())&&!liveLoading});
          if(printSession===sessionGeneration)$('import-status').textContent=downloadResult?.canceled?'เก็บการแก้ไขไว้ในหน้านี้แล้ว':'เริ่มดาวน์โหลด PDF แล้ว';
          return; // หน้ารายงานจริงไม่เปิดหน้าต่างพิมพ์และไม่ใช้ fallback เงียบ ๆ
        }

        if (!document.fonts || typeof document.fonts.load !== 'function') throw Error('เบราว์เซอร์นี้ตรวจการโหลดฟอนต์ไม่ได้ กรุณาใช้เบราว์เซอร์ที่รองรับก่อนพิมพ์'); // ไม่พิมพ์ด้วย fallback เงียบ ๆ
        $('import-status').textContent = 'กำลังเตรียมฟอนต์ TH Sarabun New สำหรับพิมพ์'; // บอกว่ากำลังรอฟอนต์ ไม่ใช่บันทึกข้อมูล
        const loaded = await Promise.all([document.fonts.load('15pt SarabunReport'), document.fonts.load('bold 15pt SarabunReport')]); // โหลดตัวปกติและตัวหนาซึ่งผูกกับไฟล์ THSarabunNew จริง
        if (printSession !== sessionGeneration) return; // ถ้าเปลี่ยนผู้กรอกระหว่างรอ ให้ยกเลิกการพิมพ์รอบเดิม
        if (loaded.some((faces) => !faces.length || faces.some((face) => face.status !== 'loaded' || String(face.family).replace(/["']/g, '') !== 'SarabunReport')) || !document.fonts.check('15pt SarabunReport') || !document.fonts.check('bold 15pt SarabunReport')) throw Error('โหลด TH Sarabun New ไม่ครบ กรุณาตรวจการเชื่อมต่อแล้วลองพิมพ์ใหม่'); // ไม่ยอมใช้ฟอนต์สำรองแทนคำสั่งผู้ใช้
        render(); // วาดค่าช่วงและข้อมูลล่าสุดอีกครั้งหลังรอ เผื่อผู้ใช้ปรับระหว่างโหลด
        $('import-status').textContent = 'เลือกบันทึกเป็น PDF ในหน้าต่างพิมพ์ แล้วตรวจหน้าตัวอย่างก่อนบันทึก'; // เตือนให้ตรวจหน้าพิมพ์ ไม่อ้างว่าตรวจภาพแล้ว
        root.print(); // เปิดหน้าพิมพ์เพียงครั้งเดียวเมื่อฟอนต์และข้อมูลพร้อม
      } catch (error) { // รับความผิดพลาดฟอนต์หรือข้อมูลโดยไม่เปิดหน้าพิมพ์
        if (printSession === sessionGeneration) $('import-status').textContent = 'ยังพิมพ์ไม่ได้: ' + error.message; // ไม่เขียนสถานะทับผู้กรอกใหม่
      } finally { // คืนปุ่มไม่ว่าพิมพ์สำเร็จ ผิดพลาด หรือยกเลิก
        printing = false; // ปลดล็อกให้ลองใหม่ได้
        $('print').disabled = liveLoading || (simpleMonthly&&!liveReady&&!hasDraft()); // เปิดปุ่มคืนเมื่อไม่มีการอ่านข้อมูลสดค้าง
      } // จบการคืนสถานะปุ่มพิมพ์
    }); // จบตัวรับเหตุการณ์พิมพ์ที่ตรวจฟอนต์จริง
    $('import').addEventListener('change', async (event) => { // เริ่มอ่านไฟล์เมื่อผู้ใช้เปลี่ยนไฟล์ JSON ที่เลือก
      if(simpleMonthly)return; // ไม่มีทางนำเข้า JSON ในหน้ารายงานจริง
      const file = event.target.files[0]; // ใช้ไฟล์แรกจากช่องเลือกไฟล์
      if (!file) return; // ถ้าผู้ใช้ยกเลิกการเลือกไฟล์ ให้หยุดโดยไม่เปลี่ยนรายงาน
      autoStartAllowed = false; // ไม่ให้กลับเข้าหน้ารายงานแล้วข้อมูลสดทับไฟล์ที่ผู้ใช้เลือก
      live?.disconnect(); // เปลี่ยนเป็นไฟล์นำเข้าแล้วเลิกใช้ข้อมูลสดและคำขอค้าง
      guard.reset(); // เมื่อเลือกไฟล์ใหม่ ให้ผลสำเร็จหรือข้อผิดพลาดของไฟล์ก่อนหน้าหมดสิทธิ์ทับข้อมูล
      const generation = guard.capture(); // จำรุ่นของไฟล์ใหม่หลังยกเลิกไฟล์ก่อนหน้า เพื่อใช้ตรวจทั้งผลอ่านและการล้างช่อง
      try { // เริ่มส่วนตรวจข้อผิดพลาดการอ่านและตรวจไฟล์
        if (file.size > 10 * 1024 * 1024) throw Error('ไฟล์ต้องไม่เกิน 10 MB'); // ปฏิเสธไฟล์เกินสิบเมกะไบต์เพื่อลดภาระหน่วยความจำ
        const text = await file.text(); // อ่านเนื้อหาไฟล์เป็นข้อความในเครื่อง
        if (!guard.current(generation)) return; // ทิ้งผลอ่านหากมีการล้างข้อมูลหรือเปลี่ยนผู้กรอกระหว่างรอ
        setData(text); // ส่งข้อความ JSON ไปตรวจและสร้างรายงาน
      } catch (error) { // รับข้อผิดพลาดจากขนาดไฟล์ การอ่าน หรือการตรวจ JSON
        if (guard.current(generation)) // แจ้งข้อผิดพลาดเฉพาะเมื่อยังเป็นรุ่นข้อมูลปัจจุบัน
          $('import-status').textContent = 'นำเข้าไม่สำเร็จ: ' + error.message; // บอกว่านำเข้าไม่สำเร็จพร้อมสาเหตุ ไม่แสดงสำเร็จผิด
      } finally { // ทำความสะอาดช่องเลือกไฟล์ไม่ว่าสำเร็จหรือผิดพลาด
        if (guard.current(generation)) event.target.value = ''; // ล้างช่องไฟล์เฉพาะรุ่นปัจจุบัน ไม่ไปรบกวนการนำเข้ารอบใหม่
      } // จบส่วนทำความสะอาดการนำเข้า
    }); // จบตัวรับเหตุการณ์เลือกไฟล์
    $('import-label').addEventListener('keydown', (event) => { // ทำให้ป้ายปุ่มนำเข้าใช้คีย์บอร์ดได้
      if (event.key === 'Enter' || event.key === ' ') { // รองรับ Enter และ Space เป็นการสั่งเปิดช่องเลือกไฟล์
        event.preventDefault(); // กันพฤติกรรมปกติของปุ่ม เช่น Space เลื่อนหน้า
        $('import').click(); // เรียกช่องเลือกไฟล์จริงเพื่อให้เบราว์เซอร์เปิดตัวเลือกไฟล์
      } // จบเงื่อนไขปุ่มที่รองรับ
    }); // จบตัวรับเหตุการณ์คีย์บอร์ดของปุ่มนำเข้า
    root.HubReport = { setData, modules: HubConfig.modules }; // คง HubReport.setData และรายชื่อ modules สำหรับส่วนเชื่อมต่อเดิม
    return { // คืนคำสั่งที่ bootstrap ใช้จัดการรายงาน
      enter: () => { render(); if(entered&&(liveLoading||liveReady))return;entered=true; if (directMode && autoStartAllowed && root.location?.protocol !== 'file:') live.connect(); }, // เริ่มอัตโนมัติบนเว็บ ยกเว้นผู้ใช้สั่งหยุดหรือใช้ไฟล์นำเข้า
      render, // เปิดให้ bootstrap สั่งวาดรายงานเมื่อเข้าแท็บ
      reset, // เปิดให้ bootstrap ล้างข้อมูลเมื่อเปลี่ยนชื่อผู้กรอก
      hasData: () => Object.keys(input.datasets).length > 0, // ให้ bootstrap ตรวจว่ามีข้อมูลรายงานก่อนถามยืนยันเปลี่ยนชื่อ
    }; // จบคำสั่งควบคุมที่คืนให้ bootstrap
  } // จบ create
  root.HubReportController = { // ประกาศฟังก์ชันสาธารณะของโมดูลตัวควบคุมรายงาน
    create, // ส่งออกตัวสร้าง controller สำหรับแอพ
    previousMonth,
    ensureReportYear,
    createImportGuard, // ส่งออกตัวกันไฟล์ค้างสำหรับทดสอบโดยตรง
    thaiDate, // ส่งออกตัวจัดวันที่ไทยสำหรับทดสอบ
    thaiSourceDate,
    periodLabel, // ส่งออกตัวจัดชื่อช่วงเวลาให้ทดสอบได้
  }; // จบรายการฟังก์ชันสาธารณะ
  if (typeof module !== 'undefined') module.exports = root.HubReportController; // ใช้ module.exports เมื่อรันใน Node เพื่อให้ชุดทดสอบเรียกได้
})(typeof window === 'undefined' ? globalThis : window); // ใช้ globalThis ใน Node และ window ในเบราว์เซอร์โดยไม่สร้างเครือข่าย
