const BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim();

export async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, options);

  if (!res.ok) {
    let errorMessage = `Request failed: ${res.status}`;
    try {
      const err = await res.json();
      errorMessage = err.error || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  // Handle empty responses safely
  const text = await res.text();
  if (!text) return null;

  return JSON.parse(text);
}
