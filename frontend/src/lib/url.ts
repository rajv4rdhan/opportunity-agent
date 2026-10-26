/** Lowercase host, drop www, tracking params, fragment and trailing slash. */
export function normalizeUrl(value: string | null | undefined): string {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`)
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    url.hash = ''
    url.pathname = url.pathname.replace(/\/+$/, '')
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_')) url.searchParams.delete(key)
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    return raw
  }
}

/** Hostname without www, used for favicons and compact labels. */
export function domainOf(value: string | null | undefined): string {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  try {
    return new URL(raw.includes('://') ? raw : `https://${raw}`).hostname
      .toLowerCase()
      .replace(/^www\./, '')
  } catch {
    return raw.replace(/^https?:\/\//, '').split('/')[0] ?? raw
  }
}
