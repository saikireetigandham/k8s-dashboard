import { NextRequest, NextResponse } from 'next/server'
import * as k8s from '@kubernetes/client-node'
import { getKubeConfig } from '@/lib/k8s-client'

export async function GET(request: NextRequest) {
  const { kc, isAvailable } = getKubeConfig(request)

  if (!isAvailable) {
    return NextResponse.json({ error: 'Kubernetes configuration is unavailable' }, { status: 503 })
  }

  try {
    const coreApi = kc.makeApiClient(k8s.CoreV1Api)

    // Fetch events across all namespaces
    const res = await coreApi.listEventForAllNamespaces()

    // Map to a clean format for the UI
    const events = res.items.map((event: k8s.V1Event) => ({
      type: event.type || 'Normal',
      reason: event.reason || 'Unknown',
      message: event.message || 'No message provided',
      timestamp: event.lastTimestamp || event.eventFirst || new Date().toISOString(),
      namespace: event.involvedObject?.namespace || 'cluster',
      objectKind: event.involvedObject?.kind || 'Unknown',
      objectName: event.involvedObject?.name || 'Unknown',
      source: event.source?.component || 'kube-system'
    }))

    // Sort events by timestamp descending (newest first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json(events)
  } catch (error) {
    console.error('Error fetching cluster events from Kubernetes:', error)
    return NextResponse.json(
      { error: 'Failed to read cluster events from Kubernetes API' },
      { status: 502 }
    )
  }
}
