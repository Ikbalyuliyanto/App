
// =========================
// CONFIG
// =========================
(() => {

// ─── API Base URL ──────────────────────────────────────────────────────────────
const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:9876"
  : "https://ashanum.com";

window.API_BASE = API_BASE;

// ─── Fetch semua config dari backend ──────────────────────────────────────────
(async function initConfig() {
  try {
    const res    = await fetch(`${API_BASE}/api/config`);
    const config = await res.json();

    // Google OAuth
    window.GOOGLE_CLIENT_ID = config.googleClientId;

    // Midtrans Snap SDK
    const script = document.createElement("script");
    script.src   = config.midtransSnapUrl;
    script.setAttribute("data-client-key", config.midtransClientKey);
    script.async  = true;
    // SESUDAH
    script.onload = () => {
      console.log("✅ Midtrans Snap SDK loaded, window.snap:", !!window.snap);
      window.dispatchEvent(new Event("snapReady")); // ← wajib ada
    };
    script.onerror = () => {
      console.error("❌ Gagal memuat SDK — URL:", script.src, "| Key:", config.midtransClientKey);
    };
    // Debug — pastikan ini muncul di console
    console.log("🔗 Snap URL:", config.midtransSnapUrl);
    console.log("🔑 Client Key:", config.midtransClientKey);
    document.head.appendChild(script);

  } catch (err) {
    console.error("❌ Gagal fetch config dari server:", err);
  }
})();

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

// public/js/analytics.js
// =========================
// GOOGLE ANALYTICS
// =========================
const measurementId = "G-8JBQCX0E7D";

if (measurementId) {
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', measurementId);
}

// =========================
// META PIXEL CONFIG
// =========================
(() => {
  let PIXEL_ID;

  if (window.location.hostname === "localhost") {
    // DEV / testing
    PIXEL_ID = "PIXEL_ID_DEV"; 
  } else {
    // PROD
    PIXEL_ID = "1717028676374534"; // ganti dengan Pixel ID sebenarnya
  }

  window.PIXEL_ID = PIXEL_ID;
})();

// (function() {
//   var PIXEL_ID = window.PIXEL_ID || "REPLACE_WITH_PIXEL_ID";

//   !function(f,b,e,v,n,t,s)
//   {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
//   n.callMethod.apply(n,arguments):n.queue.push(arguments)};
//   if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
//   n.queue=[];t=b.createElement(e);t.async=!0;
//   t.src=v;s=b.getElementsByTagName(e)[0];
//   s.parentNode.insertBefore(t,s)}(window, document,'script',
//   'https://connect.facebook.net/en_US/fbevents.js');

//   fbq('init', PIXEL_ID); 
//   fbq('track', 'PageView'); 
// })();