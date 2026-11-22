/* ชุดไอคอน SVG ของหน้าจอ ใช้ข้อมูลรูปแบบคงที่จากโค้ด ไม่ใส่ข้อความผู้กรอกเข้า markup โดยตรง */
// คลังไอคอน SVG ของหน้าเมนู เปลี่ยนรูปร่างไม่เปลี่ยนข้อมูลหรือสิทธิ์ระบบ
(function (root) {
  'use strict';
  const paths = {
    inventory: 'M3 7 12 3 21 7 12 11ZM3 7v10l9 4 9-4V7M12 11v10M7 5l10 4',
    map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16M15 5v16',
    arrow: 'M7 17 17 7M7 7h10v10',
    home: 'm3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',
    report: 'M5 3h14v18H5ZM9 8h6m-6 4h6m-6 4h4',
    person: 'M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
    bowl: 'M4 10h16a8 8 0 0 1-16 0Zm4-6v2m4-3v3m4-2v2M8 21h8',
    leaf: 'M20 4C9 2 3 8 5 15s15 4 15-11ZM5 20 15 10',
    sprout: 'M12 21V10M12 14C3 14 3 6 3 6s9-1 9 8Zm0-4c0-7 8-7 8-7s1 7-8 7',
    check: 'M9 4H5v17h14V4h-4M9 2h6v5H9ZM8 13l3 3 5-6',
    bag: 'M7 3h10l-2 5c8 8 7 13-3 13S1 16 9 8Zm2 5h6m-3 4v5m-2-3h4',
    receive: 'M4 14v6h16v-6M12 3v12m-5-5 5 5 5-5',
    sell: 'M4 14v6h16v-6M12 15V3m-5 5 5-5 5 5',
    hazard: 'm12 3 10 18H2ZM12 9v5m0 3v1',
  };
  /** Create an accessible decorative SVG without HTML interpolation. */
  function create(type) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const attributes = {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.7',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
    };
    for (const [key, value] of Object.entries(attributes))
      svg.setAttribute(key, value);
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', paths[type]);
    svg.append(path);
    return svg;
  }
  root.HubIcons = Object.freeze({ create });
})(window);
