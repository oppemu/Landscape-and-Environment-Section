(() => {
  'use strict';
  const pag=typeof module!=='undefined'?require('./pa-pagination.js'):window.PaPagination;
  const key=/^[A-Za-z0-9_-]{1,64}$/;
  const validKey=v=>typeof v==='string'&&key.test(v);
  const months=/^20\d{2}-(0[1-9]|1[0-2])$/;
  const text=v=>typeof v==='string'?v.normalize('NFC').trim().replace(/\s+/gu,' '):'';
  const digits=s=>s.replace(/[๐-๙]/g,c=>String(c.charCodeAt(0)-0xe50));
  function period(now=new Date(),offset=-1){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'numeric'}).formatToParts(now);
    const year=Number(parts.find(p=>p.type==='year').value),month=Number(parts.find(p=>p.type==='month').value);
    const prev=new Date(Date.UTC(year,month-1+(offset===0?0:-1),1));
    return {month:prev.toISOString().slice(0,7),label:'ประจำเดือน '+prev.toLocaleString('th-TH',{timeZone:'UTC',month:'long'})+' พ.ศ. '+(prev.getUTCFullYear()+543)};
  }
  function periodFor(value){
    if(!months.test(value||''))return null;
    const point=new Date(value+'-01T00:00:00Z');
    return {month:value,label:'ประจำเดือน '+point.toLocaleString('th-TH',{timeZone:'UTC',month:'long'})+' พ.ศ. '+(point.getUTCFullYear()+543)};
  }
  const topicLabel=s=>digits(text(s)).replace(/^[1-9]\d*(?:\.\d+)*\.?\s+/u,'')
    .replace(/\s*\([0-9]+(?:\.[0-9]+)?%?\)\s*$/u,'').trim().toLocaleLowerCase('th');
  const fallback=s=>/^[1-9]\d*\.\s+/u.test(digits(text(s)))&&topicLabel(s)==='งานที่ได้รับมอบหมาย';
  function sourceIndex(pages){
    const keys=new Map(), parent=[];
    for(const p of pages)for(const r of p.rows)for(const l of r.agreement){
      const code=pag.heading(l);
      if(code){if(!keys.has(code))keys.set(code,[]);keys.get(code).push(topicLabel(l.text));}
      else if(fallback(l.text))parent.push({code:digits(text(l.text)).match(/^\d+/)[0],line:l});
    }
    const rendered=new Set(pag.paginate(pages).map(p=>p.topic));
    const bound=new Map();
    for(const p of pages)for(const r of p.rows)for(const l of r.agreement)if(validKey(l.reportKey))bound.set(l.reportKey,l.text);
    return {keys,parent,rendered,bound};
  }
  function safeImage(photo){
    if(!photo||!['image/jpeg','image/png'].includes(photo.mimeType)||typeof photo.data!=='string'||photo.data.length<12||
      photo.data.length>4000000||photo.data.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(photo.data))throw Error('PA evidence bytes');
    const head=atob(photo.data.slice(0,12)),sig=photo.mimeType==='image/png'?[137,80,78,71,13,10,26,10]:[255,216,255];
    if(!sig.every((n,i)=>head.charCodeAt(i)===n))throw Error('PA evidence signature');
    return 'data:'+photo.mimeType+';base64,'+photo.data;
  }
  function group(response,{month,displayName,pages,publicSummary=false}){
    if(!months.test(month)||response?.version!==1||response?.ok!==true||response.complete!==true||response.month!==month||
       !validKey(response.employeeKey)||!text(displayName)||text(response.displayName)!==text(displayName)||!Array.isArray(response.items)||response.items.length>24)throw Error('PA evidence envelope');
    const {keys,parent,rendered}=sourceIndex(pages), reports=new Set(), evidence=new Map();
    let totalBytes=0, photoCount=0;
    for(const r of response.items){
      const work=String(r?.workDate||'');
      const actual=new Date(work+'T00:00:00Z');
      if((typeof r?.reportId!=='string'||!/^pa_[a-f0-9]{64}$/.test(r.reportId))||reports.has(r.reportId)||!validKey(r.assignmentKey)||
         !/^20\d{2}-\d{2}-\d{2}$/.test(work)||!Number.isFinite(actual.getTime())||actual.toISOString().slice(0,10)!==work||
         work.slice(0,7)!==month||typeof r.topicCode!=='string'||typeof r.assignmentLabel!=='string'||
         typeof r.description!=='string'||!r.description.trim()||r.description.length>1500||
         !Array.isArray(r.photos)||(publicSummary?(r.photos.length!==0||r.attribution!=='self_reported'):(!r.photos.length||r.photos.length>3)))throw Error('PA evidence item');
      reports.add(r.reportId);
      const code=digits(r.topicCode), label=topicLabel(r.assignmentLabel);
      const candidates=keys.get(code)||[];
      const isFallback=r.placement==='assigned-work';
      const route=isFallback
        ?parent.length===1&&parent[0].code===code&&label===topicLabel(parent[0].line.text)?'assigned:'+code:null
        :r.placement==='topic'&&rendered.has(code)&&candidates.length===1&&candidates[0]===label?code:null;
      if(!route)throw Error('PA evidence topic mismatch');
      if(publicSummary){
        evidence.set(route,[...(evidence.get(route)||[]),{reportId:r.reportId,description:r.description,assignmentKey:r.assignmentKey,metadataOnly:true}]);
        continue;
      }
      const pictures=r.photos.map(photo=>{
        const src=safeImage(photo);
        totalBytes+=src.length;photoCount++;
        if(totalBytes>12500000||photoCount>48)throw Error('PA evidence limit');
        return {src,reportId:r.reportId,caption:r.description};
      });
      evidence.set(route,[...(evidence.get(route)||[]),...pictures]);
    }
    return evidence;
  }

  function groupPhotoMedia(response,{month,displayName,pages}){
    if(!months.test(month)||![1,2].includes(response?.version)||response.ok!==true||
       response.month!==month||text(response.displayName)!==text(displayName)||
       !text(displayName)||!Array.isArray(response.items)||response.items.length>24||
       typeof response.complete!=='boolean')throw Error('PA photo envelope');
    const {keys,parent,rendered,bound}=sourceIndex(pages), photos=new Map();
    let count=0,total=0;
    for(const row of response.items){
      if(typeof row?.topicCode!=='string'||typeof row.assignmentLabel!=='string'||!validKey(row.assignmentKey)||
         typeof row.workDate!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(row.workDate)||row.workDate.slice(0,7)!==month||
         !Array.isArray(row.photos)||!row.photos.length||row.photos.length>3)throw Error('PA photo item');
      const code=digits(row.topicCode), label=topicLabel(row.assignmentLabel), candidates=keys.get(code)||[];
      const explicit='report:'+row.assignmentKey;
      const matched=bound.size?(topicLabel(bound.get(row.assignmentKey))===label&&['topic','assigned-work'].includes(row.placement)?explicit:null):row.placement==='assigned-work'
       ?parent.length===1&&parent[0].code===code&&label===topicLabel(parent[0].line.text)?'assigned:'+code:null
       :row.placement==='topic'&&rendered.has(code)&&candidates.length===1&&candidates[0]===label?code:null;
      // The private monthly feed verifies this exact employee and assignment against the Sheet and PA roster.
      // If an older template has no matching row, keep the source heading in a separate appendix.
      const approvedPlacement=['topic','assigned-work'].includes(row.placement);
      if(!approvedPlacement||!/^([1-9]\d*)(?:\.\d+)*$/.test(code)||!label||row.assignmentLabel.length>300)throw Error('PA photo topic mismatch');
      if(bound.has(row.assignmentKey)&&!matched)throw Error('PA photo assignment mismatch');
      const dest=matched||(response.version===2?'source:'+row.assignmentKey:null);
      if(!dest)throw Error('PA photo topic mismatch');
      if(row.workDetails!==undefined&&(typeof row.workDetails!=='string'||row.workDetails.length>5000))throw Error('PA work details');
      const caption=typeof row.workDetails==='string'?row.workDetails.trim():'';
      const images=row.photos.map((photo,index)=>{
        const src=safeImage(photo);
        const bytes=photo.data.length/4*3-(photo.data.endsWith('==')?2:photo.data.endsWith('=')?1:0);
        if(++count>3||bytes>2000000||(total+=bytes)>6000000)throw Error('PA photo limit');
        return {src,workDate:row.workDate,caption:index===0?caption:'',assignmentLabel:row.assignmentLabel};
      });
      photos.set(dest,[...(photos.get(dest)||[]),...images]);
    }
    return {photos,count,complete:response.complete};
  }

  async function monthlyPhotoMedia(fetchPage,{month,displayName,pages,continueLoading=()=>true}){
    const photos=new Map();
    const headings=new Map();
    let offset=0,snapshot=null,count=0,reportCount=null,complete=true,chars=0;
    for(let round=0;round<250;round++){
      if(!continueLoading())throw Error('PA month changed');
      const raw=await fetchPage(offset,snapshot);
      if(!continueLoading())throw Error('PA month changed');
      const result=groupPhotoMedia(raw,{month,displayName,pages});
      if(raw.version===1){if(round)throw Error('PA page protocol changed');return result;}
      if(!/^[A-Za-z0-9_-]{43}$/.test(raw.snapshot||'')||raw.offset!==offset||(snapshot&&raw.snapshot!==snapshot)||
        !Number.isInteger(raw.reportCount)||raw.reportCount<offset||raw.reportCount>250||(reportCount!==null&&reportCount!==raw.reportCount)||
        (raw.nextOffset!==null&&(!Number.isInteger(raw.nextOffset)||raw.nextOffset<=offset||raw.nextOffset>raw.reportCount||raw.nextOffset-offset>3))||
        raw.items.length>(raw.nextOffset===null?raw.reportCount:raw.nextOffset)-offset||
        (raw.nextOffset===null&&raw.reportCount-offset>3)||
        (result.complete&&raw.items.length!==(raw.nextOffset===null?raw.reportCount:raw.nextOffset)-offset))throw Error('Invalid PA month slice');
      snapshot=raw.snapshot;reportCount=raw.reportCount;complete=complete&&result.complete;
      count+=result.count;
      for(const [key,images] of result.photos){
        for(const image of images){chars+=image.src.length;if(chars>180000000)throw Error('PA monthly memory limit');}
        const label=images[0]?.assignmentLabel;
        if(!label||images.some(image=>image.assignmentLabel!==label)||(headings.has(key)&&headings.get(key)!==label))throw Error('PA monthly heading mismatch');
        headings.set(key,label);
        const dst=photos.get(key)||[];dst.push(...images);photos.set(key,dst);
      }
      if(raw.nextOffset===null)return {photos,count,complete};
      offset=raw.nextOffset;
    }
    throw Error('PA monthly page limit');
  }

  function previewLinks(result, report, month){
    if(result?.ok!==true||result.version!==1||result.month!==month||result.reportId!==report.reportId||result.assignmentKey!==report.assignmentKey||
       !Array.isArray(result.photos)||result.photos.length>3)throw Error('PA preview response');
    const seen=new Set();
    return result.photos.map(photo=>{
      if(!['image/png','image/jpeg'].includes(photo?.mimeType)||typeof photo.href!=='string'||
         !/^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]{20,100}\/view$/.test(photo.href)||seen.has(photo.href))throw Error('PA preview URL');
      seen.add(photo.href);
      return {drivePreview:photo.href.slice(0,-4)+'preview',driveViewer:photo.href,reportId:report.reportId};
    });
  }
  if(typeof module!=='undefined')module.exports={period,periodFor,group,previewLinks,groupPhotoMedia,monthlyPhotoMedia};
  else window.PaEvidence=Object.freeze({period,periodFor,group,previewLinks,groupPhotoMedia,monthlyPhotoMedia});
})();