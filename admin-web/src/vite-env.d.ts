/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Базовый URL API в prod (по умолчанию тот же origin); в dev используется proxy Vite */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
