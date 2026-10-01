import { NextRequest, NextResponse } from 'next/server'
import * as k8s from '@kubernetes/client-node'
import { getKubeConfig } from '@/lib/k8s-client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const namespace = searchParams.get('namespace') || undefined
  const { kc, isAvailable } = getKubeConfig(request)

  if (!isAvailable) {
    return NextResponse.json({ error: 'Kubernetes configuration is unavailable' }, { status: 503 })
  }

  try {
    const coreApi = kc.makeApiClient(k8s.CoreV1Api)
    const response = namespace && namespace !== 'all'
      ? await coreApi.listNamespacedEvent({ namespace })
      : await coreApi.listEventForAllNamespaces()

    const events = response.items.map(event => {
      const kind = event.involvedObject?.kind || 'Resource'
      const reason = event.reason || 'Changed'
      const isWarning = event.type?.toLowerCase() === 'warning'
      const timestamp = event.eventTime || event.lastTimestamp || event.metadata?.creationTimestamp
      const resourceType = kind.toLowerCase()
      const type = resourceType === 'pod' || resourceType === 'service' || resourceType === 'node' || resourceType === 'deployment'
        ? resourceType
        : 'alert'
      const action = isWarning
        ? 'error'
        : reason.toLowerCase().includes('creat')
          ? 'created'
          : reason.toLowerCase().includes('scal')
            ? 'scaled'
            : 'updated'

      return {
        id: event.metadata?.uid || `${event.metadata?.namespace || 'cluster'}-${event.metadata?.name || reason}-${timestamp || ''}`,
        type,
        action,
        resource: `${kind}/${event.involvedObject?.name || 'unknown'}`,
        namespace: event.metadata?.namespace || 'cluster',
        timestamp: timestamp ? new Date(timestamp).toISOString() : '',
        message: event.message || reason,
        severity: isWarning ? 'high' : 'low'
      }
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error('Error fetching Kubernetes events:', error)
    return NextResponse.json({ error: 'Failed to read events from Kubernetes API' }, { status: 502 })
  }
}
