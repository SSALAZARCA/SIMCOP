/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SIMCOP_API_URL: string
  readonly VITE_SIGEP_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
