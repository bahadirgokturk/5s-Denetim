// ============================================================
// qr.js — QR kod oluşturma ve yazdırma
// ============================================================

let _qrInstances = {};

function renderQRPage(){
  const wrap = document.getElementById('qr-grid');
  if(!wrap) return;

  // Temizle
  _qrInstances = {};

  // Backend zaten fabrika+dept filtreli veri gönderiyor
  const areas = [...S.areas];

  // Fabrika filtresi
  const fabrikaSet = [...new Set(areas.map(a=>a.fabrika).filter(Boolean))];
  const filterBar = document.getElementById('qr-filter-bar');
  if(filterBar && !filterBar._built){
    filterBar._built = true;
    filterBar.innerHTML = `
      <button class="filter-btn active" onclick="qrFabFilter('all',this)">Tümü</button>
      ${fabrikaSet.map(f=>`<button class="filter-btn" onclick="qrFabFilter('${f}',this)">${f}</button>`).join('')}
    `;
  }

  const baseUrl = window.location.origin + window.location.pathname;

  wrap.innerHTML = areas.map(area=>`
    <div class="qr-card" id="qr-card-${area.id}">
      <div class="qr-area-name">${area.name}</div>
      <div class="qr-area-sub">${area.fabrika||''} ${area.bolum?'· '+area.bolum:''}</div>
      <div class="qr-code-wrap" id="qr-${area.id}"></div>
      <div class="qr-url">${baseUrl}?area=${area.id}</div>
      <div class="qr-card-actions">
        <button class="btn btn-sm btn-secondary" onclick="downloadQR('${area.id}','${area.name.replace(/'/g,'')}')">⬇️ İndir</button>
      </div>
    </div>
  `).join('');

  // QR'ları render et — kısa gecikmeyle DOM'un yerleşmesi için
  requestAnimationFrame(()=>{
    areas.forEach(area=>{
      const el = document.getElementById('qr-'+area.id);
      if(!el || !window.QRCode) return;
      el.innerHTML = '';
      try {
        _qrInstances[area.id] = new QRCode(el, {
          text: `${baseUrl}?area=${area.id}`,
          width: 160, height: 160,
          colorDark: '#1e3a5f',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch(e){ el.textContent = 'QR hatası'; }
    });
  });
}

function qrFabFilter(fab, btn){
  document.querySelectorAll('#qr-filter-bar .filter-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');

  document.querySelectorAll('.qr-card').forEach(card=>{
    if(fab==='all'){ card.style.display=''; return; }
    const areaId = card.id.replace('qr-card-','');
    const area = S.areas.find(a=>a.id===areaId);
    card.style.display = (area?.fabrika===fab) ? '' : 'none';
  });
}

function downloadQR(areaId, areaName){
  const el = document.getElementById('qr-'+areaId);
  if(!el) return;
  const canvas = el.querySelector('canvas');
  const img    = el.querySelector('img');

  if(canvas){
    const link = document.createElement('a');
    link.download = `QR-${areaName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } else if(img){
    const link = document.createElement('a');
    link.download = `QR-${areaName}.png`;
    link.href = img.src;
    link.click();
  } else {
    showToast('QR henüz oluşturulmadı.');
  }
}

function printAllQR(){
  const baseUrl = window.location.origin + window.location.pathname;
  // Backend zaten fabrika+dept filtreli veri gönderiyor
  const areas = [...S.areas];

  const printWin = window.open('', '_blank', 'width=900,height=700');
  printWin.document.write(`<!DOCTYPE html><html><head>
    <title>5S QR Kodları</title>
    <style>
      body{font-family:sans-serif;margin:0;padding:16px;}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
      .card{border:1px solid #ddd;border-radius:8px;padding:16px;text-align:center;break-inside:avoid;}
      .name{font-weight:700;font-size:14px;margin-bottom:4px;}
      .sub{font-size:11px;color:#666;margin-bottom:8px;}
      .url{font-size:9px;color:#999;margin-top:4px;word-break:break-all;}
      @media print{body{padding:0;}.card{border:1px solid #ccc;}}
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
  </head><body>
    <h2 style="text-align:center;margin-bottom:16px;">5S Denetim — QR Kodları</h2>
    <div class="grid">
      ${areas.map(a=>`
        <div class="card">
          <div class="name">${a.name}</div>
          <div class="sub">${a.fabrika||''} ${a.bolum?'· '+a.bolum:''}</div>
          <div id="qp-${a.id}"></div>
          <div class="url">${baseUrl}?area=${a.id}</div>
        </div>
      `).join('')}
    </div>
    <script>
      window.onload = function(){
        ${areas.map(a=>`
          new QRCode(document.getElementById('qp-${a.id}'), {
            text:'${baseUrl}?area=${a.id}',
            width:120, height:120,
            colorDark:'#1e3a5f', colorLight:'#ffffff'
          });
        `).join('')}
        setTimeout(()=>window.print(), 1200);
      };
    <\/script>
  </body></html>`);
  printWin.document.close();
}
