/// \u003creference types="vite/client" /\u003e

interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY: string
    readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
