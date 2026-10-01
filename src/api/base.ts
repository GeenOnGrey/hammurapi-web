// Адрес API. На одном origin (docker compose: nginx проксирует /api) он пустой —
// пути относительные. Когда SPA и API на разных доменах (web.<домен> и
// api.<домен>), адрес приходит из /config.json, который контейнер web пишет при
// старте из API_BASE_URL: один образ подходит для любых доменов.

let apiBase = "";

export function setApiBase(url: string | undefined | null) {
  apiBase = (url ?? "").replace(/\/+$/, "");
}

export function getApiBase(): string {
  return apiBase;
}

/** Полный адрес пути API: `/api/v1/...` → `https://api.<домен>/api/v1/...`. */
export function apiUrl(path: string): string {
  return apiBase + path;
}

/** Загружает /config.json; его отсутствие (dev-сервер, compose) — не ошибка. */
export async function loadRuntimeConfig(fetchImpl: typeof fetch = fetch): Promise<void> {
  try {
    const res = await fetchImpl("/config.json", { cache: "no-store" });
    if (!res.ok) return;
    const cfg = (await res.json()) as { apiBaseUrl?: string };
    setApiBase(cfg.apiBaseUrl);
  } catch {
    // Нет файла или он не JSON — работаем с API на том же origin.
  }
}
