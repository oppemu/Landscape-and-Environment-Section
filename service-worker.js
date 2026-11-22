/* Offline fallback only: no form, response, staff, report, photo, map or API caching. */
'use strict';
const BASE = new URL('./', self.location.href);
const CACHE_PREFIX = 'landscape-offline:' + BASE.href + ':';
const CACHE_NAME = CACHE_PREFIX + 'v2.0.0';
const OFFLINE_PATH = new URL('offline.html', BASE).href;
const CACHE_ALLOWLIST = Object.freeze([OFFLINE_PATH]);

// เก็บเฉพาะหน้าออฟไลน์ ไม่แคชฟอร์ม รูป รายชื่อ รายงาน หรือ API
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(
          CACHE_ALLOWLIST.map(
            (url) =>
              new Request(url, {
                redirect: 'error',
                credentials: 'omit',
                cache: 'reload',
              }),
          ),
        ),
      ),
  );
  // Never skip waiting automatically: an update must not reload open drafts.
});
// ล้างเฉพาะ cache เก่าของแอปนี้ ไม่ล้าง storage งานอื่นหรือแย่งหน้าที่เปิดอยู่
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME,
            )
            .map((name) => caches.delete(name)),
        ),
      ),
  );
  // No automatic client claiming: existing pages stay on their current version until navigation.
});
// เปลี่ยน worker เฉพาะเมื่อหน้าแอปส่งคำยืนยัน ไม่รีโหลดแบบร่างเอง
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'APPLY_CONFIRMED_UPDATE' || !event.source?.url)
    return;
  const source = new URL(event.source.url);
  if (source.origin === BASE.origin && source.href.startsWith(BASE.href))
    self.skipWaiting();
});
// ดักเฉพาะ GET เปิดหน้าในขอบเขตแอป เน็ตเสียแสดง 503 ไม่สำรองผลส่งข้อมูล
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    request.mode !== 'navigate' ||
    url.origin !== BASE.origin ||
    !url.href.startsWith(BASE.href) ||
    url.search
  )
    return;
  const relative = url.pathname.slice(BASE.pathname.length);
  if (
    relative &&
    relative !== 'index.html' &&
    !/^modules\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.html$/.test(relative)
  )
    return;
  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      const fallback = await cache.match(OFFLINE_PATH);
      if (!fallback)
        return new Response(
          'ต้องเชื่อมต่ออินเทอร์เน็ต ไม่มีการบันทึกแบบออฟไลน์',
          {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          },
        );
      const html = (await fallback.text()).replaceAll(
        '@@RETRY_URL@@',
        url.href,
      );
      return new Response(html, {
        status: 503,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }),
  );
});
