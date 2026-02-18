let allProducts = [];
let filteredProducts = [];
let pagination = null;
let itemsPerPage = 20;

// Filters
let filterNama = "";
let filterKategoriId = "";
let filterTanggalDari = "";
let filterTanggalSampai = "";

document.addEventListener("DOMContentLoaded", () => {
  loadCategories();
  loadProducts();

  // Setup event listeners
  const searchNama = document.getElementById("searchNama");
  const filterKategori = document.getElementById("filterKategori");
  const filterDari = document.getElementById("filterTanggalDari");
  const filterSampai = document.getElementById("filterTanggalSampai");

  if (searchNama) {
    searchNama.addEventListener("input", (e) => {
      filterNama = e.target.value || "";
      applyFilters();
    });
  }

  if (filterKategori) {
    filterKategori.addEventListener("change", (e) => {
      filterKategoriId = e.target.value || "";
      applyFilters();
    });
  }

  if (filterDari) {
    filterDari.addEventListener("change", (e) => {
      filterTanggalDari = e.target.value || "";
      applyFilters();
    });
  }

  if (filterSampai) {
    filterSampai.addEventListener("change", (e) => {
      filterTanggalSampai = e.target.value || "";
      applyFilters();
    });
  }
});

// ===== helper url gambar =====
function fixImgUrl(u) {
  if (!u) return ""; // jika null/undefined, return string kosong
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${window.API_BASE}${u}`;
}

// ===== helper rupiah =====
function formatRupiah(angka) {
  if (angka == null) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(angka);
}

// ===== helper alert =====
function showAlert(message, type = "info") {
  alert(message); // versi simple dulu
}

async function loadCategories() {
  try {
    const categories = await apiRequest("/api/admin/kategori");
    const select = document.getElementById("filterKategori");
    if (!select) return;

    // reset options (biar tidak dobel kalau reload)
    select.innerHTML = `<option value="">Semua Kategori</option>`;

    categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.nama;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading categories:", error);
    showAlert(error.message || "Gagal memuat kategori", "error");
  }
}

async function loadProducts() {
  try {
    const res = await apiRequest("/api/admin/produk");
    console.log("produk dari API:", res);

    allProducts = res;

    // Sort by newest first
    allProducts.sort((a, b) => {
      if (a.dibuatPada && b.dibuatPada) {
        return new Date(b.dibuatPada) - new Date(a.dibuatPada);
      }
      return b.id - a.id;
    });

    applyFilters();
  } catch (error) {
    console.error("loadProducts error:", error);
    showAlert(error.message || "Gagal memuat data produk", "error");
  }
}


function applyFilters() {
  filteredProducts = allProducts.filter((product) => {
    // Filter by name
    if (filterNama && !String(product.nama || "").toLowerCase().includes(filterNama.toLowerCase())) {
      return false;
    }

    // Filter by category
    if (filterKategoriId && String(product.kategori?.id || product.kategoriId || "") != String(filterKategoriId)) {
      return false;
    }

    // Filter by date range (opsional kalau field ada)
    if (filterTanggalDari || filterTanggalSampai) {
      const rawDate = product.dibuatPada || product.createdAt || product.created_at;
      if (!rawDate) return true;

      const productDate = new Date(rawDate);
      if (isNaN(productDate.getTime())) return true;

      if (filterTanggalDari) {
        const fromDate = new Date(filterTanggalDari);
        fromDate.setHours(0, 0, 0, 0);
        if (productDate < fromDate) return false;
      }

      if (filterTanggalSampai) {
        const toDate = new Date(filterTanggalSampai);
        toDate.setHours(23, 59, 59, 999);
        if (productDate > toDate) return false;
      }
    }

    return true;
  });

  renderTable();
}

function resetFilters() {
  const searchNama = document.getElementById("searchNama");
  const filterKategori = document.getElementById("filterKategori");
  const filterDari = document.getElementById("filterTanggalDari");
  const filterSampai = document.getElementById("filterTanggalSampai");

  if (searchNama) searchNama.value = "";
  if (filterKategori) filterKategori.value = "";
  if (filterDari) filterDari.value = "";
  if (filterSampai) filterSampai.value = "";

  filterNama = "";
  filterKategoriId = "";
  filterTanggalDari = "";
  filterTanggalSampai = "";

  applyFilters();
}

function changeItemsPerPage() {
  itemsPerPage = parseInt(document.getElementById("itemsPerPage").value || "20", 20);
  renderTable();
}

function renderTable() {
  pagination = new Pagination(filteredProducts, itemsPerPage);
  renderCurrentPage();

  const total = document.getElementById("totalItems");
  if (total) total.textContent = filteredProducts.length;
}

function renderCurrentPage() {
  const tbody = document.getElementById("tableBody");
  if (!tbody) return;

  const items = pagination.getCurrentItems();
  tbody.innerHTML = "";

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center" style="padding: 40px;">
          <i class="fas fa-inbox" style="font-size: 48px; color: var(--gray-300); display: block; margin-bottom: 15px;"></i>
          Tidak ada produk ditemukan
        </td>
      </tr>
    `;
    return;
  }

  const currentPage = Number(pagination.currentPage) || 1;
  const perPage = itemsPerPage;

  let rows = "";

  items.forEach((product, index) => {

    const nomor = (currentPage - 1) * perPage + index + 1;

    const statusBadge =
      product.aktif !== false
        ? '<span class="badge badge-success">Aktif</span>'
        : '<span class="badge badge-danger">Nonaktif</span>';

    const flashsaleBadge = product.flashsale
      ? '<span class="badge badge-danger">🔥 Ya</span>'
      : '';

    const terlarisBadge = product.terlaris
      ? '<span class="badge badge-warning">🏆 Ya</span>'
      : '';

    const untukmuBadge = product.untukmu
      ? '<span class="badge badge-primary">⭐ Ya</span>'
      : '';

    rows += `
      <tr>
        <td>${nomor}</td>

        <td>
          <img src="${fixImgUrl(product.gambarUtama)}"
               alt="${product.nama}"
               style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;">
        </td>

        <td>${product.nama}</td>
        <td>${product.kategori?.nama || "-"}</td>
        <td>${formatRupiah(product.harga)}</td>
        <td>${product.stokProduk || 0} pcs</td>

        <td>${flashsaleBadge}</td>
        <td>${terlarisBadge}</td>
        <td>${untukmuBadge}</td>

        <td>${statusBadge}</td>

        <td>
          <div class="action-buttons">
            <a href="produk-form.html?id=${product.id}" class="btn-icon btn-primary">
              <i class="fas fa-edit"></i>
            </a>
            <button class="btn-icon btn-danger" onclick="deleteProduct(${product.id})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rows;

  pagination.renderPagination("pagination", renderCurrentPage);
}

// function renderCurrentPage() {
//   const tbody = document.getElementById("tableBody");
//   if (!tbody) return;

//   const items = pagination.getCurrentItems();
//   tbody.innerHTML = "";

//   if (items.length === 0) {
//     tbody.innerHTML = `
//       <tr>
//         <td colspan="7" class="text-center" style="padding: 40px;">
//           <i class="fas fa-inbox" style="font-size: 48px; color: var(--gray-300); display: block; margin-bottom: 15px;"></i>
//           Tidak ada produk ditemukan
//         </td>
//       </tr>
//     `;
//     return;
//   }

//   items.forEach((product) => {
//     const statusBadge =
//       product.aktif !== false
//         ? '<span class="badge badge-success">Aktif</span>'
//         : '<span class="badge badge-danger">Nonaktif</span>';

//     const row = `
//       <tr>
//         <td>
//           <img src="${fixImgUrl(product.gambarUtama)}"
//                alt="${product.nama}"
//                style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;">
//         </td>
//         <td>
//           <div style="font-weight: 500;">${product.nama}</div>
//           ${product.merek ? `<small style="color: var(--gray-500);">${product.merek}</small>` : ""}
//         </td>
//         <td>${product.kategori?.nama || "-"}</td>
//         <td>${formatRupiah(product.harga)}</td>
//         <td>${product.stokProduk || 0} pcs</td>
//         <td>${statusBadge}</td>
//         <td>
//           <div class="action-buttons">
//             <a href="produk-form.html?id=${product.id}" class="btn-icon btn-primary" title="Edit">
//               <i class="fas fa-edit"></i>
//             </a>
//             <button class="btn-icon btn-danger" onclick="deleteProduct(${product.id})" title="Hapus">
//               <i class="fas fa-trash"></i>
//             </button>
//           </div>
//         </td>
//       </tr>
//     `;

//     tbody.innerHTML += row;
//   });

//   pagination.renderPagination("pagination", renderCurrentPage);
// }

async function deleteProduct(id) {
  
  const ok = confirm("Yakin ingin menghapus produk ini?");
  try {
    // PAKAI ADMIN ENDPOINT
    await apiRequest(`/api/admin/produk/${id}`, { method: "DELETE" });

    showAlert("Produk berhasil dihapus!", "success");
    loadProducts();
  } catch (error) {
    showAlert(error.message || "Gagal menghapus produk", "error");
    console.error(error);
  }
}
function cartesianProduct(arrays) {
  return arrays.reduce((acc, curr) => {
    const out = [];
    acc.forEach(a => {
      curr.forEach(b => out.push(a.concat([b])));
    });
    return out;
  }, [[]]);
}

function buildVariantKey(nilaiIds) {
  return nilaiIds.slice().sort((a,b) => a-b).join("-");
}

function generateSkuDefault(baseSku, nilaiIds) {
  // contoh: SKU-7-12-19 (produkId-nilaiId...)
  const suffix = nilaiIds.join("-");
  return (baseSku ? baseSku : "SKU") + "-" + suffix;
}

function generateVariantsFromAttributes() {
  if (attributes.length === 0) {
    showAlert("Buat atribut terlebih dahulu.", "error");
    return;
  }

  // pastikan semua atribut punya nilai
  const attrValues = attributes.map(a => (a.nilai || []).map(v => Number(v.id)).filter(Boolean));
  const anyEmpty = attrValues.some(list => list.length === 0);
  if (anyEmpty) {
    showAlert("Setiap atribut harus punya minimal 1 nilai.", "error");
    return;
  }

  const defaultHarga = parseInt(document.getElementById("harga").value, 10) || 0;
  const defaultStok = parseInt(document.getElementById("stokProduk").value, 10) || 0;

  // kalau kamu punya input SKU global, ambil dari sana.
  // kalau tidak ada, biarkan kosong lalu auto generate.
  const baseSku = ""; 

  // kombinasi semua nilaiId
  const combos = cartesianProduct(attrValues); // hasil: [[nilaiId1, nilaiId2], ...]

  // map varian existing supaya tidak duplikat
  const existingMap = new Map();
  (variants || []).forEach(v => {
    const ids = (v.atribut || []).map(x => Number(x.nilaiId)).filter(Boolean);
    if (ids.length) existingMap.set(buildVariantKey(ids), v);
  });

  const newVariants = [];

  combos.forEach(nilaiIds => {
    const key = buildVariantKey(nilaiIds);

    // kalau sudah ada -> pertahankan
    if (existingMap.has(key)) {
      newVariants.push(existingMap.get(key));
      return;
    }

    // varian baru
    newVariants.push({
      id: `new_${variantCounter++}`,
      harga: defaultHarga,       // default dari atas
      stok: defaultStok,         // default dari atas
      sku: generateSkuDefault(baseSku, nilaiIds),
      atribut: nilaiIds.map(id => ({ nilaiId: id })),
    });
  });

  variants = newVariants;

  // Karena stok sudah dipakai di varian, stokProduk sebaiknya 0 (biar gak membingungkan)
  // (opsional, tapi biasanya ini yang benar)
  // document.getElementById("stokProduk").value = 0;

  renderVariants();
  showAlert(`Berhasil generate ${variants.length} varian dari atribut.`, "success");
}
