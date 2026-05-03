// ============================================================
// audit.js — Denetim formu, soru yapılandırma, kaydetme
// ============================================================

// _editAuditId — app.js'de tanımlı (global state)

// ── Form yardımcıları ─────────────────────────────────────────
function _setAuditorDisplay(name){
  const av=document.getElementById('auditor-avatar');
  const disp=document.getElementById('auditor-display');
  if(av){ const ini=name.split(' ').map(n=>n[0]||'').join('').substring(0,2).toUpperCase(); av.textContent=ini; }
  if(disp) disp.textContent=name;
}

function _showAreaQRCard(area){
  const card=document.getElementById('area-qr-card');
  const sel=document.getElementById('audit-area');
  const nameEl=document.getElementById('area-qr-name');
  const subEl=document.getElementById('area-qr-sub');
  if(card){ card.style.display='flex'; }
  if(sel)  sel.style.display='none';
  if(nameEl) nameEl.textContent=area.name||'—';
  if(subEl)  subEl.textContent=[area.fabrika, area.dept, area.alt_dept].filter(Boolean).join(' · ');
}

function _hideAreaQRCard(){
  const card=document.getElementById('area-qr-card');
  const sel=document.getElementById('audit-area');
  if(card) card.style.display='none';
  if(sel)  sel.style.display='block';
}

function clearAreaQR(){
  _hideAreaQRCard();
  const sel=document.getElementById('audit-area');
  if(sel) sel.value='';
}

function onAuditAreaChange(){
  const sel=document.getElementById('audit-area');
  const areaId=sel?.value;
  const area=S.areas.find(a=>a.id===areaId);
  const locEl=document.getElementById('audit-location');
  if(locEl) locEl.value=area?.fabrika||'';
}

function editAudit(id){
  _editAuditId = id;
  // navigate() _editAuditId'yi null'a sıfırlar — onun yerine doğrudan sayfayı aktifleştir
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));
  const target = document.getElementById('page-new-audit');
  if(target) target.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(x=>{ if(x.getAttribute('onclick')?.includes("'new-audit'")) x.classList.add('active'); });
  const titleEl = document.getElementById('topbar-title');
  if(titleEl) titleEl.textContent = 'Denetim Düzenle';
  closeSidebar();
  initForm();
}

function initForm(){
  const role = CURRENT_USER?.role||'denetci';
  const adminView    = document.getElementById('admin-audit-view');
  const denetciView  = document.getElementById('denetci-audit-view');

  if(role==='admin' && !_editAuditId){
    if(adminView)   adminView.style.display='block';
    if(denetciView) denetciView.style.display='none';
    const tarihEl = document.getElementById('admin-ata-tarih');
    if(tarihEl) tarihEl.value = new Date().toISOString().split('T')[0];
    _renderDenetciKartlari();
    _renderBolgeListesi();
    _renderFormSablonDropdown();
    renderAdminBekleyenList();
    return;
  }

  if(adminView)   adminView.style.display='none';
  if(denetciView) denetciView.style.display='block';

  // Alan dropdown
  const allAreas = S.areas;
  const sel = document.getElementById('audit-area');
  sel.innerHTML = '<option value="">Alan seçiniz...</option>';
  sel.onchange = onAuditAreaChange;
  const fabMap={};
  // Admin düzenleme modunda tüm alanları çek (backend admin için hepsini döner)
  allAreas.forEach(a=>{ const f=a.fabrika||'Genel'; if(!fabMap[f]) fabMap[f]={}; const ad=a.alt_dept||a.dept||'Diğer'; if(!fabMap[f][ad]) fabMap[f][ad]=[]; fabMap[f][ad].push(a); });
  Object.entries(fabMap).forEach(([fab,adMap])=>{
    const og=document.createElement('optgroup'); og.label='🏭 '+fab; sel.appendChild(og);
    Object.entries(adMap).forEach(([ad,areas])=>{
      areas.forEach(a=>{ const opt=document.createElement('option'); opt.value=a.id; opt.textContent=ad+' › '+a.name; og.appendChild(opt); });
    });
  });

  // Düzenleme modu banner'ı
  const editBanner = document.getElementById('audit-edit-banner');

  // Mevcut denetimi yükle (düzenleme modu)
  if(_editAuditId){
    const existingAudit = S.audits.find(a=>a.id===_editAuditId);
    if(!existingAudit){ showToast('⚠ Denetim bulunamadı'); _editAuditId=null; return; }

    if(editBanner){
      editBanner.style.display='flex';
      editBanner.innerHTML=`<span>✏️ <b>Düzenleme Modu</b> — ${existingAudit.area_name} · ${existingAudit.date}</span><button class="btn btn-sm btn-outline" onclick="_editAuditId=null;initForm()">✕ İptal</button>`;
    }

    // Başlık alanlarını doldur
    document.getElementById('audit-form-code').value = existingAudit.form_code||'';
    document.getElementById('audit-date').value = existingAudit.date||'';
    const shiftEl=document.getElementById('audit-shift'); if(shiftEl) shiftEl.value=existingAudit.shift||'Sabah';
    const locEl=document.getElementById('audit-location'); if(locEl) locEl.value=existingAudit.location||'';
    const tlEl=document.getElementById('audit-team-leader'); if(tlEl) tlEl.value=existingAudit.team_leader||'';

    // Alan seç
    if(existingAudit.area_id) sel.value=existingAudit.area_id;

    // Denetçi
    const auditorInput=document.getElementById('audit-auditor');
    if(auditorInput) auditorInput.value=existingAudit.auditor_name||'';
    _setAuditorDisplay(existingAudit.auditor_name||'');
    // Form kodu etiketi
    const lblEl=document.getElementById('audit-form-code-lbl');
    if(lblEl) lblEl.textContent=existingAudit.form_code||'';

    // Cevapları yükle (varsa)
    const rawAnswers = existingAudit.answers_json;
    const savedAnswers = (typeof rawAnswers==='string') ? JSON.parse(rawAnswers||'{}') : (rawAnswers||{});
    S.answers={}; S.photos={}; S.notes={}; S.typeOverrides={};
    PILLARS.forEach((_,pi)=>{
      S.answers[pi] = savedAnswers[pi] || savedAnswers[String(pi)] || [];
      S.photos[pi]={};
      S.notes[pi]=[];
      PILLARS[pi].questions.forEach((_,qi)=>{ S.answers[pi][qi]=S.answers[pi][qi]??null; S.notes[pi][qi]=''; S.photos[pi][qi]=[]; });
      S.typeOverrides[pi]={};
    });
    showToast('✏️ Denetim düzenleme modunda açıldı');

  } else {
    // Yeni denetim modu
    if(editBanner) editBanner.style.display='none';
    document.getElementById('audit-date').value = new Date().toISOString().split('T')[0];
    const formCode = '5S-'+new Date().getFullYear()+'-'+String(S.audits.length+1).padStart(3,'0');
    document.getElementById('audit-form-code').value = formCode;
    const lblEl = document.getElementById('audit-form-code-lbl');
    if(lblEl) lblEl.textContent = formCode;

    // Denetçi avatar + isim
    _setAuditorDisplay(CURRENT_USER?.name||'');
    const auditorInput=document.getElementById('audit-auditor');
    if(auditorInput&&CURRENT_USER) auditorInput.value=CURRENT_USER.name;

    // QR ile açıldıysa alan kartı göster, dropdown gizle
    if(window._aktifAtama){
      const {alanId, alanAd} = window._aktifAtama;
      const area = S.areas.find(a=>a.id===alanId);
      _showAreaQRCard(area || {id:alanId, name:alanAd});
      if(sel) sel.value = alanId;
      const locEl=document.getElementById('audit-location');
      if(locEl&&area) locEl.value=area.fabrika||'';
      showToast('📍 '+alanAd+' — denetim başlatılıyor');
      window._aktifAtama=null;
    } else {
      _hideAreaQRCard();
    }

    S.answers={}; S.photos={}; S.notes={}; S.typeOverrides={};
  }

  const c = document.getElementById('pillars-container');
  c.innerHTML='';
  const isEdit = !!_editAuditId;
  PILLARS.forEach((p,pi)=>{
    if(!isEdit){
      S.answers[pi]=[]; S.photos[pi]={}; S.notes[pi]=[];
      p.questions.forEach((_,qi)=>{ S.answers[pi][qi]=null; S.notes[pi][qi]=''; S.photos[pi][qi]=[]; });
      S.typeOverrides[pi]={};
    }
    const div=document.createElement('div'); div.className='pillar-sec';
    div.innerHTML=`
      <div class="pillar-hdr" onclick="togglePillar(${pi})">
        <div class="pillar-icon" style="background:${p.color}">${p.id}</div>
        <div class="pillar-info"><div class="pillar-name">${p.name}</div><div class="pillar-desc">${p.desc}</div></div>
        <span class="pillar-weight">%${PW[p.id]}</span>
        <span class="pillar-preview" id="pp-${pi}" style="color:var(--text3)">—</span>
        <span class="pillar-toggle" id="pt-${pi}">▼</span>
      </div>
      <div class="pillar-body" id="pb-${pi}">
        ${p.questions.map((q,qi)=>buildQuestion(pi,qi,q)).join('')}
      </div>`;
    c.appendChild(div);
  });
  // Düzenleme modunda kaydedilmiş cevapları UI'a yansıt
  if(isEdit){
    PILLARS.forEach((p,pi)=>{
      p.questions.forEach((q,qi)=>{
        const ans = S.answers[pi]?.[qi];
        if(ans===null||ans===undefined) return;
        const eff=(S.typeOverrides[pi]?.[qi])||q.type;
        if(eff==='count'){
          const cv=document.getElementById('cv-'+pi+'-'+qi); if(cv) cv.textContent=ans;
          const ci=document.getElementById('ci-'+pi+'-'+qi); if(ci) ci.value=ans;
        } else if(eff==='yn'){
          const btn=document.getElementById('yn-'+(ans==='evet'?'e':'h')+'-'+pi+'-'+qi);
          if(btn) btn.classList.add(ans==='evet'?'sel-yes':'sel-no');
        } else if(eff==='yn3'){
          const map={evet:'e',kısmen:'k',hayır:'h'};
          const btn=document.getElementById('yn3-'+map[ans]+'-'+pi+'-'+qi);
          if(btn) btn.classList.add(ans==='hayır'?'sel-no':'sel-yes');
        } else if(eff==='mc'){
          const b=document.getElementById('mc-'+pi+'-'+qi+'-'+ans); if(b) b.classList.add('sel');
        } else if(eff==='score'){
          [0,1,2,3,4].forEach(s=>{ const b=document.getElementById('sb-'+pi+'-'+qi+'-'+s); if(b) b.className='score-btn'+(s===ans?' s'+s:''); });
        }
      });
    });
  }

  updateSummary();
}

function _renderDenetciKartlari(){
  const el=document.getElementById('denetci-kart-listesi'); if(!el) return;
  const denetciler=S.users.filter(u=>u.role==='denetci');
  el.innerHTML=denetciler.map(d=>{
    const myAudits=S.audits.filter(a=>a.auditor_id===d.id||a.auditor_name===d.name).length;
    const bekleyen=(S.atamalar||[]).filter(a=>a.auditor_id===d.id&&a.status==='Bekliyor').length;
    const initials=d.name.split(' ').map(n=>n[0]).join('').substring(0,2);
    return `<div id="dcard-${d.id}" onclick="selectDenetci('${d.id}')" style="cursor:pointer;padding:12px;border:2px solid var(--border);border-radius:var(--r);transition:all .15s;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${initials}</div>
        <div><div style="font-size:13px;font-weight:600;">${d.name}</div><div style="font-size:10px;color:var(--text3);">Denetçi</div></div>
      </div>
      <div style="display:flex;gap:8px;font-size:10px;color:var(--text2);">
        <span>📋 ${myAudits} denetim</span>
        <span style="color:${bekleyen>0?'var(--amber)':'var(--text3)'};">⏳ ${bekleyen} bekliyor</span>
      </div>
    </div>`;
  }).join('')||'<div style="color:var(--text3);font-size:12px;">Denetçi bulunamadı</div>';
}

function _renderBolgeListesi(){
  const listEl=document.getElementById('bolge-secim-listesi');
  const fabFilter=document.getElementById('bolge-fab-filter');
  if(!listEl) return;
  const fabrikalar=['Tümü',...new Set(S.areas.map(a=>a.fabrika||'Diğer'))];
  let aktifFab='Tümü';
  const render=(fab)=>{
    aktifFab=fab;
    if(fabFilter){
      fabFilter.innerHTML=fabrikalar.map(f=>`<button type="button" onclick="window._bolgeFabSec('${f}')" style="padding:4px 10px;border-radius:20px;border:1.5px solid ${f===aktifFab?'var(--brand)':'var(--border)'};background:${f===aktifFab?'var(--brand)':'var(--surface)'};color:${f===aktifFab?'#fff':'var(--text2)'};font-size:11px;font-weight:600;cursor:pointer;">${f}</button>`).join('');
    }
    const filtreliAlanlar=fab==='Tümü'?S.areas:S.areas.filter(a=>(a.fabrika||'Diğer')===fab);
    const gruplar={};
    filtreliAlanlar.forEach(a=>{ const g=a.alt_dept||a.dept||'Genel'; if(!gruplar[g]) gruplar[g]={fab:a.fabrika,dept:a.dept,alanlar:[]}; gruplar[g].alanlar.push(a); });
    listEl.innerHTML=Object.entries(gruplar).map(([grpAd,grp],gi)=>`
      <div style="border:1px solid var(--border);border-radius:var(--r);overflow:hidden;">
        <div onclick="toggleBolgeGrup(${gi})" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--surface2);cursor:pointer;">
          <span style="font-size:12px;font-weight:700;">${grpAd}</span>
          <span style="font-size:11px;color:var(--text3);" id="bolge-grp-arrow-${gi}">▼</span>
        </div>
        <div id="bolge-grp-${gi}" style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid var(--border);">
          ${grp.alanlar.map(a=>`<label id="blabel-${a.id}" style="cursor:pointer;padding:8px 10px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:7px;">
            <input type="checkbox" id="bchk-${a.id}" value="${a.id}" style="margin-top:2px;width:15px;height:15px;cursor:pointer;" onchange="updateBolgeStyle('${a.id}');updateBolgeOzet();">
            <div style="font-size:12px;font-weight:600;">${a.name}</div>
          </label>`).join('')}
        </div>
      </div>`).join('');
    updateBolgeOzet();
  };
  window._bolgeFabSec=(fab)=>render(fab);
  render('Tümü');
}

function _renderFormSablonDropdown(){
  const sel=document.getElementById('admin-ata-form'); if(!sel) return;
  sel.innerHTML='<option value="default">📋 Varsayılan 5S Formu</option>';
  (S.formSablonlari||[]).forEach(f=>{ sel.innerHTML+=`<option value="${f.id}">📝 ${f.adi}</option>`; });
}

function selectDenetci(id){
  document.getElementById('admin-ata-denetci').value=id;
  document.querySelectorAll('[id^="dcard-"]').forEach(c=>c.style.borderColor='var(--border)');
  const card=document.getElementById('dcard-'+id);
  if(card) card.style.borderColor='var(--brand)';
}

function updateBolgeStyle(areaId){
  const lbl=document.getElementById('blabel-'+areaId);
  const chk=document.getElementById('bchk-'+areaId);
  if(lbl) lbl.style.background=chk?.checked?'var(--brand-light)':'';
}
function toggleBolgeGrup(gi){
  const el=document.getElementById('bolge-grp-'+gi);
  const arrow=document.getElementById('bolge-grp-arrow-'+gi);
  if(el) el.style.display=el.style.display==='none'?'grid':'none';
  if(arrow) arrow.textContent=el?.style.display==='none'?'▶':'▼';
}
function updateBolgeOzet(){
  const checked=document.querySelectorAll('[id^="bchk-"]:checked');
  const el=document.getElementById('bolge-secim-ozet');
  if(el) el.textContent=checked.length>0?`${checked.length} bölge seçildi`:'Bölge seçilmedi';
}

async function adminDenetimOlustur(){
  const denetciId=document.getElementById('admin-ata-denetci').value;
  const tarih=document.getElementById('admin-ata-tarih').value;
  const vardiya=document.getElementById('admin-ata-vardiya').value;
  const notlar=document.getElementById('admin-ata-not').value;
  const formId=document.getElementById('admin-ata-form').value;
  const seciliBolgeler=[...document.querySelectorAll('[id^="bchk-"]:checked')].map(c=>c.value);

  if(!denetciId){ showToast('⚠ Lütfen bir denetçi seçin!'); return; }
  if(!seciliBolgeler.length){ showToast('⚠ Lütfen en az bir bölge seçin!'); return; }
  if(!tarih){ showToast('⚠ Lütfen tarih seçin!'); return; }

  const denetci=S.users.find(u=>u.id===denetciId);
  const btn=document.querySelector('[onclick="adminDenetimOlustur()"]');
  if(btn){ btn.disabled=true; btn.textContent='Oluşturuluyor...'; }

  try {
    const promises=seciliBolgeler.map(areaId=>{
      const area=S.areas.find(a=>a.id===areaId);
      return apiFetch('/audits/plans', {
        method:'POST',
        body:JSON.stringify({ area_id:areaId, area_name:area?.name||'', auditor_id:denetciId, auditor_name:denetci?.name||'', planned_date:tarih, shift:vardiya, form_template_id:formId, notes:notlar })
      });
    });
    const results=await Promise.all(promises);
    results.forEach(r=>{ if(r) S.atamalar.push(r); });

    showToast(`✓ ${seciliBolgeler.length} denetim ataması oluşturuldu!`);
    const sonuc=document.getElementById('admin-atama-sonuc');
    if(sonuc) sonuc.innerHTML=`<div style="padding:10px;background:var(--green-light);border-radius:var(--rs);color:var(--green);font-size:12px;">✓ ${seciliBolgeler.length} bölge için denetim planlandı · ${denetci?.name||''}</div>`;
    renderAdminBekleyenList();
    updateBadges();
  } catch(err){
    showToast('⚠ '+err.message);
  } finally {
    if(btn){ btn.disabled=false; btn.textContent='✓ Denetim Oluştur ve Ata'; }
  }
}

function renderAdminBekleyenList(){
  const el=document.getElementById('admin-bekleyen-list'); if(!el) return;
  const bekleyenler=(S.atamalar||[]).filter(a=>a.status==='Bekliyor'||a.status==='Devam Ediyor');
  el.innerHTML=bekleyenler.length===0?'<div style="font-size:12px;color:var(--text3);">Bekleyen atama yok</div>'
    :bekleyenler.map(a=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border:1px solid var(--border);border-radius:var(--rs);margin-bottom:6px;font-size:12px;">
        <div><b>${a.auditor_name||'—'}</b> · ${a.area_name||'—'}<div style="font-size:11px;color:var(--text3);">${a.planned_date||'—'} · ${a.shift||''}</div></div>
        <button class="btn btn-sm" style="color:var(--red);" onclick="atamaIptal('${a.id}')">İptal</button>
      </div>`).join('');
}

async function atamaIptal(id){
  if(!confirm('Atama iptal edilsin mi?')) return;
  try {
    await apiFetch('/audits/plans/'+id, { method:'PUT', body:JSON.stringify({ status:'İptal' }) });
    const pl=S.atamalar.find(a=>a.id===id); if(pl) pl.status='İptal';
    renderAdminBekleyenList();
    showToast('Atama iptal edildi');
  } catch(err){ showToast('⚠ '+err.message); }
}

// ── Pillar toggle ─────────────────────────────────────────────
function togglePillar(pi){
  const body=document.getElementById('pb-'+pi);
  const toggle=document.getElementById('pt-'+pi);
  if(body){ body.classList.toggle('open'); }
  if(toggle){ toggle.classList.toggle('open'); }
}

// ── Soru HTML oluştur ─────────────────────────────────────────
function buildQuestion(pi, qi, q){
  const wBadge=q.w>=5?'<span class="w-badge-crit">KRİTİK</span>':q.w>=3?'<span class="w-badge-imp">ÖNEMLİ</span>':'';
  const typeToggle=(q.type==='yn3'||q.type==='mc')?`<button class="type-toggle-btn" id="tt-${pi}-${qi}" onclick="toggleQuestionType(${pi},${qi})">🔀 Çoktan Seçmeli</button>`:'';
  const eff=(q.type==='yn3'||q.type==='mc')&&S.typeOverrides[pi]&&S.typeOverrides[pi][qi]?S.typeOverrides[pi][qi]:q.type;
  const effOpts=eff==='mc'?(q.mcOptions||q.options||[]):q.options;
  let ansHtml='';
  if(eff==='yn') ansHtml=`<div class="yn-btns"><button class="yn-btn" id="yn-e-${pi}-${qi}" onclick="setYN(${pi},${qi},'evet')">✓ Evet</button><button class="yn-btn" id="yn-h-${pi}-${qi}" onclick="setYN(${pi},${qi},'hayır')">✗ Hayır</button></div>`;
  else if(eff==='yn3') ansHtml=`<div class="yn-btns"><button class="yn-btn" id="yn3-e-${pi}-${qi}" onclick="setYN3(${pi},${qi},'evet')">✓ Evet</button><button class="yn-btn" id="yn3-k-${pi}-${qi}" onclick="setYN3(${pi},${qi},'kısmen')" style="color:var(--amber);">◑ Kısmen</button><button class="yn-btn" id="yn3-h-${pi}-${qi}" onclick="setYN3(${pi},${qi},'hayır')">✗ Hayır</button></div>`;
  else if(eff==='count') ansHtml=`<div class="count-wrap"><button class="count-btn" onclick="changeCount(${pi},${qi},-1)">−</button><span class="count-val" id="cv-${pi}-${qi}">0</span><button class="count-btn" onclick="changeCount(${pi},${qi},1)">+</button><span class="count-label">${q.countLabel||'adet'}</span><input type="number" min="0" id="ci-${pi}-${qi}" value="0" style="width:60px;font-size:13px;padding:5px 8px;margin-left:4px;" oninput="setCount(${pi},${qi},+this.value)"></div>`;
  else if(eff==='score') ansHtml=`<div class="score-opts">${[0,1,2,3,4].map(s=>`<button class="score-btn" id="sb-${pi}-${qi}-${s}" onclick="setScore(${pi},${qi},${s})">${s}</button>`).join('')}</div>`;
  else if(eff==='mc') ansHtml=`<div class="mc-opts">${(effOpts||[]).map((o,oi)=>`<button class="mc-btn" id="mc-${pi}-${qi}-${oi}" onclick="setMC(${pi},${qi},${oi})">${o}</button>`).join('')}</div>`;

  const photoHtml=`<div class="photo-zone" id="pz-${pi}-${qi}" onclick="triggerPhoto(${pi},${qi})"><div class="photo-zone-label"><span>📷</span><span id="pz-lbl-${pi}-${qi}">Fotoğraf ekle (opsiyonel)</span></div><div class="photo-previews" id="pp-prev-${pi}-${qi}"></div></div><input type="file" id="pf-${pi}-${qi}" accept="image/*" multiple style="display:none;" onchange="handlePhotos(${pi},${qi},this)">`;

  return `<div class="q-item"><div class="q-text"><span class="q-num">${qi+1}.</span><span>${q.text}</span></div><div class="q-badges">${wBadge}${typeToggle}</div><div class="ans-wrap">${ansHtml}</div>${q.photo?photoHtml:''}<div class="q-note"><input type="text" placeholder="Not ekle..." value="" oninput="S.notes[${pi}][${qi}]=this.value"></div></div>`;
}

function toggleQuestionType(pi,qi){
  if(!S.typeOverrides[pi]) S.typeOverrides[pi]={};
  const q=PILLARS[pi].questions[qi];
  const cur=S.typeOverrides[pi][qi]||q.type;
  S.typeOverrides[pi][qi]=(cur==='yn3')?'mc':'yn3';
  const body=document.getElementById('pb-'+pi);
  if(body){ body.innerHTML=PILLARS[pi].questions.map((qx,qxi)=>buildQuestion(pi,qxi,qx)).join(''); }
  updateSummary();
}

// ── Cevap setleyiciler ────────────────────────────────────────
function setYN(pi,qi,v){
  S.answers[pi][qi]=v;
  document.querySelectorAll(`[id^="yn-"][id$="-${pi}-${qi}"]`).forEach(b=>b.classList.remove('sel-yes','sel-no'));
  const btn=document.getElementById(`yn-${v==='evet'?'e':'h'}-${pi}-${qi}`);
  if(btn) btn.classList.add(v==='evet'?'sel-yes':'sel-no');
  updateSummary();
}
function setYN3(pi,qi,v){
  S.answers[pi][qi]=v;
  ['e','k','h'].forEach(x=>{ const b=document.getElementById(`yn3-${x}-${pi}-${qi}`); if(b) b.classList.remove('sel-yes','sel-no'); });
  const map={evet:'e',kısmen:'k',hayır:'h'};
  const btn=document.getElementById(`yn3-${map[v]}-${pi}-${qi}`);
  if(btn) btn.classList.add(v==='hayır'?'sel-no':'sel-yes');
  updateSummary();
}
function changeCount(pi,qi,d){
  const cur=S.answers[pi][qi]||0;
  setCount(pi,qi,Math.max(0,cur+d));
}
function setCount(pi,qi,v){
  const val=Math.max(0,v);
  S.answers[pi][qi]=val;
  const cv=document.getElementById('cv-'+pi+'-'+qi); if(cv) cv.textContent=val;
  const ci=document.getElementById('ci-'+pi+'-'+qi); if(ci) ci.value=val;
  updatePhotoRequired(pi,qi,val>0);
  updateSummary();
}
function setScore(pi,qi,v){
  S.answers[pi][qi]=v;
  [0,1,2,3,4].forEach(s=>{ const b=document.getElementById('sb-'+pi+'-'+qi+'-'+s); if(b) b.className='score-btn'+(s===v?' s'+s:''); });
  updateSummary();
}
function setMC(pi,qi,idx){
  S.answers[pi][qi]=idx;
  const q=PILLARS[pi].questions[qi];
  const opts=(q.mcOptions||q.options||[]);
  opts.forEach((_,i)=>{ const b=document.getElementById('mc-'+pi+'-'+qi+'-'+i); if(b) b.classList.toggle('sel',i===idx); });
  updateSummary();
}

function updatePhotoRequired(pi,qi,required){
  const pz=document.getElementById('pz-'+pi+'-'+qi);
  const lbl=document.getElementById('pz-lbl-'+pi+'-'+qi);
  if(pz){ pz.classList.toggle('photo-required',required); }
  if(lbl) lbl.textContent=required?'⚠ Fotoğraf zorunlu':'Fotoğraf ekle (opsiyonel)';
}

function triggerPhoto(pi,qi){ document.getElementById('pf-'+pi+'-'+qi)?.click(); }

function handlePhotos(pi,qi,input){
  if(!S.photos[pi]) S.photos[pi]={};
  if(!S.photos[pi][qi]) S.photos[pi][qi]=[];
  [...input.files].forEach(file=>{
    const reader=new FileReader();
    reader.onload=e=>{ S.photos[pi][qi].push(e.target.result); renderPhotoPreview(pi,qi); };
    reader.readAsDataURL(file);
  });
  input.value='';
}

function renderPhotoPreview(pi,qi){
  const el=document.getElementById('pp-prev-'+pi+'-'+qi); if(!el) return;
  el.innerHTML=(S.photos[pi]?.[qi]||[]).map((src,i)=>`<div class="photo-thumb"><img src="${src}"><button class="photo-del" onclick="removePhoto(${pi},${qi},${i})">✕</button></div>`).join('');
}
function removePhoto(pi,qi,i){ S.photos[pi][qi].splice(i,1); renderPhotoPreview(pi,qi); }

// ── Özet panel ─────────────────────────────────────────────────
function updateSummary(){
  const sumEl=document.getElementById('score-summary'); if(!sumEl) return;
  const totEl=document.getElementById('total-score-display');
  const badgeEl=document.getElementById('score-badge-display');

  const results=PILLARS.map((p,pi)=>({ ...calcPillar(pi, S.answers[pi]||[]), p }));
  const total=Math.round(results.reduce((t,r)=>t+r.contribution,0));

  sumEl.innerHTML=results.map(r=>`
    <div class="sum-pillar">
      <div class="sp-id">${r.p.id}</div>
      <div class="sp-pct" style="color:${scoreColor(r.pct)};">${r.pct||0}%</div>
      <div class="sp-wt">${r.contribution||0} / ${PW[r.p.id]} pt</div>
    </div>`).join('');

  if(totEl) totEl.textContent=total+' / 100';
  if(badgeEl) badgeEl.innerHTML=`<span class="badge ${scoreBadge(total)}" style="font-size:14px;padding:6px 14px;">${scoreLabel(total)}</span>`;

  results.forEach((r,pi)=>{
    const pp=document.getElementById('pp-'+pi);
    if(pp){ pp.textContent=r.pct+'%'; pp.style.color=scoreColor(r.pct); }
  });

  // İlerleme çubuğunu güncelle
  let answered=0, totalQ=0;
  PILLARS.forEach((p,pi)=>{
    p.questions.forEach((_,qi)=>{
      totalQ++;
      const ans=S.answers[pi]?.[qi];
      if(ans!==null&&ans!==undefined) answered++;
    });
  });
  const pct=totalQ?Math.round(answered/totalQ*100):0;
  const progBar=document.getElementById('audit-progress-bar');
  const progTxt=document.getElementById('audit-progress-txt');
  if(progBar) progBar.style.width=pct+'%';
  if(progTxt) progTxt.textContent=`${answered} / ${totalQ} soru cevaplandı`;
  const progWrap=document.getElementById('audit-progress-wrap');
  if(progWrap) progWrap.style.display='block';
}

// ── Denetim kaydet ────────────────────────────────────────────
async function submitAudit(withReport=false){
  const areaId   = document.getElementById('audit-area')?.value;
  // Dropdown metni "dept › name" formatındadır; temiz ismi S.areas'dan al
  const areaObj  = S.areas.find(a=>a.id===areaId);
  const areaName = areaObj?.name || (document.getElementById('audit-area')?.selectedOptions[0]?.text||'').split('›').pop().trim();
  const date     = document.getElementById('audit-date')?.value;
  const shift    = document.getElementById('audit-shift')?.value;
  const formCode = document.getElementById('audit-form-code')?.value;
  const location = document.getElementById('audit-location')?.value;
  const teamLead = document.getElementById('audit-team-leader')?.value;
  const auditor  = document.getElementById('audit-auditor')?.value;

  if(!areaId)  { showToast('⚠ Lütfen denetlenen takımı seçin!'); return; }
  if(!date)    { showToast('⚠ Lütfen denetim tarihini girin!'); return; }
  if(!auditor) { showToast('⚠ Lütfen denetçi seçin!'); return; }

  const total=Math.round(PILLARS.reduce((t,p,pi)=>t+calcPillar(pi,S.answers[pi]||[]).contribution,0));
  const pillarsJson={};
  PILLARS.forEach((p,pi)=>{ pillarsJson[p.id]=calcPillar(pi,S.answers[pi]||[]); });

  const body={
    area_id:areaId, area_name:areaName, date, shift, total_score:total,
    pillars_json:pillarsJson, answers_json:S.answers,
    notes_json:S.notes, photos_json:S.photos,
    status:'tamamlandi', form_code:formCode, location, team_leader:teamLead,
  };

  const btn=document.querySelector('[onclick="submitAudit()"]');
  if(btn){ btn.disabled=true; btn.innerHTML='<span class="spinner"></span>Kaydediliyor...'; }

  try {
    let result;
    if(_editAuditId){
      // Güncelleme modu — PUT
      result = await apiFetch('/audits/'+_editAuditId, { method:'PUT', body:JSON.stringify(body) });
      if(!result) return;
      const idx = S.audits.findIndex(a=>a.id===_editAuditId);
      if(idx>-1) S.audits[idx]={...S.audits[idx],...result};
      showToast('✓ Denetim güncellendi!');
      _editAuditId=null;
    } else {
      // Yeni denetim — POST
      result = await apiFetch('/audits', { method:'POST', body:JSON.stringify(body) });
      if(!result) return;
      S.audits.unshift(result);
      showToast('✓ Denetim başarıyla kaydedildi!');
      // Atama varsa kapat
      if(window._aktifAtamaId){
        await atamaKapat(window._aktifAtamaId, result.id);
        window._aktifAtamaId=null;
      }
    }
    updateBadges();
    if(withReport) showDetail(result.id);
    else navigate('history');
  } catch(err){
    showToast('⚠ '+err.message);
  } finally {
    if(btn){ btn.disabled=false; btn.textContent='✓ Denetimi Kaydet'; }
  }
}

function submitAndReport(){ submitAudit(true); }
function resetAudit(){ if(confirm('Formu sıfırla?')) initForm(); }

// ── Auditor Modal ─────────────────────────────────────────────
function openAuditorModal(){
  const list=document.getElementById('auditor-list');
  list.innerHTML=S.auditors.map(a=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border:1px solid var(--border);border-radius:var(--rs);margin-bottom:6px;cursor:pointer;" onclick="selectAuditor('${a}')">
      <div style="display:flex;align-items:center;gap:9px;"><div style="width:28px;height:28px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;">${a.split(' ').map(n=>n[0]).join('').substring(0,2)}</div><span>${a}</span></div>
      <span style="font-size:11px;color:var(--brand);">Seç →</span>
    </div>`).join('');
  openModal('modal-auditor');
}
function selectAuditor(name){
  document.getElementById('audit-auditor').value=name;
  const disp=document.getElementById('auditor-display');
  if(disp){ disp.textContent=name; disp.style.fontWeight='500'; disp.style.color='var(--accent)'; }
  closeModal('modal-auditor');
}
function addNewAuditor(){
  const inp=document.getElementById('new-auditor-name');
  const name=inp.value.trim();
  if(!name){ showToast('⚠ Denetçi adı girin!'); return; }
  if(!S.auditors.includes(name)) S.auditors.push(name);
  selectAuditor(name); inp.value='';
}

// ── Denetim geçmişi ─────────────────────────────────────────
function renderHistory(){
  const tbody=document.getElementById('hist-tbody'); if(!tbody) return;
  const search=(document.getElementById('hist-search')?.value||'').toLowerCase();
  let audits=[...S.audits].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(search) audits=audits.filter(a=>(a.area_name||'').toLowerCase().includes(search)||(a.auditor_name||'').toLowerCase().includes(search));

  const countLbl=document.getElementById('hist-count-lbl');
  if(countLbl) countLbl.textContent=audits.length+' kayıt';

  // Edit area dropdown doldur
  const editArea=document.getElementById('edit-area');
  if(editArea){ editArea.innerHTML=S.areas.map(a=>`<option value="${a.id}">${a.name}</option>`).join(''); }

  tbody.innerHTML=audits.length===0?'<tr><td colspan="8" style="text-align:center;color:var(--text3);padding:28px;">Kayıt yok</td></tr>'
    :audits.map((a,i)=>`
      <tr>
        <td style="font-family:var(--mono);font-size:11px;">#${i+1}</td>
        <td>${a.date||'—'}</td>
        <td>${a.area_name||'—'}</td>
        <td>${a.auditor_name||'—'}</td>
        <td>${a.shift||'—'}</td>
        <td><div class="sbar-wrap"><div class="sbar"><div class="sbar-fill ${(a.total_score||0)>=85?'hi':(a.total_score||0)>=50?'md':'lo'}" style="width:${a.total_score||0}%;"></div></div><span class="sbar-val">${a.total_score||0}</span></div></td>
        <td><span class="badge ${scoreBadge(a.total_score||0)}">${scoreLabel(a.total_score||0)}</span></td>
        <td style="display:flex;gap:4px;flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" onclick="showDetail('${a.id}')">Detay</button>
          ${CURRENT_USER?.role==='admin'||CURRENT_USER?.role==='denetci'
            ?`<button class="btn btn-outline btn-sm" style="color:var(--brand);" onclick="editAudit('${a.id}')">✏️ Düzenle</button>`:''}
          ${CURRENT_USER?.role==='admin'?`<button class="btn btn-sm" style="color:var(--red);" onclick="delAudit('${a.id}')">Sil</button>`:''}
        </td>
      </tr>`).join('');
}

async function delAudit(id){
  if(!confirm('Bu denetim kalıcı olarak silinecek. Emin misiniz?')) return;
  try {
    await apiFetch('/audits/'+id, { method:'DELETE' });
    S.audits=S.audits.filter(a=>a.id!==id);
    renderHistory(); updateBadges();
    showToast('Denetim silindi');
  } catch(err){ showToast('⚠ '+err.message); }
}

function openEditModal(id){
  const a=S.audits.find(x=>x.id===id); if(!a) return;
  document.getElementById('edit-audit-id').value=id;
  document.getElementById('edit-area').value=a.area_id||'';
  document.getElementById('edit-auditor').value=a.auditor_name||'';
  document.getElementById('edit-date').value=a.date||'';
  document.getElementById('edit-shift').value=a.shift||'Sabah';
  document.getElementById('edit-location').value=a.location||'';
  document.getElementById('edit-dept').value=a.dept||'';
  document.getElementById('edit-team-leader').value=a.team_leader||'';
  document.getElementById('edit-form-code').value=a.form_code||'';
  openModal('modal-edit-audit');
}

async function saveEditAudit(){
  const id=document.getElementById('edit-audit-id').value;
  const body={
    area_id:document.getElementById('edit-area').value,
    area_name:document.getElementById('edit-area')?.selectedOptions[0]?.text||'',
    auditor_name:document.getElementById('edit-auditor').value,
    date:document.getElementById('edit-date').value,
    shift:document.getElementById('edit-shift').value,
    location:document.getElementById('edit-location').value,
    team_leader:document.getElementById('edit-team-leader').value,
    form_code:document.getElementById('edit-form-code').value,
  };
  try {
    const updated=await apiFetch('/audits/'+id, { method:'PUT', body:JSON.stringify(body) });
    if(updated){ const idx=S.audits.findIndex(a=>a.id===id); if(idx>-1) S.audits[idx]={...S.audits[idx],...updated}; }
    closeModal('modal-edit-audit'); renderHistory();
    showToast('✓ Denetim güncellendi');
  } catch(err){ showToast('⚠ '+err.message); }
}

function showDetail(id){
  const a=S.audits.find(x=>x.id===id); if(!a) return;
  document.getElementById('det-title').textContent='Denetim Detayı — '+a.area_name;
  document.getElementById('det-sub').textContent=a.date+' · '+a.auditor_name+' · '+a.shift;
  const detAiBtn=document.getElementById('det-ai-btn');
  if(detAiBtn) detAiBtn.onclick=()=>{ buildOfflineReport(a); };
  const detDenetBtn=document.getElementById('det-denetlenen-btn');
  if(detDenetBtn) detDenetBtn.onclick=()=>{ denetlenenRaporu(a.id); };

  const pjsRaw=a.pillars_json||{};
  // pillars_json can be {S1:{pct,contribution},...} or array [{pct,contribution},...]
  const pjsByKey = Array.isArray(pjsRaw)
    ? PILLARS.reduce((m,p,i)=>{ m[p.id]=pjsRaw[i]||{}; return m; }, {})
    : pjsRaw;
  const pjs = pjsByKey;
  const pillarHtml=PILLARS.map(p=>{
    const d=pjs[p.id]||{}; const pct=d.pct||0;
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <div style="width:24px;height:24px;border-radius:5px;background:${p.color};display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:700;">${p.id}</div>
      <div style="flex:1;font-size:12px;">${p.name}</div>
      <div class="sbar-wrap" style="width:120px;"><div class="sbar"><div class="sbar-fill ${pct>=85?'hi':pct>=50?'md':'lo'}" style="width:${pct}%;"></div></div><span class="sbar-val">${pct}%</span></div>
    </div>`;
  }).join('');

  // Fotoğrafları topla
  const photosRaw = a.photos_json || {};
  const allPhotos = [];
  PILLARS.forEach((p, pi) => {
    p.questions.forEach((q, qi) => {
      const imgs = photosRaw[pi]?.[qi] || photosRaw[String(pi)]?.[String(qi)] || [];
      imgs.forEach(src => allPhotos.push({ src, label: `${p.id} · S.${qi+1}` }));
    });
  });
  const photoHtml = allPhotos.length ? `
    <div style="margin-top:16px;">
      <div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">📷 Fotoğraflar (${allPhotos.length})</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${allPhotos.map(p=>`
          <div style="position:relative;">
            <img src="${p.src}" style="width:90px;height:90px;object-fit:cover;border-radius:6px;border:1px solid var(--border);cursor:pointer;" onclick="openPhotoFull('${p.src}')" title="${p.label}">
            <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.5);color:#fff;font-size:9px;text-align:center;border-radius:0 0 6px 6px;padding:2px;">${p.label}</div>
          </div>`).join('')}
      </div>
    </div>` : '';

  document.getElementById('det-content').innerHTML=`
    <div style="text-align:center;margin-bottom:14px;">
      <div style="font-size:52px;font-weight:700;font-family:var(--mono);color:${scoreColor(a.total_score||0)};">${a.total_score||0}</div>
      <div class="badge ${scoreBadge(a.total_score||0)}" style="font-size:13px;margin-top:4px;">${scoreLabel(a.total_score||0)}</div>
    </div>
    ${pillarHtml}
    ${photoHtml}`;
  openModal('modal-detail');
}

function openPhotoFull(src){
  const ov = document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;z-index:9999;cursor:zoom-out;';
  ov.innerHTML=`<img src="${src}" style="max-width:95vw;max-height:95vh;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.6);">`;
  ov.onclick=()=>ov.remove();
  document.body.appendChild(ov);
}

// ── Pillar analiz metinleri ───────────────────────────────────
const PILLAR_ANALYSIS = {
  S1: {
    hi:  'Ayıklama faaliyetleri mükemmel düzeyde yürütülmektedir. Gereksiz malzeme, ekipman ve doküman birikimi etkin biçimde önlenmekte; çalışma alanı yalnızca ihtiyaç duyulan öğelerle düzenli şekilde korunmaktadır.',
    ok:  'Ayıklama çalışmaları genel olarak yeterli düzeydedir. Bununla birlikte bazı noktalarda gereksiz malzeme ya da ekipman birikimi gözlemlenmektedir. Periyodik kırmızı etiket kampanyaları ile bu durum kontrol altına alınabilir.',
    mid: 'Çalışma alanında gereksiz malzeme ve ekipman birikimi dikkat çekmektedir. Kullanılmayan, arızalı veya süresi geçmiş öğeler bir an önce ayrıştırılmalı; kırmızı etiket uygulaması sistematik hale getirilmelidir.',
    lo:  'Ayıklama pillarında ciddi eksikler tespit edilmiştir. Prosesle ilgisi olmayan malzeme, kişisel eşya ve güncelliğini yitirmiş dokümanların yoğun birikimi gözlemlenmektedir. Acil kırmızı etiket kampanyası ve ekip eğitimi zorunludur.',
    rec_mid: 'Kırmızı etiket kampanyası planlanarak gereksiz öğeler sahadan uzaklaştırılmalı.',
    rec_lo:  'Tüm çalışma noktaları için kapsamlı kırmızı etiket uygulaması acilen başlatılmalı; arızalı ekipmanlar kayıt altına alınarak ilgili birime devredilmeli.',
  },
  S2: {
    hi:  'Her malzeme ve ekipmanın tanımlı, işaretlenmiş ve görünür bir yeri mevcuttur. "Bir yeri var, her zaman orada" prensibi tam anlamıyla hayata geçirilmiş; görsel yönetim araçları etkin biçimde kullanılmaktadır.',
    ok:  'Alan tanımları büyük ölçüde belirlenmiş ve uygulanmaktadır. Ancak bazı ekipman ve malzemelerin belirsiz konumlarda bulunduğu ya da tanımlı alanlarının dışına taştığı görülmektedir.',
    mid: 'Düzenleme çalışmaları kısmen uygulanmış olmakla birlikte tutarsızlıklar devam etmektedir. Alet, aparat ve sarf malzemeleri için net alan tanımları oluşturulmalı; zemin ve raf işaretlemeleri yenilenmelidir.',
    lo:  'Alan tanımları yetersiz ya da mevcut değildir. Malzeme ve ekipmanlar belirsiz konumlarda bulunmakta; acil durum erişim yolları ve emniyet ekipmanlarına ulaşım olumsuz etkilenmektedir. Görsel yönetim altyapısı acilen kurulmalıdır.',
    rec_mid: 'Tüm el aletleri, aparatlar ve sarf malzemeleri için gölge panolar ve raf etiketleri oluşturulmalı.',
    rec_lo:  'Öncelikli olarak acil durum erişim yolları serbest bırakılmalı; ardından kapsamlı alan tanımlama ve işaretleme çalışması başlatılmalı.',
  },
  S3: {
    hi:  'Temizlik mükemmel düzeyde sürdürülmektedir. Makine, ekipman ve çalışma yüzeyleri düzenli olarak temizlenmekte; temizlik sorumlulukları net şekilde belirlenmiş ve otonom bakım rutinlerine entegre edilmiştir.',
    ok:  'Temizlik genel olarak iyi düzeyde sağlanmaktadır. Bazı noktalarda yüzey kirliliği, pas veya boya lekesi gözlemlenmektedir; periyodik denetimler ile bu durumun önüne geçilebilir.',
    mid: 'Temizlik çalışmaları kısmen yürütülmekte, ancak sürdürülebilirlik sağlanamamaktadır. Temizlik sorumluluk matrisi oluşturulmalı ve her vardiya başında kısa temizlik kontrolü rutin haline getirilmelidir.',
    lo:  'Temizlik standartları ciddi ölçüde yetersiz kalmaktadır. Yüzey kirlilikleri, paslı parçalar, sıvı sızıntıları ve birikmeler sağlık, güvenlik ve ekipman ömrü açısından risk oluşturmaktadır. Acil temizlik planı ve sorumluluk dağılımı zorunludur.',
    rec_mid: 'Vardiya başı 5 dakikalık "5S turu" uygulaması başlatılarak temizlik sürekliliği sağlanmalı.',
    rec_lo:  'Kapsamlı bir temizlik seferberliği planlanmalı; temizlik sorumlulukları bölge bazında atanmalı ve günlük kontrol formu oluşturulmalı.',
  },
  S4: {
    hi:  'Standartlaştırma çalışmaları üst düzeyde hayata geçirilmiştir. SOF formları güncel ve operatörler tarafından bilinmekte; etiketleme, işaretleme ve görsel standartlar firma gerekliliklerine tam uyum sağlamaktadır.',
    ok:  'Standartlar büyük ölçüde belirlenmiş ve uygulanmaktadır. Bazı alanlarda SOF güncelliği veya etiketleme tutarsızlıkları dikkat çekmektedir; düzenli revizyon döngüsü kurulması önerilir.',
    mid: 'Bazı standartlar belirlenmiş olmakla birlikte tutarlı uygulamada eksiklikler görülmektedir. SOF formları güncel değil ya da operatörler tarafından yeterince bilinmiyor olabilir; görsel standartların sahaya yansıtılması için aksiyon alınmalıdır.',
    lo:  'Standartlaştırma çalışmaları yetersiz kalmaktadır. SOF formları ya mevcut değil ya da güncelliğini yitirmiş; etiketleme ve işaretlemeler firma standartlarına uygun değildir. Bu durum operasyon tutarlılığını ve anormallik tespitini olumsuz etkilemektedir.',
    rec_mid: 'Mevcut SOF formları gözden geçirilerek güncellenmeli; operatörlere kısa bilgilendirme seansları düzenlenmeli.',
    rec_lo:  'SOF hazırlama atölyesi düzenlenerek tüm prosesler için güncel talimatlar oluşturulmalı; etiketleme standartları baştan uygulanmalı.',
  },
  S5: {
    hi:  'Ekip 5S kültürünü tam anlamıyla benimsemiştir. Disiplin içselleştirilmiş; vardiya devir teslimlerinde 5S kontrolü rutin olarak yapılmakta, önceki denetimlerin aksiyonları takip edilmektedir.',
    ok:  '5S disiplini genel olarak sürdürülmektedir. Ekip 5S prensiplerine büyük ölçüde hakimdir; ancak bazı süreçlerde sürekliliğin güçlendirilmesi gerekmektedir.',
    mid: 'Disiplin kısmen sağlanmakta, ancak süreklilik henüz tam olarak kazanılamamaktadır. Bazı ekip üyeleri 5S gerekliliklerini yeterince içselleştirememiş olabilir; eğitim ve sahiplenme artırılmalıdır.',
    lo:  '5S kültürünün içselleştirilmesi için kapsamlı çalışmalar gerekmektedir. Ekip 5S prensiplerine yeterince hakim değil; vardiya kontrolü, "Bir Fikrim Var" ve Ramakkala sistemleri aktif kullanılmıyor. Eğitim planı ve yönetici sahiplenme zorunludur.',
    rec_mid: '"Bir Fikrim Var" panosu aktif hale getirilmeli; 5S uyarı farkındalık eğitimi planlanmalı.',
    rec_lo:  'Tüm ekip için zorunlu 5S temel eğitimi düzenlenmeli; liderler tarafından haftalık saha turu başlatılmalı.',
  },
};

function _getPillarText(id, pct, field){
  const t=PILLAR_ANALYSIS[id]; if(!t) return '';
  if(field==='desc') return pct>=85?t.hi:pct>=70?t.ok:pct>=50?t.mid:t.lo;
  if(field==='rec')  return pct<70?(pct<50?t.rec_lo:t.rec_mid):'';
  return '';
}

function _execSummary(score, areaName, weakest, strongest){
  const area = areaName||'denetlenen alan';
  if(score>=85) return `<b>${area}</b> alanı bu denetimde <b>${score} puan</b> ile mükemmel bir performans sergilemiştir. 5S uygulamaları sistematik ve sürdürülebilir biçimde yürütülmekte; ${strongest.name.split('(')[0].trim()} başta olmak üzere tüm pillarlarda üst düzey başarı görülmektedir.`;
  if(score>=70) return `<b>${area}</b> alanı bu denetimde <b>${score} puan</b> ile iyi bir performans ortaya koymuştur. Genel olarak olumlu bir tablo olmakla birlikte, özellikle <b>${weakest.name.split('(')[0].trim()}</b> pillarında tespit edilen eksiklikler giderildiğinde üst düzey performansa ulaşmak mümkündür.`;
  if(score>=50) return `<b>${area}</b> alanı bu denetimde <b>${score} puan</b> ile orta düzey bir performans sergilemiştir. <b>${weakest.name.split('(')[0].trim()}</b> ve <b>${strongest.name.split('(')[0].trim()}</b> pillarları arasındaki dengesizlik dikkat çekmektedir. Öncelikli iyileştirme alanlarına odaklanılması önerilmektedir.`;
  return `<b>${area}</b> alanı bu denetimde <b>${score} puan</b> almış olup ciddi iyileştirme gerektiren bir tablo ortaya çıkmıştır. Birden fazla pillarda tespit edilen eksiklikler sistematik ve acil müdahale gerektirmektedir. Yönetim desteğiyle kapsamlı bir 5S aksiyon planı oluşturulması zorunludur.`;
}

function buildOfflineReport(audit){
  openModal('modal-ai');
  document.getElementById('ai-title').textContent='5S Denetim Raporu — '+(audit.area_name||'');
  const dateStr = (audit.date||'').slice(0,10);
  document.getElementById('ai-sub').textContent=`${dateStr} · ${audit.auditor_name||''} · ${audit.shift||''}`;
  document.getElementById('ai-loading').style.display='none';

  const pjsRaw=audit.pillars_json||{};
  const pjs=Array.isArray(pjsRaw)
    ? PILLARS.reduce((m,p,i)=>{ m[p.id]=pjsRaw[i]||{}; return m; }, {})
    : pjsRaw;

  const score=audit.total_score||0;
  const pillarData=PILLARS.map(p=>({ ...p, pct: Math.round(pjs[p.id]?.pct||0), contrib: pjs[p.id]?.contribution||0 }));
  const sorted=[...pillarData].sort((a,b)=>b.pct-a.pct);
  const strongest=sorted[0], weakest=sorted[sorted.length-1];
  const goodPillars=pillarData.filter(p=>p.pct>=70);
  const badPillars=pillarData.filter(p=>p.pct<70).sort((a,b)=>a.pct-b.pct);

  // Trend — aynı alanın önceki denetimi
  const prevAudits=S.audits
    .filter(a=>a.area_id===audit.area_id && a.id!==audit.id && a.date<(audit.date||'9'))
    .sort((a,b)=>b.date?.localeCompare(a.date));
  const prev=prevAudits[0];
  const trendDiff=prev?score-(prev.total_score||0):null;
  const trendHtml=prev?`
    <div style="margin-bottom:20px;padding:12px 16px;background:${trendDiff>=0?'#f0fdf4':'#fff7ed'};border:1px solid ${trendDiff>=0?'#86efac':'#fdba74'};border-radius:var(--r);">
      <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">📈 Önceki Denetime Kıyasla</div>
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="font-size:24px;font-weight:700;color:${trendDiff>=0?'#16a34a':'#ea580c'};">${trendDiff>=0?'+':''}${trendDiff} puan</div>
        <div style="font-size:12px;color:var(--text2);">${prev.date?.slice(0,10)||''} tarihli denetimde <b>${prev.total_score}</b> puan alınmıştı.<br>${trendDiff>0?'Olumlu bir ilerleme gözlemlenmektedir.':trendDiff<0?'Performans gerileme göstermiştir; sebeplerin araştırılması önerilir.':'Performans önceki dönemle aynı düzeyde seyretmektedir.'}</div>
      </div>
    </div>`:
    `<div style="margin-bottom:20px;padding:10px 14px;background:#f8fafc;border:1px solid var(--border);border-radius:var(--r);font-size:12px;color:var(--text3);">Bu alan için önceki denetim kaydı bulunmamaktadır.</div>`;

  // Pillar analiz HTML
  const pillarHtml=pillarData.map(p=>{
    const desc=_getPillarText(p.id,p.pct,'desc');
    return `<div style="margin-bottom:16px;padding:14px 16px;border:1px solid var(--border);border-radius:var(--r);border-left:4px solid ${p.color};">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div style="width:28px;height:28px;border-radius:6px;background:${p.color};display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;">${p.id}</div>
        <div style="flex:1;"><div style="font-size:13px;font-weight:600;">${p.name}</div></div>
        <div style="font-size:18px;font-weight:700;font-family:var(--mono);color:${scoreColor(p.pct)};">${p.pct}%</div>
        <span class="badge ${scoreBadge(p.pct)}" style="font-size:10px;">${scoreLabel(p.pct)}</span>
      </div>
      <div class="sbar" style="margin-bottom:10px;"><div class="sbar-fill ${p.pct>=85?'hi':p.pct>=50?'md':'lo'}" style="width:${p.pct}%;"></div></div>
      <div style="font-size:12px;color:var(--text2);line-height:1.6;">${desc}</div>
    </div>`;
  }).join('');

  // Güçlü yönler
  const strongHtml=goodPillars.length?`
    <div style="margin-bottom:20px;">
      <div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">💪 Güçlü Yönler</div>
      ${goodPillars.map(p=>`<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;font-size:12px;">
        <span style="color:#16a34a;font-size:14px;margin-top:1px;">✓</span>
        <span><b>${p.name.split('(')[0].trim()}</b> — ${p.pct}% ile ${p.pct>=85?'mükemmel':'iyi'} düzeyde performans sergilenmektedir.</span>
      </div>`).join('')}
    </div>`:'';

  // Öncelikli aksiyonlar
  const actionItems=badPillars.map(p=>{
    const rec=_getPillarText(p.id,p.pct,'rec');
    return rec?`<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;padding:10px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:var(--rs);">
      <div style="width:20px;height:20px;border-radius:50%;background:${p.pct<50?'#ef4444':'#f97316'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0;margin-top:1px;">${p.pct<50?'!':'▲'}</div>
      <div style="font-size:12px;"><b style="color:${p.color};">${p.id} · ${p.name.split('(')[0].trim()}:</b> ${rec}</div>
    </div>`:'';
  }).filter(Boolean);

  const actionsHtml=actionItems.length?`
    <div style="margin-bottom:20px;">
      <div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">🎯 Öncelikli İyileştirme Aksiyonları</div>
      ${actionItems.join('')}
    </div>`:'';

  // Sonuç
  const conclusionMap={
    lo:`Sonuç olarak, ${audit.area_name||'bu alan'} için kapsamlı bir 5S iyileştirme planı hazırlanması ve üst yönetim desteğiyle hayata geçirilmesi büyük önem taşımaktadır. Yukarıda belirlenen aksiyonların en kısa sürede uygulanması ve bir sonraki denetimde ilerlemenin ölçülmesi önerilmektedir.`,
    mid:`${audit.area_name||'Bu alan'} için belirlenen aksiyon maddelerinin sorumlu kişilere atanması ve takip takviminin oluşturulması önerilmektedir. Tutarlı uygulamayla bir sonraki denetimde belirgin ilerleme sağlanabilir.`,
    ok:`${audit.area_name||'Bu alanda'} iyi bir performans sürdürülmektedir. Zayıf kalan pillar(lar)daki iyileştirmelerle mükemmel seviyeye ulaşmak mümkündür. Ekibin mevcut motivasyonunu koruyarak aksiyonları sahiplenmesi kritik önem taşımaktadır.`,
    hi:`${audit.area_name||'Bu alan'} 5S uygulamalarında örnek bir seviyededir. Bu başarının sürdürülmesi ve diğer alanlara ilham kaynağı olması için en iyi uygulamaların paylaşılması önerilmektedir.`,
  };
  const conclusionKey=score>=85?'hi':score>=70?'ok':score>=50?'mid':'lo';

  const html=`<div style="font-size:13px;line-height:1.6;">

    <!-- Başlık kartı -->
    <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:var(--r);margin-bottom:20px;border:1px solid var(--border);">
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">TOPLAM 5S PUANI</div>
      <div style="font-size:64px;font-weight:800;font-family:var(--mono);color:${scoreColor(score)};line-height:1;">${score}</div>
      <div style="font-size:11px;color:var(--text3);margin:2px 0 10px;">/ 100</div>
      <span class="badge ${scoreBadge(score)}" style="font-size:14px;padding:6px 18px;">${scoreLabel(score)}</span>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:16px;">
        ${pillarData.map(p=>`<div style="text-align:center;padding:6px 4px;background:#fff;border:1px solid var(--border);border-radius:var(--rs);">
          <div style="width:18px;height:18px;border-radius:4px;background:${p.color};margin:0 auto 4px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:8px;font-weight:700;">${p.id}</div>
          <div style="font-size:12px;font-weight:700;color:${scoreColor(p.pct)};">${p.pct}%</div>
        </div>`).join('')}
      </div>
    </div>

    <!-- Genel değerlendirme -->
    <div style="margin-bottom:20px;padding:14px 16px;background:#f8fafc;border-left:4px solid ${scoreColor(score)};border-radius:0 var(--r) var(--r) 0;">
      <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">📋 Genel Değerlendirme</div>
      <div style="font-size:12px;color:var(--text1);">${_execSummary(score,audit.area_name,weakest,strongest)}</div>
    </div>

    <!-- Trend -->
    ${trendHtml}

    <!-- Pillar analizi -->
    <div style="margin-bottom:20px;">
      <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">🔍 Pillar Bazlı Analiz</div>
      ${pillarHtml}
    </div>

    <!-- Güçlü yönler -->
    ${strongHtml}

    <!-- Aksiyonlar -->
    ${actionsHtml}

    <!-- Sonuç -->
    <div style="padding:14px 16px;background:#f0fdf4;border:1px solid #86efac;border-radius:var(--r);">
      <div style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">✅ Sonuç ve Öneriler</div>
      <div style="font-size:12px;color:var(--text1);">${conclusionMap[conclusionKey]}</div>
    </div>

    <div style="margin-top:16px;font-size:10px;color:var(--text3);text-align:center;border-top:1px solid var(--border);padding-top:10px;">
      Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})} · Denetim No: ${audit.form_code||'—'} · Denetçi: ${audit.auditor_name||'—'}
    </div>
  </div>`;

  document.getElementById('ai-content').innerHTML=html;
  document.getElementById('ai-content').style.display='block';
  document.getElementById('pdf-btn').style.display='';
}

function denetlenenRaporu(auditId){ buildOfflineReport(S.audits.find(a=>a.id===auditId)||{}); }
function exportPDF(){ window.print(); }
