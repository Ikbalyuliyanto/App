
// =========================
// CONFIG
// =========================
(() => {
const API_BASE =
  window.location.hostname === "ashanum.com"
    ? "https://ashanum.com"
    : `http://${window.location.hostname}:9876`;

window.API_BASE = API_BASE;

  // =========================
  // STORAGE HELPERS
  // =========================
  window.getToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

  window.getUserNama = () =>
    localStorage.getItem("userNama") || sessionStorage.getItem("userNama");

  window.isLoggedIn = () => !!window.getToken();

  window.clearAuthStorage = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userNama");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("userNama");
  };

  // =========================
  // AUTH GUARD
  // =========================
  window.requireLogin = (returnUrl) => {
    if (window.isLoggedIn()) return true;

    // showAlert diasumsikan sudah ada di project kamu
    if (typeof window.showAlert === "function") {
      window.showAlert("Silakan login terlebih dahulu", "warning");
    }

    const ru = returnUrl || (window.location.pathname + window.location.search);

    setTimeout(() => {
      window.location.href = `auth/login.html?returnUrl=${encodeURIComponent(ru)}`;
    }, 1500);

    return false;
  };

  window.authHeaders = () => {
    const token = window.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // =========================
  // CORE REQUEST (UNIVERSAL)
  // =========================
  window.apiRequest = async (endpoint, options = {}) => {
    const url = `${window.API_BASE}${endpoint}`;
    const token = window.getToken();

    const headers = { ...(options.headers || {}) };

    const isFormData = options.body instanceof FormData;

    // Auto JSON stringify kalau body object biasa (bukan FormData/Blob)
    let body = options.body;
    if (body && !isFormData && typeof body === "object" && !(body instanceof Blob)) {
      body = JSON.stringify(body);
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    } else if (!isFormData && body && typeof body === "string") {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }

    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, { ...options, body, headers });

    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => "");

    // Auto logout + redirect kalau 401
    if (res.status === 401) {
      window.clearAuthStorage();

      // default redirect login (kalau endpoint umum)
      const ru = window.location.pathname + window.location.search;
      window.location.href = `auth/login.html?returnUrl=${encodeURIComponent(ru)}`;
      return;
    }

    if (!res.ok) {
      const msg =
        (data && typeof data === "object" && data.message) ? data.message :
        (typeof data === "string" && data) ? data :
        `Request gagal (${res.status})`;
      throw new Error(msg);
    }

    return data;
  };

  // =========================
  // AUTH-REQUIRED REQUEST
  // =========================
  // apiAuth ini hanya wrapper dari apiRequest + requireLogin
  window.apiAuth = async (path, options = {}) => {
    const ru = window.location.pathname + window.location.search;
    if (!window.requireLogin(ru)) throw new Error("NO_LOGIN");

    // Biarkan caller override headers (mis. FormData). Kalau body object biasa, apiRequest akan handle.
    return window.apiRequest(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        // Jangan paksa Content-Type di sini, biar konsisten dengan apiRequest (FormData aman)
      },
    });
  };
})();