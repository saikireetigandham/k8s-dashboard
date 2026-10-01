import { NextRequest, NextResponse } from 'next/server'
import { CoreV1Api, Metrics, type NodeMetric } from '@kubernetes/client-node'
import { getKubeConfig } from '@/lib/k8s-client'

interface ResourceMetric {
  name: string
  current: number | null
  total: number
  unit: string
  percentage: number | null
}

interface NodeResource {
  name: string
  status: 'Ready' | 'NotReady' | 'Unknown'
  cpu: ResourceMetric
  memory: ResourceMetric
  storage: ResourceMetric
  pods: number
  maxPods: number
}

export async function GET(request: NextRequest) {
  const { kc, isAvailable } = getKubeConfig(request)

  if (!isAvailable) {
    return NextResponse.json({ error: 'Kubernetes configuration is unavailable' }, { status: 503 })
  }

  try {
    const k8sApi = kc.makeApiClient(CoreV1Api)
    const metricsClient = new Metrics(kc)
    const nodesResponse = await k8sApi.listNode()
    const nodes = nodesResponse.items
    const podsResponse = await k8sApi.listPodForAllNamespaces()
    const pods = podsResponse.items

    let realNodeMetrics: NodeMetric[] = []
    try {
      const nodeMetricsResponse = await metricsClient.getNodeMetrics()
      realNodeMetrics = nodeMetricsResponse.items || []
    } catch (error) {
      console.warn('Kubernetes Metrics API is unavailable:', error)
    }

    const nodeResources: NodeResource[] = []

    for (const node of nodes) {
      const nodeName = node.metadata?.name || 'unknown'
      const nodeStatus = getNodeStatus(node)
      const podsOnNode = pods.filter(pod => pod.spec?.nodeName === nodeName).length
      const capacity = node.status?.capacity || {}
      const allocatable = node.status?.allocatable || {}
      const cpuCapacity = parseCpuResource(allocatable.cpu || capacity.cpu || '0')
      const memoryCapacity = parseMemoryResource(allocatable.memory || capacity.memory || '0Ki')
      const storageCapacity = parseMemoryResource(allocatable['ephemeral-storage'] || capacity['ephemeral-storage'] || '0Ki')
      const maxPods = parseInt(capacity.pods || '110', 10)
      const nodeMetric = realNodeMetrics.find(m => m.metadata?.name === nodeName)

      let cpuCurrent: number | null = null
      let memoryCurrent: number | null = null
      let storageCurrent: number | null = null
      if (nodeMetric?.usage) {
        cpuCurrent = Number(parseCpuResource(nodeMetric.usage.cpu).toFixed(2))
        memoryCurrent = Number(parseMemoryResource(nodeMetric.usage.memory).toFixed(2))
      }

      nodeResources.push({
        name: nodeName,
        status: nodeStatus,
        cpu: {
          name: 'CPU',
          current: cpuCurrent,
          total: cpuCapacity,
          unit: 'cores',
          percentage: getPercentage(cpuCurrent, cpuCapacity)
        },
        memory: {
          name: 'Memory',
          current: memoryCurrent,
          total: memoryCapacity,
          unit: 'GB',
          percentage: getPercentage(memoryCurrent, memoryCapacity)
        },
        storage: {
          name: 'Storage',
          current: storageCurrent,
          total: storageCapacity,
          unit: 'GB',
          percentage: getPercentage(storageCurrent, storageCapacity)
        },
        pods: podsOnNode,
        maxPods
      })
    }
    
    return NextResponse.json(nodeResources)
    
  } catch (error) {
    console.error('Error fetching real resources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    )
  }
}

function getPercentage(current: number | null, total: number): number | null {
  return current !== null && total > 0 ? Math.round((current / total) * 100) : null
}

function getNodeStatus(node: any): 'Ready' | 'NotReady' | 'Unknown' {
  const conditions = node.status?.conditions || []
  const readyCondition = conditions.find((condition: any) => condition.type === 'Ready')
  
  if (!readyCondition) return 'Unknown'
  return readyCondition.status === 'True' ? 'Ready' : 'NotReady'
}

function parseCpuResource(cpu: string): number {
  // Parse CPU resources like "2000m" or "2"
  if (cpu.endsWith('m')) {
    return parseInt(cpu.slice(0, -1), 10) / 1000
  }
  return parseFloat(cpu) || 0
}

function parseMemoryResource(memory: string): number {
  // Parse memory resources like "16Gi" or "16384Mi" and convert to GB
  if (memory.endsWith('Ki')) {
    return parseInt(memory.slice(0, -2), 10) / (1024 * 1024)
  }
  if (memory.endsWith('Mi')) {
    return parseInt(memory.slice(0, -2), 10) / 1024
  }
  if (memory.endsWith('Gi')) {
    return parseInt(memory.slice(0, -2), 10)
  }
  if (memory.endsWith('k')) {
    return parseInt(memory.slice(0, -1), 10) / (1024 * 1024)
  }
  if (memory.endsWith('M')) {
    return parseInt(memory.slice(0, -1), 10) / 1024
  }
  if (memory.endsWith('G')) {
    return parseInt(memory.slice(0, -1), 10)
  }
  return 0
}
