/* Free text remains allowed, as in the original hazardous-waste form. */
(function(){
 'use strict';
 const input=document.getElementById('orphanDepartment'),list=document.getElementById('departmentOptions');
 let matches=[],active=-1;
 function close(){list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;}
 function choose(index){if(input.disabled||!matches[index]){close();return;}input.value=matches[index];close();input.focus();}
 function highlight(){Array.from(list.children).forEach((li,i)=>li.setAttribute('aria-selected',String(i===active)));if(active>=0){input.setAttribute('aria-activedescendant','department-option-'+active);list.children[active].scrollIntoView({block:'nearest'});}}
 input.addEventListener('input',()=>{
  const query=input.value.trim();list.replaceChildren();active=-1;
  matches=query?window.ORPHAN_DEPARTMENTS.filter(name=>name.includes(query)):[];
  if(!matches.length){close();return;}
  matches.forEach((name,i)=>{const li=document.createElement('li');li.id='department-option-'+i;li.setAttribute('role','option');li.setAttribute('aria-selected','false');li.textContent=name;li.addEventListener('click',()=>choose(i));list.appendChild(li);});
  list.hidden=false;input.setAttribute('aria-expanded','true');
 });
 input.addEventListener('keydown',event=>{
  if(list.hidden)return;
  if(event.key==='Escape'){close();return;}
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();active=event.key==='ArrowDown'?Math.min(matches.length-1,active+1):Math.max(0,active-1);highlight();}
  if(event.key==='Enter'&&active>=0){event.preventDefault();choose(active);}
  if(event.key==='Tab')close();
 });
 document.addEventListener('click',event=>{if(!input.parentElement.contains(event.target))close();});
 document.getElementById('orphanForm').addEventListener('reset',close);
})();
