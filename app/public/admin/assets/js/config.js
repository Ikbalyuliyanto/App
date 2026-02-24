// config.js
let API_BASE;

const host = window.location.hostname;

if (host === "localhost" || host === "127.0.0.1") {
  API_BASE = "http://localhost:9876";
} else {
  API_BASE = "https://ashanum.com";
}

window.API_BASE = API_BASE;


window.apiRequest = async (endpoint, options = {}) => {
  const url = `${window.API_BASE}${endpoint}`;
  const token = localStorage.getItem("admintoken") || sessionStorage.getItem("admintoken");

  const headers = { ...(options.headers || {}) };

  // Jangan paksa Content-Type kalau FormData
  const isFormData = options.body instanceof FormData;

  // Auto JSON stringify kalau body object biasa
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
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (res.status === 401) {
    localStorage.removeItem("admintoken");
    localStorage.removeItem("user");
    sessionStorage.removeItem("admintoken");
    sessionStorage.removeItem("user");
    window.location.href = "login.html";
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
