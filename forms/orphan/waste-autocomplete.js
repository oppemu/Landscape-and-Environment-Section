/* Multiple reporting categories; comma-separated text remains editable. */
(function(){
 'use strict';
 const input=document.getElementById('orphanWasteType'),list=document.getElementById('wasteOptions');
 let matches=[],active=-1;
 const unique=items=>Array.from(new Set(items.map(s=>s.trim()).filter(Boolean)));
 function close(){list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;}
 function choose(index){if(input.disabled||!matches[index]){close();return;}const parts=input.value.split(',');parts.pop();const values=unique([...parts,matches[index]]);const next=values.join(', ')+', ';if(next.length>input.maxLength&&input.maxLength>0)return;input.value=next;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();show();}
 function highlight(){Array.from(list.children).forEach((li,i)=>li.setAttribute('aria-selected',String(i===active)));if(active>=0){input.setAttribute('aria-activedescendant','waste-option-'+active);list.children[active].scrollIntoView({block:'nearest'});}}
 function show(){if(input.disabled){close();return;}const parts=input.value.split(','),query=parts.pop().trim(),selected=unique(parts);list.replaceChildren();active=-1;
  matches=window.ORPHAN_WASTE_TYPES.filter(name=>!selected.includes(name)&&name.includes(query));
  if(!matches.length){close();return;}
  matches.forEach((name,i)=>{const li=document.createElement('li');li.id='waste-option-'+i;li.setAttribute('role','option');li.setAttribute('aria-selected','false');li.textContent=name;li.addEventListener('mousedown',e=>e.preventDefault());li.addEventListener('click',()=>choose(i));list.appendChild(li);});list.hidden=false;input.setAttribute('aria-expanded','true');
 }
 input.addEventListener('input',show);input.addEventListener('focus',show);
 input.addEventListener('keydown',event=>{if(list.hidden)return;if(event.key==='Escape'){close();return;}if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();active=event.key==='ArrowDown'?Math.min(matches.length-1,active+1):Math.max(0,active-1);highlight();}if(event.key==='Enter'&&active>=0){event.preventDefault();choose(active);}if(event.key==='Tab')close();});
 document.addEventListener('click',event=>{if(!input.parentElement.contains(event.target))close();});
 document.getElementById('orphanForm').addEventListener('reset',close);
})();
