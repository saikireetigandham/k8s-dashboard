"use client"

import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"
import { metricsClient } from "@/lib/metrics-client"

export interface ClusterEvent {
  type: string
  reason: string
  message: string
  timestamp: string
  namespace: string
  objectKind: string
  objectName: string
  source: string
}

export function useClusterEvents() {
  const [events, setEvents] = useState<ClusterEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInitialEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/events')
      if (!response.ok) throw new Error('Failed to fetch initial events')
      const data = await response.json()
      setEvents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  useEffect(() => {
    fetchInitialEvents()

    const handleEventUpdate = (payload: any) => {
      // payload typically contains a list of new events
      const newEvents = Array.isArray(payload) ? payload : [payload]

      setEvents(prev => {
        // Append new events to the top and remove duplicates by timestamp+message
        const combined = [...newEvents, ...prev]
        const seen = new Set()
        return combined.filter(e => {
          const key = `${e.timestamp}-${e.message}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        }).slice(0, 200) // Keep last 200 events
      })
    }

    const unsub = metricsClient.subscribe("events", handleEventUpdate)
    setIsConnected(true)

    return () => {
      unsub()
    }
  }, [fetchInitialEvents])

  return {
    events,
    isConnected,
    error,
    refresh: fetchInitialEvents
  }
}
