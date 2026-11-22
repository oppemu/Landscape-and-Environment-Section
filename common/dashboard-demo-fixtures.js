/* Local visual fixtures only; no network, profile storage, browser cache or production configuration. */
(() => {
  'use strict';
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname)) return;
  const panel = document.querySelector('#dashboard-overview');
  const banner = document.querySelector('#demo-banner');
  banner.hidden = false;
  panel.hidden = false;

  const monthPad = i => String(i).padStart(2, '0');
  const datasets = {food: [], fresh: [], general: [], hazard: [], orphan: [], humusquality: [], sale: [], 'bank-import': [], imports: []};
  function fixtureYear(year) {
    const months = new Map();
    for (let i = 1; i <= 12; i++) {
      const month = year + '-' + monthPad(i);
      const season = (i * 7 + year) % 9;
      const kg = 340 + season * 58;
      const purchase = 2700 + season * 490;
      const sale = [3, 7].includes(i) ? purchase - 900 : purchase + 650 + ((i * 230) % 1700);
      months.set(month, {status:'committed', rows:new Map(), quantityByUnit:{'กิโลกรัม':kg*100}, purchaseSatang:purchase*100, saleSatang:sale*100, profitSatang:(sale-purchase)*100});
    }
    return months;
  }
  const yearNow = Number(new Intl.DateTimeFormat('en', {timeZone:'Asia/Bangkok', year:'numeric'}).format(new Date()));
  for (let year=yearNow-11; year<=yearNow+1; year++) {
    for (let i=1; i<=12; i++) {
      const month = year + '-' + monthPad(i), date = month + '-16', n = (i*7+year)%9;
      datasets.food.push({date, weight:680+n*78});
      datasets.fresh.push({date, weight:400+n*125});
      datasets.general.push({date, entryStatus:'เข้า', beforeWeight:85, afterWeight:430+n*56});
      datasets.hazard.push({date, weight:100+n*24});
      datasets.orphan.push({date, weight:160+n*39});
      for(let j=0;j<2+(i%4);j++)datasets.humusquality.push({date, volume:(260+n*47)/(2+(i%4))});
      datasets.sale.push({date, items:[{name:'ฮิวมัส', subtotal:800+n*469}]});
    }
  }
  window.HubReportUnified = {bankTables: (records, journal, range) => ({fixtureYear: range.value})};
  window.ReportEngine = {inspectBankImports: value => ({status:'ready', months:fixtureYear(value.datasets.fixtureYear)})};
  window.HubSelectedProfile = {get: () => 'local-chart-preview'};
  const agg = month => ({month, waste:{
    hazard:{status:'ready', kg:datasets.hazard.find(row=>row.date.startsWith(month))?.weight||100,count:1},
    orphan:{status:'ready', kg:datasets.orphan.find(row=>row.date.startsWith(month))?.weight||160,count:1}
  }});
  window.UnifiedApi = {
    endpoint: () => 'demo-memory',
    request(body, endpoint) {
      if (endpoint !== 'demo-memory') return Promise.reject(Error('Disabled'));
      if (body.action === 'reportData') return Promise.resolve({datasets, errors:{}});
      if (body.action === 'municipalRead') return Promise.resolve({records:datasets.general});
      if (body.action === 'environmentDashboardRead') {
        return Promise.resolve({...agg(body.month),byMonth:Object.fromEntries((body.months||[]).map(m=>[m,agg(m)]))});
      }
      return Promise.reject(Error('Unsupported in chart preview'));
    }
  };
  window.HubDashboard.mount();
})();
