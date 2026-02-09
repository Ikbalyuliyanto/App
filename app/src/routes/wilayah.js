import express from "express";

const router = express.Router();
const BASE = "https://wilayah.web.id/api";

// cache sederhana in-memory
const cache = new Map();
const TTL_MS = 24 * 60 * 60 * 1000;

async function cachedFetch(url) {
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.exp > now) return hit.data;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Upstream error ${res.status}`);

  const data = await res.json();
  cache.set(url, { exp: now + TTL_MS, data });
  return data;
}

function normalize(raw) {
  // wilayah.web.id/api/... => {status,message,data:[...]}
  if (raw && Array.isArray(raw.data)) return raw.data;

  // kalau ternyata array langsung
  if (Array.isArray(raw)) return raw;

  // fallback lain kalau struktur beda
  return raw?.provinces || raw?.regencies || raw?.districts || raw?.villages || [];
}

// GET /api/wilayah/provinces
router.get("/provinces", async (req, res) => {
  try {
    const raw = await cachedFetch(`${BASE}/provinces`);
    res.json({ status: "success", data: normalize(raw) });
  } catch (e) {
    console.error(e);
    res.status(502).json({ status: "error", message: "Gagal ambil provinsi", data: [] });
  }
});

// GET /api/wilayah/regencies/:provinceCode
router.get("/regencies/:provinceCode", async (req, res) => {
  try {
    const raw = await cachedFetch(`${BASE}/regencies/${encodeURIComponent(req.params.provinceCode)}`);
    res.json({ status: "success", data: normalize(raw) });
  } catch (e) {
    console.error(e);
    res.status(502).json({ status: "error", message: "Gagal ambil kota/kab", data: [] });
  }
});

// GET /api/wilayah/districts/:regencyCode
router.get("/districts/:regencyCode", async (req, res) => {
  try {
    const raw = await cachedFetch(`${BASE}/districts/${encodeURIComponent(req.params.regencyCode)}`);
    res.json({ status: "success", data: normalize(raw) });
  } catch (e) {
    console.error(e);
    res.status(502).json({ status: "error", message: "Gagal ambil kecamatan", data: [] });
  }
});

// GET /api/wilayah/villages/:districtCode
router.get("/villages/:districtCode", async (req, res) => {
  try {
    const raw = await cachedFetch(`${BASE}/villages/${encodeURIComponent(req.params.districtCode)}`);
    res.json({ status: "success", data: normalize(raw) });
  } catch (e) {
    console.error(e);
    res.status(502).json({ status: "error", message: "Gagal ambil kelurahan", data: [] });
  }
});

export default router;
