/* ดาวน์โหลด PDF A4 โดยสร้างจากโมเดลรายงานเดียวกับหน้าเว็บ ไม่ใช้ภาพหน้าจอและไม่เปิดหน้าพิมพ์ */
(function(root){'use strict';
 const months=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
 // ค่าไม่ครบ/อ่านไม่ได้แสดงขีดแทนศูนย์ เพื่อไม่ทำให้รายงานดูเหมือนมีข้อมูลยืนยัน
 const valid=m=>m&&m.status==='ok'&&Number.isFinite(m.value);
 const amount=m=>valid(m)?root.HubWasteReportDisplay.number(m.value):'';
 // แปลงวัน/เดือน/ปีของช่วงรายงานเป็นข้อความไทยและปีพุทธศักราช โดยไม่แก้ค่าฐานข้อมูล
 const periodLabel=p=>p.type==='year'?'ประจำปี พ.ศ. '+(Number(p.value)+543):p.type==='month'?'ประจำเดือน '+months[Number(p.value.slice(5,7))-1]+' พ.ศ. '+(Number(p.value.slice(0,4))+543):'ประจำวันที่ '+Number(p.value.slice(8,10))+' '+months[Number(p.value.slice(5,7))-1]+' พ.ศ. '+(Number(p.value.slice(0,4))+543);
 // หัวตารางซ้ำเมื่อขึ้นหน้าใหม่และไม่แบ่งหนึ่งแถวข้ามหน้า ช่วยให้ตรวจรายงานต่อเนื่องได้
 function table(headers,rows,widths){return {table:{headerRows:1,dontBreakRows:true,widths:widths||headers.map(()=>'*'),body:[headers.map(h=>({text:h,bold:false,fillColor:'#ffffff',alignment:'center'})),...rows]},layout:{hLineColor:()=> '#000000',vLineColor:()=> '#000000',hLineWidth:()=>.6,vLineWidth:()=>.6,paddingLeft:()=>5,paddingRight:()=>5,paddingTop:()=>3,paddingBottom:()=>3},margin:[0,3,0,10]};}
 function heading(text,pageBreak){return {text,bold:false,fontSize:15,margin:[0,8,0,5],...(pageBreak?{pageBreak:'before'}:{})};}
 // แสดงเหตุผลที่ข้อมูลมีข้อจำกัดครั้งเดียวต่อข้อความ ไม่ซ้ำทุกตัวชี้วัด
 // ซ่อนเฉพาะคำอธิบายแหล่งยอดที่ยืนยันแล้วตามภาพ ไม่ซ่อนข้อผิดพลาดหรือยอดไม่ครบ
 function showReason(m){return m&&m.reason&&!(m.status==='ok'&&/^(รวมเฉพาะรายการหน่วยกิโลกรัม;|ใช้ยอดรวมเดือนที่นำเข้าสำเร็จแทนรายการธนาคารขยะเดิมในเดือนเดียวกัน|ใช้ยอดรายเดือนที่บันทึกสำเร็จในแท็บธนาคารขยะโดยตรง)/.test(m.reason));}
 function note(metrics){const reasons=[...new Set(metrics.filter(showReason).map(m=>m.reason))];return reasons.map(text=>({text,fontSize:15,color:'#555555',margin:[0,2,0,3]}));}
 // กราฟเวกเตอร์รักษาหน่วยกิโลกรัม ไม่แปลงหน่วยอื่นหรือถือข้อมูลไม่ครบเป็นศูนย์
 // ใช้กราฟตั้งเหมือนต้นฉบับรายงาน ไม่แทนกราฟเดิมด้วยตารางคนละรูปแบบ
 const mm=n=>n*72/25.4;
 const compact=n=>root.HubWasteReportDisplay.tick(n);
 const barLabel=root.HubWasteReportDisplay.number;
 function niceMax(value){if(!(value>0))return 1;const power=10**Math.floor(Math.log10(value));return [1,2,5,10].find(n=>n*power>=value)*power;}
 const xml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 function verticalChart(groups,{divisor=1,maximum=null,colors=['#32765f','#80aebe'],rightMaximum=null,annual=false,leftUnit=null,rightUnit=null,rightInside=false}={}){
  const values=groups.flatMap(g=>g.metrics).filter(valid).map(m=>m.value/divisor);
  const max=maximum||niceMax(Math.max(0,...values)), height=mm(45), width=mm(160), left=0,right=rightMaximum&&!rightInside?35:0,plotWidth=width-left-right;
  const groupWidth=plotWidth/groups.length,parts=[],text=(x,y,value,anchor='middle',size=15)=>parts.push('<text x="'+x+'" y="'+y+'" font-family="Sarabun" font-size="'+size+'" text-anchor="'+anchor+'">'+xml(value)+'</text>');
  if(leftUnit)text(left,10,leftUnit,'end',12);if(rightUnit)text(width-right,10,rightUnit,rightInside?'end':'start',12);
  [0,.5,1].forEach(part=>{const y=23+height*(1-part);parts.push('<line x1="'+left+'" y1="'+y+'" x2="'+(width-right)+'" y2="'+y+'" stroke="'+(part?'#b7b7b7':'#222')+'" stroke-width="0.4"/>');text(left-4,y+4,root.HubWasteReportDisplay.tick(max*part,annual),'end');if(rightMaximum)text(width-right+(rightInside?-4:4),y+4,compact(rightMaximum*part),rightInside?'end':'start');});
  parts.push('<line x1="'+left+'" y1="23" x2="'+left+'" y2="'+(23+height)+'" stroke="#222" stroke-width="0.6"/>');

  groups.forEach((group,i)=>{
   const barWidth=Math.min(annual?7:14,(groupWidth-8)/group.metrics.length),start=left+i*groupWidth+(groupWidth-barWidth*group.metrics.length)/2;
   group.metrics.forEach((metric,j)=>{const scale=group.maximum||max,div=group.divisor||divisor,x=start+j*barWidth;
    const raw=valid(metric)?Math.max(0,metric.value/div/scale*height):0;if(!raw)return;
    const h=annual?raw:Math.max(3,raw);
    parts.push('<rect x="'+x+'" y="'+(23+height-h)+'" width="'+barWidth+'" height="'+h+'" fill="'+colors[j%colors.length]+'"/>');
    if(!annual&&raw<3){
      const exact=div===1000&&metric.value<1000?amount(metric)+' กก.':amount(metric)+(group.unit?' '+group.unit:'');
      text(x+barWidth/2,23+height-h-3,exact,'middle',10);
    }
   });
   text(left+(i+.5)*groupWidth,23+height+18,group.label,'middle',annual?12:15);
  });
  return {editChart:{groups:JSON.parse(JSON.stringify(groups)),options:{divisor,maximum,colors,rightMaximum,annual,leftUnit,rightUnit,rightInside}},svg:'<svg xmlns="http://www.w3.org/2000/svg" width="'+(width+35)+'" height="'+(height+48)+'" viewBox="-35 0 '+(width+35)+' '+(height+48)+'">'+parts.join('')+'</svg>',width:width+35,margin:[-35,3,0,12]};
 }
 function wasteChart(rows){const divisor=rows.some(r=>valid(r.metric)&&r.metric.value>=1000)?1000:1;return verticalChart(rows.map((r,i)=>({label:r.label,metrics:[r.metric],metricKeys:['waste-'+i]})),{divisor});}
 function productChart(products){
  const weights=products.filter(p=>p.unit!=='ลิตร').flatMap(p=>[p.produced,p.sold]),liquids=products.filter(p=>p.unit==='ลิตร').flatMap(p=>[p.produced,p.sold]);
  const divisor=weights.some(m=>valid(m)&&m.value>=1000)?1000:1,left=niceMax(Math.max(0,...weights.filter(valid).map(m=>m.value/divisor))),right=niceMax(Math.max(0,...liquids.filter(valid).map(m=>m.value)));
  return [{columns:[{canvas:[{type:'rect',x:0,y:5,w:8,h:8,color:'#32765f'}],width:12},{text:'ผลิต',width:35},{canvas:[{type:'rect',x:0,y:5,w:8,h:8,color:'#80aebe'}],width:12},{text:'ขาย',width:35}],columnGap:0},verticalChart(products.map(p=>({label:p.label==='สารปรุงดิน'?'ฮิวมิค':p.label,unit:p.unit,metrics:[p.produced,p.sold],divisor:p.unit==='ลิตร'?1:divisor,maximum:p.unit==='ลิตร'?right:left})),{maximum:left,rightMaximum:right,leftUnit:null,rightUnit:null,rightInside:true})];
 }
 // สร้างคำสั่งวางหน้า PDF จากโมเดลที่คำนวณแล้ว ไม่มีการอ่านหรือเขียนชีตในฟังก์ชันนี้
 function buildDefinition(model,letter={}){
  if(!model||!Array.isArray(model.waste)||!Array.isArray(model.products)||!Array.isArray(model.months)||!model.bank||!model.period)throw Error('ข้อมูลรายงาน PDF ไม่ครบ');
  const content=[{text:'งานภูมิทัศน์และสิ่งแวดล้อม\nกองกายภาพและสิ่งแวดล้อม\nสำนักงานอธิการบดี มหาวิทยาลัยมหิดล\nโทร 02-441-4400 ต่อ 1211',bold:false,margin:[0,0,0,12]},
   {columns:[{text:'ที่',width:mm(15)},{text:letter.number||''}],margin:[0,0,0,3]},{columns:[{text:'วันที่',width:mm(15)},{text:letter.date||''}],margin:[0,0,0,3]},
   {columns:[{text:'เรื่อง',width:mm(15)},{text:'สรุปรายงานการจัดการขยะ '+periodLabel(model.period).replace('ประจำเดือน ','ประจำเดือน').replace(' พ.ศ. ',' ')}],margin:[0,4,0,4]},
   {columns:[{text:'เรียน',width:mm(15)},{text:letter.recipient||'ผู้อำนวยการกองกายภาพและสิ่งแวดล้อม'}],margin:[0,0,0,0]},
   {text:'ตามที่งานภูมิทัศน์และสิ่งแวดล้อม ได้ดำเนินงานบริหารจัดการขยะอย่างยั่งยืน ผ่านการคัดแยกขยะ อีกทั้งจัดโครงการธนาคารขยะรีไซเคิล และการผลิตฮิวมัสจากเศษพืช พร้อมทั้งบันทึกสถิติผลการดำเนินงานไว้ในฐานข้อมูลของหน่วยงาน นั้น',leadingIndent:72,alignment:'justify',margin:[0,16.445,0,16.445]},
   {text:'ในการนี้ งานภูมิทัศน์และสิ่งแวดล้อมจึงขอรายงานสรุปผลการดำเนินงาน '+periodLabel(model.period).replace('ประจำเดือน ','ประจำเดือน').replace(' พ.ศ. ',' ')+' ตามข้อมูลที่รวบรวมได้จากฐานข้อมูลปัจจุบัน เพื่อโปรดพิจารณา โดยมีรายละเอียดดังนี้',leadingIndent:72,alignment:'justify',margin:[0,0,0,16.445]},
   heading('1. ปริมาณขยะและวัสดุ ('+(model.waste.some(r=>valid(r.metric)&&r.metric.value>=1000)?'ตัน':'กก.')+')'),wasteChart(model.waste),table(['ประเภทขยะ',...model.waste.map(r=>r.label)],[['ปริมาณ',...model.waste.map((r,i)=>({text:valid(r.metric)?root.HubWasteReportDisplay.weight(r.metric.value):'',alignment:'center',editMetric:'waste-'+i}))]]),
   ...note(model.waste.map(r=>r.metric).filter(m=>m?.status!=='ok'))];
  if(model.waste.some(r=>r.metric?.verifiedSubset))content.push({text:'เศษอาหาร: เฉพาะรายการที่ตรวจได้',fontSize:15,color:'#555555',margin:[0,2,0,3]});
  const wastePos=model.waste.map(r=>r.metric).filter(m=>valid(m)&&m.value>0);if(wastePos.some(m=>m.value/Math.max(...wastePos.map(x=>x.value))<0.025))content.push({text:'แท่งค่าต่ำมีความสูงขั้นต่ำเพื่อให้อ่านง่าย ให้ยึดปริมาณที่ระบุ',fontSize:11,color:'#555555',margin:[0,0,0,4]});
  // หน่วยที่ไม่ใช่กิโลกรัมของธนาคารขยะแสดงแยก ไม่คูณเป็นน้ำหนักเอง
  content.push(...(model.pendingNotes||[]).map(text=>({text:'ข้อมูลรอตรวจ: '+text,fontSize:15,color:'#555555',margin:[0,2,0,3]})));
  content.push(heading('2. ปริมาณผลิตเทียบจำหน่าย',true),...productChart(model.products),...note(model.products.flatMap(p=>[p.produced,p.sold])),heading('3. รายได้จากการจำหน่ายผลิตภัณฑ์'));
  // รวมรายได้จากโมเดลยอดรวมที่ตรวจแล้ว ไม่รวมซ้ำจากแถวผลิตและแถวจำหน่าย
  const revenueData=root.HubReportAnalytics.revenueView(model);
  const revenues=revenueData.products.map(p=>[p.label,valid(p.revenue)?amount(p.revenue)+' บาท':'']);revenues.push([revenueData.totalLabel,valid(revenueData.total)?amount(revenueData.total)+' บาท':'']);
  content.push(table(['ผลิตภัณฑ์','ยอดเงิน (บาท)'],revenues),...note(revenueData.products.map(p=>p.revenue)),...(revenueData.warning?[{text:revenueData.warning,fontSize:15}]:[]),heading('4. ธนาคารขยะ'),table(['รายการ','ปริมาณ / มูลค่า'],[['รับเข้ารีไซเคิล',(valid(model.bank.received)?amount(model.bank.received)+' กก.':'')],['เงินซื้อ',(valid(model.bank.purchase)?amount(model.bank.purchase)+' บาท':'')],['เงินขาย',(valid(model.bank.sale)?amount(model.bank.sale)+' บาท':'')],['ส่วนต่างขาย − ซื้อ',(valid(model.bank.difference)?amount(model.bank.difference)+' บาท':'')]]),...note(Object.values(model.bank)));
  // ตารางรายได้และธนาคารขยะ: ตัวเลขชิดขวาโดยไม่เปลี่ยนค่า
  content.filter(n=>n.table).slice(1,3).forEach(n=>n.table.body.slice(1).forEach(row=>{row[1]=typeof row[1]==='object'?{...row[1],alignment:'right'}:{text:row[1],alignment:'right'};}));

  content.push(heading('5. ยอดซื้อและยอดขายรีไซเคิล 12 เดือน ปี พ.ศ. '+(Number(model.year)+543),true),{columns:[{canvas:[{type:'rect',x:0,y:5,w:8,h:8,color:'#32765f'}],width:12},{text:'ยอดซื้อ',width:45},{canvas:[{type:'rect',x:0,y:5,w:8,h:8,color:'#80aebe'}],width:12},{text:'ยอดขาย',width:45}],columnGap:0},verticalChart(model.months.map(m=>({label:['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][Number(m.month.slice(5,7))-1],metrics:[m.purchase,m.sale]})),{annual:true}),{reportSignature:true,text:'('+(letter.signatory||'นายมนัสชาย ประเดิมชัย')+')\nหัวหน้างานภูมิทัศน์และสิ่งแวดล้อม',alignment:'center',margin:[mm(70),mm(23),0,0],unbreakable:true});
  return {pageBreakBefore:(node,following)=>typeof node.text==='string'&&/^[1-5]\. /.test(node.text)&&following.length<2,pageSize:'A4',pageMargins:[mm(30),mm(20),mm(20),mm(15)],footer:currentPage=>({text:'รหัสเอกสาร (Doc. No.): OPPE-06-F-01-01 | ฉบับที่ (Rev. No.): 00 | วันที่บังคับใช้ (Effective Date): 20/11/2026 | '+currentPage,font:'Sarabun',fontSize:10.5,bold:false,alignment:'right',margin:[mm(15),mm(4),mm(20),0]}),defaultStyle:{font:'Sarabun',fontSize:15,lineHeight:1,bold:false},info:{title:'สรุปรายงานการจัดการขยะ '+periodLabel(model.period).replace('ประจำเดือน ','ประจำเดือน').replace(' พ.ศ. ',' '),author:'งานภูมิทัศน์และสิ่งแวดล้อม'},content: [
   // ตรากึ่งกลางกระดาษ 25 มม. ที่อยู่ชิดขวา ตาม report.css และตัวอย่าง v1.10.1
   ...((root.HubPdfLogo||root.HubPreviewLogo)?[{image:(root.HubPdfLogo||root.HubPreviewLogo),width:mm(25),height:mm(25),absolutePosition:{x:mm(92.5),y:mm(20)}}]:[]),
   {...content[0],bold:false,alignment:'right',margin:[0,mm(12)+20,0,20]},...content.slice(1)
  ]};
 }
 // โหลดไลบรารี PDF และฟอนต์เมื่อกดดาวน์โหลดเท่านั้น ไม่โหลดหนักตั้งแต่เปิดแอป
 let loading;
 function loadScript(url){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>reject(Error('โหลดเครื่องมือ PDF ไม่สำเร็จ'));document.head.appendChild(s);});}
 // ฝังฟอนต์ Sarabun ใน PDF ให้ตัวอักษรไทยแสดงได้บนเครื่องที่ไม่มีฟอนต์ติดตั้ง
 // แบ่งคำไทยเฉพาะสำเนาที่ส่งเข้า PDF เพื่อหาจุดตัดบรรทัด ไม่เติมช่องว่างในข้อความจริง
 function prepareForPdf(def){
  const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('th',{granularity:'word'}):null;
  const copy=v=>{if(Array.isArray(v))return v.map(copy);if(!v||typeof v!=='object')return v;const out={};for(const k of Object.keys(v))out[k]=copy(v[k]);if(out.table?.body){const rows=out.table.body;const text=v=>typeof v==='object'?v.text:v;const bank=rows.some(r=>/^รับเข้ารีไซเคิล/.test(String(text(r[0]))));const income=String(text(rows[0]?.[0]))==='ผลิตภัณฑ์';if(String(text(rows[0]?.[0]))==='ประเภทขยะ')rows.slice(1).forEach(r=>r.forEach((v,i)=>{r[i]=typeof v==='object'?{...v,alignment:'center'}:{text:v,alignment:'center'};}));if(bank||income)rows.slice(1).forEach((r,i)=>{if(bank){const label=String(text(r[0])).replace(/\s*\(\s*(?:กก\.?|กิโลกรัม|บาท)\s*\)/g,'');r[0]=typeof r[0]==='object'?{...r[0],text:label}:label;}const raw=String(text(r[1]));const unit=bank&&i===0?'กก.':'บาท';const value=raw.trim()===''?raw:raw.replace(/\s*(บาท|กิโลกรัม|กก\.)$/,'')+' '+unit;r[1]={...(typeof r[1]==='object'?r[1]:{}),text:value,alignment:'right'};});}if(out.leadingIndent&&typeof out.text==='string'){out.alignment='justify';if(segmenter)out.text=[...segmenter.segment(out.text.replace(/\u200b/g,''))].map(x=>x.segment).join('\u200b');}return out;};
  const result=copy(def);
  if(Array.isArray(result.content))result.content.forEach(n=>{if(n.text==='4. ธนาคารขยะ')n.text='4. รายงานผลการจัดการธนาคารขยะรีไซเคิล';});
  // Equal breathing room between sections 2, 3 and 4, PDF only.
  if(Array.isArray(result.content))result.content.forEach(n=>{if(typeof n.text==='string'&&/^[34]\.\s/.test(n.text))n.margin=[0,n.text.startsWith('4.')?37:22,0,5];});
  // PDF section headings only: bold, without parenthesized measurement units.
  if(Array.isArray(result.content))result.content.forEach(n=>{if(typeof n.text==='string'&&/^[1-5]\.\s/.test(n.text)){n.bold=true;n.text=n.text.replace(/\s*\(\s*(?:กก\.?|กิโลกรัม|ตัน|ลิตร|บาท)\s*\)/g,'');}});
  if(Array.isArray(result.content)){
   result.content=result.content.filter(n=>!['รีไซเคิล: สรุปเฉพาะน้ำหนักที่ระบุเป็นกิโลกรัม ไม่แปลงหน่วยอื่นเป็นน้ำหนัก','ยังไม่มีข้อมูลนำเข้าของเดือนที่เลือก จึงไม่ใช้ยอดเดือนอื่นแทน'].includes(String(n.text||'').trim()));
   for(const prefix of ['2. ปริมาณผลิตเทียบจำหน่าย','5. ยอดซื้อและยอดขายรีไซเคิล']){
    const i=result.content.findIndex(n=>typeof n.text==='string'&&n.text.startsWith(prefix));
    if(i>=0&&result.content[i+1]?.columns){const h=result.content[i],legend=result.content[i+1];const title={...h,width:'*',margin:0};delete title.pageBreak;result.content.splice(i,2,{columns:[title,{...legend,width:prefix.startsWith('5.')?120:110,margin:0}],columnGap:12,margin:h.margin,pageBreak:h.pageBreak,unbreakable:true});}
   }
  }
  // SVG-to-PDF does not shape Thai combining marks. Keep chart geometry as SVG,
  // but render category labels with native pdfmake text and the embedded Thai font.
  if(Array.isArray(result.content))result.content=result.content.map(n=>{
   if(!n.svg||!n.editChart)return n;
   const groups=n.editChart.groups,options=n.editChart.options||{},fontSize=options.annual?12:15;
   const plotWidth=mm(160)-(options.rightMaximum&&!options.rightInside?35:0);
   const labelText=new Set(groups.map(g=>xml(g.label)));
   const svg=n.svg.replace(/<text\b[^>]*>([\s\S]*?)<\/text>/g,(t,value)=>labelText.has(value)?'':t);
   const lineHeight=fontSize*1.0963333333333334;
   const labels={columns:groups.map(g=>({text:g.label,font:'Sarabun',fontSize,bold:false,alignment:'center',width:plotWidth/groups.length,noWrap:true})),columnGap:0,relativePosition:{x:35,y:-22},margin:[0,0,0,-lineHeight]};
   return {stack:[{svg,width:n.width},labels],margin:n.margin,unbreakable:true,reportChart:true};
  });
  if(Array.isArray(result.content)){const i=result.content.findIndex(n=>n.table?.body?.[0]?.[0]?.text==='ประเภทขยะ');if(i>0&&result.content[i-1].reportChart){const chart=result.content[i-1],tbl=result.content[i];tbl.margin=[0,11,0,10];result.content.splice(i-1,2,{stack:[chart,tbl],unbreakable:true});}}
  if(Array.isArray(result.content)){const i=result.content.findIndex(n=>n.reportSignature);if(i>=0)result.content.splice(i,0,{text:"จึงเรียนมาเพื่อโปรดทราบ",leadingIndent:72,alignment:"left",margin:[0,16.445,0,0]});}
  return result;
 }
 function configure(pdf,fonts){if(!pdf||!fonts)throw Error('เครื่องมือ PDF หรือฟอนต์ไทยไม่พร้อม');if(!pdf._thaiReportPrepared){const original=pdf.createPdf.bind(pdf);pdf.createPdf=(def,...args)=>original(prepareForPdf(def),...args);pdf._thaiReportPrepared=true;}pdf.addVirtualFileSystem(fonts);pdf.fonts={Sarabun:{normal:'THSarabunNew.ttf',bold:'THSarabunNewBold.ttf',italics:'THSarabunNew.ttf',bolditalics:'THSarabunNewBold.ttf'}};return pdf;}
 async function download(options){
  if(!options?.ready||!options.input?.datasets||(!Object.keys(options.input.datasets).length&&options.allowManualDraft!==true)||!root.HubReportAnalytics)throw Error('ยังโหลดข้อมูลรายงานจริงไม่สำเร็จ');
  // ตรวจว่าผู้ใช้ยังอยู่ช่วงรายงานเดิมหลังรอโหลด/สร้างไฟล์ ป้องกันดาวน์โหลดข้อมูลคนละช่วง
  const current=()=>!options.isCurrent||options.isCurrent();if(!current())throw Error('ช่วงรายงานเปลี่ยน กรุณาลองใหม่');
  if(!loading)loading=(async()=>{await loadScript('assets/vendor/pdfmake/pdfmake.min.js');await loadScript('assets/vendor/pdfmake/sarabun-vfs.js');return configure(root.pdfMake,root.HubPdfFonts);})().catch(e=>{loading=null;throw e;});
  const pdf=await loading;if(!current())throw Error('ช่วงรายงานเปลี่ยน กรุณาลองใหม่');
  const model=root.HubReportAnalytics.build(options.input,options.period,options.mappings||{});let definition=buildDefinition(model,options.letter);
  if(!root.HubReportEdit)await loadScript('common/report-edit.js');
  definition=root.HubReportEdit.prepared(definition,'waste:'+options.period.type+':'+options.period.value);if(!definition)return {canceled:true};if(!current())throw Error('ช่วงรายงานเปลี่ยน กรุณาลองใหม่');
  // สร้างไฟล์ให้เสร็จและตรวจ session อีกครั้งก่อนเปิดการดาวน์โหลด ไม่อ้างว่าบันทึกลงเครื่องสำเร็จแล้ว
  const buffer=await new Promise((resolve,reject)=>{try{const timer=setTimeout(()=>reject(Error('สร้าง PDF นานเกินกำหนด กรุณาลองใหม่')),45000);pdf.createPdf(definition).getBuffer(buffer=>{clearTimeout(timer);resolve(buffer);});}catch(e){reject(e);}});
  // สร้าง URL ชั่วคราวสำหรับไฟล์ในเครื่องแล้วคืนหน่วยความจำภายหลัง ไม่อัปโหลด PDF เข้า Drive
  if(!current())throw Error('ช่วงรายงานเปลี่ยน ยกเลิกดาวน์โหลด');const blob=new Blob([buffer],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='รายงานขยะ-'+options.period.value+'.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);return {downloadStarted:true};
 }
 root.HubReportPdf={buildDefinition,download,configure,verticalChart,prepareForPdf};if(typeof module!=='undefined')module.exports=root.HubReportPdf;
})(typeof window!=='undefined'?window:globalThis);
