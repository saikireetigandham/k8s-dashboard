"use client"

import { useState, useEffect, useCallback } from "react"
import { apiClient, Pod } from "@/lib/api-client"
import { metricsClient } from "@/lib/metrics-client"
import { useCluster } from "@/contexts/cluster-context"

interface PodMetric {
  timestamp: string
  value: number
  type: 'cpu' | 'memory'
  podName: string
}

export function useRealTimePods(namespace?: string) {
  const { clusterState } = useCluster()
  const [pods, setPods] = useState<Pod[]>([])
  const [podMetrics, setPodMetrics] = useState<PodMetric[]>([])
  const [podEvents, setPodEvents] = useState<any[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchInitialData = useCallback(async () => {
    try {
      const data = await apiClient.getPods(namespace)
      setPods(data)
      setLastUpdate(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch initial pods")
    }
  }, [namespace])

  useEffect(() => {
    fetchInitialData()

    const handlePodUpdate = (payload: any) => {
      setPods(payload.pods || [])
      setLastUpdate(new Date())
    }

    const handleMetricsUpdate = (payload: any) => {
      // Implement a history buffer: keep last 50 points per pod per metric type
      setPodMetrics(prev => {
        const newMetrics = payload.metrics || []
        const combined = [...prev, ...newMetrics]

        // Group by pod and type to prune old data
        const groups: Record<string, any[]> = {}
        combined.forEach(m => {
          const key = `${m.podName}-${m.type}`
          if (!groups[key]) groups[key] = []
          groups[key].push(m)
        })

        const pruned = Object.values(groups).flatMap(group =>
          group.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
               .slice(0, 50)
        )

        return pruned
      })
    }

    const handleEventsUpdate = (payload: any) => {
      setPodEvents(payload.events || [])
    }

    const unsubPods = metricsClient.subscribe("pods", handlePodUpdate)
    const unsubMetrics = metricsClient.subscribe("pod-metrics", handleMetricsUpdate)
    const unsubEvents = metricsClient.subscribe("pod-events", handleEventsUpdate)

    setIsConnected(true)

    return () => {
      unsubPods()
      unsubMetrics()
      unsubEvents()
    }
  }, [fetchInitialData, clusterState])

  return {
    pods,
    podMetrics,
    podEvents,
    isConnected,
    lastUpdate,
    error,
    refresh: fetchInitialData,
  }
}
