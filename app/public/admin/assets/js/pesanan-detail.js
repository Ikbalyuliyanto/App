let currentOrder = null;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnRefresh").addEventListener("click", () => loadDetail(true));
  document.getElementById("btnUpdateStatus").addEventListener("click", onUpdateStatus);
  document.getElementById("btnSaveResi").addEventListener("click", onSaveResi);

  loadDetail(false);
});

function getOrderIdFromUrl() {
  const p = new URLSearchParams(location.search);
  return p.get("orderId") || p.get("id");
}

function rupiah(n) {
  // kalau helpers.js sudah punya formatRupiah, pakai itu
  if (typeof formatRupiah === "function") return formatRupiah(n);
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function safeDate(d) {
  if (typeof formatDate === "function") return formatDate(d);
  return d ? new Date(d).toLocaleString("id-ID") : "-";
}

function badgeStatus(status) {
  const s = String(status || "").toUpperCase();
  const map = {
    MENUNGGU_PEMBAYARAN: { cls: "badge-warning", text: "Menunggu Bayar" },
    DIPROSES: { cls: "badge-info", text: "Diproses" },
    DIKIRIM: { cls: "badge-primary", text: "Dikirim" },
    SELESAI: { cls: "badge-success", text: "Selesai" },
    DIBATALKAN: { cls: "badge-danger", text: "Dibatalkan" },
  };
  return map[s] || { cls: "badge-secondary", text: s || "-" };
}

function payStatusLabel(p) {
  const st = String(p?.status || "").toUpperCase();
  const metode = p?.metode || "-";
  const provider = p?.provider ? ` (${p.provider})` : "";

  if (!st) return "-";

  if (st === "BERHASIL") return `✅ ${metode}${provider}`;
  if (st === "MENUNGGU") return `⏳ MENUNGGU ${metode}${provider}`;
  if (st === "KADALUARSA") return `⚠️ KADALUARSA ${metode}${provider}`;
  if (st === "DIBATALKAN") return `❌ DIBATALKAN ${metode}${provider}`;
  if (st === "GAGAL") return `❌ GAGAL ${metode}${provider}`;
  return `${st} ${metode}${provider}`;
}

async function loadDetail(silent) {
  const orderId = getOrderIdFromUrl();
  if (!orderId) {
    if (!silent) showAlert("Order ID tidak ditemukan", "error");
    return;
  }

  try {
    // admin detail endpoint
    const data = await apiRequest(`/api/admin/pesanan/${encodeURIComponent(orderId)}`);
    currentOrder = data;
    renderAll(data);
    if (!silent) showAlert("Detail pesanan dimuat", "success");
  } catch (e) {
    console.error(e);
    showAlert(e.message || "Gagal memuat detail pesanan", "error");
  }
}

function renderAll(o) {
  // ringkasan
  document.getElementById("orderId").textContent = `#${o.id}`;
  document.getElementById("orderDate").textContent = safeDate(o.dibuatPada);
  document.getElementById("orderTotal").textContent = rupiah(o.totalAkhir ?? 0);
  document.getElementById("payStatus").textContent = payStatusLabel(o.pembayaran);

  const b = badgeStatus(o.status);
  const badge = document.getElementById("badgeStatus");
  badge.className = `badge ${b.cls}`;
  badge.textContent = b.text;

  // pelanggan
  const profil = o.pengguna?.profil;
  const nama = profil ? `${profil.namaDepan || ""} ${profil.namaBelakang || ""}`.trim() : (o.pengguna?.email || "User");
  const email = o.pengguna?.email || "-";
  const phone = profil?.nomorTelepon || "-";

  document.getElementById("userName").textContent = nama || "User";
  document.getElementById("userEmail").textContent = email;
  document.getElementById("userPhone").textContent = phone;

  document.getElementById("userAvatar").src =
    `https://ui-avatars.com/api/?name=${encodeURIComponent(nama || "User")}&background=random`;

  // alamat snapshot (dari Pesanan)
  const addrHtml = [
    `<b>${escapeHtml(o.namaPenerima || "-")}</b> • ${escapeHtml(o.noTelp || "-")}`,
    escapeHtml(o.alamat || "-"),
    `Kel. ${escapeHtml(o.kelurahan || "-")}, Kec. ${escapeHtml(o.kecamatan || "-")}`,
    `${escapeHtml(o.kota || "-")}, ${escapeHtml(o.provinsi || "-")} ${escapeHtml(o.kodePos || "")}`,
  ].join("<br>");
  document.getElementById("shipAddress").innerHTML = addrHtml;

  // pengiriman
  const ship = o.pengiriman;
  const layanan = ship?.layanan;
  const kurir = layanan?.kurir;

  const methodText = layanan
    ? `${layanan.nama}${kurir ? ` (${kurir.nama || kurir.kode || ""})` : ""}`
    : "-";
  document.getElementById("shippingMethod").textContent = methodText;

  document.getElementById("shippingEtd").textContent =
    layanan?.estimasiHari ? `${layanan.estimasiHari} hari` : "-";

  document.getElementById("shippingCost").textContent = rupiah(o.ongkir ?? ship?.biaya ?? 0);

  // resi
  const resiVal = ship?.resi || "";
  document.getElementById("resiInput").value = resiVal;

  // status select set current
  const sel = document.getElementById("statusSelect");
  sel.value = String(o.status || "MENUNGGU_PEMBAYARAN");

  // summary
  document.getElementById("sumSubtotal").textContent = rupiah(o.subtotal ?? 0);
  document.getElementById("sumOngkir").textContent = rupiah(o.ongkir ?? 0);
  document.getElementById("sumDiskon").textContent = o.diskon ? `- ${rupiah(o.diskon)}` : rupiah(0);
  document.getElementById("sumTotal").textContent = rupiah(o.totalAkhir ?? 0);

  // items
  renderItems(o.item || []);
}

function renderItems(items) {
  const el = document.getElementById("itemsList");
  if (!items.length) {
    el.innerHTML = `<div style="color:#6b7280;">Tidak ada item</div>`;
    return;
  }

  el.innerHTML = items.map((it) => {
    const nama = it.produk?.nama || "Produk";
    const qty = Number(it.jumlah || 1);
    const harga = Number(it.harga ?? it.varian?.harga ?? it.produk?.harga ?? 0);

    const gambar = it.produk?.gambarUtama ? `${API_BASE}${it.produk.gambarUtama}` : "";
    const attrs = getVariantAttributesFromDb(it.varian);
    const variantText = attrs.length
      ? attrs.map(a => `${escapeHtml(a.label)}: ${escapeHtml(a.value)}`).join(" | ")
      : "";

    return `
      <div style="display:flex; gap:12px; padding:12px 0; border-bottom:1px solid #eef2f7;">
        <div style="width:54px;height:54px;border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f3f4f6;flex:0 0 auto;">
          ${gambar ? `<img src="${gambar}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='📦'"/>` : "📦"}
        </div>
        <div style="flex:1;">
          <div style="font-weight:700;">${escapeHtml(nama)}</div>
          ${variantText ? `<div style="color:#6b7280;font-size:13px;margin:4px 0;">${variantText}</div>` : ""}
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
            <div style="color:#111827;font-weight:700;">${rupiah(harga)}</div>
            <div style="color:#6b7280;">x${qty}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ambil atribut varian dari struktur prisma include kamu
function getVariantAttributesFromDb(varian) {
  const out = [];
  const maps = varian?.atribut || [];
  for (const m of maps) {
    const label = m?.nilai?.atribut?.nama;
    const value = m?.nilai?.nilai;
    if (label && value) out.push({ label, value });
  }
  return out;
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function onUpdateStatus() {
  const orderId = getOrderIdFromUrl();
  const status = document.getElementById("statusSelect").value;

  if (!orderId) return showAlert("Order ID tidak valid", "error");
  if (!status) return showAlert("Pilih status", "warning");

  try {
    await apiRequest(`/api/admin/pesanan/${encodeURIComponent(orderId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    showAlert("Status berhasil diupdate", "success");
    await loadDetail(true);
  } catch (e) {
    console.error(e);
    showAlert(e.message || "Gagal update status", "error");
  }
}

async function onSaveResi() {
  const orderId = getOrderIdFromUrl();
  const resi = document.getElementById("resiInput").value.trim();

  if (!orderId) return showAlert("Order ID tidak valid", "error");

  try {
    // endpoint yang sama: kirim status current + resi
    const status = document.getElementById("statusSelect").value;

    await apiRequest(`/api/admin/pesanan/${encodeURIComponent(orderId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, resi })
    });

    showAlert("Resi berhasil disimpan", "success");
    await loadDetail(true);
  } catch (e) {
    console.error(e);
    showAlert(e.message || "Gagal simpan resi", "error");
  }
}


document.getElementById('btnPrintLabel')?.addEventListener('click', () => {
  const orderId = getOrderIdFromUrl();
  if (!orderId) return alert('Order ID tidak ditemukan');

  window.open(
    `/admin/cetak-label.html?orderId=${orderId}`,
    '_blank'
  );
});
