// ============================================================
// dashboard.js — Dashboard render fonksiyonları
// ============================================================

function renderDashboard(){
  if(!CURRENT_USER) return;
  const role = CURRENT_USER.role;
  document.getElementById('dash-admin').style.display      = (role==='admin')     ? 'block':'none';
  document.getElementById('dash-denetci').style.display    = (role==='denetci')   ? 'block':'none';
  document.getElementById('dash-takimlider').style.display = (role==='departman'||role==='takimlider') ? 'block':'none';

  if(role==='admin')     renderAdminDashboard();
  if(role==='denetci')   renderDenetciDashboard();
  if(role==='departman'||role==='takimlider') renderDepartmanDashboard();
}

// ─────────────────────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────
function renderAdminDashboard(){
  // Dept filtre satırını her zaman güncelle
  renderDeptFilterRow(S.fabrikaFilter||'all');

  const filtered = getFilteredAudits();

  // Metrikler
  const avgScore = filtered.length ? Math.round(filtered.reduce((s,a)=>s+(a.total_score||0),0)/filtered.length) : 0;
  const openActions = S.actions.filter(a=>a.status==='Açık').length;

  const mTotal = document.getElementById('m-total');
  if(mTotal) mTotal.textContent = avgScore || '—';
  const bar = document.getElementById('m-5s-bar');
  if(bar) bar.style.width = (avgScore)+'%';
  const mSub = document.getElementById('m-total-sub');
  if(mSub) mSub.textContent = `${filtered.length} denetim — ${TITLES[S.timeFilter]||S.timeFilter||''}`;

  // Tamamlanma oranı — atamalar vs gerçekleşen
  const planlanan = (S.atamalar||[]).length;
  const tamamlanan = (S.atamalar||[]).filter(a=>a.status==='Tamamlandı').length;
  const perfPct = planlanan>0 ? Math.round((tamamlanan/planlanan)*100) : 0;
  const mAvg = document.getElementById('m-avg');
  if(mAvg) mAvg.textContent = perfPct;
  const perfBar = document.getElementById('m-perf-bar');
  if(perfBar) perfBar.style.width = Math.min(perfPct,100)+'%';

  // En iyi bölge
  const areaScores = {};
  filtered.forEach(a=>{ const k=a.area_name||a.area_id; if(!areaScores[k]) areaScores[k]=[]; areaScores[k].push(a.total_score||0); });
  let bestArea='—', bestScore=0;
  Object.entries(areaScores).forEach(([k,v])=>{
    const avg=Math.round(v.reduce((s,x)=>s+x,0)/v.length);
    if(avg>bestScore){ bestScore=avg; bestArea=k; }
  });
  const mBest=document.getElementById('m-best'); if(mBest) mBest.textContent=bestArea;
  const mBestS=document.getElementById('m-best-score'); if(mBestS) mBestS.textContent=bestScore>0?bestScore+' puan':'';
  const mActions=document.getElementById('m-actions'); if(mActions) mActions.textContent=openActions;

  // Kritik banner
  const kritikBanner=document.getElementById('kritik-banner');
  const kritikActions=S.actions.filter(a=>a.priority==='Kritik'&&a.status==='Açık');
  if(kritikBanner){
    if(kritikActions.length>0){
      kritikBanner.style.display='block';
      kritikBanner.textContent=`⚠ ${kritikActions.length} adet KRİTİK açık aksiyon var! Acil müdahale gerekiyor.`;
    } else {
      kritikBanner.style.display='none';
    }
  }

  // Denetçi plan/tamamlanan widget
  renderDenetciPlanTamamWidget();
  renderLeaderboardPreview();
  renderActionDashboardWidget();
  renderRadarChart(filtered);
  renderBolumBarChart(filtered);
}

function renderDenetciPlanTamamWidget(){
  const planlananEl=document.getElementById('planlanan-list');
  const tamamlananEl=document.getElementById('tamamlanan-list');
  if(!planlananEl||!tamamlananEl) return;

  const atamalar=S.atamalar||[];
  const bekleyenler=atamalar.filter(a=>a.status==='Bekliyor'||a.status==='Devam Ediyor');
  const tamamlananlar=atamalar.filter(a=>a.status==='Tamamlandı');

  planlananEl.innerHTML = bekleyenler.length===0
    ? '<div style="font-size:12px;color:var(--text3);padding:8px 0;">Bekleyen denetim yok</div>'
    : bekleyenler.slice(0,5).map(a=>`
      <div style="padding:8px 10px;background:var(--surface);border:1px solid var(--border);border-radius:var(--rs);margin-bottom:6px;font-size:12px;">
        <div style="font-weight:600;">${a.auditor_name||'—'}</div>
        <div style="color:var(--text3);">${a.area_name||'—'} · ${a.planned_date||'—'}</div>
        <span class="badge badge-amber">${a.status}</span>
      </div>`).join('');

  tamamlananEl.innerHTML = tamamlananlar.length===0
    ? '<div style="font-size:12px;color:var(--text3);padding:8px 0;">Tamamlanan yok</div>'
    : tamamlananlar.slice(0,5).map(a=>`
      <div style="padding:8px 10px;background:var(--surface);border:1px solid var(--border);border-radius:var(--rs);margin-bottom:6px;font-size:12px;">
        <div style="font-weight:600;">${a.auditor_name||'—'}</div>
        <div style="color:var(--text3);">${a.area_name||'—'} · ${a.planned_date||'—'}</div>
        <span class="badge badge-green">Tamamlandı</span>
      </div>`).join('');
}

function renderLeaderboardPreview(){
  const el=document.getElementById('leaderboard-preview'); if(!el) return;
  const areaMap={};
  S.audits.forEach(a=>{ const k=a.area_name||a.area_id; if(!areaMap[k]) areaMap[k]=[]; areaMap[k].push(a.total_score||0); });
  const sorted=Object.entries(areaMap).map(([k,v])=>({ name:k, avg:Math.round(v.reduce((s,x)=>s+x,0)/v.length) })).sort((a,b)=>b.avg-a.avg).slice(0,3);
  const medals=['🥇','🥈','🥉'];
  el.innerHTML=sorted.map((a,i)=>`
    <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);">
      <div style="font-size:18px;">${medals[i]}</div>
      <div style="flex:1;"><div style="font-size:13px;font-weight:600;">${a.name}</div></div>
      <div style="font-family:var(--mono);font-weight:700;color:${scoreColor(a.avg)};">${a.avg}</div>
    </div>`).join('')||'<div style="color:var(--text3);font-size:12px;padding:8px 0;">Henüz denetim yok</div>';
}

function renderActionDashboardWidget(){
  const el=document.getElementById('action-dashboard-widget'); if(!el) return;
  const acik=S.actions.filter(a=>a.status==='Açık');
  el.innerHTML=acik.slice(0,4).map(a=>`
    <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);">
      <span class="badge ${a.priority==='Kritik'?'badge-red':a.priority==='Yüksek'?'badge-amber':'badge-blue'}">${a.priority}</span>
      <div style="flex:1;font-size:12px;">${(a.description||'').substring(0,45)}${(a.description||'').length>45?'...':''}</div>
    </div>`).join('')||'<div style="color:var(--text3);font-size:12px;padding:8px 0;">Açık aksiyon yok ✓</div>';
}

// Radar chart
let _radarChart=null;
function renderRadarChart(audits){
  const canvas=document.getElementById('radarChart'); if(!canvas) return;
  if(_radarChart){ _radarChart.destroy(); _radarChart=null; }
  const pillarAvgs=PILLARS.map((p,pi)=>{
    const vals=audits.map(a=>{
      // pillars_json array veya object olabilir
      const pjs = Array.isArray(a.pillars_json) ? a.pillars_json : (a.pillars_json ? Object.values(a.pillars_json) : []);
      const pData = pjs[pi];
      return pData?.score || pData?.pct || 0;
    }).filter(v=>v>0);
    return vals.length?Math.round(vals.reduce((s,x)=>s+x,0)/vals.length):0;
  });
  _radarChart=new Chart(canvas,{
    type:'radar',
    data:{ labels:PILLARS.map(p=>p.id+'\n'+p.name.split('(')[0].trim()), datasets:[{ data:pillarAvgs, backgroundColor:'rgba(13,34,64,.12)', borderColor:'#0d2240', borderWidth:2, pointBackgroundColor:'#E63312' }] },
    options:{ responsive:true, maintainAspectRatio:false, scales:{ r:{ beginAtZero:true, max:100, ticks:{stepSize:25,font:{size:9}}, pointLabels:{font:{size:9}} } }, plugins:{legend:{display:false}} }
  });
}

// Bölüm bar chart
let _bolumBarChart=null;
function renderBolumBarChart(audits){
  const canvas=document.getElementById('bolumBarChart'); if(!canvas) return;
  if(_bolumBarChart){ _bolumBarChart.destroy(); _bolumBarChart=null; }
  const areaMap={};
  audits.forEach(a=>{ const k=a.area_name||a.area_id; if(!areaMap[k]) areaMap[k]=[]; areaMap[k].push(a.total_score||0); });
  const labels=Object.keys(areaMap).slice(0,8);
  const data=labels.map(k=>Math.round(areaMap[k].reduce((s,x)=>s+x,0)/areaMap[k].length));
  _bolumBarChart=new Chart(canvas,{
    type:'bar',
    data:{ labels, datasets:[{ data, backgroundColor:data.map(s=>s>=85?'rgba(46,125,79,.7)':s>=70?'rgba(13,34,64,.7)':s>=50?'rgba(212,130,10,.7)':'rgba(230,51,18,.7)'), borderRadius:4 }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true,max:100,ticks:{font:{size:9}}}, x:{ticks:{font:{size:9}}} } }
  });
}

// ─────────────────────────────────────────────────────────────
// DENETÇİ DASHBOARD
// ─────────────────────────────────────────────────────────────
function renderDenetciDashboard(){
  if(!CURRENT_USER) return;
  const name=CURRENT_USER.name;
  const nameEl=document.getElementById('denetci-name-lbl'); if(nameEl) nameEl.textContent=name;
  const dateEl=document.getElementById('denetci-date-lbl'); if(dateEl) dateEl.textContent=new Date().toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'});

  const myAudits=S.audits.filter(a=>a.auditor_id===CURRENT_USER.id||a.auditor_name===name);
  const thisMonth=new Date(); thisMonth.setDate(1);
  const monthAudits=myAudits.filter(a=>new Date(a.date)>=thisMonth);

  const dMonth=document.getElementById('d-month'); if(dMonth) dMonth.textContent=monthAudits.length;
  const dTotal=document.getElementById('d-total'); if(dTotal) dTotal.textContent=myAudits.length;
  const avg=myAudits.length?Math.round(myAudits.reduce((s,a)=>s+(a.total_score||0),0)/myAudits.length):0;
  const dAvg=document.getElementById('d-avg'); if(dAvg) dAvg.textContent=avg||'—';

  // Atanan denetimler
  const atanan=(S.atamalar||[]).filter(a=>a.auditor_id===CURRENT_USER.id&&a.status==='Bekliyor');
  const badge=document.getElementById('d-atanan-badge'); if(badge){ badge.textContent=atanan.length+' bekliyor'; badge.style.display=atanan.length?'':'none'; }
  const dAtanan=document.getElementById('d-atanan'); if(dAtanan) dAtanan.textContent=monthAudits.length;

  const atananList=document.getElementById('atanan-list'); if(!atananList) return;
  atananList.innerHTML=atanan.length===0
    ? '<div style="font-size:12px;color:var(--text3);padding:8px 0;">Atanan görev yok ✓</div>'
    : atanan.map(a=>`
      <div style="padding:10px;background:var(--surface2);border-radius:var(--rs);margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:13px;font-weight:600;">${a.area_name||'—'}</div>
          <div style="font-size:11px;color:var(--text3);">📅 ${a.planned_date||'—'} · ${a.shift||''}</div>
          ${a.notes?`<div style="font-size:11px;color:var(--amber);margin-top:3px;">📌 ${a.notes}</div>`:''}
        </div>
        <button class="btn btn-primary btn-sm" onclick="denetimBaslat('${a.id}','${a.area_id}','${a.area_name}')">Başlat →</button>
      </div>`).join('');

  const recentEl=document.getElementById('denetci-recent'); if(recentEl){
    recentEl.innerHTML=myAudits.slice(0,5).map(a=>`
      <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);">
        <div style="flex:1;"><div style="font-size:12px;font-weight:600;">${a.area_name||'—'}</div><div style="font-size:11px;color:var(--text3);">${a.date||'—'}</div></div>
        <span class="badge ${scoreBadge(a.total_score||0)}">${a.total_score||0}</span>
      </div>`).join('')||'<div style="color:var(--text3);font-size:12px;">Henüz denetim yok</div>';
  }
}

function denetimBaslat(atamaId, alanId, alanAd){
  window._aktifAtama={atamaId, alanId, alanAd};
  navigate('new-audit');
}

async function atamaKapat(id, auditId){
  try {
    await apiFetch('/audits/plans/'+id, {
      method:'PUT',
      body:JSON.stringify({ status:'Tamamlandı', completed_audit_id:auditId||null })
    });
    const pl=S.atamalar.find(a=>a.id===id);
    if(pl) pl.status='Tamamlandı';
    showToast('✓ Atama tamamlandı olarak işaretlendi');
  } catch(err){ showToast('⚠ '+err.message); }
}

// ─────────────────────────────────────────────────────────────
// DEPARTMAN DASHBOARD
// ─────────────────────────────────────────────────────────────
function renderDepartmanDashboard(){
  if(!CURRENT_USER) return;
  const fabrika = CURRENT_USER.fabrika||'';
  const dept    = CURRENT_USER.dept||'';

  // Backend zaten fabrika+dept filtresini uyguluyor — S.areas ve S.audits zaten doğru veri
  const myAreas = S.areas;
  const myAreaIds = new Set(myAreas.map(a=>a.id));
  const myAuditsFull = S.audits.filter(a=>myAreaIds.has(a.area_id));

  const adiEl=document.getElementById('dept-adi');
  if(adiEl) adiEl.textContent=(dept ? dept+' – ' : '')+fabrika||(CURRENT_USER.name||'—');
  const bolumAdiEl=document.getElementById('dept-bolum-adi');
  if(bolumAdiEl) bolumAdiEl.textContent=dept||fabrika||'Departman';

  const avg=myAuditsFull.length?Math.round(myAuditsFull.reduce((s,a)=>s+(a.total_score||0),0)/myAuditsFull.length):0;
  const skorBig=document.getElementById('dept-skor-big'); if(skorBig) skorBig.textContent=avg||'—';

  const thisMonth=new Date(); thisMonth.setDate(1);
  const monthAudits=myAuditsFull.filter(a=>new Date(a.date)>=thisMonth);
  const maxScore=myAuditsFull.reduce((m,a)=>Math.max(m,a.total_score||0),0);
  const openActs=S.actions.filter(a=>myAreas.some(ar=>ar.id===a.area_id)&&a.status==='Açık');

  ['dept-total','dept-month','dept-best','dept-actions'].forEach((id,i)=>{
    const el=document.getElementById(id); if(!el) return;
    el.textContent=[myAuditsFull.length, monthAudits.length, maxScore||'—', openActs.length][i];
  });

  const recentEl=document.getElementById('dept-recent'); if(recentEl){
    recentEl.innerHTML=myAuditsFull.slice(0,5).map(a=>`
      <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);">
        <div style="flex:1;"><div style="font-size:12px;font-weight:600;">${a.area_name||'—'}</div><div style="font-size:11px;color:var(--text3);">${a.date||'—'}</div></div>
        <span class="badge ${scoreBadge(a.total_score||0)}">${a.total_score||0}</span>
      </div>`).join('')||'<div style="font-size:12px;color:var(--text3);">Henüz denetim yok</div>';
  }

  const aksEl=document.getElementById('dept-aksiyonlar');
  const aksCount=document.getElementById('dept-aksiyon-count');
  if(aksEl){ aksEl.innerHTML=openActs.slice(0,4).map(a=>`<div style="padding:7px 0;border-bottom:1px solid var(--border);font-size:12px;">${(a.description||'').substring(0,50)}<span class="badge badge-amber" style="margin-left:6px;">${a.priority}</span></div>`).join('')||'<div style="font-size:12px;color:var(--text3);">Açık aksiyon yok ✓</div>'; }
  if(aksCount) aksCount.textContent=openActs.length;
}

// ─────────────────────────────────────────────────────────────
// DİĞER SAYFALAR — Leaderboard, Hedefler, Takvim, Denetçiler, Karşılaştırma
// ─────────────────────────────────────────────────────────────
function renderLeaderboard(){
  const el=document.getElementById('leaderboard-list'); if(!el) return;
  const filter=document.getElementById('lb-filter')?.value||'all';
  let auds=S.audits;
  if(filter==='month'){ const d=new Date(); d.setDate(1); auds=auds.filter(a=>new Date(a.date)>=d); }
  if(filter==='week'){ const d=new Date(); d.setDate(d.getDate()-7); auds=auds.filter(a=>new Date(a.date)>=d); }
  const map={};
  auds.forEach(a=>{ const k=a.area_name||a.area_id; if(!map[k]) map[k]=[]; map[k].push(a.total_score||0); });
  const sorted=Object.entries(map).map(([k,v])=>({ name:k, avg:Math.round(v.reduce((s,x)=>s+x,0)/v.length), cnt:v.length })).sort((a,b)=>b.avg-a.avg);
  const medals=['🥇','🥈','🥉'];
  el.innerHTML=sorted.map((a,i)=>`
    <div style="display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--border);">
      <div style="font-size:20px;min-width:30px;text-align:center;">${medals[i]||'#'+(i+1)}</div>
      <div style="flex:1;"><div style="font-size:13px;font-weight:600;">${a.name}</div><div style="font-size:11px;color:var(--text3);">${a.cnt} denetim</div></div>
      <div class="sbar-wrap" style="width:120px;"><div class="sbar"><div class="sbar-fill ${a.avg>=85?'hi':a.avg>=50?'md':'lo'}" style="width:${a.avg}%;"></div></div><span class="sbar-val">${a.avg}</span></div>
    </div>`).join('')||'<div style="text-align:center;padding:20px;color:var(--text3);">Denetim verisi yok</div>';
}

function renderHedefler(){
  const el=document.getElementById('hedef-list'); if(!el) return;
  if(!S.areas.length){ el.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);">Bölge bulunamadı</div>'; return; }
  el.innerHTML=S.areas.map(a=>{
    const lastAudit=S.audits.filter(au=>au.area_id===a.id||au.area_name===a.name).sort((x,y)=>y.date?.localeCompare(x.date))[0];
    const current=lastAudit?.total_score||0;
    const hedef=S.hedefler?.[a.id]||80;
    return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);">
      <div style="flex:1;font-size:13px;">${a.name} <span style="font-size:10px;color:var(--text3);">· ${a.fabrika||''} ${a.dept||''}</span></div>
      <div style="text-align:center;min-width:60px;"><div style="font-size:16px;font-weight:700;color:${scoreColor(current)};">${current||'—'}</div><div style="font-size:9px;color:var(--text3);">Mevcut</div></div>
      <div style="display:flex;align-items:center;gap:5px;">
        <span style="font-size:11px;color:var(--text3);">Hedef:</span>
        <input type="number" min="0" max="100" value="${hedef}" style="width:55px;font-size:12px;padding:4px 6px;text-align:center;"
          onchange="setHedef('${a.id}',+this.value,this)">
      </div>
    </div>`;
  }).join('');
}

function setHedef(areaId, val, span){
  if(!S.hedefler) S.hedefler={};
  S.hedefler[areaId]=Math.min(100,Math.max(0,val));
  showToast('✓ Hedef güncellendi');
}

function renderTakvim(){
  const el=document.getElementById('takvim-list'); if(!el) return;
  const rows=S.areas.map(a=>{
    const audits=S.audits.filter(au=>au.area_id===a.id||au.area_name===a.name).sort((x,y)=>y.date?.localeCompare(x.date));
    const last=audits[0]; const days=last?Math.floor((new Date()-new Date(last.date))/86400000):null;
    const urgency=days===null?'Hiç denetlenmedi':days===0?'Bugün':days+' gün önce';
    const color=days===null||days>30?'var(--red)':days>14?'var(--amber)':'var(--green)';
    return `<tr><td>${a.name}</td><td>${a.fabrika||'—'}</td><td>${a.dept||'—'}</td><td style="color:${color};font-weight:600;">${urgency}</td><td>${last?.date||'—'}</td><td><button class="btn btn-outline btn-sm" onclick="navigate('new-audit')">+ Denetle</button></td></tr>`;
  }).join('');
  el.innerHTML=`<div class="tbl-wrap"><table><thead><tr><th>Bölge</th><th>Fabrika</th><th>Departman</th><th>Son Denetim</th><th>Tarih</th><th>İşlem</th></tr></thead><tbody>${rows||'<tr><td colspan="6" style="text-align:center;color:var(--text3);">Veri yok</td></tr>'}</tbody></table></div>`;
}

function renderDenetciler(){
  const el=document.getElementById('denetci-list'); if(!el) return;
  const denetciler=S.users.filter(u=>u.role==='denetci');
  if(!denetciler.length){ el.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);">Denetçi bulunamadı</div>'; return; }
  el.innerHTML=denetciler.map(d=>{
    const myAudits=S.audits.filter(a=>a.auditor_id===d.id||a.auditor_name===d.name);
    const avg=myAudits.length?Math.round(myAudits.reduce((s,a)=>s+(a.total_score||0),0)/myAudits.length):0;
    const bekleyen=(S.atamalar||[]).filter(a=>a.auditor_id===d.id&&a.status==='Bekliyor').length;
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);">
      <div style="width:40px;height:40px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;">${d.name.split(' ').map(n=>n[0]).join('').substring(0,2)}</div>
      <div style="flex:1;"><div style="font-size:13px;font-weight:600;">${d.name}</div><div style="font-size:11px;color:var(--text3);">${myAudits.length} denetim · ${bekleyen} bekliyor</div></div>
      <div style="text-align:center;"><div style="font-size:18px;font-weight:700;color:${scoreColor(avg)};">${avg||'—'}</div><div style="font-size:9px;color:var(--text3);">ort. skor</div></div>
    </div>`;
  }).join('');
}

function renderKarsilastirma(){
  const el=document.getElementById('karsilastirma-table'); if(!el) return;
  const areaMap={};
  S.audits.forEach(a=>{
    const k=a.area_id||a.area_name;
    if(!areaMap[k]) areaMap[k]={ name:a.area_name||a.area_id, scores:[], pillars:{} };
    areaMap[k].scores.push(a.total_score||0);
    const pjs=a.pillars_json||{};
    PILLARS.forEach(p=>{ if(pjs[p.id]?.pct) { if(!areaMap[k].pillars[p.id]) areaMap[k].pillars[p.id]=[]; areaMap[k].pillars[p.id].push(pjs[p.id].pct); } });
  });
  const rows=Object.values(areaMap).map(a=>{
    const avg=Math.round(a.scores.reduce((s,x)=>s+x,0)/a.scores.length);
    const pScores=PILLARS.map(p=>{ const vals=a.pillars[p.id]||[]; return vals.length?Math.round(vals.reduce((s,x)=>s+x,0)/vals.length):0; });
    return `<tr><td><b>${a.name}</b></td><td style="font-family:var(--mono);font-weight:700;color:${scoreColor(avg)};">${avg}</td>${pScores.map(s=>`<td style="font-family:var(--mono);color:${scoreColor(s)};">${s||'—'}</td>`).join('')}</tr>`;
  }).join('');
  el.innerHTML=`<div class="tbl-wrap"><table><thead><tr><th>Bölge</th><th>Toplam</th>${PILLARS.map(p=>`<th>${p.id}</th>`).join('')}</tr></thead><tbody>${rows||'<tr><td colspan="7" style="text-align:center;">Veri yok</td></tr>'}</tbody></table></div>`;
}

function exportKarsilastirmaPDF(){ window.print(); }

// Varsayılan şablon — PILLARS'tan otomatik üretilir
function _getVarsayilanSablon(){
  return {
    id:'default',
    adi:'Standart 5S Formu',
    aciklama:'Tüm fabrikalar için genel 5S denetim formu',
    readonly:true,
    pillarlar: PILLARS.map(p=>({ id:p.id, name:p.name, sorular:p.questions.map(q=>q.text) }))
  };
}

function renderFormSablonlari(){
  const el=document.getElementById('form-sablon-listesi'); if(!el) return;
  if(!S.formSablonlari) S.formSablonlari=[];

  // Varsayılan + kullanıcı şablonları
  const tumSablonlar = [_getVarsayilanSablon(), ...S.formSablonlari];

  el.innerHTML = tumSablonlar.map(f=>`
    <div class="card" style="margin-bottom:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="font-size:14px;font-weight:600;">${f.adi} ${f.readonly?'<span style="font-size:10px;color:var(--brand);background:var(--brand-light);padding:2px 7px;border-radius:10px;margin-left:6px;">Varsayılan</span>':''}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px;">${f.aciklama||''}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:4px;">${(f.pillarlar||[]).length} pillar · ${(f.pillarlar||[]).reduce((s,p)=>s+(p.sorular||[]).length,0)} soru</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="formOnizle('${f.id}')">👁 Önizle</button>
          ${!f.readonly?`<button class="btn btn-sm" style="color:var(--red);border:1px solid var(--red);background:var(--red-light);" onclick="formSablonuSil('${f.id}')">🗑️ Sil</button>`:''}
        </div>
      </div>
    </div>`).join('');
}

function openFormModal(form, pillarlar){
  // Pillar editörünü PILLARS'tan doldur
  const editor = document.getElementById('fm-pillar-editor');
  if(editor){
    editor.innerHTML = PILLARS.map((p,pi)=>`
      <div class="card" style="margin-bottom:12px;">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px;color:${p.color||'var(--brand)'};">${p.name}</div>
        ${p.questions.map((q,qi)=>`
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;padding:8px;background:var(--surface2);border-radius:var(--rs);">
            <input type="checkbox" id="fm-q-${pi}-${qi}" checked style="margin-top:3px;flex-shrink:0;">
            <label for="fm-q-${pi}-${qi}" style="font-size:12px;line-height:1.4;cursor:pointer;">${q.text}</label>
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  // Form alanlarını temizle
  document.getElementById('fm-adi').value = form?.adi||'';
  document.getElementById('fm-aciklama').value = form?.aciklama||'';
  document.getElementById('fm-edit-id').value = form?.id||'';

  // Bölge dropdown doldur
  const bolge = document.getElementById('fm-bolge');
  if(bolge){
    bolge.innerHTML = '<option value="">— Seçin —</option>' +
      S.areas.map(a=>`<option value="${a.id}">${a.name} (${a.fabrika||''})</option>`).join('');
  }

  openModal('modal-form-yeni');
}

function formSablonuKaydet(){
  const adi = document.getElementById('fm-adi')?.value.trim();
  if(!adi){ showToast('Form adı zorunlu.'); return; }

  const id = document.getElementById('fm-edit-id')?.value || 'form-'+Date.now();
  const aciklama = document.getElementById('fm-aciklama')?.value.trim();

  // Seçili soruları topla
  const pillarlar = PILLARS.map((p,pi)=>({
    id: p.id,
    name: p.name,
    sorular: p.questions
      .filter((_,qi)=>document.getElementById(`fm-q-${pi}-${qi}`)?.checked)
      .map(q=>q.text)
  })).filter(p=>p.sorular.length>0);

  if(!S.formSablonlari) S.formSablonlari=[];
  const existing = S.formSablonlari.findIndex(f=>f.id===id);
  const sablon = { id, adi, aciklama, pillarlar };
  if(existing>=0) S.formSablonlari[existing]=sablon;
  else S.formSablonlari.push(sablon);

  closeModal('modal-form-yeni');
  renderFormSablonlari();
  showToast('✅ Form şablonu kaydedildi.');
}

function formSablonuSil(id){
  if(!confirm('Bu şablonu silmek istediğinizden emin misiniz?')) return;
  S.formSablonlari=(S.formSablonlari||[]).filter(f=>f.id!==id);
  renderFormSablonlari();
  showToast('Form şablonu silindi.');
}

function formOnizle(id){
  const sablon = id==='default' ? _getVarsayilanSablon() : (S.formSablonlari||[]).find(f=>f.id===id);
  if(!sablon) return;

  const baslik = document.getElementById('onizleme-baslik');
  if(baslik) baslik.textContent = sablon.adi;

  const icerik = document.getElementById('onizleme-icerik');
  if(icerik){
    icerik.innerHTML = (sablon.pillarlar||[]).map(p=>`
      <div style="margin-bottom:16px;">
        <div style="font-weight:600;font-size:13px;margin-bottom:8px;padding:8px;background:var(--surface2);border-radius:var(--rs);">${p.name}</div>
        ${(p.sorular||[]).map((s,i)=>`
          <div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;">
            <span style="color:var(--text3);flex-shrink:0;">${i+1}.</span>
            <span>${s}</span>
          </div>
        `).join('')}
      </div>
    `).join('') || '<div style="color:var(--text3);">Soru bulunamadı.</div>';
  }

  openModal('modal-form-onizleme');
}
