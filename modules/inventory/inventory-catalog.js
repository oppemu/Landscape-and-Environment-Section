(function(root){
  'use strict';
  const limit=1024*1024;
  function parse(source){
    if(typeof source==='string'){
      if(source.length>limit)throw Error('LIMIT');
      source=JSON.parse(source.replace(/^\uFEFF/,''));
    }
    if(!source||source.format!=='oppe-inventory-catalog-v1'||!Array.isArray(source.items)||!source.items.length||source.items.length>2000)throw Error('FORMAT');
    const seen=new Set();
    return source.items.map(row=>{
      if(!row||typeof row.code!=='string'||typeof row.name!=='string')throw Error('ROW');
      const code=row.code.trim(),name=row.name.replace(/\s+/gu,' ').trim();
      if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(code)||!name||name.length>240||/[\u0000-\u001F\u007F]/.test(name)||seen.has(code.toLowerCase()))throw Error('ROW');
      seen.add(code.toLowerCase());
      return {code,name};
    });
  }
  const filter=(items,q)=>{const query=String(q||'').trim().toLocaleLowerCase('th');return query?items.filter(x=>(x.code+' '+x.name).toLocaleLowerCase('th').includes(query)):items;};
  function mount(doc){
    const byId=id=>doc.getElementById(id);
    const input=byId('catalog-file'),status=byId('catalog-status'),body=byId('catalog-body'),table=byId('catalog-table'),clear=byId('catalog-clear'),search=byId('catalog-search');
    let items=[],request=0;
    function draw(){
      const view=filter(items,search.value),fragment=doc.createDocumentFragment();
      for(const entry of view){
        const tr=doc.createElement('tr');
        for(const value of [entry.code,entry.name,'รอตรวจนับ']){const td=doc.createElement('td');td.textContent=value;tr.append(td);}
        fragment.append(tr);
      }
      body.replaceChildren(fragment);table.hidden=!view.length;search.disabled=!items.length;clear.hidden=!items.length;
      status.textContent=items.length?'แสดง '+view.length+' จาก '+items.length+' รายการ':'เลือกไฟล์ทะเบียนคลัง (.json) เพื่อดูชื่อและรหัสรายการ';
    }
    input.addEventListener('change',async()=>{
      const file=input.files[0],token=++request;
      if(!file)return;
      input.value='';
      try{
        if(file.size>limit)throw Error('LIMIT');
        const parsed=parse(await file.text());
        if(token!==request)return;
        items=parsed;search.value='';draw();
      }catch(_){
        if(token!==request)return;
        status.textContent='เปิดไฟล์ไม่ได้ กรุณาเลือกไฟล์ทะเบียนคลังที่ถูกต้อง'+(items.length?' รายการเดิมยังแสดงอยู่':'');
      }
    });
    search.addEventListener('input',draw);
    clear.addEventListener('click',()=>{++request;items=[];search.value='';input.value='';draw();});
    draw();
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={parse,filter,mount};
  else if(root.document)mount(root.document);
})(typeof window==='undefined'?globalThis:window);
