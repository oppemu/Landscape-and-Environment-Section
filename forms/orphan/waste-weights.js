(function(root){
'use strict';
const types=value=>Array.from(new Set(String(value||'').split(',').map(s=>s.trim()).filter(Boolean)));
function total(items){return Number(items.reduce((sum,item)=>sum+Number(item.weightKg),0).toPrecision(15));}
function valid(items){return items.length>0&&items.length<=100&&total(items)<=1e9&&items.every(x=>x.type&&/^\d+(?:\.\d+)?$/.test(String(x.weightKg))&&Number(x.weightKg)>0&&Number(x.weightKg)<=1e9);}
if(typeof module==='object')module.exports={types,total,valid};
if(!root.document)return;
const input=document.getElementById('orphanWasteType'),box=document.getElementById('wasteWeights'),sum=document.getElementById('orphanTotalWeight');
let weights=new Map(),locked=false;
function items(){return types(input.value).map(type=>({type,weightKg:weights.get(type)??''}));}
function updateTotal(){const data=items();sum.value=data.length&&data.every(i=>i.weightKg!=='')?String(total(data)):'';}
function render(){box.replaceChildren();for(const type of types(input.value)){const row=document.createElement('div');row.className='waste-weight-row';const label=document.createElement('label');label.textContent=type+' (กิโลกรัม)';const field=document.createElement('input');field.type='number';field.min='0';field.max='1000000000';field.step='any';field.inputMode='decimal';field.required=true;field.value=weights.get(type)??'';field.disabled=locked;field.setAttribute('aria-label','น้ำหนัก '+type+' (กิโลกรัม)');field.addEventListener('input',()=>{weights.set(type,field.value);updateTotal();});label.appendChild(field);row.appendChild(label);box.appendChild(row);}updateTotal();}
input.addEventListener('input',render);
document.getElementById('orphanForm').addEventListener('reset',()=>{weights=new Map();setTimeout(render,0);});
root.OrphanWeights={read(){render();const data=items();if(!valid(data)){const e=Error('กรอกน้ำหนักมากกว่า 0 ให้ครบทุกประเภทขยะ');e.code='WEIGHT_VALIDATION';throw e;}return data.map(x=>({type:x.type,weightKg:Number(x.weightKg)}));},restore(data){weights=new Map((data||[]).map(x=>[x.type,String(x.weightKg)]));render();},setDisabled(value){locked=value;box.querySelectorAll('input').forEach(x=>x.disabled=value);}};
render();
})(typeof window==='object'?window:globalThis);
