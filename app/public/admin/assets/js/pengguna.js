let allUsers = [];
let filteredUsers = [];
let pagination = null;

let searchText = "";
let filterPeran = "";

// =====================
// INIT
// =====================
document.addEventListener("DOMContentLoaded", () => {
  // tombol
  document.getElementById("btnRefresh").addEventListener("click", loadUsers);
  document.getElementById("btnAdd").addEventListener("click", openAddModal);
  document.getElementById("btnApply").addEventListener("click", applyFilters);
  document.getElementById("btnReset").addEventListener("click", resetFilters);

  document.getElementById("btnCloseModal").addEventListener("click", () => closeModal("formModal"));
  document.getElementById("btnCancelModal").addEventListener("click", () => closeModal("formModal"));
  document.getElementById("btnSave").addEventListener("click", saveUser);

  // input filter
  document.getElementById("searchInput").addEventListener("input", (e) => {
    searchText = e.target.value || "";
  });

  document.getElementById("filterPeran").addEventListener("change", (e) => {
    filterPeran = e.target.value || "";
  });

  // close modal klik overlay
  document.getElementById("formModal").addEventListener("click", (e) => {
    if (e.target.id === "formModal") closeModal("formModal");
  });

  loadUsers();
});

// =====================
// API (pakai config.js / main.js kalau sudah ada apiRequest)
// =====================
async function apiAdmin(path, options = {}) {
  // kalau di config.js kamu ada apiRequest() yang otomatis pakai token, pakai itu saja:
  if (typeof apiRequest === "function") {
    return apiRequest(path, options);
  }

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) {
    alert("Silakan login admin terlebih dahulu");
    window.location.href = "/login.html";
    throw new Error("NO_LOGIN");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request gagal");
  return data;
}

// =====================
// LOAD
// =====================
async function loadUsers() {
  try {
    document.getElementById("tableBody").innerHTML = `
      <tr><td colspan="6">
        <div class="loading"><div class="spinner"></div><p>Memuat data...</p></div>
      </td></tr>
    `;

    // endpoint admin
    allUsers = await apiAdmin("/api/admin/pengguna", { method: "GET" });

    // sort terbaru
    allUsers.sort((a, b) => new Date(b.dibuatPada) - new Date(a.dibuatPada));

    applyFilters();
    showAlert("Data pengguna berhasil dimuat", "success", 1500);
  } catch (err) {
    console.error(err);
    showAlert(err.message || "Gagal memuat pengguna", "error");
    renderRows([]);
  }
}

function applyFilters() {
  const q = searchText.trim().toLowerCase();

  filteredUsers = (allUsers || []).filter((u) => {
    const nama = String(u.nama || "").toLowerCase();
    const email = String(u.email || "").toLowerCase();

    if (q && !(nama.includes(q) || email.includes(q))) return false;
    if (filterPeran && String(u.peran || "") !== filterPeran) return false;

    return true;
  });

  document.getElementById("totalInfo").textContent = `Total: ${filteredUsers.length} pengguna`;

  renderTable();
}

function resetFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("filterPeran").value = "";
  searchText = "";
  filterPeran = "";
  applyFilters();
}

// =====================
// RENDER
// =====================
function formatDate(s) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTable() {
  if (typeof Pagination !== "undefined") {
    pagination = new Pagination(filteredUsers, 10);
    renderCurrentPage();
    return;
  }
  renderRows(filteredUsers);
}

function renderCurrentPage() {
  const items = pagination.getCurrentItems();
  renderRows(items);
  pagination.renderPagination("pagination", renderCurrentPage);
}

function renderRows(items) {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  if (!items || items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center" style="padding: 40px;">
          <i class="fas fa-inbox" style="font-size: 48px; color: var(--gray-300); display:block; margin-bottom: 15px;"></i>
          Tidak ada data pengguna
        </td>
      </tr>
    `;
    return;
  }

  items.forEach((u) => {
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nama || "User")}&background=random`;

    const row = `
      <tr>
        <td><strong>#${u.id}</strong></td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${avatar}" style="width:36px;height:36px;border-radius:50%;" />
            <div style="font-weight:600;">${escapeHtml(u.nama || "-")}</div>
          </div>
        </td>
        <td>${escapeHtml(u.email || "-")}</td>
        <td>
          <span class="badge ${u.peran === "ADMIN" ? "badge-primary" : "badge-secondary"}">
            ${u.peran || "-"}
          </span>
        </td>
        <td>${formatDate(u.dibuatPada)}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon btn-primary" onclick="openEditModal(${u.id})" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon btn-danger" onclick="deleteUser(${u.id})" title="Hapus">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}

// =====================
// MODAL
// =====================
function openAddModal() {
  document.getElementById("modalTitle").textContent = "Tambah Pengguna";
  document.getElementById("userId").value = "";
  document.getElementById("nama").value = "";
  document.getElementById("email").value = "";
  document.getElementById("password").value = "";
  document.getElementById("peran").value = "USER";

  document.getElementById("password").required = true;
  document.getElementById("passwordHelp").textContent = "Minimal 6 karakter (wajib saat tambah)";

  openModal("formModal");
}

window.openEditModal = async function (id) {
  try {
    const u = await apiAdmin(`/api/admin/pengguna/${id}`, { method: "GET" });

    document.getElementById("modalTitle").textContent = "Edit Pengguna";
    document.getElementById("userId").value = u.id;
    document.getElementById("nama").value = u.nama || "";
    document.getElementById("email").value = u.email || "";
    document.getElementById("peran").value = u.peran || "USER";

    document.getElementById("password").value = "";
    document.getElementById("password").required = false;
    document.getElementById("passwordHelp").textContent = "Kosongkan jika tidak ingin mengganti password";

    openModal("formModal");
  } catch (err) {
    console.error(err);
    showAlert(err.message || "Gagal ambil data pengguna", "error");
  }
};

async function saveUser() {
  const id = document.getElementById("userId").value;
  const nama = document.getElementById("nama").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const peran = document.getElementById("peran").value;

  if (!nama || !email) return showAlert("Nama dan email wajib diisi", "error");

  try {
    if (!id) {
      if (!password || password.length < 6) return showAlert("Password minimal 6 karakter", "error");

      await apiAdmin("/api/admin/pengguna", {
        method: "POST",
        body: JSON.stringify({ nama, email, password, peran }),
      });

      showAlert("Pengguna berhasil ditambahkan", "success");
    } else {
      const payload = { nama, email, peran };
      if (password && password.length) {
        if (password.length < 6) return showAlert("Password minimal 6 karakter", "error");
        payload.password = password;
      }

      await apiAdmin(`/api/admin/pengguna/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      showAlert("Pengguna berhasil diupdate", "success");
    }

    closeModal("formModal");
    await loadUsers();
  } catch (err) {
    console.error(err);
    showAlert(err.message || "Gagal menyimpan pengguna", "error");
  }
}

window.deleteUser = async function (id) {
  if (!confirm(`Hapus pengguna #${id}?`)) return;

  try {
    await apiAdmin(`/api/admin/pengguna/${id}`, { method: "DELETE" });
    showAlert("Pengguna berhasil dihapus", "success");
    await loadUsers();
  } catch (err) {
    console.error(err);
    showAlert(err.message || "Gagal menghapus pengguna", "error");
  }
};

// =====================
// MODAL HELPERS
// =====================
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = "flex";
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = "none";
}
