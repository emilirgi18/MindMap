// Derived / composed types used across components

import type { WorkspaceRole, WorkspaceType } from './database.types'

export type { WorkspaceRole }

export interface WorkspaceWithRole {
  id: string
  name: string
  type: WorkspaceType
  owner_id: string | null
  role: WorkspaceRole
}

export interface NoteListItem {
  id: string
  title: string
  dm_only: boolean
  folder_id: string | null
  updated_at: string
  tags: string[]
}

export interface FolderItem {
  id: string
  name: string
  parent_id: string | null
}

export interface UserProfile {
  id: string
  full_name: string | null
  email: string
}
