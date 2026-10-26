export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'ss-theme'

export function readStoredTheme(): ThemeMode {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    // Ignore storage errors (private mode, blocked cookies, ...).
  }
  return 'system'
}

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(mode: ThemeMode): void {
  const resolved = resolveTheme(mode)
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document.documentElement.dataset.theme = resolved
}

export function storeTheme(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // Ignore storage errors.
  }
}

export function cycleTheme(mode: ThemeMode): ThemeMode {
  if (mode === 'light') return 'dark'
  if (mode === 'dark') return 'system'
  return 'light'
}

export function themeLabel(mode: ThemeMode): string {
  if (mode === 'light') return 'Light'
  if (mode === 'dark') return 'Dark'
  return 'System'
}
