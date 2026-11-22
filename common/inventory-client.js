/* Inventory direct-submit adapter: server confirmation, metadata receipts, no payload queue or replay. */
(function(root){
  'use strict';
  const DEFINITE = new Set(['PHOTO_REQUIRED','IMAGE_INVALID','FILES_INVALID','FILE_INVALID','PHOTO_CONFLICT','PHOTO_SCHEMA_CONFLICT','PHOTO_VERIFY_FAILED','NOT_CONFIGURED','BAD_ORIGIN','CONNECT_TIMEOUT','UNAUTHORIZED','FORBIDDEN','WRITES_DISABLED','INVALID_COMMAND','INVALID_ACTION','INVALID_REQUEST','INVALID_TEXT','INVALID_QUANTITY','INVALID_DATE','FUTURE_DATE','INVALID_DUE_DATE','REVISION_CONFLICT','INSUFFICIENT_STOCK','EXCESS_RETURN','DATE_BEFORE_ITEM','DATE_BEFORE_LOAN','DATE_BEFORE_RETURN','DATE_BEFORE_COUNT','ALREADY_INSPECTED','INSPECTION_TOTAL_MISMATCH','DAMAGE_NOTE_REQUIRED','REASON_REQUIRED','DUPLICATE_ITEM_CODE','DUPLICATE_SERIAL','SERIAL_REQUIRES_SINGLE_ASSET','SERIAL_ASSET_FIXED_QUANTITY','INSUFFICIENT_DAMAGED','CONDITION_REQUIRED','STALE_COUNT','COUNT_NOT_OPEN','CASE_NOT_OUTSTANDING','ITEM_EXISTS','ITEM_NOT_FOUND','ITEM_KIND_MISMATCH','CASE_NOT_FOUND','RETURN_NOT_FOUND','COUNT_NOT_FOUND','LEDGER_LIMIT','COMMAND_TOO_LARGE']);
  function fail(code){const e=new Error(code);e.code=code;throw e;}
  class InventoryClient {
    // รับตัวส่ง/ที่เก็บใบรับรอง/กติกาคลังเพื่อแยกทดสอบจาก Google
    constructor({request,storage,key,core,endpoint,database,legacySpreadsheetId}) {
      this.database=database||null;this.legacySpreadsheetId=legacySpreadsheetId;this.request=request;this.endpoint=endpoint||(()=>undefined);this.storage=storage;this.key=key;this.core=core;this.snapshot=null;this.uncertain=null;this.busy=false;this.storageFailure=false;this.receiptUnreadable=false;
      // อ่านเฉพาะ metadata ใบรับรองรุ่นนี้ ไม่อ่านหรือส่ง payload คิวเก่า
      try{const raw=storage.getItem(key);if(raw){const value=JSON.parse(raw);if(![1,2].includes(value.version)||(value.version===2&&typeof value.spreadsheetId!=='string')||typeof value.requestId!=='string'||typeof value.actorId!=='string'||Object.keys(value).some(k=>!['version','requestId','actorId','endpoint','spreadsheetId'].includes(k)))fail('RECEIPT_CORRUPT');this.uncertain=value;}}catch(e){this.storageFailure=true;this.receiptUnreadable=true;}
    }
    _clear(){try{this.storage.removeItem(this.key);}catch(_){this.storageFailure=true;}this.uncertain=null;}
    async _identity(endpoint){
      if(!this.database)return null;
      const target=this.database();if(typeof target!=='string'||!target)fail('DATABASE_NOT_CONFIGURED');
      if(this.uncertain){const bound=this.uncertain.spreadsheetId||this.legacySpreadsheetId;if(!bound||bound!==target)fail('DATABASE_CHANGED');}
      const info=await this.request({action:'connectionInfo'},endpoint);
      if(this.endpoint()!==endpoint||this.database()!==target)fail('CONFIG_CHANGED');
      if(!info||info.version!=='2.4.5')fail('BACKEND_OUTDATED');
      if(!info||info.app!=='mahidol-waste-unified'||info.spreadsheetId!==target||typeof info.email!=='string'||!info.email)fail('DATABASE_MISMATCH');
      if(this.uncertain&&info.email!==this.uncertain.actorId)fail('ACTOR_CHANGED');
      return {spreadsheetId:target,actorId:info.email};
    }
    // อ่าน ledger และ replay แล้วตรวจ revision ก่อนใช้เป็นฐานคำสั่งใหม่
    async read(){
      const endpoint=this.endpoint();
      if(this.uncertain&&this.uncertain.endpoint!==endpoint)fail('CONFIG_CHANGED');
      const identity=await this._identity(endpoint);
      const data=await this.request({action:'inventoryRead',...(identity?{expectedActor:identity.actorId,expectedSpreadsheetId:identity.spreadsheetId}:{})},endpoint);
      if(this.endpoint()!==endpoint)fail('CONFIG_CHANGED');
      if(identity&&(!data||!data.actor||data.actor.id!==identity.actorId))fail('ACTOR_CHANGED');
      if(identity&&this.database()!==identity.spreadsheetId)fail('DATABASE_CHANGED');
      if(!data || data.status!=='success' || !data.actor || !Array.isArray(data.events))fail('INVALID_RESPONSE');
      const state=this.core.replay(data.events);
      if(state.revision!==data.revision)fail('INVALID_RESPONSE');
      this.snapshot={...data,endpoint,...(identity?{spreadsheetId:identity.spreadsheetId}:{}),events:JSON.parse(JSON.stringify(data.events)),state};
      if(this.uncertain && this.uncertain.actorId===data.actor.id && data.events.some(e=>e.requestId===this.uncertain.requestId&&e.actor.id===data.actor.id))this._clear();
      return this.snapshot;
    }
    // ห้ามส่งพร้อมกันหรือมีผลเก่าค้าง เก็บเฉพาะ metadata ก่อนส่งตรงและรอผลจริง
    async submit(command,photos){
      if(this.busy)fail('BUSY');if(!Array.isArray(photos)||photos.length>3)fail('FILES_INVALID');if(this.storageFailure)fail('STORAGE_UNAVAILABLE');
      if(!this.snapshot)fail('NOT_LOADED');if(this.uncertain)fail('UNCONFIRMED_RECEIPT');
      const endpoint=this.endpoint();if(endpoint!==this.snapshot.endpoint)fail('CONFIG_CHANGED');
      // เก็บเฉพาะรหัสคำขอ/ผู้กรอก/ปลายทาง ไม่เก็บคำสั่งคลังเพื่อ replay อัตโนมัติ
      const actorId=this.snapshot.actor.id;
      this.busy=true;let identity;try{identity=this.database?await this._identity(endpoint):null;if(identity&&(identity.actorId!==actorId||identity.spreadsheetId!==this.snapshot.spreadsheetId))fail('CONFIG_CHANGED');}catch(e){this.busy=false;throw e;}
      this.uncertain={version:identity?2:1,requestId:command.requestId,actorId};if(identity)this.uncertain.spreadsheetId=identity.spreadsheetId;if(endpoint!==undefined)this.uncertain.endpoint=endpoint;
      try{this.storage.setItem(this.key,JSON.stringify(this.uncertain));}catch(e){this.uncertain=null;this.busy=false;fail('STORAGE_UNAVAILABLE');}
      this.busy=true;
      const notify=(state,message)=>{if(root.UnifiedApi&&root.UnifiedApi.submissionStatus)root.UnifiedApi.submissionStatus(state,message);};
      notify('sending','กำลังส่งรายการคลัง รอผลยืนยันจากระบบ');
      try {
        const result=await this.request({action:'inventoryCommand',command,photos,expectedActor:actorId,...(identity?{expectedSpreadsheetId:identity.spreadsheetId}:{})},endpoint);
        if(!result||result.status!=='success'||!result.event||result.event.requestId!==command.requestId||result.event.actor.id!==actorId)fail('INVALID_RESPONSE');
        if(identity)await this._identity(endpoint);
        // ใบรับรองยืนยันแล้วถือว่าจบ; ถ้าอ่านยอดใหม่ล้มเหลวห้ามส่งคำสั่งเดิมซ้ำ
        this._clear();notify('confirmed','บันทึกรายการคลังเข้าชีทแล้ว');
        try {await this.read();} catch(e) {
          if(result.event.revision===this.snapshot.revision+1){const events=[...this.snapshot.events,result.event];this.snapshot={...this.snapshot,events,revision:result.event.revision,state:this.core.replay(events)};}
          result.refreshWarning=true;
        }
        return result;
      } catch(e){notify('blocked','ยังไม่ยืนยันรายการคลัง: '+(e.message||e.code));if(DEFINITE.has(e.code||e.message))this._clear();throw e;}finally{this.busy=false;}
    }
    // Verification is read-only, never a replay, including after reconnect or reload.
    // ตรวจด้วยการอ่าน ledger เท่านั้น ไม่ส่งคำสั่งเดิมซ้ำ
    async verify(){if(this.receiptUnreadable)fail('RECEIPT_UNREADABLE');await this.read();return {confirmed:!this.uncertain,requestId:this.uncertain&&this.uncertain.requestId};}
  }
  root.HubInventoryClient=InventoryClient;
  if(typeof module!=='undefined'&&module.exports)module.exports=InventoryClient;
})(typeof window==='undefined'?globalThis:window);
