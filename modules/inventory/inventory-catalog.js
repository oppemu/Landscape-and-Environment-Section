(function(root){
  'use strict';
  const filter=(items,q)=>{const query=String(q||'').trim().toLocaleLowerCase('th');return query?items.filter(x=>(x.code+' '+x.name).toLocaleLowerCase('th').includes(query)):items;};
  function validate(catalog){
    if(!Array.isArray(catalog)||catalog.length>2000)return null;
    const seen=new Set(),items=[];
    for(const row of catalog){
      if(!row||typeof row.code!=='string'||typeof row.name!=='string')return null;
      const code=row.code.trim(),name=row.name.trim();
      if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(code)||!name||name.length>240||seen.has(code.toLowerCase()))return null;
      seen.add(code.toLowerCase());items.push({code,name});
    }
    return items;
  }
  function mount(doc){
    const byId=id=>doc.getElementById(id);
    const status=byId('catalog-status'),body=byId('catalog-body'),table=byId('catalog-table'),search=byId('catalog-search');
    let items=null,state='loading';
    function draw(){
      const view=items?filter(items,search.value):[],fragment=doc.createDocumentFragment();
      for(const entry of view){
        const tr=doc.createElement('tr');
        for(const value of [entry.code,entry.name,'รอตรวจนับ']){const td=doc.createElement('td');td.textContent=value;tr.append(td);}
        fragment.append(tr);
      }
      body.replaceChildren(fragment);table.hidden=!view.length;search.disabled=!items||!items.length;
      status.textContent=state==='loading'?'กำลังอ่านทะเบียนจากฐานข้อมูลแอปขยะ…':
        state==='error'?'โหลดทะเบียนไม่ได้ กรุณากด “โหลดข้อมูลล่าสุด”':items.length?'แสดง '+view.length+' จาก '+items.length+' รายการ':'ยังไม่มีรายการในทะเบียนคลัง';
    }
    search.addEventListener('input',draw);draw();
    return {update(catalog){items=validate(catalog);state=items?'ready':'error';draw();}};
  }
  function csvRows(text){
    const rows=[];let row=[],field='',quoted=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i];
      if(quoted){
        if(ch==='"'&&text[i+1]==='"'){field+='"';i++;}
        else if(ch==='"')quoted=false;
        else field+=ch;
      }else if(ch==='"'&&!field)quoted=true;
      else if(ch===','){row.push(field);field='';}
      else if(ch==='\n'){row.push(field);rows.push(row);row=[];field='';}
      else if(ch!=='\r')field+=ch;
    }
    if(quoted)throw Error('CSV incomplete');
    if(row.length||field)rows.push([...row,field]);
    const head=rows.shift();
    if(head?.length!==2||head[0]!=='รหัสรายการภายใน'||head[1]!=='ชื่อวัสดุ / อุปกรณ์')throw Error('Unexpected catalog headers');
    if(rows.some(r=>r.length!==2))throw Error('Unexpected columns');
    const result=validate(rows.filter(r=>r.some(Boolean)).map(([code,name])=>({code,name})));
    if(!result)throw Error('Invalid catalog');
    return result;
  }
  async function start(view){
    const sid=root.HubConfig?.api?.spreadsheetId;
    if(!/^[A-Za-z0-9_-]{30,}$/.test(sid||'')){view.update(null);return;}
    const url=new URL('https://docs.google.com/spreadsheets/d/'+sid+'/gviz/tq');
    url.search=new URLSearchParams({gid:'914427690',range:'A1:B2001',headers:'1',tqx:'out:csv'});
    let attempt=0;
    async function load(){
      const seq=++attempt;
      try{
        const res=await fetch(url,{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
        if(!res.ok)throw Error('Catalog unavailable');
        const csv=await res.text();
        if(csv.length>1000000)throw Error('Catalog too large');
        const rows=csvRows(csv.replace(/^\uFEFF/,''));
        if(seq===attempt)view.update(rows);
      }catch(_){if(seq===attempt)view.update(null);}
    }
    root.document.getElementById('refresh-ledger').addEventListener('click',load);
    await load();
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={validate,filter,mount,csvRows};
  else if(root.document)start(mount(root.document));
})(typeof window==='undefined'?globalThis:window);