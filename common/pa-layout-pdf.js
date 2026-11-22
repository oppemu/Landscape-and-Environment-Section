(() => {
  'use strict';
  const pxToPt = 0.75, size = 18 * pxToPt, mm=n=>n*72/25.4;
  const pageW=841.89, bodyW=pageW-mm(13)-mm(26);
  const pagination=typeof module!=='undefined'?require('./pa-pagination.js'):window.PaPagination;
  const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('th',{granularity:'word'}):null;
  const splitThai=text=>segmenter?[...segmenter.segment(text)].map(x=>x.segment).join('\u200b'):text;
  function fromDocument(root) {
    return Array.from(root.querySelectorAll('.pa-paper'), page => ({
      title:page.querySelector('.pa-paper-title')?.textContent||'',
      name:page.querySelector('.pa-paper-name')?.textContent||'',
      period:page.querySelector('.pa-paper-period')?.textContent||'',
      templateNotice:page.querySelector('.pa-paper-template-notice')?.textContent||'',
      signatureOnly:page.classList.contains('pa-signature-only'),
      signatures:Array.from(page.querySelectorAll('.pa-signature-person'),person=>Array.from(person.children,line=>line.textContent)),
      widths:Array.from(page.querySelectorAll('colgroup col'), col=>Number.parseFloat(col.style.width)),
      headers:Array.from(page.querySelectorAll('thead th'), th=>th.textContent),
      rows:Array.from(page.querySelectorAll('tbody tr'), row=>Array.from(row.cells, cell=>
        Array.from(cell.children).filter(line=>!line.classList.contains('pa-proof')).map(line=>({text:line.textContent,bold:line.tagName==='STRONG'})))),
      evidence:!!page.querySelector('.pa-proof'),
      photos:Array.from(page.querySelectorAll('.pa-proof-item'), item=>{const image=item.querySelector('img');return {src:image.getAttribute('src'),width:image.naturalWidth,height:image.naturalHeight,caption:item.querySelector('.pa-proof-caption')?.textContent||''};})
    }));
  }
  function definition(pages, logo) {
    if(!Array.isArray(pages)||(!pages.length||pages.length>128)||pages.some(p=>!p.signatureOnly&&(p.headers.length!==3||!p.rows.length||p.rows.some(row=>row.length!==3))))throw Error('Invalid PA paper layout');
    const content=pages.map((page,index)=>{
      const data=[];
      if(index===0&&logo)data.push({image:logo,width:mm(19),absolutePosition:{x:(pageW-mm(19))/2,y:mm(10)}});
      if(page.title)data.push({text:splitThai(page.title),bold:true,alignment:'center',margin:[mm(13),logo?mm(8):0,0,page.period?0:logo?4-mm(1):4]});
      if(page.period)data.push({text:splitThai(page.period),alignment:'center',margin:[mm(13),0,0,logo?4-mm(1):4]});
      if(page.name)data.push({text:splitThai(page.name),alignment:'center',margin:[mm(13),0,0,page.templateNotice?0:6]});
      if(page.templateNotice)data.push({text:splitThai(page.templateNotice),bold:true,alignment:'center',margin:[mm(13),0,0,6]});
      const ws=Array.isArray(page.widths)&&page.widths.length===3&&page.widths.every(x=>Number.isFinite(x)&&x>=8&&x<=75)&&Math.abs(page.widths.reduce((a,b)=>a+b,0)-100)<=.5?page.widths:[33,51,16];
      const sum=ws.reduce((a,b)=>a+b,0);
      function proof(){
        const photos=(Array.isArray(page.photos)?page.photos:[]).map(ref=>typeof ref==='string'?{src:ref}:ref);
        if(photos.length>4||photos.some(p=>typeof p?.src!=='string'||!/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+=*$/i.test(p.src)))throw Error('Invalid PA evidence');
        if(!photos.length)return {text:'',margin:[0,32,0,0]};
        const columns=photos.length===1?1:2,slot=pagination.photoSlot(photos.length),cellW=ws[1]/sum*bodyW-9,gap=mm(pagination.PHOTO_LAYOUT.gapMm);
        const width=Math.min(mm(slot.widthMm),(cellW-gap*(columns-1))/columns),height=mm(slot.heightMm),result=[];
        for(let i=0;i<photos.length;i+=columns){
          const row=photos.slice(i,i+columns);if(i)result.push({text:'',margin:[0,gap,0,0]});
          result.push({columns:row.map(photo=>{
            const lines=photo.caption?[{text:splitThai(photo.caption),margin:[0,0,0,3]}]:[];
            const fitHeight=photo.width>0&&photo.height>0?Math.min(height,width*photo.height/photo.width):height;
            lines.push({table:{widths:[width],heights:()=>height,
              body:[[{image:photo.src,fit:[width,height],alignment:'center',margin:[0,(height-fitHeight)/2,0,0]}]]},
              layout:{hLineWidth:()=>0,vLineWidth:()=>0,paddingTop:()=>0,paddingBottom:()=>0,paddingLeft:()=>0,paddingRight:()=>0}});
            return {width,stack:lines};
          }),columnGap:gap,margin:[(cellW-(width*columns+gap*(columns-1)))/2,0,0,0]});
        }
        return {stack:result,margin:[0,4,0,0]};
      }
      if(!page.signatureOnly)data.push({table:{
        headerRows:1,dontBreakRows:true,widths:ws.map(x=>x/sum*bodyW-9),
        heights:row=>row===0?19:((page.signatures?.length?226:page.title?338:390)/page.rows.length),
        body:[page.headers.map(text=>({text:splitThai(text),alignment:'center',bold:true})),
          ...page.rows.map((row,ri)=>row.map((entries,ci)=>{
            const stack=entries.map(line=>({text:splitThai(line.text),bold:line.bold}));
            if(page.evidence&&ri===0&&ci===1)stack.push(proof());
            return stack.length?{stack}:'';
          }))]
      },layout:{hLineWidth:()=>.6,vLineWidth:()=>.6,hLineColor:()=>'#151515',vLineColor:()=>'#151515',
        paddingTop:()=>3,paddingBottom:()=>3,paddingLeft:()=>4,paddingRight:()=>4}});
      if(page.signatures?.length){const columns=page.signatures.map(lines=>({width:'*',stack:lines.map(text=>({text:splitThai(text),alignment:'center',margin:[0,0,0,2]}))}));data.push({columns,margin:[0,page.signatureOnly?275:12,0,0]});}
      return {stack:data,...(index?{pageBreak:'before'}:{})};
    });
    return {pageSize:'A4',pageOrientation:'landscape',pageMargins:[mm(13),mm(23),mm(26),mm(18)],
      defaultStyle:{font:'Sarabun',fontSize:size,lineHeight:1.12,color:'#000000'},
      footer:page=>({text:String(page),alignment:'center',margin:[0,mm(7),0,0]}),
      info:{title:'PA Landscape'},content};
  }
  if(typeof module!=='undefined')module.exports={definition,fromDocument};
  if(typeof window==='undefined')return;
  const el=document.getElementById('pa-layout-download'), mount=document.getElementById('pa-layout-pages'), error=document.getElementById('pa-layout-pdf-error');
  if(!el||!mount||!error)return;
  let loading;
  const load=url=>new Promise((yes,no)=>{const script=document.createElement('script');script.src=url;script.onload=yes;script.onerror=no;document.head.append(script);});
  async function ready(){
    if(!loading)loading=(async()=>{
      if(!window.pdfMake)await load('assets/vendor/pdfmake/pdfmake.min.js');
      if(!window.HubPdfFonts)await load('assets/vendor/pdfmake/sarabun-vfs.js');
      return window.HubReportPdf.configure(window.pdfMake,window.HubPdfFonts);
    })().catch(e=>{loading=null;throw e;});
    return loading;
  }
  async function crest(){
    const response=await fetch('assets/report-reference/logo-MU_blackwhite.png',{credentials:'same-origin'});
    if(!response.ok)throw Error('PA crest unavailable');
    const blob=await response.blob();
    return new Promise((yes,no)=>{const reader=new FileReader();reader.onload=()=>yes(reader.result);reader.onerror=no;reader.readAsDataURL(blob);});
  }
  el.addEventListener('click',async()=>{
    if(el.disabled||mount.dataset.templateAvailable==='false')return;
    el.disabled=true;error.hidden=true;
    try{
      const month=mount.dataset.documentMonth, pages=fromDocument(window.PaDraft?.project(mount.paPdfSnapshot||mount)||(mount.paPdfSnapshot||mount)), [pdf,logo]=await Promise.all([ready(),crest()]), def=definition(pages,logo);
      const bytes=await new Promise((yes,no)=>{
        const timeout=setTimeout(()=>no(Error('PDF timeout')),20000);
        try{pdf.createPdf(def).getBuffer(result=>{clearTimeout(timeout);yes(result);});}
        catch(e){clearTimeout(timeout);no(e);}
      });
      if(!bytes||bytes.length<6||[37,80,68,70,45].some((n,i)=>bytes[i]!==n))throw Error('Invalid PDF');
      if(location.hash!=='#pa-online'||mount.dataset.templateAvailable==='false'||month!==mount.dataset.documentMonth||pages[0]?.name!==mount.querySelector('.pa-paper-name')?.textContent)return;
      const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})), anchor=document.createElement('a');
      anchor.href=url;anchor.download='แบบรายงาน-PA-'+month+(mount.paPdfSnapshot?'-ไม่รวมรูป':pages[0]?.templateNotice?'-เฉพาะแบบ':'')+'.pdf';document.body.append(anchor);anchor.click();anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(_){if(location.hash==='#pa-online')error.hidden=false;}
    finally{el.disabled=mount.dataset.templateAvailable==='false';}
  });
})();