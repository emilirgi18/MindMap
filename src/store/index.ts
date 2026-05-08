import { create } from 'zustand'

interface AppState {
  currentWorkspaceId: string | null
  currentNoteId: string | null
  sidebarOpen: boolean
  rightPanelOpen: boolean

  setCurrentWorkspace: (id: string | null) => void
  setCurrentNote: (id: string | null) => void
  toggleSidebar: () => void
  toggleRightPanel: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentWorkspaceId: null,
  currentNoteId: null,
  sidebarOpen: true,
  rightPanelOpen: false,

  setCurrentWorkspace: (id) => set({ currentWorkspaceId: id }),
  setCurrentNote: (id) => set({ currentNoteId: id }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
}))
