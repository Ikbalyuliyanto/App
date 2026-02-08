
  // =========================
  // ALERT (sementara di sini)
  // =========================
  function ensureAlertStyles() {
    if (document.getElementById("app-alert-style")) return;

    const style = document.createElement("style");
    style.id = "app-alert-style";
    style.textContent = `
      .app-alert-wrap{
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: min(520px, calc(100vw - 24px));
        pointer-events: none;
      }
      .app-alert{
        pointer-events: auto;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 12px;
        background: #111827;
        color: #fff;
        box-shadow: 0 12px 28px rgba(0,0,0,.22);
        border: 1px solid rgba(255,255,255,.08);
        animation: appAlertIn .18s ease-out;
      }
      .app-alert__icon{
        width: 28px;
        height: 28px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        flex: 0 0 28px;
        font-weight: 700;
      }
      .app-alert__body{ flex: 1; }
      .app-alert__title{
        font-size: 14px;
        font-weight: 700;
        margin: 0 0 2px 0;
        line-height: 1.2;
      }
      .app-alert__msg{
        font-size: 13px;
        opacity: .95;
        margin: 0;
        line-height: 1.35;
      }
      .app-alert__close{
        border: 0;
        background: transparent;
        color: rgba(255,255,255,.85);
        cursor: pointer;
        padding: 4px 6px;
        margin: -2px -4px 0 0;
        border-radius: 8px;
        font-size: 16px;
        line-height: 1;
      }
      .app-alert__close:hover{ background: rgba(255,255,255,.08); }

      .app-alert--success .app-alert__icon{ background: rgba(34,197,94,.18); color: #22c55e; }
      .app-alert--error   .app-alert__icon{ background: rgba(239,68,68,.18); color: #ef4444; }
      .app-alert--warning .app-alert__icon{ background: rgba(245,158,11,.18); color: #f59e0b; }
      .app-alert--info    .app-alert__icon{ background: rgba(59,130,246,.18); color: #3b82f6; }

      @keyframes appAlertIn{
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes appAlertOut{
        from { opacity: 1; transform: translateY(0); }
        to   { opacity: 0; transform: translateY(-6px); }
      }
    `;
    document.head.appendChild(style);
  }

  function getOrCreateAlertWrap() {
    let wrap = document.getElementById("app-alert-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "app-alert-wrap";
      wrap.className = "app-alert-wrap";
      document.body.appendChild(wrap);
    }
    return wrap;
  }

  function showAlert(message, type = "info", opts = {}) {
    ensureAlertStyles();
    const wrap = getOrCreateAlertWrap();

    const {
      title = type === "success" ? "Berhasil" :
              type === "error" ? "Gagal" :
              type === "warning" ? "Perhatian" : "Info",
      timeout = 2500
    } = opts;

    const iconMap = { success: "✓", error: "!", warning: "!", info: "i" };
    const t = ["success","error","warning","info"].includes(type) ? type : "info";

    const el = document.createElement("div");
    el.className = `app-alert app-alert--${t}`;
    el.innerHTML = `
      <div class="app-alert__icon">${iconMap[t]}</div>
      <div class="app-alert__body">
        <p class="app-alert__title">${title}</p>
        <p class="app-alert__msg">${String(message || "")}</p>
      </div>
      <button class="app-alert__close" aria-label="Tutup">&times;</button>
    `;

    const close = () => {
      el.style.animation = "appAlertOut .16s ease-in forwards";
      setTimeout(() => el.remove(), 130);
    };

    el.querySelector(".app-alert__close").addEventListener("click", close);
    wrap.appendChild(el);

    if (timeout > 0) setTimeout(close, timeout);
  }


  window.showAlert = showAlert;


(function () {
  function ensureConfirmStyles() {
    if (document.getElementById("app-confirm-style")) return;

    const style = document.createElement("style");
    style.id = "app-confirm-style";
    style.textContent = `
      .confirm-overlay{
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.45);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100000;
        padding: 16px;
      }
      .confirm-modal{
        width: min(440px, 100%);
        background: #111827;
        color: #fff;
        border-radius: 14px;
        padding: 18px;
        box-shadow: 0 25px 60px rgba(0,0,0,.4);
        border: 1px solid rgba(255,255,255,.08);
        animation: confirmPop .18s ease-out;
        position: relative;
      }
      .confirm-close{
        position: absolute;
        top: 10px;
        right: 10px;
        border: 0;
        background: transparent;
        color: rgba(255,255,255,.85);
        cursor: pointer;
        padding: 6px 8px;
        border-radius: 10px;
        font-size: 18px;
        line-height: 1;
      }
      .confirm-close:hover{ background: rgba(255,255,255,.08); }

      .confirm-title{
        font-size: 16px;
        font-weight: 800;
        margin: 0 0 6px 0;
        padding-right: 34px;
      }
      .confirm-message{
        font-size: 14px;
        opacity: .95;
        line-height: 1.45;
        margin: 0;
      }
      .confirm-actions{
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 18px;
      }
      .confirm-btn{
        border: 0;
        padding: 10px 14px;
        border-radius: 10px;
        font-size: 14px;
        cursor: pointer;
        font-weight: 700;
      }
      .confirm-cancel{
        background: #374151;
        color: #fff;
      }
      .confirm-cancel:hover{ filter: brightness(1.05); }

      .confirm-confirm{
        background: #2563eb;
        color: #fff;
      }
      .confirm-confirm:hover{ filter: brightness(1.05); }

      .confirm-confirm.danger{ background: #dc2626; }
      .confirm-confirm.warning{ background: #f59e0b; color: #111827; }

      @keyframes confirmPop{
        from { transform: scale(.97); opacity: 0; }
        to   { transform: scale(1); opacity: 1; }
      }
      @keyframes confirmOut{
        from { transform: scale(1); opacity: 1; }
        to   { transform: scale(.97); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  window.showConfirm = function ({
    title = "Konfirmasi",
    message = "Apakah Anda yakin?",
    confirmText = "Ya",
    cancelText = "Batal",
    type = "primary", // "primary" | "danger" | "warning"
    closeOnBackdrop = true,
  } = {}) {
    ensureConfirmStyles();

    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "confirm-overlay";

      overlay.innerHTML = `
        <div class="confirm-modal" role="dialog" aria-modal="true" aria-label="${String(title)}">
          <button class="confirm-close" aria-label="Tutup">&times;</button>
          <h3 class="confirm-title">${String(title)}</h3>
          <p class="confirm-message">${String(message)}</p>
          <div class="confirm-actions">
            <button class="confirm-btn confirm-cancel">${String(cancelText)}</button>
            <button class="confirm-btn confirm-confirm ${type === "danger" ? "danger" : type === "warning" ? "warning" : ""}">
              ${String(confirmText)}
            </button>
          </div>
        </div>
      `;

      const modal = overlay.querySelector(".confirm-modal");
      const btnCancel = overlay.querySelector(".confirm-cancel");
      const btnConfirm = overlay.querySelector(".confirm-confirm");
      const btnClose = overlay.querySelector(".confirm-close");

      // lock scroll
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      let done = false;

      const cleanup = (result) => {
        if (done) return;
        done = true;

        // animate out
        modal.style.animation = "confirmOut .14s ease-in forwards";
        setTimeout(() => {
          overlay.remove();
          document.body.style.overflow = prevOverflow;
          resolve(result);
        }, 140);
      };

      const onKeydown = (e) => {
        if (e.key === "Escape") cleanup(false);
      };

      btnCancel.onclick = () => cleanup(false);
      btnConfirm.onclick = () => cleanup(true);
      btnClose.onclick = () => cleanup(false);

      overlay.addEventListener("click", (e) => {
        if (!closeOnBackdrop) return;
        if (e.target === overlay) cleanup(false);
      });

      document.addEventListener("keydown", onKeydown, { once: false });

      // setelah selesai, hapus listener
      const originalCleanup = cleanup;
      const wrappedCleanup = (result) => {
        document.removeEventListener("keydown", onKeydown);
        originalCleanup(result);
      };

      // override cleanup reference supaya semua tombol pakai cleanup yang sudah remove listener
      btnCancel.onclick = () => wrappedCleanup(false);
      btnConfirm.onclick = () => wrappedCleanup(true);
      btnClose.onclick = () => wrappedCleanup(false);
      overlay.addEventListener("click", (e) => {
        if (!closeOnBackdrop) return;
        if (e.target === overlay) wrappedCleanup(false);
      });

      document.body.appendChild(overlay);

      // focus ke tombol confirm biar enak
      setTimeout(() => btnConfirm.focus(), 0);
    });
  };
})();

function showSelect(message, options) {
  return new Promise((resolve) => {
      // Buat overlay
      const modal = document.createElement("div");
      modal.id = "customSelectModal";
      modal.innerHTML = `
          <div style="
              position: fixed;
              top:0; left:0;
              width:100%; height:100%;
              background: rgba(0,0,0,0.5);
              display:flex;
              justify-content:center;
              align-items:center;
              z-index:9999;
              font-family: sans-serif;
          ">
              <div style="
                  background:white;
                  padding:20px 25px;
                  border-radius:10px;
                  max-width:400px;
                  width:90%;
                  text-align:center;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                  animation: fadeIn 0.2s ease;
              ">
                  <p style='font-size:16px; margin-bottom:15px;'>${message}</p>
                  <select id="statusSelect" style="
                      width: 100%;
                      padding:8px 10px;
                      font-size:15px;
                      margin-bottom:20px;
                      border-radius:5px;
                      border:1px solid #ccc;
                      outline:none;
                  ">
                      ${options.map(o => `<option value="${o.value}">${o.text}</option>`).join('')}
                  </select>
                  <div style="display:flex; justify-content: space-between;">
                      <button id="cancelBtn" style="
                          padding:8px 15px;
                          background:#ccc;
                          border:none;
                          border-radius:5px;
                          cursor:pointer;
                          font-size:14px;
                          transition: all 0.2s;
                      ">Batal</button>
                      <button id="okBtn" style="
                          padding:8px 15px;
                          background:#4caf50;
                          color:white;
                          border:none;
                          border-radius:5px;
                          cursor:pointer;
                          font-size:14px;
                          transition: all 0.2s;
                      ">OK</button>
                  </div>
              </div>
          </div>
      `;

      // Tambahkan ke body
      document.body.appendChild(modal);

      // Tombol OK
      modal.querySelector("#okBtn").onclick = () => {
          const val = modal.querySelector("#statusSelect").value;
          document.body.removeChild(modal);
          resolve(val);
      };

      // Tombol Batal
      modal.querySelector("#cancelBtn").onclick = () => {
          document.body.removeChild(modal);
          resolve(null);
      };

      // Close klik di luar box
      modal.firstElementChild.onclick = (e) => {
          if (e.target === modal.firstElementChild) {
              document.body.removeChild(modal);
              resolve(null);
          }
      };
  });
}

  // Pesan
  const WHATSAPP_NUMBER = "6285185774225";
  const DEFAULT_MESSAGE = "Halo, saya ingin bertanya tentang produk di Ashanum";

document.addEventListener("DOMContentLoaded", () => {
  // Ambil token
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const whatsappWidget = document.querySelector(".whatsapp-chat-widget");

  // ⛔ jika widget tidak ada di halaman ini, stop
  if (!whatsappWidget) return;

  if (!token) {
    // Jika tidak login, sembunyikan widget
    whatsappWidget.style.display = "none";
  } else {
    // Jika login, tampilkan widget
    whatsappWidget.style.display = "block";
  }
});

// Toggle Popup
function toggleWhatsAppPopup() {
  const popup = document.getElementById("whatsappPopup");
  if (!popup) return;

  popup.classList.toggle("active");

  if (popup.classList.contains("active")) {
    const badge = document.querySelector(".whatsapp-badge");
    if (badge) badge.style.display = "none";
  }
}


  // Buka WhatsApp langsung
  function openWhatsApp(message = DEFAULT_MESSAGE) {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  // Kirim pesan cepat
  function sendWhatsAppMessage(message) {
    openWhatsApp(message);
  }

  // Newsletter
  function subscribeNewsletter() {
    const email = document.getElementById('newsletterEmail').value;
    if (email) {
      alert('Terima kasih! Anda telah berlangganan newsletter kami.');
      document.getElementById('newsletterEmail').value = '';
    } else {
      alert('Silakan masukkan email Anda.');
    }
  }
