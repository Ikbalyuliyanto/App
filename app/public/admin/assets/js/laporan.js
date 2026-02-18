// assets/js/laporan.js
// Laporan Penjualan - Frontend Logic

document.addEventListener("DOMContentLoaded", () => {
    applyPreset("month");
    loadLaporan();
    bindEvents();
  });
  
  // ─── State ────────────────────────────────────────────────
  let allOrders = [];
  let filteredOrders = [];
  let pagination = null;
  let revenueChart = null;
  const ITEMS_PER_PAGE = 20;
  
  // ─── Event Bindings ───────────────────────────────────────
  function bindEvents() {
    document.getElementById("btnFilter").addEventListener("click", () => {
      applyFilters();
      renderAll();
    });
  
    document.getElementById("btnReset").addEventListener("click", () => {
      document.getElementById("filterStatus").value = "";
      applyPreset("month");
      document.getElementById("filterPreset").value = "month";
      applyFilters();
      renderAll();
    });
  
    document.getElementById("filterPreset").addEventListener("change", (e) => {
      if (e.target.value) applyPreset(e.target.value);
    });
  
    document.getElementById("btnExportCSV").addEventListener("click", exportCSV);
    document.getElementById("btnPrint").addEventListener("click", () => window.print());
  }
  
  // ─── Preset date ranges ───────────────────────────────────
  function applyPreset(preset) {
    const today = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);
    let from, to;
  
    switch (preset) {
      case "today":
        from = to = fmt(today);
        break;
      case "week": {
        const w = new Date(today);
        w.setDate(w.getDate() - 6);
        from = fmt(w);
        to = fmt(today);
        break;
      }
      case "month": {
        const m = new Date(today);
        m.setDate(m.getDate() - 29);
        from = fmt(m);
        to = fmt(today);
        break;
      }
      case "thismonth":
        from = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
        to = fmt(today);
        break;
      case "lastmonth": {
        const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lmEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        from = fmt(lm);
        to = fmt(lmEnd);
        break;
      }
      case "year":
        from = `${today.getFullYear()}-01-01`;
        to = fmt(today);
        break;
      default:
        return;
    }
    document.getElementById("filterFrom").value = from;
    document.getElementById("filterTo").value = to;
  }
  
  // ─── Load raw data ────────────────────────────────────────
  async function loadLaporan() {
    try {
      const raw = await apiRequest("/api/admin/pesanan");
      allOrders = Array.isArray(raw) ? raw : [];
      applyFilters();
      renderAll();
    } catch (err) {
      showAlert("Gagal memuat data laporan: " + err.message, "error");
    }
  }
  
  // ─── Filter logic (client-side) ───────────────────────────
  function applyFilters() {
    const from = document.getElementById("filterFrom").value;
    const to = document.getElementById("filterTo").value;
    const status = document.getElementById("filterStatus").value;
  
    filteredOrders = allOrders.filter((o) => {
      const tgl = new Date(o.dibuatPada);
  
      if (from) {
        const f = new Date(from);
        f.setHours(0, 0, 0, 0);
        if (tgl < f) return false;
      }
      if (to) {
        const t = new Date(to);
        t.setHours(23, 59, 59, 999);
        if (tgl > t) return false;
      }
      if (status && o.status !== status) return false;
      return true;
    });
  }
  
  // ─── Render everything ────────────────────────────────────
  function renderAll() {
    renderSummary();
    renderChart();
    renderTopProducts();
    renderStatusBreakdown();
    renderDetailTable(1);
  }
  
  // ─── Summary cards ────────────────────────────────────────
  function renderSummary() {
    const selesai = filteredOrders.filter((o) => o.status === "SELESAI");
    const batal   = filteredOrders.filter((o) => o.status === "DIBATALKAN");
  
    const totalPendapatan = selesai.reduce((s, o) => s + Number(o.totalAkhir || 0), 0);
    const totalItem = selesai.reduce((s, o) => {
      const cnt = o._count?.item || (Array.isArray(o.item) ? o.item.reduce((a, i) => a + Number(i.jumlah || 0), 0) : 0);
      return s + Number(cnt);
    }, 0);
    const rataRata = selesai.length ? totalPendapatan / selesai.length : 0;
  
    document.getElementById("sTotalPendapatan").textContent = formatRupiah(totalPendapatan);
    document.getElementById("sTotalPesanan").textContent    = filteredOrders.length;
    document.getElementById("sPesananSelesai").textContent  = selesai.length;
    document.getElementById("sTotalItem").textContent       = totalItem;
    document.getElementById("sPesananBatal").textContent    = batal.length;
    document.getElementById("sRataRata").textContent        = formatRupiah(rataRata);
  }
  
  // ─── Revenue Chart ────────────────────────────────────────
  function renderChart() {
    const from  = document.getElementById("filterFrom").value;
    const to    = document.getElementById("filterTo").value;
  
    // Build daily map for SELESAI orders only
    const selesai = filteredOrders.filter((o) => o.status === "SELESAI");
    const dayMap  = {};
  
    selesai.forEach((o) => {
      const day = new Date(o.dibuatPada).toISOString().slice(0, 10);
      dayMap[day] = (dayMap[day] || 0) + Number(o.totalAkhir || 0);
    });
  
    // Generate date labels
    const labels = [];
    const values = [];
  
    if (from && to) {
      const cur = new Date(from);
      const end = new Date(to);
      while (cur <= end) {
        const key = cur.toISOString().slice(0, 10);
        labels.push(
          cur.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
        );
        values.push(dayMap[key] || 0);
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      Object.keys(dayMap).sort().forEach((k) => {
        const d = new Date(k);
        labels.push(d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }));
        values.push(dayMap[k]);
      });
    }
  
    // Update period label
    document.getElementById("chartPeriodLabel").textContent =
      from && to ? `${from} s/d ${to}` : "—";
  
    // Draw / update chart
    const ctx = document.getElementById("revenueChart").getContext("2d");
  
    if (revenueChart) revenueChart.destroy();
  
    // Only show every N-th label if too many
    const tickMod = labels.length > 30 ? Math.ceil(labels.length / 20) : 1;
  
    revenueChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Pendapatan",
            data: values,
            backgroundColor: "rgba(59,130,246,0.55)",
            borderColor: "rgba(59,130,246,1)",
            borderWidth: 1.5,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => " " + formatRupiah(ctx.parsed.y),
            },
          },
        },
        scales: {
          x: {
            grid: { color: "rgba(100,116,139,0.2)" },
            ticks: {
              color: "#94a3b8",
              font: { size: 11 },
              maxRotation: 45,
              callback: function (val, idx) {
                return idx % tickMod === 0 ? this.getLabelForValue(val) : "";
              },
            },
          },
          y: {
            grid: { color: "rgba(100,116,139,0.2)" },
            ticks: {
              color: "#94a3b8",
              font: { size: 11 },
              callback: (v) => "Rp " + (v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "jt" : v.toLocaleString("id-ID")),
            },
          },
        },
      },
    });
  }
  
  // ─── Top Products ─────────────────────────────────────────
  function renderTopProducts() {
    const selesai = filteredOrders.filter((o) => o.status === "SELESAI");
  
    // Aggregate per product
    const map = {};
    selesai.forEach((o) => {
      const items = Array.isArray(o.item) ? o.item : [];
      items.forEach((it) => {
        const name = it.produk?.nama || `Produk #${it.produkId}`;
        if (!map[name]) map[name] = { qty: 0, rev: 0 };
        map[name].qty += Number(it.jumlah || 0);
        map[name].rev += Number(it.harga || 0) * Number(it.jumlah || 0);
      });
    });
  
    const sorted = Object.entries(map)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
  
    const tbody = document.getElementById("topProductsBody");
  
    if (!sorted.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center">Belum ada data</td></tr>';
      return;
    }
  
    tbody.innerHTML = sorted
      .map(
        (p, i) => `
      <tr>
        <td><span style="font-weight:700;color:var(--primary)">${i + 1}</span></td>
        <td>${escHtml(p.name)}</td>
        <td><strong>${p.qty}</strong></td>
        <td>${formatRupiah(p.rev)}</td>
      </tr>`
      )
      .join("");
  }
  
  // ─── Status Breakdown ─────────────────────────────────────
  function renderStatusBreakdown() {
    const map = {};
    filteredOrders.forEach((o) => {
      map[o.status] = (map[o.status] || 0) + 1;
    });
  
    const conf = {
      SELESAI:             { cls: "badge-success",   label: "Selesai" },
      DIPROSES:            { cls: "badge-info",      label: "Diproses" },
      DIKIRIM:             { cls: "badge-primary",   label: "Dikirim" },
      MENUNGGU_PEMBAYARAN: { cls: "badge-warning",   label: "Menunggu Bayar" },
      DIBATALKAN:          { cls: "badge-danger",    label: "Dibatalkan" },
    };
  
    const total = filteredOrders.length || 1;
    const el    = document.getElementById("statusBreakdown");
  
    if (!Object.keys(map).length) {
      el.innerHTML = '<span class="tbl-label">Tidak ada data</span>';
      return;
    }
  
    el.innerHTML = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([status, cnt]) => {
        const c = conf[status] || { cls: "badge-secondary", label: status };
        const pct = ((cnt / total) * 100).toFixed(1);
        return `<span class="badge ${c.cls}" style="font-size:13px;padding:8px 14px;gap:6px;">
          ${escHtml(c.label)} &nbsp;
          <strong>${cnt}</strong>
          <span style="opacity:.7;">(${pct}%)</span>
        </span>`;
      })
      .join("");
  }
  
  // ─── Detail Table ─────────────────────────────────────────
  function renderDetailTable(page) {
    const perPage = ITEMS_PER_PAGE;
    const total   = filteredOrders.length;
    const totalPages = Math.ceil(total / perPage) || 1;
    const cur     = Math.max(1, Math.min(page, totalPages));
  
    document.getElementById("totalRowLabel").textContent =
      total ? `${total} transaksi ditemukan` : "Tidak ada data";
  
    const slice = filteredOrders.slice((cur - 1) * perPage, cur * perPage);
    const tbody = document.getElementById("detailBody");
  
    if (!slice.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="text-center">Tidak ada data untuk periode ini</td></tr>';
      document.getElementById("detailPagination").innerHTML = "";
      return;
    }
  
    tbody.innerHTML = slice.map((o) => {
      const sb   = getStatusBadge(o.status);
      const pb   = getPembayaranBadge(o.pembayaran?.status, o.pembayaran?.metode);
      const tgl  = formatDateShort ? formatDateShort(o.dibuatPada) : new Date(o.dibuatPada).toLocaleDateString("id-ID");
      const nama = o.pengguna?.nama || o.pengguna?.email || "—";
  
      // brief product summary
      const items = Array.isArray(o.item) ? o.item : [];
      const produkRingkas = items.length
        ? items.slice(0, 2).map((i) => `${escHtml(i.produk?.nama || "?")} x${i.jumlah}`).join(", ") +
          (items.length > 2 ? ` +${items.length - 2} lainnya` : "")
        : `${o._count?.item || 0} item`;
  
      return `<tr>
        <td><strong>#${o.id}</strong></td>
        <td style="white-space:nowrap;">${tgl}</td>
        <td>${escHtml(nama)}</td>
        <td style="max-width:200px;font-size:12px;color:var(--dark-text-secondary);">${produkRingkas}</td>
        <td>${formatRupiah(o.subtotal)}</td>
        <td>${formatRupiah(o.ongkir)}</td>
        <td>${o.diskon ? formatRupiah(o.diskon) : "—"}</td>
        <td><strong>${formatRupiah(o.totalAkhir)}</strong></td>
        <td><span class="badge ${pb.cls}" style="font-size:11px;">${escHtml(pb.text)}</span></td>
        <td><span class="badge ${sb.class}">${escHtml(sb.text)}</span></td>
      </tr>`;
    }).join("");
  
    // Pagination
    renderDetailPagination(cur, totalPages);
  }
  
  function renderDetailPagination(cur, totalPages) {
    const container = document.getElementById("detailPagination");
    if (totalPages <= 1) { container.innerHTML = ""; return; }
  
    let html = "";
  
    const mkBtn = (page, label, disabled = false, active = false) =>
      `<button class="page-btn${active ? " active" : ""}" 
        ${disabled ? "disabled" : `onclick="renderDetailTable(${page})"`}>${label}</button>`;
  
    html += mkBtn(cur - 1, '<i class="fas fa-chevron-left"></i>', cur === 1);
  
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) html += mkBtn(i, i, false, i === cur);
    } else {
      html += mkBtn(1, 1, false, cur === 1);
      if (cur > 3) html += `<span style="padding:0 6px;color:var(--dark-text-secondary);">…</span>`;
      for (let i = Math.max(2, cur - 1); i <= Math.min(totalPages - 1, cur + 1); i++) {
        html += mkBtn(i, i, false, i === cur);
      }
      if (cur < totalPages - 2) html += `<span style="padding:0 6px;color:var(--dark-text-secondary);">…</span>`;
      html += mkBtn(totalPages, totalPages, false, cur === totalPages);
    }
  
    html += mkBtn(cur + 1, '<i class="fas fa-chevron-right"></i>', cur === totalPages);
    container.innerHTML = html;
  }
  
  // ─── Export CSV ───────────────────────────────────────────
  function exportCSV() {
    if (!filteredOrders.length) {
      showAlert("Tidak ada data untuk diekspor.", "warning");
      return;
    }
  
    const headers = ["ID", "Tanggal", "Pembeli", "Email", "Subtotal", "Ongkir", "Diskon", "Total", "Metode Bayar", "Status Bayar", "Status Pesanan"];
  
    const rows = filteredOrders.map((o) => [
      o.id,
      new Date(o.dibuatPada).toLocaleString("id-ID"),
      `"${(o.pengguna?.nama || "").replace(/"/g, '""')}"`,
      `"${(o.pengguna?.email || "").replace(/"/g, '""')}"`,
      o.subtotal,
      o.ongkir,
      o.diskon || 0,
      o.totalAkhir,
      o.pembayaran?.metode || "—",
      o.pembayaran?.status || "—",
      o.status,
    ]);
  
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
  
    const from = document.getElementById("filterFrom").value;
    const to   = document.getElementById("filterTo").value;
    a.href     = url;
    a.download = `laporan-penjualan_${from}_sd_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert("CSV berhasil diunduh!", "success");
  }
  
  // ─── Helpers ──────────────────────────────────────────────
  function getStatusBadge(status) {
    const map = {
      MENUNGGU_PEMBAYARAN: { class: "badge-warning", text: "Menunggu Bayar" },
      DIPROSES:            { class: "badge-info",    text: "Diproses" },
      DIKIRIM:             { class: "badge-primary",  text: "Dikirim" },
      SELESAI:             { class: "badge-success",  text: "Selesai" },
      DIBATALKAN:          { class: "badge-danger",   text: "Dibatalkan" },
    };
    return map[status] || { class: "badge-secondary", text: status || "—" };
  }
  
  function getPembayaranBadge(status, metode) {
    if (!status) return { cls: "badge-secondary", text: "—" };
    const map = {
      BERHASIL:  { cls: "badge-success", text: "Lunas" },
      MENUNGGU:  { cls: "badge-warning", text: "Menunggu" },
      GAGAL:     { cls: "badge-danger",  text: "Gagal" },
      KADALUARSA:{ cls: "badge-danger",  text: "Kadaluarsa" },
      DIBATALKAN:{ cls: "badge-secondary",text: "Batal" },
    };
    const b = map[status] || { cls: "badge-secondary", text: status };
    if (metode) b.text += ` (${metode})`;
    return b;
  }
  
  function escHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  
  // Fallback if helpers.js not loaded yet
  if (typeof formatRupiah === "undefined") {
    window.formatRupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
  }