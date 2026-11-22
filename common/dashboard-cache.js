/* Memory only. Never retained across profile changes, data writes or explicit refresh. */
(function(root){'use strict';
function create(options={}){
 const ttl=options.ttl??30000,now=options.now||Date.now;let scope='',epoch=0;
 const entries=new Map(),pending=new Map(),keyOf=body=>JSON.stringify(body);
 function clear(){epoch++;entries.clear();pending.clear();}
 function useScope(value){if(value!==scope){clear();scope=value;}}
 function peek(body,maxAge=ttl){const hit=entries.get(keyOf(body));return hit&&now()-hit.at<maxAge?hit.value:undefined;}
 function put(body,value){const key=keyOf(body);entries.delete(key);entries.set(key,{value,at:now()});if(entries.size>24)entries.delete(entries.keys().next().value);}
 function read(body,fetcher,policy={}){
  const hit=peek(body),key=keyOf(body);
  if(hit!==undefined)return Promise.resolve(hit);
  if(pending.has(key))return pending.get(key);
  const token=epoch,cacheable=policy.cacheable||(v=>v&&!(v.errors&&Object.keys(v.errors).length));
  const work=Promise.resolve().then(()=>fetcher(body)).then(value=>{
   if(token===epoch){
    if(cacheable(value))put(body,value);
    if(policy.warm)policy.warm(value,(sibling,result)=>{if(token===epoch&&cacheable(result)&&!pending.has(keyOf(sibling))&&peek(sibling)===undefined)put(sibling,result);});
   }
   return value;
  }).finally(()=>{if(pending.get(key)===work)pending.delete(key);});
  pending.set(key,work);return work;
 }
 return {read,peek,clear,useScope};
}
root.HubDashboardCache={create};if(typeof module==='object'&&module.exports)module.exports={create};
})(typeof window==='object'?window:globalThis);
