(() => {
  'use strict';
  let active='', edits=new Map(), photos=new Map();
  const draws=new WeakMap(), observer=new ResizeObserver(es=>es.forEach(({target})=>draws.get(target)?.()));
  const path=(base,index)=>base+'|'+index;
  const clamp=(n,low,high)=>Math.min(high,Math.max(low,n));
  function blocks(root,makeEmpty=false){
    const result=[]; const seen=new Map();
    for(const sheet of root.querySelectorAll('.pa-paper')){
      const topic=(sheet.dataset.topic||'cover')+'|'+sheet.dataset.continuation;
      const count=seen.get(topic)||0;seen.set(topic,count+1);
      const prefix=path(topic,count);
      sheet.querySelectorAll('.pa-paper-title,.pa-paper-period,.pa-paper-name,thead th,.pa-proof-caption').forEach((el,i)=>result.push([prefix+'|header|'+i,el]));
      [...sheet.querySelectorAll('tbody tr')].forEach((row,i)=>[...row.cells].forEach((cell,j)=>{
        const lines=[...cell.children].filter(n=>!n.matches('.pa-proof,.pa-proof-caption'));
        if(!lines.length){let empty=cell.querySelector('.pa-draft-empty');if(!empty&&makeEmpty){empty=document.createElement('div');empty.className='pa-draft-empty';cell.prepend(empty);}if(empty)lines.push(empty);}
        lines.forEach((line,k)=>result.push([prefix+'|cell|'+i+'|'+j+'|'+k,line]));
      }));
    }
    root.querySelectorAll(".pa-signature-person > div").forEach((el,i)=>result.push(["signature|"+i,el]));
    return result;
  }
  function writeDraft(key,el){
    el.setAttribute('contenteditable','plaintext-only');el.spellcheck=false;
    el.setAttribute('aria-label','แก้ไขข้อความในเอกสาร');el.classList.add('pa-draft-text');
    const save=()=>{if(el.isConnected)edits.set(key,el.innerText.replace(/\r/g,'').slice(0,4000));};
    el.addEventListener('input',save);el.addEventListener('blur',save);
    el.addEventListener('paste',event=>{
      const text=event.clipboardData?.getData('text/plain');if(typeof text!=='string')return;
      event.preventDefault();
      const insertion=text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').slice(0,4000);
      if(document.execCommand('insertText',false,insertion)){save();return;}
      const selection=getSelection();if(!selection?.rangeCount)return;
      const range=selection.getRangeAt(0);if(!el.contains(range.commonAncestorContainer))return;
      range.deleteContents();const n=document.createTextNode(insertion);range.insertNode(n);range.setStartAfter(n);range.collapse(true);selection.removeAllRanges();selection.addRange(range);save();
    });
  }
  function controls(item,image,key,preferBottom){
    const state=photos.get(key)||{x:50,y:preferBottom?100:50,scale:item.closest('.pa-proof')?.dataset.count==='1'?90:85};photos.set(key,state);
    const stage=document.createElement('div');stage.className='pa-photo-stage';image.before(stage);stage.append(image);
    const handle=document.createElement('button');handle.type='button';handle.className='pa-photo-handle';handle.tabIndex=-1;handle.setAttribute('aria-label','ลากมุมเพื่อปรับขนาดรูป');stage.append(handle);
    function draw(){
      const w=stage.clientWidth,h=stage.clientHeight,aw=image.naturalWidth,ah=image.naturalHeight;
      if(!w||!h||!aw||!ah)return;
      const f=Math.min(w/aw,h/ah)*state.scale/100,iw=aw*f,ih=ah*f;
      stage.style.setProperty('--photo-x',((w-iw)*state.x/w)+'%');
      stage.style.setProperty('--photo-y',((h-ih)*state.y/h)+'%');
      stage.style.setProperty('--photo-w',(iw/w*100)+'%');
      stage.style.setProperty('--photo-h',(ih/h*100)+'%');
    }
    const steps=[[-15,0,0],[0,-15,0],[0,15,0],[15,0,0],[0,0,-8],[0,0,8]];
    const update=(dx,dy,ds)=>{state.x=clamp(state.x+dx,0,100);state.y=clamp(state.y+dy,0,100);state.scale=clamp(state.scale+ds,40,100);draw();};
    stage.tabIndex=0;stage.setAttribute('aria-label','ลากรูป หรือใช้แป้นลูกศรเพื่อขยับ กดบวกหรือลบเพื่อปรับขนาด');
    stage.addEventListener('keydown',event=>{const step={ArrowLeft:0,ArrowUp:1,ArrowDown:2,ArrowRight:3,'-':4,'+':5}[event.key];if(step!==undefined){event.preventDefault();update(...steps[step]);}});
    let drag;
    stage.addEventListener('pointerdown',event=>{if(event.button!==0||(event.target!==image&&event.target!==handle))return;event.preventDefault();stage.focus({preventScroll:true});stage.setPointerCapture(event.pointerId);drag={x:event.clientX,y:event.clientY,id:event.pointerId,resize:event.target===handle};});
    stage.addEventListener('pointermove',event=>{if(drag?.id!==event.pointerId)return;const w=stage.clientWidth,h=stage.clientHeight;const iw=image.getBoundingClientRect().width,ih=image.getBoundingClientRect().height;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if(drag.resize){const f=Math.max(1,iw*iw+ih*ih);update(0,0,(dx*iw+dy*ih)/f*state.scale);}
      else update(dx/Math.max(1,w-iw)*100,dy/Math.max(1,h-ih)*100,0);
      drag.x=event.clientX;drag.y=event.clientY;});
    for(const events of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(events,()=>{drag=null;});
    image.draggable=false;image.addEventListener('load',draw);draws.set(stage,draw);observer.observe(stage);draw();
  }
  function activate(root,key){
    observer.disconnect();
    if(key!==active){active=key;edits=new Map();photos=new Map();}
    if(!key)return;
    for(const [k,el] of blocks(root,true)){if(edits.has(k)){el.textContent=edits.get(k);el.dataset.paDraftEdited='true';}writeDraft(k,el);}
    for(const sheet of root.querySelectorAll('.pa-paper')){
      const items=[...sheet.querySelectorAll('.pa-proof-drive')];
      items.forEach((item,i)=>{const img=item.querySelector('img');if(img)controls(item,img,(sheet.dataset.topic||'cover')+'|'+img.getAttribute('src')+'|'+i,items.length===1||i>0);});
    }
  }
  function project(root){
    if(!edits.size)return root;
    const out=root.cloneNode(true);
    for(const [key,el] of blocks(out,true))if(edits.has(key))el.textContent=edits.get(key);
    return out;
  }
  window.PaDraft=Object.freeze({activate,project});
})();