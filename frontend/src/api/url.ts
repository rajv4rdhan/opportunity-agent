/** Public origin of the FastAPI backend, without a trailing slash. */
export function apiBase(): string {
  return (import.meta.env.VITE_API_BASE ?? '').trim().replace(/\/+$/, '')
}

/** Absolute URL for an /api path, or the relative path when no base is set. */
export function apiUrl(path: string): string {
  return `${apiBase()}${path}`
}
