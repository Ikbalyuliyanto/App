  // =========================
  // AUTH / API
  // =========================
  const API_BASE = `${location.protocol}//${location.hostname}:4000`;

  const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token");
  const getUserNama = () => localStorage.getItem("userNama") || sessionStorage.getItem("userNama");
  const isLoggedIn = () => !!getToken();

  function requireLogin(returnUrl) {
    if (isLoggedIn()) return true;

    showAlert("Silakan login terlebih dahulu", "warning");
    const ru = returnUrl || (window.location.pathname + window.location.search);
    window.location.href = `/login.html?returnUrl=${encodeURIComponent(ru)}`;
    return false;
  }

  function authHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function apiAuth(path, options = {}) {
    if (!requireLogin(window.location.pathname + window.location.search)) {
      throw new Error("NO_LOGIN");
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...authHeaders(),
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        localStorage.removeItem("userNama");
        sessionStorage.removeItem("userNama");

        showAlert("Sesi login berakhir. Silakan login lagi.", "warning", { timeout: 3000 });
        const ru = window.location.pathname + window.location.search;
        window.location.href = `/login.html?returnUrl=${encodeURIComponent(ru)}`;
      }
      throw new Error(data.message || "Request gagal");
    }

    return data;
  }