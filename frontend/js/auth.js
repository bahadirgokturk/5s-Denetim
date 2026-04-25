// ============================================================
// auth.js — Login, logout, applyRole, token yönetimi
// ============================================================

async function doLogin(){
  const un = document.getElementById('login-username').value.trim();
  const pw = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-err');
  const btn = document.getElementById('login-btn');

  if(!un || !pw){ errEl.textContent='Kullanıcı adı ve şifre girin.'; errEl.style.display='block'; return; }

  btn.disabled=true;
  btn.innerHTML='<span class="spinner"></span>Giriş yapılıyor...';

  try {
    const data = await apiFetch('/auth/login', {
      method:'POST',
      body: JSON.stringify({ username:un, password:pw }),
    });
    if(!data) return;
    errEl.style.display='none';
    CURRENT_USER = data.user;
    await loadAllData();
    applyRole(data.user);
    handleQRRedirectAfterLogin();
  } catch(err){
    errEl.textContent = err.message || 'Kullanıcı adı veya şifre hatalı!';
    errEl.style.display='block';
  } finally {
    btn.disabled=false;
    btn.textContent='Giriş Yap';
  }
}

async function doLogout(){
  try { await apiFetch('/auth/logout', { method:'POST' }); } catch(e){}
  CURRENT_USER = null;
  S.audits=[]; S.areas=[]; S.actions=[]; S.users=[];
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('main-app').style.display='none';
  document.getElementById('login-username').value='';
  document.getElementById('login-password').value='';
  document.body.className='';
}

function applyRole(user){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('main-app').style.display='flex';
  document.body.className='role-'+(user.role==='departman'?'takimlider':user.role);

  const roleLabels={admin:'👑 Yönetici',denetci:'🔍 Denetçi',takimlider:'👔 Takım Lideri',departman:'🏭 Departman'};
  const roleClasses={admin:'role-admin',denetci:'role-denetci',takimlider:'role-takimlider',departman:'role-takimlider'};
  const badge=document.getElementById('user-badge');
  if(badge){ badge.textContent=roleLabels[user.role]||user.role; badge.className='role-badge '+roleClasses[user.role]; }
  const sbUser=document.getElementById('sb-user');
  if(sbUser) sbUser.innerHTML=`<div style="font-weight:500;color:rgba(255,255,255,.8);">${user.name}</div><div style="font-size:10px;">${roleLabels[user.role]}</div>`;

  document.querySelectorAll('#sidebar-nav [data-roles]').forEach(div=>{
    const roles=div.getAttribute('data-roles').split(' ');
    const match=roles.includes(user.role)||(user.role==='departman'&&roles.includes('takimlider'));
    div.style.display=match?'block':'none';
  });

  const newAuditBtn=document.querySelector('.topbar-right .btn-primary');
  if(newAuditBtn) newAuditBtn.style.display=(user.role==='takimlider'||user.role==='departman')?'none':'';

  document.getElementById('topbar-date').textContent=new Date().toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  navigate('dashboard');
  updateBadges();
}

// ── Tüm veriyi API'den yükle ──────────────────────────────────
async function loadAllData(){
  try {
    const [audits, areas, actions] = await Promise.all([
      apiFetch('/audits?limit=500'),
      apiFetch('/areas'),
      apiFetch('/actions'),
    ]);
    if(audits)  S.audits  = audits;
    if(areas)   S.areas   = areas;
    if(actions) S.actions = actions;

    // Denetçi listesi (admin + denetci rolü)
    if(CURRENT_USER?.role==='admin'){
      const [users, plans] = await Promise.all([
        apiFetch('/users'),
        apiFetch('/audits/plans/list'),
      ]);
      if(users) S.users = users;
      if(plans) S.atamalar = plans;
      S.auditors = S.users.filter(u=>u.role==='denetci').map(u=>u.name);
    } else if(CURRENT_USER?.role==='denetci'){
      const plans = await apiFetch('/audits/plans/list');
      if(plans) S.atamalar = plans;
      const auds = await apiFetch('/users/auditors');
      if(auds) S.auditors = auds.map(u=>u.name);
    } else {
      const auds = await apiFetch('/users/auditors');
      if(auds) S.auditors = auds.map(u=>u.name);
    }
  } catch(err){
    showToast('⚠ Veri yüklenirken hata: ' + err.message);
  }
}

// ── Oturum kontrolü (sayfa yenileme) ────────────────────────
async function checkSession(){
  try {
    const data = await apiFetch('/auth/me');
    if(!data) return false;
    CURRENT_USER = data.user;
    await loadAllData();
    applyRole(data.user);
    handleQRRedirectAfterLogin();
    return true;
  } catch(e){
    return false;
  }
}

// ── QR yönlendirme ────────────────────────────────────────────
function handleQRRedirectAfterLogin(){
  const params = new URLSearchParams(window.location.search);
  const qrArea = params.get('area');
  if(!qrArea) return;
  const area = S.areas.find(a=>a.id===qrArea);
  if(!area) return;
  window._aktifAtama = { atamaId:null, alanId:area.id, alanAd:area.name };
  history.replaceState({}, '', window.location.pathname);
  navigate('new-audit');
}

function checkQRAutostart(){
  const params = new URLSearchParams(window.location.search);
  const qrArea = params.get('area');
  if(qrArea && !CURRENT_USER){
    const el=document.getElementById('login-username');
    if(el) el.focus();
    showToast('📷 QR ile giriş — lütfen oturum açın');
  }
}
