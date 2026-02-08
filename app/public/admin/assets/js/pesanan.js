let allOrders = [];
let filteredOrders = [];
let pagination = null;
let searchId = '';
let filterStatus = '';
let filterTanggalDari = '';
let filterTanggalSampai = '';

document.addEventListener('DOMContentLoaded', () => {
  loadOrders();

  document.getElementById('searchId').addEventListener('input', (e) => {
    searchId = e.target.value.trim();
  });

  document.getElementById('filterStatus').addEventListener('change', (e) => {
    filterStatus = e.target.value.trim();
  });

  document.getElementById('filterTanggalDari').addEventListener('change', (e) => {
    filterTanggalDari = e.target.value;
  });

  document.getElementById('filterTanggalSampai').addEventListener('change', (e) => {
    filterTanggalSampai = e.target.value;
  });
});

async function loadOrders() {
  try {
    // admin endpoint
    allOrders = await apiRequest('/api/admin/pesanan');

    allOrders.sort((a, b) => {
      if (a.dibuatPada && b.dibuatPada) return new Date(b.dibuatPada) - new Date(a.dibuatPada);
      return b.id - a.id;
    });

    applyFilters();
  } catch (error) {
    showAlert('Gagal memuat data pesanan', 'error');
    console.error(error);
  }
}

function applyFilters() {
  filteredOrders = allOrders.filter(order => {
    if (searchId && !String(order.id).includes(searchId)) return false;

    if (filterStatus && String(order.status) !== filterStatus) return false;

    if (filterTanggalDari || filterTanggalSampai) {
      const orderDate = new Date(order.dibuatPada);

      if (filterTanggalDari) {
        const fromDate = new Date(filterTanggalDari);
        fromDate.setHours(0, 0, 0, 0);
        if (orderDate < fromDate) return false;
      }

      if (filterTanggalSampai) {
        const toDate = new Date(filterTanggalSampai);
        toDate.setHours(23, 59, 59, 999);
        if (orderDate > toDate) return false;
      }
    }

    return true;
  });

  renderTable();
}

function resetFilters() {
  document.getElementById('searchId').value = '';
  document.getElementById('filterStatus').value = '';
  document.getElementById('filterTanggalDari').value = '';
  document.getElementById('filterTanggalSampai').value = '';
  searchId = '';
  filterStatus = '';
  filterTanggalDari = '';
  filterTanggalSampai = '';
  applyFilters();
}

function renderTable() {
  pagination = new Pagination(filteredOrders, 10);
  renderCurrentPage();
}

function renderCurrentPage() {
  const tbody = document.getElementById('tableBody');
  const items = pagination.getCurrentItems();

  tbody.innerHTML = '';

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center" style="padding: 40px;">
          <i class="fas fa-inbox" style="font-size: 48px; color: var(--gray-300); display: block; margin-bottom: 15px;"></i>
          Tidak ada data pesanan
        </td>
      </tr>
    `;
    return;
  }

  items.forEach(order => {
    const statusBadge = getStatusBadge(order.status);
    const nama = order.pengguna?.nama || 'User';
    const email = order.pengguna?.email || '';
    const total = order.totalAkhir ?? 0;

    const row = `
      <tr>
        <td><strong>#${order.id}</strong></td>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(nama)}&background=random"
                 style="width: 36px; height: 36px; border-radius: 50%;">
            <div>
              <div style="font-weight: 500;">${escapeHtml(nama)}</div>
              <small style="color: var(--gray-500);">${escapeHtml(email)}</small>
            </div>
          </div>
        </td>
        <td><strong>${formatRupiah(total)}</strong></td>
        <td><span class="badge ${statusBadge.class}">${statusBadge.text}</span></td>
        <td>${formatDate(order.dibuatPada)}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon btn-primary" onclick="viewOrder(${order.id})" title="Lihat Detail">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn-icon btn-success" onclick="updateStatus(${order.id})" title="Update Status">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });

  pagination.renderPagination('pagination', renderCurrentPage);
}

function getStatusBadge(status) {
  const s = String(status || '').toUpperCase();
  const statusMap = {
    'MENUNGGU_PEMBAYARAN': { class: 'badge-warning', text: 'Menunggu Bayar' },
    'DIPROSES': { class: 'badge-info', text: 'Diproses' },
    'DIKIRIM': { class: 'badge-primary', text: 'Dikirim' },
    'SELESAI': { class: 'badge-success', text: 'Selesai' },
    'DIBATALKAN': { class: 'badge-danger', text: 'Dibatalkan' }
  };
  return statusMap[s] || { class: 'badge-secondary', text: s || '-' };
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function viewOrder(id) {
  // kamu bisa bikin halaman admin detail sendiri, contoh:
  window.location.href = `pesanan-detail.html?orderId=${encodeURIComponent(id)}`;
}

async function updateStatus(id) {
  const options = [
      { value: 'MENUNGGU_PEMBAYARAN', text: 'Menunggu Bayar' },
      { value: 'DIPROSES', text: 'Diproses' },
      { value: 'DIKIRIM', text: 'Dikirim' },
      { value: 'SELESAI', text: 'Selesai' },
      { value: 'DIBATALKAN', text: 'Dibatalkan' }
  ];

  const status = await showSelect("Pilih status baru:", options);
  if (!status) return;

  try {
      await apiRequest(`/api/admin/pesanan/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status })
      });
      showAlert("Status berhasil diupdate", "success");
      await loadOrders();
  } catch (e) {
      console.error(e);
      showAlert(e.message || "Gagal update status", "error");
  }
}
