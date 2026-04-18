import Dexie from 'dexie'
import type { Table } from 'dexie'
export interface SavedRequest {
  id?: number
  collectionName: string
  toolName: string
  parameters: Record<string, unknown>
  savedAt: Date
}

class CollectionDB extends Dexie {
  requests!: Table<SavedRequest>

  constructor() {
    super('mcp-dev')
    this.version(1).stores({
      requests: '++id, collectionName, toolName'
    })
  }
}

export const db = new CollectionDB()

export async function saveRequest(
  toolName: string,
  parameters: Record<string, unknown>
): Promise<void> {
  await db.requests.add({
    collectionName: 'Default',
    toolName,
    parameters,
    savedAt: new Date()
  })
}

export async function getRequests(): Promise<SavedRequest[]> {
  return await db.requests.toArray()
}

export async function deleteRequest(id: number): Promise<void> {
  await db.requests.delete(id)
}
