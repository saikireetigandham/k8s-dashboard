"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  RefreshCw, 
  Server
} from "lucide-react"

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

async function fetchNodeResources(): Promise<NodeResource[]> {
  const headers = new Headers()
  const context = window.localStorage.getItem('k8s-context')
  if (context) headers.set('x-k8s-context', context)

  const response = await fetch('/api/resources', { headers, cache: 'no-store' })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch cluster resource data')
  }
  return result
}

function averagePercentage(values: (number | null)[]): number | null {
  const reportedValues = values.filter((value): value is number => value !== null)
  if (reportedValues.length === 0) return null
  return Math.round(reportedValues.reduce((total, value) => total + value, 0) / reportedValues.length)
}

function formatPercentage(value: number | null): string {
  return value === null ? 'Not reported' : `${value}%`
}

export function ResourceCharts() {
  const [nodeResources, setNodeResources] = useState<NodeResource[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string>('all')
  const [refreshCycle, setRefreshCycle] = useState(0)

  useEffect(() => {
    let isCurrentRequest = true
    setIsRefreshing(true)
    fetchNodeResources()
      .then(data => {
        if (isCurrentRequest) {
          setNodeResources(data)
          setError(null)
        }
      })
      .catch(fetchError => {
        if (isCurrentRequest) {
          setNodeResources([])
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch cluster resource data')
        }
      })
      .finally(() => {
        if (isCurrentRequest) setIsRefreshing(false)
      })

    return () => {
      isCurrentRequest = false
    }
  }, [refreshCycle])

  const refreshData = () => setRefreshCycle(cycle => cycle + 1)

  const filteredNodes = selectedNode === 'all' 
    ? nodeResources 
    : nodeResources.filter(node => node.name === selectedNode)

  const avgCpu = averagePercentage(nodeResources.map(node => node.cpu.percentage))
  const avgMemory = averagePercentage(nodeResources.map(node => node.memory.percentage))
  const avgStorage = averagePercentage(nodeResources.map(node => node.storage.percentage))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="size-4 text-sky-500" />
            Cluster Resource Allocation
          </CardTitle>
          <CardDescription>Node capacity and usage reported by the Kubernetes API</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={selectedNode} 
            onChange={(e) => setSelectedNode(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-input bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-none"
          >
            <option value="all">All Nodes</option>
            {nodeResources.map(node => (
              <option key={node.name} value={node.name}>{node.name}</option>
            ))}
          </select>
          <Button
            variant="outline"
            size="icon"
            onClick={refreshData}
            disabled={isRefreshing}
            className="size-8 rounded-lg"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Aggregated cluster averages */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-border/70 bg-muted/30">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Cpu className="size-3.5 text-primary" /> CPU Usage
              </span>
              <span className="font-bold text-foreground font-mono">{formatPercentage(avgCpu)}</span>
            </div>
            <Progress value={avgCpu ?? 0} className="h-2" indicatorClassName={avgCpu !== null && avgCpu > 80 ? "bg-rose-500" : "bg-primary"} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <MemoryStick className="size-3.5 text-sky-500" /> Memory Usage
              </span>
              <span className="font-bold text-foreground font-mono">{formatPercentage(avgMemory)}</span>
            </div>
            <Progress value={avgMemory ?? 0} className="h-2" indicatorClassName={avgMemory !== null && avgMemory > 80 ? "bg-amber-500" : "bg-sky-500"} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <HardDrive className="size-3.5 text-violet-500" /> Storage Usage
              </span>
              <span className="font-bold text-foreground font-mono">{formatPercentage(avgStorage)}</span>
            </div>
            <Progress value={avgStorage ?? 0} className="h-2" indicatorClassName="bg-violet-500" />
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!error && !isRefreshing && nodeResources.length === 0 && (
          <p className="text-sm text-muted-foreground">No nodes were returned by the Kubernetes API.</p>
        )}

        {/* Node detail items */}
        <div className="space-y-2.5">
          {filteredNodes.map((node) => (
            <div 
              key={node.name}
              className="p-3.5 rounded-xl border border-border/70 bg-card/60 hover:bg-muted/30 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-foreground font-mono">{node.name}</span>
                  <Badge 
                    variant={node.status === 'Ready' ? 'success' : 'destructive'} 
                    className="text-[10px] h-4.5 px-2"
                  >
                    {node.status}
                  </Badge>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {node.pods}/{node.maxPods} Pods
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      CPU
                    </span>
                    <span className="font-mono text-foreground font-semibold">{formatPercentage(node.cpu.percentage)}</span>
                  </div>
                  <Progress value={node.cpu.percentage ?? 0} className="h-1.5" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Memory
                    </span>
                    <span className="font-mono text-foreground font-semibold">{formatPercentage(node.memory.percentage)}</span>
                  </div>
                  <Progress value={node.memory.percentage ?? 0} className="h-1.5" indicatorClassName="bg-sky-500" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Disk
                    </span>
                    <span className="font-mono text-foreground font-semibold">{formatPercentage(node.storage.percentage)}</span>
                  </div>
                  <Progress value={node.storage.percentage ?? 0} className="h-1.5" indicatorClassName="bg-violet-500" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
