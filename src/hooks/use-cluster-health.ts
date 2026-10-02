"use client"

import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"

export type ClusterHealthStatus = 'connected' | 'degraded' | 'disconnected'

export function useClusterHealth() {
  const [status, setStatus] = useState<ClusterHealthStatus>('connected')
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkHealth = useCallback(async () => {
    try {
      // We use /api/cluster as our health check endpoint
      const response = await fetch('/api/cluster')

      if (response.ok) {
        setStatus('connected')
        setError(null)
      } else if (response.status === 502) {
        setStatus('degraded')
        setError('API server responding with errors')
      } else {
        setStatus('disconnected')
        setError('Cluster unreachable')
      }
    } catch (err) {
      setStatus('disconnected')
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLastCheck(new Date())
    }
  }, [])

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [checkHealth])

  return {
    status,
    lastCheck,
    error,
    refresh: checkHealth
  }
}
