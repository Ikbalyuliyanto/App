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

function loadSidebar() {
  const container = document.getElementById("sidebar-container");
  if (!container) return;

  fetch("sidebar.html")
    .then(res => res.text())
    .then(html => {
      container.innerHTML = html;
      const currentPage = window.location.pathname.split("/").pop().split(".")[0];
      container.querySelectorAll(".nav-item").forEach(item => {
        if (item.dataset.page === currentPage) item.classList.add("active");
      });
      setupSidebarToggle();
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
      setupSidebarToggle();
    })
    .catch(err => console.error("Failed to load header:", err));
}

function setupSidebarToggle() {
  const toggleBtn = document.querySelector("#menuToggle, #sidebarToggle");
  const sidebar = document.querySelector("#sidebar");
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => sidebar.classList.toggle("collapsed"));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();
  loadHeader();
});

// function showAlert(message, type = 'info') {
//   const container = document.getElementById('alertContainer');
//   if (!container) {
//     alert(message);
//     return;
//   }

//   const colors = {
//     success: '#4caf50',
//     error: '#f44336',
//     info: '#2196f3',
//     warning: '#ff9800'
//   };

//   const el = document.createElement('div');
//   el.style.padding = '12px 16px';
//   el.style.marginBottom = '10px';
//   el.style.borderRadius = '6px';
//   el.style.color = '#fff';
//   el.style.background = colors[type] || colors.info;
//   el.style.fontSize = '14px';
//   el.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)';
//   el.textContent = message;

//   container.appendChild(el);

//   setTimeout(() => {
//     el.remove();
//   }, 9876);
// }


// function formatRupiah(angka) {
//   if (angka == null) return "Rp 0";
//   return new Intl.NumberFormat("id-ID", {
//     style: "currency",
//     currency: "IDR",
//     minimumFractionDigits: 0
//   }).format(angka);
// }

// function formatDateShort(dateStr) {
//   if (!dateStr) return "-";
//   const d = new Date(dateStr);
//   if (isNaN(d.getTime())) return "-";
//   return d.toLocaleDateString("id-ID", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric"
//   });
// }

// function formatDate(dateString) {
//   if (!dateString) return "-";
//   const d = new Date(dateString);
//   if (Number.isNaN(d.getTime())) return "-";

//   return d.toLocaleDateString("id-ID", {
//     day: "numeric",
//     month: "long",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//   });
// }

// function formatRupiah(n) {
//   return "Rp " + Number(n || 0).toLocaleString("id-ID");
// }

// function loadSidebar() {
//   const container = document.getElementById("sidebar-container");
//   if (!container) return;

//   fetch("sidebar.html")
//     .then(res => res.text())
//     .then(html => {
//       container.innerHTML = html;

//       // Tandai menu aktif otomatis
//       const currentPage = window.location.pathname.split("/").pop().split(".")[0]; // misal "produk"
//       const navItems = container.querySelectorAll(".nav-item");

//       navItems.forEach(item => {
//         if (item.dataset.page === currentPage) {
//           item.classList.add("active");
//         }
//       });

//       // Toggle sidebar
//       const toggleBtn = container.querySelector("#sidebarToggle");
//       const sidebar = container.querySelector("#sidebar");
//       if (toggleBtn && sidebar) {
//         toggleBtn.addEventListener("click", () => {
//           sidebar.classList.toggle("collapsed");
//         });
//       }
//     })
//     .catch(err => console.error("Failed to load sidebar:", err));
// }

// // Auto-load sidebar saat DOM siap
// document.addEventListener("DOMContentLoaded", loadSidebar);

// function loadHeader() {
//   const container = document.getElementById("header-container");
//   if (!container) return;

//   fetch("/components/header.html")
//     .then(res => res.text())
//     .then(html => {
//       container.innerHTML = html;

//       // Toggle sidebar (sidebar sudah ada di halaman)
//       const toggleBtn = container.querySelector("#menuToggle");
//       const sidebar = document.getElementById("sidebar-container")?.querySelector("#sidebar");
//       if (toggleBtn && sidebar) {
//         toggleBtn.addEventListener("click", () => {
//           sidebar.classList.toggle("collapsed");
//         });
//       }
//     })
//     .catch(err => console.error("Failed to load header:", err));
// }

// document.addEventListener("DOMContentLoaded", () => {
//   loadHeader();
// });
