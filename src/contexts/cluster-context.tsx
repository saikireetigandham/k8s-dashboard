"use client"

import { createContext, useContext, useState, useCallback } from "react"

interface ClusterState {
  context: string
  version: string
  user: string
}

interface ClusterContextType {
  clusterState: ClusterState | null
  setClusterState: (state: ClusterState | null) => void
  refreshCluster: () => void
}

const ClusterContext = createContext<ClusterContextType | undefined>(undefined)

export function ClusterProvider({ children }: { children: React.ReactNode }) {
  const [clusterState, setClusterState] = useState<ClusterState | null>(null)

  const refreshCluster = useCallback(() => {
    // This function can be called by context switcher to trigger
    // re-fetches in all subscribing hooks.
    setClusterState(prev => prev ? { ...prev, version: prev.version } : null)
  }, [])

  return (
    <ClusterContext.Provider value={{ clusterState, setClusterState, refreshCluster }}>
      {children}
    </ClusterContext.Provider>
  )
}

export function useCluster() {
  const context = useContext(ClusterContext)
  if (!context) {
    throw new Error("useCluster must be used within a ClusterProvider")
  }
  return context
}
