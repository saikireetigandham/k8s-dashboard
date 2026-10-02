import { NextRequest, NextResponse } from 'next/server'
import * as k8s from '@kubernetes/client-node'
import { getKubeConfig } from '@/lib/k8s-client'

export async function GET(request: NextRequest) {
  const { kc, isAvailable, currentContext } = getKubeConfig(request)

  if (!isAvailable) {
    return NextResponse.json({ error: 'Kubernetes configuration is unavailable' }, { status: 503 })
  }

  try {
    const coreApi = kc.makeApiClient(k8s.CoreV1Api)
    const versionApi = kc.makeApiClient(k8s.VersionApi)

    const currentContextName = kc.getCurrentContext()
    const contexts = kc.getContexts()
    const currentCtx = contexts.find(c => c.name === currentContextName)
    const currentUser = currentCtx?.user || 'unknown-user'

    const [versionRes, nodesRes, podsRes, svcRes, nsRes] = await Promise.all([
      versionApi.getCode(),
      coreApi.listNode(),
      coreApi.listPodForAllNamespaces(),
      coreApi.listServiceForAllNamespaces(),
      coreApi.listNamespace()
    ])

    return NextResponse.json({
      name: currentContextName || kc.getCurrentCluster()?.name || 'Kubernetes cluster',
      version: `v${versionRes.major}.${versionRes.minor}`,
      user: currentUser,
      nodes: nodesRes.items.length,
      pods: podsRes.items.length,
      services: svcRes.items.length,
      namespaces: nsRes.items.length
    })
  } catch (error) {
    console.error('Error fetching cluster info from Kubernetes:', error)
    return NextResponse.json(
      { error: 'Failed to read cluster overview from Kubernetes API' },
      { status: 502 }
    )
  }
}
