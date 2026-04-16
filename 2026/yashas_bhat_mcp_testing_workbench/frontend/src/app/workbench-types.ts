export type TabKey = "resources" | "tools" | "apps" | "scenarios" | "runs" | "traces"

export interface AppEntry {
  key: string
  title: string
  kind: string
  toolName?: string
  inputSchema?: Record<string, unknown>
  uri?: string
  mimeType?: string
  description?: string
}

export interface SchemaField {
  name: string
  label: string
  type: string
  required: boolean
  description?: string
}
