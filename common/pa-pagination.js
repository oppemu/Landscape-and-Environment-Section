(() => {
  'use strict';
  const MAX_PAGES=512, MAX_PHOTOS=4;
  const PHOTO_LAYOUT=Object.freeze({one:Object.freeze({widthMm:126,heightMm:100}),two:Object.freeze({widthMm:126,heightMm:52}),gapMm:2});
  const photoSlot=count=>count===1?PHOTO_LAYOUT.one:PHOTO_LAYOUT.two;
  const mm=n=>n*72/25.4;
  const thaiDigits=s=>s.replace(/[๐-๙]/g,c=>String(c.charCodeAt(0)-0xe50));
  const heading=line=>{
    const text=thaiDigits(String(line?.text||'')).trim();
    const code=/^([1-9]\d*(?:\.\d+)+)\.?(?=\s|[^0-9.]|$)/u.exec(text)?.[1];
    return code||null;
  };
  const boundedDrive=photo=>typeof photo?.drivePreview==='string'&&/^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]{20,100}\/preview$/.test(photo.drivePreview)&&photo.driveViewer===photo.drivePreview.slice(0,-7)+'view';
  const isPhoto=photo=>boundedDrive(photo)||typeof photo?.src==='string'&&/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+=*$/i.test(photo.src)&&photo.src.length<=4500000;
  function paginate(source,evidenceByTopic=null) {
    if(!Array.isArray(source)||!source.length)return [];
    const output=[];
    const reportRows=source.map(page=>({...page,rows:page.rows.flatMap(row=>{
      if(!(evidenceByTopic instanceof Map))return [row];
      const assigned=row.agreement.filter(line=>{
        const label=thaiDigits(String(line.text||'')).trim();
        const prefix=/^([1-9]\d*)\.\s+งานที่ได้รับมอบหมาย(?:\s*\([0-9]+(?:\.[0-9]+)?%?\))?$/u.exec(label);
        return prefix&&evidenceByTopic.has('assigned:'+prefix[1]);
      });
      if(assigned.length!==1)return [row];
      const code=thaiDigits(assigned[0].text.trim()).match(/^\d+/)[0];
      return [{agreement:assigned,target:[],assignedKey:'assigned:'+code},row];
    })}));
    for(const page of reportRows)for(const row of page.rows){
      const lines=row.agreement, positions=lines.length===1&&/^[A-Za-z0-9_-]{1,64}$/.test(lines[0].reportKey||'')?[{code:'report:'+lines[0].reportKey,index:0}]:row.assignedKey?[{code:row.assignedKey,index:0}]:lines.map((line,index)=>({code:heading(line),index})).filter(x=>x.code);
      if(!positions.length){output.push({widths:page.widths,topic:null,rows:[row],photos:[],evidence:true});continue;}
      const leaves=positions.filter((p,i)=>!(positions[i+1]?.code.startsWith(p.code+'.')));
      // Keep hierarchy and unnumbered leading notes exactly once; never infer evidence under parent headings.
      // Parent text between leaf headings moves to its own first child, rather than attaching to the preceding task.
      const starts=leaves.map((leaf,i)=>{
        if(i===0)return 0;
        const prior=leaves[i-1];
        return positions.find(p=>p.index>prior.index&&p.index<leaf.index&&leaf.code.startsWith(p.code+'.'))?.index??leaf.index;
      });
      const goals=new Map(leaves.map(leaf=>[leaf.code,[]]));
      let goalCode=leaves[0].code;
      for(const line of row.target||[]){
        const marker=heading(line);
        if(goals.has(marker))goalCode=marker;
        goals.get(goalCode).push(line);
      }
      leaves.forEach((leaf,i)=>{
        const agreement=lines.slice(starts[i],starts[i+1]??lines.length);
        const target=goals.get(leaf.code);
        const raw=evidenceByTopic instanceof Map?evidenceByTopic.get(leaf.code):undefined;
        const captioned=new Set();
        const photos=(Array.isArray(raw)?raw.filter(isPhoto):[]).map(photo=>{
          const text=typeof photo.caption==='string'?photo.caption.trim().slice(0,1500):'';
          const id=typeof photo.reportId==='string'&&photo.reportId?photo.reportId:null;
          if(!text||id&&captioned.has(id))return {...photo,caption:''};
          if(id)captioned.add(id);
          return {...photo,caption:text};
        });
        const middle=Number(page.widths?.[1])||51;
        const letters=Math.max(18,Math.floor(middle*1.15));
        const targetLines=target.reduce((total,line)=>total+Math.max(1,Math.ceil(Array.from(line.text).length/letters)),0);
        const budget=Math.max(0,(output.length===0?350:410)-targetLines*16);
        const groups=[];
        const metadata=Array.isArray(raw)?raw.filter(item=>item?.metadataOnly===true&&typeof item.description==='string'):[], reportLines=[];
        if(metadata.length){
          for(const report of metadata){
            const chars=Array.from(report.description), maxChars=Math.max(120,letters*12);
            let firstLine=true;
            while(chars.length){reportLines.push({text:(firstLine?'รายงานตามที่ผู้รายงานระบุ: ':'')+chars.splice(0,maxChars).join(''),bold:false});firstLine=false;}
          }
        }
        const firstSummaryLines=reportLines.length?Math.ceil(Array.from(reportLines[0].text).length/letters):0;
        const photoBudget=Math.max(0,budget-(firstSummaryLines&&firstSummaryLines<=Math.floor(budget/24)?firstSummaryLines*16:0));
        const boxHeight=list=>{
          const columns=list.length===1?1:2, slot=photoSlot(list.length), wrap=Math.max(12,Math.floor(letters/columns));
          let h=0;
          for(let i=0;i<list.length;i+=columns){const row=list.slice(i,i+columns);h+=mm(slot.heightMm+(i?PHOTO_LAYOUT.gapMm:0))+Math.max(...row.map(image=>Math.ceil(Array.from(image.caption||'').length/wrap)*16));}
          return h;
        };
        let offset=0, first=true;
        do{
          const remaining=first?photoBudget:410, single=photos.slice(offset,offset+1);
          let fitting=[];
          for(let size=Math.min(MAX_PHOTOS,photos.length-offset);size>=1;size--){
            const group=photos.slice(offset,offset+size);
            if(boxHeight(group)<=remaining){fitting=group;break;}
          }
          if(fitting.length){groups.push({images:fitting});offset+=fitting.length;
          } else if(single.length&&!first){
            // An unusually long description gets its own continuation. Never shrink the next photo slot.
            const [image]=single, chars=Array.from(image.caption||''), chunkSize=letters*20;
            while(chars.length)groups.push({images:[],captionOnly:chars.splice(0,chunkSize).join('')});
            groups.push({images:[{...image,caption:''}]});offset++;
          } else groups.push({images:[]});
          first=false;
        }while(offset<photos.length);
        if(reportLines.length){
          const firstRoom=Math.max(0,Math.floor(budget/24));
          if(firstRoom>0&&Math.ceil(Array.from(reportLines[0].text).length/letters)<=firstRoom)groups[0].summary=[reportLines.shift()];
          for(const item of reportLines)groups.push({images:[],summary:[item]});
        }
        groups.forEach(({images,captionOnly,summary=[]},ci)=>{
          output.push({widths:page.widths,topic:leaf.code,continuation:ci>0,photos:images,captionOnly,photoBudget:ci===0?budget:252,evidence:true,
            rows:[{agreement:ci===0?agreement:[lines[leaf.index],{text:'ภาพหลักฐานต่อเนื่อง',bold:false}],target:ci===0?[...target,...summary]:summary}]});
        });
      });
    }
    if(output.length>MAX_PAGES)throw Error('PA page limit');
    return output.map((page,i)=>({...page,number:i+1}));
  }
  // Keep the fixed personal form pages intact. Evidence gets one continuation
  // per group of up to four photos, with its exact assignment label on every page.
  function paperEvidenceAppendix(source,evidenceByTopic){
    if(!(evidenceByTopic instanceof Map))return [];
    const out=[],seen=new Set();
    for(const page of source)for(const row of page.rows){
      if(row.continued||!row.reportKey||seen.has(row.reportKey))continue;
      seen.add(row.reportKey);
      const topic='report:'+row.reportKey;
      const photos=(evidenceByTopic.get(topic)||[]).filter(isPhoto);
      for(let offset=0;offset<photos.length;offset+=MAX_PHOTOS){
        out.push({rows:[{agreement:[row.agreement[0]],target:[]}],widths:page.widths,topic,
          evidence:true,appendix:true,continuation:offset>0,photos:photos.slice(offset,offset+MAX_PHOTOS),
          number:source.length+out.length+1});
        if(out.length+source.length>MAX_PAGES)throw Error('PA appendix page limit');
      }
    }
    if([...evidenceByTopic.keys()].some(key=>key.startsWith('report:')&&!seen.has(key.slice(7))))throw Error('PA missing appendix assignment');
    return out;
  }
  if(typeof module==='object'&&module.exports)module.exports={paginate,paperEvidenceAppendix,heading,MAX_PAGES,MAX_PHOTOS,PHOTO_LAYOUT,photoSlot};
  else window.PaPagination=Object.freeze({paginate,paperEvidenceAppendix,heading,MAX_PAGES,MAX_PHOTOS,PHOTO_LAYOUT,photoSlot});
})();