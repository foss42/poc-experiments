/** Minimal Vite env typing so the app project typechecks without relying on `types: ["vite/client"]`. */
interface ImportMetaEnv {
  readonly [key: string]: string | boolean | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "*.css" {}
