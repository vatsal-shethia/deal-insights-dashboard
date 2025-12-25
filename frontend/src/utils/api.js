const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("VITE_API_BASE_URL is not defined");
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  return text ? JSON.parse(text) : {};
}
