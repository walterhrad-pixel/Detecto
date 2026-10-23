export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

export const ACCEPTED_TYPES = ["image/jpeg", "image/png"];
export const MAX_UPLOAD_MB = 15;

async function request(path, options) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error(`Cannot reach the backend at ${API_URL}. Check that it is running.`);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body && typeof body.detail === "string" ? body.detail : `Request failed with status ${res.status}`;
    throw new Error(detail);
  }
  return body;
}

export function validateImageFile(file) {
  if (!file) return "No file selected.";
  if (!ACCEPTED_TYPES.includes(file.type)) return "This file type is not supported. Use a JPEG or PNG image.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return `This file is larger than ${MAX_UPLOAD_MB} MB.`;
  return "";
}

export function detect(file, { conf, enhance = false, overlay = false, save = true }) {
  const form = new FormData();
  form.append("file", file);
  form.append("conf", String(conf));
  form.append("enhance", String(enhance));
  form.append("overlay", String(overlay));
  form.append("save", String(save));
  return request("/detect", { method: "POST", body: form });
}

function query(filters) {
  const params = new URLSearchParams();
  if (filters.minConfidence > 0) params.set("min_confidence", filters.minConfidence);
  if (filters.start) params.set("start", filters.start);
  if (filters.end) params.set("end", filters.end);
  const text = params.toString();
  return text ? `?${text}` : "";
}

export const getHistory = (filters) => request(`/history${query(filters)}`);
export const getStats = (filters) => request(`/stats${query(filters)}`);
export const exportUrl = (filters) => `${API_URL}/history/export${query(filters)}`;
export const resetHistory = () => request("/reset", { method: "DELETE" });
export const checkHealth = () => request("/health");
