/* หน้าแผนที่ต้นไม้ อ่านฐานรวมและแสดงตำแหน่งจริงตามทะเบียน */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  let data = null;
  let map = null;
  let generation = 0;
  // Every tree stays at its original coordinates. Overview styling reduces visual
  // overlap without clustering, sampling or dropping any source point.
// ปรับขนาดจุดตามการซูม แต่ไม่ย้ายพิกัด ไม่รวมกลุ่ม และไม่ลดจำนวนต้นไม้
  function markerStyleForZoom(zoom) {
    const level = zoom >= 18 ? "detail" : zoom >= 17 ? "street" : "overview";
    return {
      radius: level === "detail" ? 5.5 : level === "street" ? 3.8 : 2.4,
      color: "#e7f5de",
      weight: level === "detail" ? 1.25 : level === "street" ? 0.9 : 0.55,
      fillColor: "#0a3522",
      fillOpacity: level === "detail" ? 1 : level === "street" ? 0.98 : 0.91,
    };
  }

// จัดวันที่ฐานข้อมูลสำหรับแสดงผล โดยไม่แก้ค่าต้นฉบับ
  function createTreeHover(activeMap){
    const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const entries=new Map();
    let hovering=null, frame=0;
    const clock=()=>performance.now();
    function remove(marker,entry){
      marker.setStyle({fillColor:entry.originalFill});
      entries.delete(marker);
    }
    function clear(){
      hovering=null;
      if(frame){cancelAnimationFrame(frame);frame=0;}
      for(const [marker,entry] of entries)remove(marker,entry);
    }

    const rgb=(hex)=>hex.slice(1).match(/../g).map(n=>parseInt(n,16));
    const mix=(a,b,t)=>'#'+a.map((v,i)=>Math.round(v+(b[i]-v)*t).toString(16).padStart(2,'0')).join('');
    const red=rgb('#ee182e');
    function paint(entry,t){
      entry.layer.setStyle({fillColor:mix(entry.fill,red,t)});
    }
    function tick(now){
      frame=0;
      let moving=false;
      for(const [marker,entry] of entries){
        if(entry.current===entry.target)continue;
        const t=Math.min(1,(now-entry.start)/entry.duration);
        const eased=1-(1-t)**3;
        entry.current=entry.from+(entry.target-entry.from)*eased;
        if(t===1&&marker!==hovering){remove(marker,entry);continue;}
        if(t===1)entry.current=entry.target;
        paint(entry,entry.current);
        if(t<1)moving=true;
      }
      if(moving)frame=requestAnimationFrame(tick);
    }
    function transition(marker,entry,target){
      if(motion?.matches){
        if(marker!==hovering){remove(marker,entry);return;}
        paint(entry,target);entry.current=entry.target=target;return;
      }
      entry.from=entry.current;entry.target=target;entry.start=clock();entry.duration=marker===hovering?185:170;
      if(entry.current===target&&marker!==hovering){remove(marker,entry);return;}
      if(!frame)frame=requestAnimationFrame(tick);
    }
    function leave(marker){
      if(hovering!==marker)return;
      hovering=null;
      const entry=entries.get(marker);
      if(entry)transition(marker,entry,0);
    }
    function enter(marker){
      if(hovering===marker)return;
      if(hovering)leave(hovering);
      hovering=marker;
      for(const [candidate,entry] of entries)if(candidate!==marker&&entries.size>=2)remove(candidate,entry);
      const style=markerStyleForZoom(activeMap.getZoom());
      let entry=entries.get(marker);
      if(!entry){
        const layer=marker;
        entry={layer,current:0,target:0,fill:rgb(style.fillColor),originalFill:style.fillColor};
        entries.set(marker,entry);
      }
      transition(marker,entry,1);
    }
    activeMap.on('zoomstart dragstart unload',clear);
    return marker=>{
      marker.on('mouseover',()=>enter(marker));
      marker.on('mouseout',()=>leave(marker));
    };
  }

  function displayDate(iso) {
    return new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Bangkok",
    }).format(new Date(iso));
  }

// แจ้งความพร้อมไปหน้าแม่เฉพาะ origin ที่อนุญาต
  function notifyParent(ready = false) {
    if (window.parent === window) return;
    try {
      if (window.parent.location.origin !== window.location.origin) return;
      if (ready)
        window.parent.postMessage(
          { type: "hub:ready", module: "tree" },
          window.location.origin,
        );
      window.parent.postMessage(
        {
          type: "hub:module-status",
          module: "tree",
          message: data
            ? "ฐานข้อมูลต้นไม้ " + displayDate(data.sourceDate) + " · อ่านอย่างเดียว"
            : "แผนที่ต้นไม้ · อ่านอย่างเดียว",
        },
        window.location.origin,
      );
    } catch (error) {
      /* A cross-origin host receives no status messages. */
    }
  }

  window.addEventListener("message", function (event) {
    if (
      window.parent === window ||
      event.source !== window.parent ||
      event.origin !== window.location.origin ||
      !event.data ||
      event.data.type !== "HUB_ACTIVATE"
    )
      return;
    if (map) map.invalidateSize({ pan: false });
    loadRegistry();
  });

// สร้าง DOM ด้วยข้อความไม่ตีความรายละเอียดต้นไม้เป็น HTML
  function textNode(tag, text) {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
  }

// สร้างแผนที่พร้อม popup และตั้งขอบเขตให้เห็นต้นไม้ทุกจุดที่ตรวจผ่าน
  function renderMap() {
    const date = displayDate(data.sourceDate);
    $("source-status").textContent =
      "อ่านฐานข้อมูลต้นไม้ " +
      date +
      " · " +
      data.trees.length.toLocaleString("th-TH") +
      " จุด · อ่าน " +
      data.total.toLocaleString("th-TH") +
      " แถว · ไม่มีพิกัดที่ใช้ได้ " +
      data.reasons.unavailableCoordinates +
      " · พิกัดผิดช่วง " +
      data.reasons.invalidCoordinates +
      " · ขาดรหัส/ชื่อ " +
      data.reasons.missingIdentity +
      " · ว่าง " +
      data.blank +
      " · รหัสซ้ำที่ละเว้น " +
      data.duplicate +
      " · อ่านอย่างเดียว";
    if (!data.trees.length) {
      $("map-status").textContent =
        data.total === 0 ? "ทะเบียนต้นไม้ยังไม่มีข้อมูล · ยังไม่มีจุดแสดงบนแผนที่" : "ไม่มีจุดที่พิกัดใช้ได้ · ไม่สร้างจุดสมมติ";
      return;
    }
    if (typeof L === "undefined") {
      $("map-status").textContent =
        "โหลดส่วนแผนที่ไม่สำเร็จ · โปรดตรวจว่าไฟล์ vendor/leaflet.js อยู่ครบ แล้วโหลดหน้าใหม่";
      return;
    }
    // ขอบเขตตามภาพอ้างอิงของผู้ใช้: เฉพาะวิทยาเขตศาลายา ไม่ขยายตามพิกัดผิดพื้นที่
    const campusBounds = [[13.7873,100.3162],[13.8015,100.3279]];
    // Rotate the display projection, not stored coordinates. Native Leaflet input,
    // vector hit testing, pan, zoom and popups stay in the same coordinate system.
    const baseProjection = L.Projection.SphericalMercator;
    const rotatedCRS = L.extend({}, L.CRS.EPSG3857, {
      projection: {
        bounds: baseProjection.bounds,
        project(latlng) { const p = baseProjection.project(latlng); return L.point(p.y, -p.x); },
        unproject(p) { return baseProjection.unproject(L.point(-p.y, p.x)); }
      }
    });
    map = L.map("map", { crs:rotatedCRS, preferCanvas: true, maxBounds: campusBounds,
      maxBoundsViscosity:1, zoomSnap:0, minZoom:0, maxZoom:19, scrollWheelZoom:false });
    // Wheel belongs to the page, including when this map is embedded in an iframe.
    const mapElement = $("map");
    mapElement.onwheel = function(event) {
      if(window.parent === window || event.ctrlKey) return;
      try {
        if(window.parent.location.origin !== window.location.origin) return;
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
        window.parent.scrollBy({left:event.deltaX*unit,top:event.deltaY*unit,behavior:'instant'});
        event.preventDefault();
      } catch(error) { /* Standalone/cross-origin host retains native scrolling. */ }
    };
    $("map-status").textContent = "";
    map.createPane('campusBackground'); map.getPane('campusBackground').style.zIndex=200;
    L.geoJSON(window.CampusBasemap, {pane:'campusBackground',interactive:false,style:function(feature){
      const kind=feature.properties.kind;
      if(kind==='building') return {color:'#a3a291',weight:.8,fillColor:'#d7ceba',fillOpacity:1};
      if(kind==='water') return {color:'#619ba5',weight:1,fillColor:'#9dced5',fillOpacity:1};
      if(kind==='pitch') return {color:'#8dad77',weight:1,fillColor:'#c4daa5',fillOpacity:1};
      const small=['footway','path','pedestrian','cycleway','steps'].includes(feature.properties.road);
      return {color:small?'#c2b395':'#bfc3c5',weight:small?2:5,opacity:1};
    }}).addTo(map);
    map.attributionControl.addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors');
    // Bounds include all points before choosing a zoom-dependent marker style.
    function lockCampusView(){
      // inside=false แสดงพื้นที่มหาวิทยาลัยครบกรอบ ไม่ซูมจนตัดด้านบนล่างบนจอแนวนอน
      const bounds=L.latLngBounds(campusBounds);
      // Clear the previous minimum first: a smaller container must be able to
      // zoom farther out than its previous fit (e.g. after collapsing a sidebar).
      map.setMinZoom(0);
      const zoom=map.getBoundsZoom(bounds,false,L.point(48,48));
      map.setMinZoom(zoom);map.setView(bounds.getCenter(),zoom,{animate:false});
    }
    lockCampusView();map.on('resize',lockCampusView);
    // Parent dashboard/sidebar layout changes do not always fire window.resize.
    if (typeof ResizeObserver !== 'undefined') {
      const activeMap=map;
      const observer=new ResizeObserver(function(){
        if(map===activeMap) activeMap.invalidateSize({pan:false});
      });
      observer.observe(mapElement);
      activeMap.on('unload',function(){observer.disconnect();});
    }
    // Search highlighting is its own layer. A coincident marker cannot take over another tree's identity.
    const selectedPane=map.createPane('selectedTreeSearch');
    selectedPane.style.zIndex=475;
    const searchRenderer=L.canvas({pane:'selectedTreeSearch',tolerance:4});
    const selectionLayer=L.layerGroup().addTo(map);
    let selectedSearchTree=null, selectedHighlights=[];
    const highlightRadius=()=>{const zoom=map.getZoom();return zoom>=18?9.5:zoom>=17?8:6.5;};
    function treePopup(tree){
      const popup = textNode("div", "");
      popup.append(
        textNode("strong", tree.id + " · " + tree.name),
        textNode("p", tree.area || "ไม่ระบุพื้นที่"),
      );
      const preview=textNode('div','กำลังอ่านภาพล่าสุด…');preview.className='tree-popup-photo';popup.append(preview);
      if(window.TreeHistory)window.TreeHistory.open(tree,preview);
      return popup;
    }
    function showSearchSelection(){
      selectionLayer.clearLayers();
      const selected=selectedSearchTree;
      if(!selected)return;
      const point=[selected.lat,selected.lng];
      const radius=highlightRadius();
      const common={renderer:searchRenderer,pane:'selectedTreeSearch',stroke:false};
      selectedHighlights=[
        L.circleMarker(point,{...common,radius:radius+9,fillColor:'#ff473c',fillOpacity:.18,interactive:false}).addTo(selectionLayer),
        L.circleMarker(point,{...common,radius:radius+5,fillColor:'#ff302d',fillOpacity:.36,interactive:false}).addTo(selectionLayer),
        L.circleMarker(point,{...common,radius,stroke:true,color:'#ffeae6',weight:2,fillColor:'#c61229',fillOpacity:1})
          .bindPopup(()=>treePopup(selected)).addTo(selectionLayer)
      ];
    }
    if(window.TreeHistory)window.TreeHistory.bindSearch(data.trees,tree=>{
      selectedSearchTree=tree;
      map.setView([tree.lat,tree.lng],18);
      showSearchSelection();
    });
    // Canvas hit tolerance keeps small overview markers easier to tap without larger base markers.
    const attachHover=createTreeHover(map);
    const renderer = L.canvas({ tolerance: 4 });
    const markers = [];
    data.trees.forEach(function (tree) {
      const marker = L.circleMarker([tree.lat, tree.lng], {
        ...markerStyleForZoom(map.getZoom()),
        renderer,
      }).bindPopup(()=>treePopup(tree)).addTo(map);
      attachHover(marker);
      markers.push(marker);
    });
    map.on("zoomend", function () {
      const style = markerStyleForZoom(map.getZoom());
      markers.forEach((marker) => marker.setStyle(style));
      const radius=highlightRadius();
      selectedHighlights.forEach((layer,i)=>layer.setRadius(radius+[9,5,0][i]));
    });
  }

// อ่านทะเบียนล่าสุดผ่าน API และ adapter ไม่อ้างข้อมูลเก่าว่าเป็นผลล่าสุด
  async function loadRegistry() {
    const current=++generation;
    data=null; if(map){map.remove();map=null;}
    $("map-status").textContent="กำลังอ่านทะเบียนต้นไม้…";
    try {
      const response=await UnifiedApi.request({action:'treeDashboardRead'});
      if(current!==generation)return;
      if(response.sourceSpreadsheetId!=='1dBVvGQcIND94vPRNZ6a0K9wsJyBAnImX0IH8Qph_Jp4'||response.sourceSheet!=='Data')throw Error('แหล่งข้อมูลต้นไม้ไม่ตรงกับที่กำหนด');
      data=HubTreeAdapter.fromRecords(response.records,response.sourceDate);
      renderMap();
    } catch(error) {
      if(current!==generation)return;
      $("map-status").textContent="ยังอ่านทะเบียนต้นไม้ไม่ได้: "+error.message;
      $("source-status").textContent="ยังไม่มีข้อมูลที่ยืนยันได้ · ไม่ใช้ข้อมูลเก่าหรือจุดสมมติแทน";
    }
    notifyParent();
  }
  notifyParent(true);
  loadRegistry();
})();
