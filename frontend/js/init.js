// ============================================================
// init.js — Uygulama başlatma
// ============================================================

document.addEventListener('DOMContentLoaded', async ()=>{

  // ── Modal overlay tıklamayla kapanma ───────────────────────
  document.querySelectorAll('.modal-ov').forEach(overlay=>{
    overlay.addEventListener('click', e=>{
      if(e.target===overlay) closeModal(overlay.id);
    });
  });

  // ── Escape tuşu ile modal kapatma ──────────────────────────
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape'){
      const open = document.querySelector('.modal-ov.open');
      if(open) closeModal(open.id);
    }
  });

  // ── Login formu Enter tuşu ──────────────────────────────────
  document.getElementById('login-username')?.addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });
  document.getElementById('login-password')?.addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });

  // ── modal-action-add açılırken alan listesini doldur ────────
  document.getElementById('modal-action-add')?.addEventListener('click', e=>{
    if(e.target===document.getElementById('modal-action-add')){
      // overlay tıklaması — zaten yukarıda handle ediliyor
      return;
    }
  });

  // ── modal-user-add kapatıldığında butonları sıfırla ────────
  const userModal = document.getElementById('modal-user-add');
  if(userModal){
    const obs = new MutationObserver(()=>{
      if(userModal.style.display==='none'||!userModal.style.display){
        const saveBtn = userModal.querySelector('.btn-primary');
        if(saveBtn && saveBtn.textContent.includes('Güncelle')){
          saveBtn.onclick = addUser;
          saveBtn.textContent = 'Kaydet';
          const titleEl = userModal.querySelector('.modal-title');
          if(titleEl) titleEl.textContent = 'Yeni Kullanıcı Ekle';
          const pwLabel = userModal.querySelector('label');
          if(pwLabel && pwLabel.textContent.includes('Yeni')){
            // reset yapıldı: label düzenlenmeden bırak
          }
        }
      }
    });
    obs.observe(userModal, { attributes:true, attributeFilter:['style'] });
  }

  // ── QR otomatik başlatma ────────────────────────────────────
  checkQRAutostart();

  // ── Oturum kontrolü ─────────────────────────────────────────
  await checkSession();
});
