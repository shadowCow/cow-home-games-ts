/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_IN_MEMORY_SERVICES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
