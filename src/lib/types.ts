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
  body?: string
  dm_only: boolean
  folder_id: string | null
  updated_at: string
  tags: string[]
  kanban_column_id: string | null
  kanban_position: number | null
  timeline_position: number | null
}

export interface FolderItem {
  id: string
  name: string
  parent_id: string | null
}

export interface KanbanColumnItem {
  id: string
  name: string
  position: number
  color: string | null
}

export interface UserProfile {
  id: string
  full_name: string | null
  email: string
}
