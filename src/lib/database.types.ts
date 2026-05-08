// Auto-generated shape. Regenerate with: npm run types
// (requires `supabase` CLI and a linked project)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          approved: boolean
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          approved?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          approved?: boolean
          created_at?: string
        }
      }
      workspaces: {
        Row: {
          id: string
          owner_id: string | null
          type: 'personal' | 'campaign'
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          owner_id?: string | null
          type: 'personal' | 'campaign'
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string | null
          type?: 'personal' | 'campaign'
          name?: string
          created_at?: string
        }
      }
      workspace_members: {
        Row: {
          workspace_id: string
          user_id: string
          role: 'owner' | 'dm' | 'player'
          joined_at: string
        }
        Insert: {
          workspace_id: string
          user_id: string
          role: 'owner' | 'dm' | 'player'
          joined_at?: string
        }
        Update: {
          workspace_id?: string
          user_id?: string
          role?: 'owner' | 'dm' | 'player'
          joined_at?: string
        }
      }
      folders: {
        Row: {
          id: string
          workspace_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name?: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          created_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          workspace_id: string
          user_id: string | null
          title: string
          body: string
          dm_only: boolean
          yjs_state: string | null
          folder_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id?: string | null
          title?: string
          body?: string
          dm_only?: boolean
          yjs_state?: string | null
          folder_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string | null
          title?: string
          body?: string
          dm_only?: boolean
          yjs_state?: string | null
          folder_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      note_links: {
        Row: {
          id: string
          source_id: string
          target_id: string
        }
        Insert: {
          id?: string
          source_id: string
          target_id: string
        }
        Update: {
          id?: string
          source_id?: string
          target_id?: string
        }
      }
      tags: {
        Row: {
          id: string
          note_id: string
          name: string
        }
        Insert: {
          id?: string
          note_id: string
          name: string
        }
        Update: {
          id?: string
          note_id?: string
          name?: string
        }
      }
      invites: {
        Row: {
          id: string
          workspace_id: string
          token: string
          created_by: string
          expires_at: string
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          token?: string
          created_by: string
          expires_at: string
          used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          token?: string
          created_by?: string
          expires_at?: string
          used_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_approved: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_workspace_member: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      workspace_role: {
        Args: { p_workspace_id: string }
        Returns: string | null
      }
      redeem_invite: {
        Args: { p_token: string }
        Returns: string
      }
      create_campaign_workspace: {
        Args: { p_name: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience re-exports
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Profile = Tables<'profiles'>
export type Workspace = Tables<'workspaces'>
export type WorkspaceMember = Tables<'workspace_members'>
export type Note = Tables<'notes'>
export type NoteLink = Tables<'note_links'>
export type Tag = Tables<'tags'>
export type Invite = Tables<'invites'>

export type WorkspaceRole = WorkspaceMember['role']
export type WorkspaceType = Workspace['type']
