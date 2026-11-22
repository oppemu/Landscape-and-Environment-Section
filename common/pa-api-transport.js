/* Google OAuth token is kept in memory; there is no public-link fallback. */
window.PaApi = (() => {
  'use strict';
  const config=window.HubConfig||{}, gis='https://accounts.google.com/gsi/client';
  const scopes=['userinfo.email','spreadsheets.readonly','drive.readonly'].map(x=>'https://www.googleapis.com/auth/'+x);
  let endpoint=null, sdk=null, state=null, generation=0, requesting=false;
  const secure=window.isSecureContext===true;
  try {
    const candidate=new URL(config.paApiExecutable);
    if(secure&&/^https:\/\/script\.googleapis\.com\/v1\/scripts\/[A-Za-z0-9_-]{20,250}:run$/.test(candidate.href)&&
      typeof config.paOAuthClientId==='string'&&/^\d+-[A-Za-z0-9-]+\.apps\.googleusercontent\.com$/.test(config.paOAuthClientId))endpoint=candidate;
  }catch(_){}
  function prepare(){
    if(!endpoint)return Promise.reject(Error('unavailable'));
    if(window.google?.accounts?.oauth2)return Promise.resolve();
    if(!sdk)sdk=new Promise((resolve,reject)=>{
      const element=document.createElement('script');
      element.src=gis;element.referrerPolicy='no-referrer';
      element.onload=()=>window.google?.accounts?.oauth2?resolve():reject(Error('unavailable'));
      element.onerror=()=>reject(Error('unavailable'));document.head.append(element);
    }).catch(e=>{sdk=null;throw e;});
    return sdk;
  }
  const signedIn=()=>Boolean(state&&state.until>Date.now());
  function clear(){generation++;state=null;requesting=false;}
  function connect(){
    const oauth=window.google?.accounts?.oauth2;
    if(!endpoint||!oauth||requesting)return Promise.reject(Error('unavailable'));
    const turn=generation;requesting=true;
    return new Promise((resolve,reject)=>{
      const fail=()=>{if(turn===generation)requesting=false;reject(Error('access'));};
      try{
        oauth.initTokenClient({client_id:config.paOAuthClientId,scope:scopes.join(' '),include_granted_scopes:false,
          callback:r=>{
            if(turn!==generation||r?.error||typeof r?.access_token!=='string'||!r.access_token||
              !oauth.hasGrantedAllScopes(r,...scopes)||!Number.isFinite(Number(r.expires_in))||Number(r.expires_in)<=5)return fail();
            const granted=String(r.scope||'').split(/\s+/).filter(Boolean);
            if(granted.some(s=>!scopes.includes(s)))return fail();
            state={token:r.access_token,until:Date.now()+Number(r.expires_in)*1000-5000};requesting=false;resolve();
          },error_callback:fail}).requestAccessToken();
      }catch(_){fail();}
    });
  }
  async function run(operation,parameters,signal){
    if(!endpoint||!signedIn())throw Error('access');
    const fn={catalog:'paReadCatalog',original:'paReadOriginal'}[operation];if(!fn)throw Error('unavailable');
    const r=await fetch(endpoint.href,{method:'POST',mode:'cors',credentials:'omit',redirect:'error',cache:'no-store',signal,
      headers:{Authorization:'Bearer '+state.token,'Content-Type':'application/json'},body:JSON.stringify({function:fn,parameters,devMode:false})});
    if(r.status===401||r.status===403){state=null;throw Error('access');}
    if(!r.ok)throw Error('unavailable');
    const operationResult=await r.json(), result=operationResult?.response?.result;
    if(operationResult?.error||operationResult?.done!==true||!result||result.ok!==true)throw Error('unavailable');
    return result;
  }
  return Object.freeze({configured:!!endpoint,prepare,connect,clear,signedIn,run});
})();