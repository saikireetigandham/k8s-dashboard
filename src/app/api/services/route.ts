import { NextResponse } from 'next/server'
import * as k8s from '@kubernetes/client-node'
import { getKubeConfig } from '@/lib/k8s-client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const namespace = searchParams.get('namespace') || undefined

  const { kc, isAvailable } = getKubeConfig(request)

  if (!isAvailable) {
    return NextResponse.json({ error: 'Kubernetes configuration is unavailable' }, { status: 503 })
  }

  try {
    const coreApi = kc.makeApiClient(k8s.CoreV1Api)

    const res = namespace && namespace !== 'all'
      ? await coreApi.listNamespacedService({ namespace })
      : await coreApi.listServiceForAllNamespaces()

    const services = res.items.map((svc: k8s.V1Service) => ({
      name: svc.metadata?.name || '',
      namespace: svc.metadata?.namespace || '',
      type: svc.spec?.type || 'ClusterIP',
      clusterIP: svc.spec?.clusterIP || 'None',
      externalIPs: svc.status?.loadBalancer?.ingress?.map(i => i.ip || i.hostname || '').filter(Boolean) || [],
      ports: svc.spec?.ports?.map(p => `${p.port}${p.nodePort ? `:${p.nodePort}` : ''}/${p.protocol || 'TCP'}`).join(', ') || '',
      age: svc.metadata?.creationTimestamp ? new Date(svc.metadata.creationTimestamp).toISOString() : 'Active'
    }))

    return NextResponse.json(services)
  } catch (error) {
    console.error('Error fetching services from Kubernetes:', error)
    return NextResponse.json({ error: 'Failed to read services from Kubernetes API' }, { status: 502 })
  }
}
