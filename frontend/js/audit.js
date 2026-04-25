// ============================================================
// audit.js — Denetim formu, soru yapılandırma, kaydetme
// ============================================================

// ── Düzenleme modu state ─────────────────────────────────────
let _editAuditId = null;

function editAudit(id){
  _editAuditId = id;
  navigate('new-audit');
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

  // Alan dropdown — admin için de tüm alanları göster
  const allAreas = _editAuditId ? S.areas : S.areas;
  const sel = document.getElementById('audit-area');
  sel.innerHTML = '<option value="">Takım seçiniz.</option>';
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
    const auditorDisplay=document.getElementById('auditor-display');
    if(auditorInput) auditorInput.value=existingAudit.auditor_name||'';
    if(auditorDisplay){ auditorDisplay.textContent=existingAudit.auditor_name||''; auditorDisplay.style.fontWeight='500'; auditorDisplay.style.color='var(--accent)'; }

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
    document.getElementById('audit-form-code').value = '5S-'+new Date().getFullYear()+'-'+String(S.audits.length+1).padStart(3,'0');

    // Atama varsa otomatik doldur
    if(window._aktifAtama){
      const {alanId, alanAd} = window._aktifAtama;
      if(sel) sel.value = alanId;
      const auditorInput=document.getElementById('audit-auditor');
      const auditorDisplay=document.getElementById('auditor-display');
      if(auditorInput) auditorInput.value = CURRENT_USER?.name||'';
      if(auditorDisplay) auditorDisplay.textContent = CURRENT_USER?.name||'';
      showToast('📋 '+alanAd+' denetimi yüklendi');
      window._aktifAtama=null;
    } else {
      const auditorInput=document.getElementById('audit-auditor');
      const auditorDisplay=document.getElementById('auditor-display');
      if(auditorInput&&CURRENT_USER){ auditorInput.value=CURRENT_USER.name; }
      if(auditorDisplay&&CURRENT_USER){ auditorDisplay.textContent=CURRENT_USER.name; auditorDisplay.style.fontWeight='500'; auditorDisplay.style.color='var(--accent)'; }
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
}

// ── Denetim kaydet ────────────────────────────────────────────
async function submitAudit(withReport=false){
  const areaId   = document.getElementById('audit-area')?.value;
  const areaName = document.getElementById('audit-area')?.selectedOptions[0]?.text||'';
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

  document.getElementById('det-content').innerHTML=`
    <div style="text-align:center;margin-bottom:14px;">
      <div style="font-size:52px;font-weight:700;font-family:var(--mono);color:${scoreColor(a.total_score||0)};">${a.total_score||0}</div>
      <div class="badge ${scoreBadge(a.total_score||0)}" style="font-size:13px;margin-top:4px;">${scoreLabel(a.total_score||0)}</div>
    </div>
    ${pillarHtml}`;
  openModal('modal-detail');
}

function buildOfflineReport(audit){
  openModal('modal-ai');
  document.getElementById('ai-title').textContent='Denetim Raporu — '+(audit.area_name||'');
  document.getElementById('ai-sub').textContent=(audit.date||'')+(audit.auditor_name?' · '+audit.auditor_name:'');
  document.getElementById('ai-loading').style.display='none';
  const pjsRaw2=audit.pillars_json||{};
  const pjs=Array.isArray(pjsRaw2)
    ? PILLARS.reduce((m,p,i)=>{ m[p.id]=pjsRaw2[i]||{}; return m; }, {})
    : pjsRaw2;
  let html='<div style="font-size:13px;">';
  html+=`<div style="text-align:center;margin-bottom:16px;"><div style="font-size:56px;font-weight:700;font-family:var(--mono);color:${scoreColor(audit.total_score||0)};">${audit.total_score||0}</div><div class="badge ${scoreBadge(audit.total_score||0)}" style="font-size:13px;">${scoreLabel(audit.total_score||0)}</div></div>`;
  PILLARS.forEach(p=>{ const d=pjs[p.id]||{}; const pct=d.pct||0; html+=`<div style="margin-bottom:10px;"><div style="font-weight:600;margin-bottom:4px;">${p.id} · ${p.name}: <span style="color:${scoreColor(pct)};">${pct}%</span></div><div class="sbar"><div class="sbar-fill ${pct>=85?'hi':pct>=50?'md':'lo'}" style="width:${pct}%;"></div></div></div>`; });
  html+='</div>';
  document.getElementById('ai-content').innerHTML=html;
  document.getElementById('ai-content').style.display='block';
  document.getElementById('pdf-btn').style.display='';
}

function denetlenenRaporu(auditId){ buildOfflineReport(S.audits.find(a=>a.id===auditId)||{}); }
function exportPDF(){ window.print(); }
