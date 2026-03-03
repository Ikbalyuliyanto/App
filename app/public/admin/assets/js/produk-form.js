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
      id: a.id,
      nama: String(a.nama),
      urutan: Number(a.urutan ?? idx),
      nilai: (a.nilai || [])
        .filter(v => v?.nilai)
        .map((v, j) => ({
          id: v.id,
          nilai: String(v.nilai),
          urutan: Number(v.urutan ?? j),
        })),
    }));
}
// -------------------------
// Format angka ribuan
// -------------------------
function formatRibuan(val) {
  if (val === null || val === undefined || val === '') return '';
  return String(val).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseRibuan(str) {
  if (!str) return null;
  const clean = String(str).replace(/\./g, '').replace(/,/g, '');
  const num = parseInt(clean, 10);
  return isNaN(num) ? null : num;
}

function initFormatInput(el) {
  // tampilkan formatted saat load
  if (el.value) {
    const num = parseRibuan(el.value);
    el.value = num !== null ? formatRibuan(num) : '';
  }
  el.addEventListener('focus', function() {
    // strip dots on focus so user can type freely
    const raw = parseRibuan(this.value);
    this.value = raw !== null ? String(raw) : '';
  });
  el.addEventListener('input', function() {
    // only allow digits
    this.value = this.value.replace(/[^0-9]/g, '');
  });
  el.addEventListener('blur', function() {
    const num = parseRibuan(this.value);
    this.value = num !== null ? formatRibuan(num) : '';
  });
}



// -------------------------
// Init
// -------------------------
document.addEventListener("DOMContentLoaded", async () => {
  await loadCategories();

  currentProductId = getProductId();

  const btnGen = document.getElementById("btnGenerateVariants");
  if (btnGen) btnGen.addEventListener("click", generateVariantsAuto);

  if (currentProductId) {
    document.getElementById("pageTitle").textContent = "Edit Produk";
    await loadProduct(currentProductId);
  } else {
    // mode tambah baru - pasang format ribuan
    ['harga','hargaAsli','stokProduk'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('focus', function() {
        const raw = this.value.replace(/\./g,'');
        this.value = raw;
      });
      el.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g,'');
      });
      el.addEventListener('blur', function() {
        const n = parseInt(this.value, 10);
        this.value = isNaN(n) ? '' : formatRibuan(n);
      });
    });
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

    document.getElementById("nama").value = product.nama || "";
    document.getElementById("kategoriId").value = product.kategoriId || "";
    document.getElementById("merek").value = product.merek || "";
    document.getElementById("deskripsi").value = product.deskripsi || "";
    document.getElementById("urlproduk").value = product.urlproduk || "";

    document.getElementById("harga").value = formatRibuan(product.harga) ?? "";
    document.getElementById("hargaAsli").value = formatRibuan(product.hargaAsli) ?? "";
    document.getElementById("diskonPersen").value = product.diskonPersen ?? "";
    document.getElementById("stokProduk").value = product.stokProduk ?? 0;

    document.getElementById("gratisOngkir").checked = !!product.gratisOngkir;
    document.getElementById("aktif").checked = product.aktif !== false;
    document.getElementById("flashsale").checked = product.flashsale === true;
    document.getElementById("terlaris").checked = product.terlaris === true;
    document.getElementById("untukmu").checked = product.untukmu === true;

    if (product.gambarUtama) {
      mainImage = product.gambarUtama;
      document.getElementById("mainImagePreview").src = fixImgUrl(mainImage);
      document.getElementById("mainImagePreview").style.display = "block";
      document.getElementById("mainImagePlaceholder").style.display = "none";
    } else {
      document.getElementById("mainImagePreview").style.display = "none";
      document.getElementById("mainImagePlaceholder").style.display = "block";
    }

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

    // pasang event handler format ribuan
    ['harga','hargaAsli'].forEach(id => {
      const el = document.getElementById(id);
      if (!el || el.dataset.fmtInit) return;
      el.dataset.fmtInit = '1';
      el.addEventListener('focus', function() {
        const raw = this.value.replace(/\./g,'');
        this.value = raw;
      });
      el.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g,'');
      });
      el.addEventListener('blur', function() {
        const n = parseInt(this.value, 10);
        this.value = isNaN(n) ? '' : formatRibuan(n);
      });
    });

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
// Variants UI — berjejer horizontal
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
    atribut: [],
  });
  renderVariants();
}

function renderVariants() {
  const container = document.getElementById("variantsContainer");
  container.innerHTML = "";

  if (variants.length === 0) {
    container.innerHTML =
      '<p style="color:var(--gray-500);text-align:center;padding:20px;">Belum ada varian. Klik "Tambah Varian" untuk membuat varian baru.</p>';
    return;
  }

  function buildVariantHTML(variant, varIndex) {
    let selects = attributes.map((attr) => {
      const selectedRow = (variant.atribut || []).find((a) =>
        (attr.nilai || []).some((v) => String(v.id) === String(a.nilaiId))
      );
      const options = (attr.nilai || [])
        .map(val => `<option value="${val.id}" ${
          selectedRow && String(selectedRow.nilaiId) === String(val.id) ? "selected" : ""
        }>${val.nilai}</option>`)
        .join("");
      return `<select onchange="updateVariantAttribute(${varIndex},'${attr.id}',this)">
        <option value="">— ${attr.nama} —</option>${options}
      </select>`;
    }).join("");

    return `
      <div class="vr-item">
        <span class="vr-no">#${varIndex + 1}</span>
        <div class="vr-attrs">${selects}</div>
        <input class="vr-harga" type="text" inputmode="numeric"
               value="${formatRibuan(variant.harga)}" placeholder="Harga"
               data-idx="${varIndex}" data-field="harga"
               onblur="syncVariantNum(this,'harga')"
               onfocus="this.value=variants[${varIndex}].harga??''"
               oninput="this.value=this.value.replace(/[^0-9]/g,'');syncVariantNum(this,'harga')">
        <input class="vr-stok" type="text" inputmode="numeric"
               value="${formatRibuan(variant.stok||0)}" placeholder="Stok"
               data-idx="${varIndex}" data-field="stok"
               onblur="syncVariantNum(this,'stok')"
               onfocus="this.value=variants[${varIndex}].stok??0"
               oninput="this.value=this.value.replace(/[^0-9]/g,'');syncVariantNum(this,'stok')">
        <input class="vr-sku" type="text" value="${variant.sku || ""}" placeholder="SKU"
               onchange="variants[${varIndex}].sku = this.value">
        <button type="button" class="btn btn-danger btn-sm vr-del" onclick="removeVariant(${varIndex})">
          <i class="fas fa-trash"></i>
        </button>
      </div>`;
  }

  const half = Math.ceil(variants.length / 2);
  const leftItems  = variants.slice(0, half).map((v, i) => buildVariantHTML(v, i)).join("");
  const rightItems = variants.slice(half).map((v, i) => buildVariantHTML(v, half + i)).join("");

  const attrLabels = attributes.map(a => `<span>${a.nama}</span>`).join("");
  const headerHTML = `
    <div class="vr-header">
      <span class="vr-no"></span>
      <div class="vr-attrs">${attrLabels}</div>
      <span class="vr-harga">Harga (Rp)</span>
      <span class="vr-stok">Stok</span>
      <span class="vr-sku">SKU</span>
      <span class="vr-del"></span>
    </div>`;

  container.innerHTML = `
    <div class="vr-columns">
      <div class="vr-col">
        ${headerHTML}
        ${leftItems}
      </div>
      <div class="vr-col">
        ${variants.length > 1 ? headerHTML : ""}
        ${rightItems}
      </div>
    </div>`;
}

function syncVariantNum(el, field) {
  const idx = parseInt(el.dataset.idx, 10);
  const raw = el.value.replace(/\./g, '').replace(/,/g, '');
  const num = raw ? parseInt(raw, 10) : (field === 'stok' ? 0 : null);
  variants[idx][field] = isNaN(num) ? (field === 'stok' ? 0 : null) : num;
  // format hanya saat blur (bukan saat oninput — user masih ketik)
  if (document.activeElement !== el) {
    el.value = variants[idx][field] !== null ? formatRibuan(variants[idx][field]) : '';
  }
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
// Generate Variants AUTO
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

// -------------------------
// Loading overlay
// -------------------------
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
    @keyframes spin { to { transform: rotate(360deg); } }
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
// Save Product
// -------------------------
async function saveProduct() {
  const nama = document.getElementById("nama").value;
  const kategoriId = document.getElementById("kategoriId").value;

  // strip titik ribuan sebelum parse
  function getInt(id) {
    const raw = (document.getElementById(id)?.value || '').replace(/\./g, '').replace(/,/g,'');
    const n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  }

  const harga = getInt("harga");

  showLoading();

  if (!nama || !kategoriId || !harga) {
    hideLoading();
    showAlert("Nama, kategori, dan harga wajib diisi", "error");
    return;
  }

  const baseData = {
    nama,
    kategoriId: parseInt(kategoriId, 10),
    merek: document.getElementById("merek").value || null,
    deskripsi: document.getElementById("deskripsi").value || null,
    urlproduk: document.getElementById("urlproduk").value || null,
    harga: harga,
    hargaAsli: getInt("hargaAsli"),
    diskonPersen: getInt("diskonPersen"),
    stokProduk: getInt("stokProduk") ?? 0,
    gratisOngkir: document.getElementById("gratisOngkir").checked,
    aktif: document.getElementById("aktif").checked,
    flashsale: document.getElementById("flashsale").checked,
    terlaris: document.getElementById("terlaris").checked,
    untukmu: document.getElementById("untukmu").checked,
    atributProduk: normalizeAttributesForSend(attributes),
  };

  try {
    let productId = currentProductId;

    if (!productId) {
      const createData = { ...baseData };
      delete createData.atributProduk;

      const created = await apiRequest("/api/admin/produk", {
        method: "POST",
        body: createData,
      });

      productId = created.id;
      currentProductId = String(created.id);
    }

    let mainPath = null;
    if (mainImageFile) {
      mainPath = await uploadMainImage(productId, mainImageFile);
    }

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

    const fresh = await apiRequest(`/api/admin/produk/${productId}`);

    const validNilaiId = new Set();
    (fresh.atributProduk || []).forEach(a => {
      (a.nilai || []).forEach(v => validNilaiId.add(String(v.id)));
    });

    const varianPayload = (variants || []).map(v => {
      // kirim id asli agar backend bisa UPDATE, bukan INSERT baru
      const isExisting = v.id && !String(v.id).startsWith('new_');
      return {
        ...(isExisting ? { id: Number(v.id) } : {}),
        sku: v.sku || null,
        stok: Number(v.stok || 0),
        harga: v.harga != null ? Number(v.harga) : null,
        atribut: (v.atribut || [])
          .map(a => ({ nilaiId: Number(a.nilaiId) }))
          .filter(x => Number.isInteger(x.nilaiId) && x.nilaiId > 0 && validNilaiId.has(String(x.nilaiId))),
      };
    });

    const anyInvalid = varianPayload.some(v => (v.atribut || []).length === 0);
    if (variants.length > 0 && anyInvalid) {
      hideLoading();
      showAlert("Ada varian yang belum memilih nilai atribut lengkap.", "error");
      return;
    }

    await apiRequest(`/api/admin/produk/${productId}/variants`, {
      method: "PUT",
      body: { varianProduk: varianPayload },
    });

    hideLoading();
    showAlert("Produk berhasil disimpan!", "success");
    setTimeout(() => (window.location.href = "produk.html"), 1200);
  } catch (err) {
    console.error(err);
    hideLoading();
    showAlert(err.message || "Gagal menyimpan produk", "error");
  }
}