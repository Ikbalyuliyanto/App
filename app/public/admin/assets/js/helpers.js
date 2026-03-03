function showAlert(message, type = 'info') {
  const container = document.getElementById('alertContainer');
  if (!container) { alert(message); return; }

  const colors = { success:'#4caf50', error:'#f44336', info:'#2196f3', warning:'#ff9800' };
  const el = document.createElement('div');
  el.style.cssText = `
    padding:12px 16px;
    margin-bottom:10px;
    border-radius:6px;
    color:#fff;
    background:${colors[type] || colors.info};
    font-size:14px;
    box-shadow:0 4px 10px rgba(0,0,0,0.15);
  `;
  el.textContent = message;
  container.appendChild(el);

  setTimeout(() => el.remove(), 9876);
}

function formatRupiah(n) {
  if (n == null) return "Rp 0";
  return "Rp " + Number(n).toLocaleString("id-ID");
}

function formatDateShort(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" });
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day:"numeric", month:"long", year:"numeric",
    hour:"2-digit", minute:"2-digit"
  });
}

// Track apakah sidebar & header sudah selesai di-load
let _sidebarReady = false;
let _headerReady  = false;

function setupSidebarToggle() {
  // Hanya jalankan setelah KEDUANYA (sidebar + header) selesai di-load
  if (!_sidebarReady || !_headerReady) return;

  const sidebar            = document.getElementById("sidebar");
  const mainContent        = document.querySelector(".main-content");
  const menuToggle         = document.getElementById("menuToggle");         // buka sidebar (mobile) — di header
  const sidebarToggle      = document.getElementById("sidebarToggle");      // tutup sidebar (mobile) — di sidebar
  const sidebarCollapseBtn = document.getElementById("sidebarCollapseBtn"); // collapse desktop — di header

  if (!sidebar) return;

  // Mobile: buka sidebar
  if (menuToggle) {
    menuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.toggle("active");
    });
  }

  // Mobile: tutup sidebar (tombol X)
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => sidebar.classList.remove("active"));
  }

  // Desktop: collapse / expand sidebar
  if (sidebarCollapseBtn) {
    sidebarCollapseBtn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      if (mainContent) mainContent.classList.toggle("sidebar-collapsed");
    });
  }

  // Klik di luar sidebar → tutup (mobile only)
  document.addEventListener("click", (e) => {
    if (window.innerWidth <= 768 && sidebar) {
      const klikDiSidebar = sidebar.contains(e.target);
      const klikDiMenu    = menuToggle && menuToggle.contains(e.target);
      if (!klikDiSidebar && !klikDiMenu) sidebar.classList.remove("active");
    }
  });
}

function loadSidebar() {
  const container = document.getElementById("sidebar-container");
  if (!container) return;

  fetch("sidebar.html")
    .then(res => res.text())
    .then(html => {
      container.innerHTML = html;

      // Tandai active nav item
      const currentPage = window.location.pathname.split("/").pop().split(".")[0];
      container.querySelectorAll(".nav-item").forEach(item => {
        if (item.dataset.page === currentPage) item.classList.add("active");
      });

      _sidebarReady = true;
      setupSidebarToggle(); // akan jalan hanya kalau header juga sudah siap
    })
    .catch(err => console.error("Failed to load sidebar:", err));
}

function loadHeader() {
  const container = document.getElementById("header-container");
  if (!container) return;

  fetch("header.html")
    .then(res => res.text())
    .then(html => {
      container.innerHTML = html;

      _headerReady = true;
      setupSidebarToggle(); // akan jalan hanya kalau sidebar juga sudah siap
    })
    .catch(err => console.error("Failed to load header:", err));
}

document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();
  loadHeader();
});