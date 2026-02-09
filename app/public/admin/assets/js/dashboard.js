// assets/js/dashboard.js

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
  const n = Number(angka);
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(safe);
}

// helper ambil total order yang benar (support beberapa kemungkinan field)
function getOrderTotal(order) {
  // Prisma kamu: totalAkhir
  const val = Number(order?.totalAkhir ?? order?.total ?? order?.grandTotal ?? 0);
  return Number.isFinite(val) ? val : 0;
}

// helper format tanggal pendek (fallback kalau formatDateShort tidak ada)
function safeFormatDateShort(dateLike) {
  try {
    if (typeof formatDateShort === "function") return formatDateShort(dateLike);
  } catch {}
  const d = new Date(dateLike || Date.now());
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

async function loadDashboardStats() {
  try {
    // ADMIN endpoint (butuh token, apiRequest sudah kirim Authorization)
    const products = await apiRequest("/api/admin/produk");
    document.getElementById("totalProduk").textContent = Array.isArray(products) ? products.length : 0;

    const orders = await apiRequest("/api/admin/pesanan");
    const orderArr = Array.isArray(orders) ? orders : [];
    document.getElementById("totalPesanan").textContent = orderArr.length;

    // kalau route pengguna admin belum ada, fallback ke public
    let users = [];
    try {
      users = await apiRequest("/api/admin/pengguna");
    } catch {
      users = await apiRequest("/api/pengguna");
    }
    document.getElementById("totalPengguna").textContent = Array.isArray(users) ? users.length : 0;

    // ✅ FIX NaN: pakai totalAkhir + Number() + guard
    const totalRevenue = orderArr
      .filter(o => o.status === "SELESAI")
      .reduce((sum, order) => sum + getOrderTotal(order), 0);

    document.getElementById("totalPendapatan").textContent = formatRupiah(totalRevenue);
  } catch (error) {
    console.error("Error loading dashboard stats:", error);
  }
}

async function loadRecentOrders() {
  try {
    const orders = await apiRequest("/api/admin/pesanan");
    const orderArr = Array.isArray(orders) ? orders : [];
    const recentOrders = orderArr.slice(0, 5);

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
          <td>#${order.id ?? "-"}</td>
          <td>${order.pengguna?.nama || "N/A"}</td>
          <td>${formatRupiah(getOrderTotal(order))}</td>
          <td><span class="badge ${statusBadge.class}">${statusBadge.text}</span></td>
          <td>${safeFormatDateShort(order.dibuatPada ?? order.createdAt)}</td>
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

function getProductStock(product) {
  // 1) kalau backend kirim stokProduk
  const stokProduk = Number(product?.stokProduk);
  if (Number.isFinite(stokProduk)) return stokProduk;

  // 2) kalau backend pakai nama lain
  const stokAlt = Number(product?.stok);
  if (Number.isFinite(stokAlt)) return stokAlt;

  // 3) kalau backend kirim daftar varian: jumlahkan stok varian
  if (Array.isArray(product?.varianProduk) && product.varianProduk.length) {
    return product.varianProduk.reduce((sum, v) => sum + (Number(v?.stok) || 0), 0);
  }
  return 0;
}
async function loadTopProducts() {
  try {
    const products = await apiRequest("/api/admin/produk");
    const prodArr = Array.isArray(products) ? products : [];

    const topProducts = prodArr
      .slice()
      .sort((a, b) => (Number(b.terjual || 0) - Number(a.terjual || 0)))
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
            <div style="display:flex;align-items:center;gap:10px;">
              <img src="${fixImgUrl(product.gambarUtama)}"
                  alt="${(product.nama || "Produk").replace(/"/g, "&quot;")}"
                  style="width:40px;height:40px;border-radius:6px;object-fit:cover;">
              <span>${product.nama || "-"}</span>
            </div>
          </td>
          <td>${Number(product.terjual || 0)}</td>
          <td>${getProductStock(product)}</td>
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
    MENUNGGU_PEMBAYARAN: { class: "badge-warning", text: "Menunggu Pembayaran" },
    MENUNGGU: { class: "badge-warning", text: "Menunggu" }, // fallback kalau ada yang lama
    DIPROSES: { class: "badge-info", text: "Diproses" },
    DIKIRIM: { class: "badge-primary", text: "Dikirim" },
    SELESAI: { class: "badge-success", text: "Selesai" },
    DIBATALKAN: { class: "badge-danger", text: "Dibatalkan" },
  };

  return statusMap[status] || { class: "badge-secondary", text: status || "-" };
}
