// ==============================
// produk-form.js (VERSI BENAR)
// ==============================

let currentProductId = null;

let mainImage = null;
let galleryImages = [];      // [{url, urutan, _isNew?}]
let mainImageFile = null;
let galleryFiles = [];       // File[] hanya untuk gambar baru

let attributes = [];         // [{id, nama, urutan, nilai:[{id, nilai, urutan}]}]
let variants = [];           // [{id, sku, stok, harga, atribut:[{nilaiId}]}]

let attributeCounter = 0;
let variantCounter = 0;

// -------------------------
// Helpers
// -------------------------
function getProductId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function fixImgUrl(u) {
  if (!u) return "https://picsum.photos/600/400";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("blob:")) return u;
  return `${window.API_BASE}${u}`;
}

function normalizeAttributesForSend(attrs) {
  return (attrs || [])
    .filter(a => a?.nama && Array.isArray(a.nilai) && a.nilai.length > 0)
    .map((a, idx) => ({
      id: a.id, // angka atau "new_..."
      nama: String(a.nama),
      urutan: Number(a.urutan ?? idx),
      nilai: (a.nilai || [])
        .filter(v => v?.nilai)
        .map((v, j) => ({
          id: v.id, // angka atau "new_..."
          nilai: String(v.nilai),
          urutan: Number(v.urutan ?? j),
        })),
    }));
}

// -------------------------
// Init
// -------------------------
document.addEventListener("DOMContentLoaded", async () => {
  await loadCategories();

  currentProductId = getProductId();

  // OPTIONAL: kalau kamu punya tombol generate, pastikan ada id="btnGenerateVariants"
  const btnGen = document.getElementById("btnGenerateVariants");
  if (btnGen) btnGen.addEventListener("click", generateVariantsAuto);

  if (currentProductId) {
    document.getElementById("pageTitle").textContent = "Edit Produk";
    await loadProduct(currentProductId);
  }

  document.getElementById("productForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveProduct();
  });
});

// -------------------------
// Categories
// -------------------------
async function loadCategories() {
  try {
    const categories = await apiRequest("/api/kategori");
    const select = document.getElementById("kategoriId");
    select.innerHTML = `<option value="">Pilih Kategori</option>`;
    categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.nama;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading categories:", error);
  }
}

// -------------------------
// Load Product (edit mode)
// -------------------------
async function loadProduct(id) {
  try {
    const product = await apiRequest(`/api/admin/produk/${id}`);

    // Basic info
    document.getElementById("nama").value = product.nama || "";
    document.getElementById("kategoriId").value = product.kategoriId || "";
    document.getElementById("merek").value = product.merek || "";
    document.getElementById("deskripsi").value = product.deskripsi || "";
    document.getElementById("urlproduk").value = product.urlproduk || "";

    // Pricing
    document.getElementById("harga").value = product.harga ?? "";
    document.getElementById("hargaAsli").value = product.hargaAsli ?? "";
    document.getElementById("diskonPersen").value = product.diskonPersen ?? "";
    document.getElementById("stokProduk").value = product.stokProduk ?? 0;

    document.getElementById("gratisOngkir").checked = !!product.gratisOngkir;
    document.getElementById("aktif").checked = product.aktif !== false;
    document.getElementById("flashsale").checked = product.flashsale === true;
    document.getElementById("terlaris").checked = product.terlaris === true;
    document.getElementById("untukmu").checked = product.untukmu === true;

    // Main image
    if (product.gambarUtama) {
      mainImage = product.gambarUtama;
      document.getElementById("mainImagePreview").src = fixImgUrl(mainImage);
      document.getElementById("mainImagePreview").style.display = "block";
      document.getElementById("mainImagePlaceholder").style.display = "none";
    } else {
      document.getElementById("mainImagePreview").style.display = "none";
      document.getElementById("mainImagePlaceholder").style.display = "block";
    }

    // Gallery
    galleryFiles = [];
    galleryImages = [];
    if (product.galeri && product.galeri.length) {
      galleryImages = product.galeri
        .slice()
        .sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0))
        .map((g, i) => ({
          url: g.url,
          urutan: g.urutan ?? i + 1,
          _isNew: false,
        }));
    }
    renderGallery();

    // Attributes
    attributes = [];
    if (product.atributProduk && product.atributProduk.length) {
      attributes = product.atributProduk
        .slice()
        .sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0))
        .map((a) => ({
          id: a.id,
          nama: a.nama,
          urutan: a.urutan ?? 0,
          nilai: (a.nilai || [])
            .slice()
            .sort((x, y) => (x.urutan ?? 0) - (y.urutan ?? 0))
            .map((v) => ({
              id: v.id,
              nilai: v.nilai,
              urutan: v.urutan ?? 0,
            })),
        }));
    }
    renderAttributes();

    // Variants
    variants = [];
    if (product.varianProduk && product.varianProduk.length) {
      variants = product.varianProduk.map((v) => ({
        id: v.id,
        sku: v.sku || "",
        stok: v.stok || 0,
        harga: v.harga ?? null,
        atribut: (v.atribut || []).map((va) => ({ nilaiId: va.nilaiId })),
      }));
    }
    renderVariants();
  } catch (error) {
    showAlert("Gagal memuat data produk", "error");
    console.error(error);
  }
}

// -------------------------
// Main image upload
// -------------------------
function handleMainImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  mainImageFile = file;
  const previewUrl = URL.createObjectURL(file);

  document.getElementById("mainImagePreview").src = previewUrl;
  document.getElementById("mainImagePreview").style.display = "block";
  document.getElementById("mainImagePlaceholder").style.display = "none";
}

// -------------------------
// Gallery upload + render
// -------------------------
function handleGalleryUpload(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  files.forEach((file) => {
    galleryFiles.push(file);
    galleryImages.push({
      url: URL.createObjectURL(file),
      urutan: galleryImages.length + 1,
      _isNew: true,
    });
  });

  renderGallery();
  event.target.value = "";
}

function renderGallery() {
  const container = document.getElementById("galleryContainer");
  container.innerHTML = "";

  galleryImages.forEach((img, index) => {
    const div = document.createElement("div");
    div.className = "gallery-item";
    div.innerHTML = `
      <img src="${fixImgUrl(img.url)}" alt="Gallery ${index + 1}">
      <button class="remove-btn" onclick="removeGalleryImage(${index})" type="button">
        <i class="fas fa-times"></i>
      </button>
    `;
    container.appendChild(div);
  });
}

function removeGalleryImage(index) {
  if (galleryImages[index]?._isNew) {
    const newCountBefore = galleryImages.slice(0, index + 1).filter((x) => x._isNew).length;
    galleryFiles.splice(newCountBefore - 1, 1);
  }
  galleryImages.splice(index, 1);
  renderGallery();
}

// -------------------------
// Upload endpoints
// -------------------------
async function uploadMainImage(productId, file) {
  const fd = new FormData();
  fd.append("image", file);
  const res = await apiRequest(`/api/admin/produk/${productId}/upload-main`, {
    method: "POST",
    body: fd,
  });
  return res.path;
}

async function uploadGalleryImage(productId, file, slot) {
  const fd = new FormData();
  fd.append("image", file);
  fd.append("slot", String(slot));
  const res = await apiRequest(`/api/admin/produk/${productId}/upload-gallery`, {
    method: "POST",
    body: fd,
  });
  return res.path;
}

// -------------------------
// Attributes UI
// -------------------------
function addAttribute() {
  attributes.push({
    id: `new_${attributeCounter++}`,
    nama: "",
    nilai: [],
  });
  renderAttributes();
}

function renderAttributes() {
  const container = document.getElementById("attributesContainer");
  container.innerHTML = "";

  if (attributes.length === 0) {
    container.innerHTML =
      '<p style="color: var(--gray-500); text-align: center; padding: 20px;">Belum ada atribut. Klik "Tambah Atribut" untuk membuat atribut baru.</p>';
    return;
  }

  attributes.forEach((attr, attrIndex) => {
    const div = document.createElement("div");
    div.className = "attribute-section";
    div.innerHTML = `
      <div class="attribute-header">
        <input type="text" placeholder="Nama Atribut (contoh: Warna, Ukuran)"
               value="${attr.nama ?? ""}"
               onchange="updateAttributeName(${attrIndex}, this.value)"
               style="flex: 1; padding: 10px; border: 1px solid var(--gray-300); border-radius: 6px;">
        <button type="button" class="btn btn-danger btn-sm" onclick="removeAttribute(${attrIndex})">
          <i class="fas fa-trash"></i>
        </button>
      </div>

      <div style="display: flex; gap: 10px; margin-bottom: 10px;">
        <input type="text" placeholder="Nilai (contoh: Merah, Biru)"
               id="attrValue_${attrIndex}"
               onkeypress="if(event.key==='Enter'){event.preventDefault();addAttributeValue(${attrIndex});}"
               style="flex: 1; padding: 10px; border: 1px solid var(--gray-300); border-radius: 6px;">
        <button type="button" class="btn btn-primary btn-sm" onclick="addAttributeValue(${attrIndex})">
          <i class="fas fa-plus"></i> Tambah
        </button>
      </div>

      <div class="value-tags" id="attrValues_${attrIndex}">
        ${(attr.nilai || [])
          .map(
            (val, valIndex) => `
              <div class="value-tag">
                ${val.nilai}
                <button type="button" onclick="removeAttributeValue(${attrIndex}, ${valIndex})">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            `
          )
          .join("")}
      </div>
    `;
    container.appendChild(div);
  });
}

function updateAttributeName(attrIndex, name) {
  attributes[attrIndex].nama = name;
}

function addAttributeValue(attrIndex) {
  const input = document.getElementById(`attrValue_${attrIndex}`);
  const value = (input.value || "").trim();
  if (!value) return;

  if (!attributes[attrIndex].nilai) attributes[attrIndex].nilai = [];
  attributes[attrIndex].nilai.push({
    id: `new_${Date.now()}`,
    nilai: value,
    urutan: attributes[attrIndex].nilai.length,
  });

  input.value = "";
  renderAttributes();
}

function removeAttributeValue(attrIndex, valIndex) {
  attributes[attrIndex].nilai.splice(valIndex, 1);
  renderAttributes();
}

function removeAttribute(attrIndex) {
  if (confirm("Hapus atribut ini?")) {
    attributes.splice(attrIndex, 1);
    renderAttributes();
  }
}

// -------------------------
// Variants UI (MANUAL)
// -------------------------
function addVariant() {
  if (!currentProductId) {
    showAlert("Simpan produk dulu sebelum menambah varian.", "error");
    return;
  }
  if (attributes.length === 0) {
    showAlert("Buat atribut terlebih dahulu sebelum menambah varian", "error");
    return;
  }

  variants.push({
    id: `new_${variantCounter++}`,
    harga: null,
    stok: 0,
    sku: "",
    atribut: [], // [{nilaiId}]
  });
  renderVariants();
}

function renderVariants() {
  const container = document.getElementById("variantsContainer");
  container.innerHTML = "";

  if (variants.length === 0) {
    container.innerHTML =
      '<p style="color: var(--gray-500); text-align: center; padding: 20px;">Belum ada varian. Klik "Tambah Varian" untuk membuat varian baru.</p>';
    return;
  }

  variants.forEach((variant, varIndex) => {
    const div = document.createElement("div");
    div.className = "variant-section";

    let atributOptions = "";

    attributes.forEach((attr) => {
      const selectedRow = (variant.atribut || []).find((a) =>
        (attr.nilai || []).some((v) => String(v.id) === String(a.nilaiId))
      );

      atributOptions += `
        <div class="form-group">
          <label>${attr.nama}</label>
          <select onchange="updateVariantAttribute(${varIndex}, '${attr.id}', this)">
            <option value="">Pilih ${attr.nama}</option>
            ${(attr.nilai || [])
              .map(
                (val) => `
                  <option value="${val.id}" ${
                    selectedRow && String(selectedRow.nilaiId) === String(val.id) ? "selected" : ""
                  }>${val.nilai}</option>
                `
              )
              .join("")}
          </select>
        </div>
      `;
    });

    div.innerHTML = `
      <div class="attribute-header">
        <strong>Varian ${varIndex + 1}</strong>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeVariant(${varIndex})">
          <i class="fas fa-trash"></i>
        </button>
      </div>

      <div class="variant-grid">
        ${atributOptions}
        <div class="form-group">
          <label>Harga Varian (Opsional)</label>
          <input type="number" value="${variant.harga ?? ""}" placeholder="Kosongkan untuk pakai harga default"
                 onchange="variants[${varIndex}].harga = this.value ? parseInt(this.value,10) : null">
        </div>
        <div class="form-group">
          <label>Stok</label>
          <input type="number" value="${variant.stok || 0}"
                 onchange="variants[${varIndex}].stok = parseInt(this.value,10) || 0">
        </div>
        <div class="form-group">
          <label>SKU</label>
          <input type="text" value="${variant.sku || ""}" placeholder="SKU-001"
                 onchange="variants[${varIndex}].sku = this.value">
        </div>
      </div>
    `;

    container.appendChild(div);
  });
}

function updateVariantAttribute(varIndex, atributId, selectEl) {
  if (!variants[varIndex].atribut) variants[varIndex].atribut = [];

  const nilaiId = selectEl.value ? parseInt(selectEl.value, 10) : null;

  const attr = attributes.find(a => String(a.id) === String(atributId));
  const attrNilaiIds = new Set((attr?.nilai || []).map(v => String(v.id)));

  variants[varIndex].atribut = (variants[varIndex].atribut || []).filter(
    a => !attrNilaiIds.has(String(a.nilaiId))
  );

  if (nilaiId && Number.isInteger(nilaiId) && nilaiId > 0) {
    variants[varIndex].atribut.push({ nilaiId });
  }
}

function removeVariant(varIndex) {
  if (confirm("Hapus varian ini?")) {
    variants.splice(varIndex, 1);
    renderVariants();
  }
}

// -------------------------
// Generate Variants AUTO (MANUAL BUTTON)
// -------------------------
async function generateVariantsAuto() {
  if (!currentProductId) {
    showAlert("Simpan produk dulu sebelum generate varian.", "error");
    return;
  }

  try {
    await apiRequest(`/api/admin/produk/${currentProductId}/variants`, {
      method: "PUT",
      body: { autoGenerate: true },
    });

    await loadProduct(currentProductId);
    showAlert("Varian berhasil digenerate otomatis!", "success");
  } catch (e) {
    console.error(e);
    showAlert(e.message || "Gagal generate varian", "error");
  }
}
// Loading
(function injectLoadingStyle() {
  const css = `
    #loadingOverlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.45);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }

    #loadingOverlay .loading-box {
      background: #fff;
      padding: 20px 28px;
      border-radius: 10px;
      text-align: center;
      min-width: 220px;
      box-shadow: 0 10px 30px rgba(0,0,0,.25);
    }

    #loadingOverlay .spinner {
      width: 42px;
      height: 42px;
      border: 4px solid #e5e7eb;
      border-top: 4px solid #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto;
    }

    #loadingOverlay p {
      margin-top: 12px;
      font-size: 14px;
      color: #333;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
})();

(function injectLoadingHtml() {
  const div = document.createElement("div");
  div.id = "loadingOverlay";
  div.innerHTML = `
    <div class="loading-box">
      <div class="spinner"></div>
      <p>Menyimpan data...</p>
    </div>
  `;
  document.body.appendChild(div);
})();

function showLoading() {
  document.getElementById("loadingOverlay").style.display = "flex";
}

function hideLoading() {
  document.getElementById("loadingOverlay").style.display = "none";
}
// -------------------------
// Save Product (create/update + upload + variants)
// -------------------------
async function saveProduct() {
  const nama = document.getElementById("nama").value;
  const kategoriId = document.getElementById("kategoriId").value;
  const harga = document.getElementById("harga").value;
  showLoading(); 
  if (!nama || !kategoriId || !harga) {
    showAlert("Nama, kategori, dan harga wajib diisi", "error");
    return;
  }

  const baseData = {
    nama,
    kategoriId: parseInt(kategoriId, 10),
    merek: document.getElementById("merek").value || null,
    deskripsi: document.getElementById("deskripsi").value || null,
    urlproduk: document.getElementById("urlproduk").value || null,
    harga: parseInt(harga, 10),
    hargaAsli: document.getElementById("hargaAsli").value
      ? parseInt(document.getElementById("hargaAsli").value, 10)
      : null,
    diskonPersen: document.getElementById("diskonPersen").value
      ? parseInt(document.getElementById("diskonPersen").value, 10)
      : null,
    stokProduk: parseInt(document.getElementById("stokProduk").value, 10) || 0,
    gratisOngkir: document.getElementById("gratisOngkir").checked,
    aktif: document.getElementById("aktif").checked,
    flashsale: document.getElementById("flashsale").checked,
    terlaris: document.getElementById("terlaris").checked,
    untukmu: document.getElementById("untukmu").checked,
    atributProduk: normalizeAttributesForSend(attributes),
  };

  try {
    let productId = currentProductId;

    // 1) create dulu kalau baru
    let isNew = false;
    if (!productId) {
      isNew = true;

      const createData = { ...baseData };
      delete createData.atributProduk;   // ✅ jangan kirim atribut di POST

      const created = await apiRequest("/api/admin/produk", {
        method: "POST",
        body: createData,
      });

      productId = created.id;
      currentProductId = String(created.id);
    }


    // 2) upload main jika ada file baru
    let mainPath = null;
    if (mainImageFile) {
      mainPath = await uploadMainImage(productId, mainImageFile);
    }

    // 3) upload gallery baru lalu replace blob->path
    let newFileIdx = 0;
    for (let i = 0; i < galleryImages.length; i++) {
      const img = galleryImages[i];
      if (img._isNew) {
        const file = galleryFiles[newFileIdx++];
        const slot = i + 1;
        const path = await uploadGalleryImage(productId, file, slot);
        img.url = path;
        img._isNew = false;
      }
    }

    const galeriPayload = galleryImages
      .filter((g) => g && g.url)
      .map((g, i) => ({ url: g.url, urutan: i + 1 }));

    // 4) PUT produk (update basic + galeri + atribut)
    const updateData = {
      ...baseData,
      ...(mainPath ? { gambarUtama: mainPath } : {}),
      galeri: galeriPayload,
      atributProduk: baseData.atributProduk,
    };

    await apiRequest(`/api/admin/produk/${productId}`, {
      method: "PUT",
      body: updateData,
    });

    // 5) GET fresh (ambil nilaiId terbaru jika ada nilai baru)
    const fresh = await apiRequest(`/api/admin/produk/${productId}`);

    const validNilaiId = new Set();
    (fresh.atributProduk || []).forEach(a => {
      (a.nilai || []).forEach(v => validNilaiId.add(String(v.id)));
    });

    // 6) payload varian (manual) -> hanya yang nilaiId valid
    const varianPayload = (variants || []).map(v => ({
      sku: v.sku || null,
      stok: Number(v.stok || 0),
      harga: v.harga != null ? Number(v.harga) : null,
      atribut: (v.atribut || [])
        .map(a => ({ nilaiId: Number(a.nilaiId) }))
        .filter(x => Number.isInteger(x.nilaiId) && x.nilaiId > 0 && validNilaiId.has(String(x.nilaiId))),
    }));

    // validasi: kalau ada varian manual tapi ada yang atribut kosong -> stop
    const anyInvalid = varianPayload.some(v => (v.atribut || []).length === 0);
    if (variants.length > 0 && anyInvalid) {
      showAlert("Ada varian yang belum memilih nilai atribut lengkap.", "error");
      return;
    }

    // 7) SIMPAN VARIAN (INILAH YANG TADI KAMU LUPA)
    await apiRequest(`/api/admin/produk/${productId}/variants`, {
      method: "PUT",
      body: { varianProduk: varianPayload },
    });
    hideLoading()
    showAlert("Produk berhasil disimpan!", "success");
    setTimeout(() => (window.location.href = "produk.html"), 1200);
  } catch (err) {
    console.error(err);
    showAlert(err.message || "Gagal menyimpan produk", "error");
  }
}
