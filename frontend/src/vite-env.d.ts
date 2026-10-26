/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public origin of the FastAPI backend, e.g. https://api.example.com. */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
