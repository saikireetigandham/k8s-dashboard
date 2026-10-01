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
    const k8sApi = kc.makeApiClient(k8s.CoreV1Api)

    const res = namespace && namespace !== 'all'
      ? await k8sApi.listNamespacedPod({ namespace })
      : await k8sApi.listPodForAllNamespaces()

    const pods = res.items.map((pod: k8s.V1Pod) => ({
      name: pod.metadata?.name || '',
      namespace: pod.metadata?.namespace || '',
      status: pod.status?.phase || 'Unknown',
      phase: pod.status?.phase || 'Unknown',
      node: pod.spec?.nodeName || '',
      ip: pod.status?.podIP || '',
      createdAt: pod.metadata?.creationTimestamp ? new Date(pod.metadata.creationTimestamp).toISOString() : 'Active',
      restarts: pod.status?.containerStatuses?.reduce((acc: number, container: k8s.V1ContainerStatus) => acc + (container.restartCount || 0), 0) || 0,
      ready: `${pod.status?.containerStatuses?.filter((c: k8s.V1ContainerStatus) => c.ready).length || 0}/${pod.status?.containerStatuses?.length || 0}`,
      containers: pod.spec?.containers?.map(c => ({
        name: c.name,
        image: c.image || '',
        ready: pod.status?.containerStatuses?.find(cs => cs.name === c.name)?.ready || false,
        restartCount: pod.status?.containerStatuses?.find(cs => cs.name === c.name)?.restartCount || 0
      })) || []
    }))

    return NextResponse.json(pods)
  } catch (error) {
    console.error('Error fetching pods from Kubernetes:', error)
    return NextResponse.json({ error: 'Failed to read pods from Kubernetes API' }, { status: 502 })
  }
}
