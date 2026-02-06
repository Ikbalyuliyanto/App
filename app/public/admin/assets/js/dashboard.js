// Dashboard Statistics
document.addEventListener("DOMContentLoaded", async () => {
  await loadDashboardStats();
  await loadRecentOrders();
  await loadTopProducts();
});

function fixImgUrl(u) {
  if (!u) return "https://picsum.photos/600/400";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${window.API_BASE}${u}`; // contoh: /uploads/a.jpg
}

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(angka);
}

async function loadDashboardStats() {
  try {
    // ADMIN endpoint (butuh token, apiRequest sudah kirim Authorization)
    const products = await apiRequest("/api/admin/produk");
    document.getElementById("totalProduk").textContent = products.length;

    const orders = await apiRequest("/api/admin/pesanan");
    document.getElementById("totalPesanan").textContent = orders.length;

    // kalau route pengguna admin belum ada, fallback ke public
    let users = [];
    try {
      users = await apiRequest("/api/admin/pengguna");
    } catch {
      users = await apiRequest("/api/pengguna");
    }
    document.getElementById("totalPengguna").textContent = users.length;

    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    document.getElementById("totalPendapatan").textContent = formatRupiah(totalRevenue);
  } catch (error) {
    console.error("Error loading dashboard stats:", error);
  }
}

async function loadRecentOrders() {
  try {
    const orders = await apiRequest("/api/admin/pesanan");
    const recentOrders = orders.slice(0, 5);

    const tbody = document.getElementById("recentOrders");
    tbody.innerHTML = "";

    if (recentOrders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">Belum ada pesanan</td></tr>';
      return;
    }

    recentOrders.forEach((order) => {
      const statusBadge = getStatusBadge(order.status);
      const row = `
        <tr>
          <td>#${order.id}</td>
          <td>${order.pengguna?.nama || "N/A"}</td>
          <td>${formatRupiah(order.total)}</td>
          <td><span class="badge ${statusBadge.class}">${statusBadge.text}</span></td>
          <td>${formatDateShort(order.dibuatPada)}</td>
        </tr>
      `;
      tbody.innerHTML += row;
    });
  } catch (error) {
    console.error("Error loading recent orders:", error);
    document.getElementById("recentOrders").innerHTML =
      '<tr><td colspan="5" class="text-center">Gagal memuat data</td></tr>';
  }
}

async function loadTopProducts() {
  try {
    const products = await apiRequest("/api/admin/produk");
    const topProducts = products
      .sort((a, b) => (b.terjual || 0) - (a.terjual || 0))
      .slice(0, 5);

    const tbody = document.getElementById("topProducts");
    tbody.innerHTML = "";

    if (topProducts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-center">Belum ada data</td></tr>';
      return;
    }

    topProducts.forEach((product) => {
      const row = `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${fixImgUrl(product.gambarUtama)}"
                   alt="${product.nama}"
                   style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover;">
              <span>${product.nama}</span>
            </div>
          </td>
          <td>${product.terjual || 0}</td>
          <td>${product.stokProduk || 0}</td>
        </tr>
      `;
      tbody.innerHTML += row;
    });
  } catch (error) {
    console.error("Error loading top products:", error);
    document.getElementById("topProducts").innerHTML =
      '<tr><td colspan="3" class="text-center">Gagal memuat data</td></tr>';
  }
}

function getStatusBadge(status) {
  const statusMap = {
    MENUNGGU: { class: "badge-warning", text: "Menunggu" },
    DIPROSES: { class: "badge-info", text: "Diproses" },
    DIKIRIM: { class: "badge-primary", text: "Dikirim" },
    SELESAI: { class: "badge-success", text: "Selesai" },
    DIBATALKAN: { class: "badge-danger", text: "Dibatalkan" },
  };

  return statusMap[status] || { class: "badge-secondary", text: status || "-" };
}
