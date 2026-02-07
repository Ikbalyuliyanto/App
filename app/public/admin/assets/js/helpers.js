function showAlert(message, type = 'info') {
  const container = document.getElementById('alertContainer');
  if (!container) {
    alert(message);
    return;
  }

  const colors = {
    success: '#4caf50',
    error: '#f44336',
    info: '#2196f3',
    warning: '#ff9800'
  };

  const el = document.createElement('div');
  el.style.padding = '12px 16px';
  el.style.marginBottom = '10px';
  el.style.borderRadius = '6px';
  el.style.color = '#fff';
  el.style.background = colors[type] || colors.info;
  el.style.fontSize = '14px';
  el.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)';
  el.textContent = message;

  container.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 9876);
}


function formatRupiah(angka) {
  if (angka == null) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(angka);
}

function formatDateShort(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatDate(dateString) {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRupiah(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}
