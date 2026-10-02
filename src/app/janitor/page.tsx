"use client"

import React, { useEffect, useState, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { apiClient, Pod } from "@/lib/api-client"
import { useToast } from "@/contexts/toast-context"
import {
  Trash2,
  RefreshCw,
  AlertTriangle,
  Search,
  Loader2,
  CheckCircle2,
  XCircle
} from "lucide-react"

export default function JanitorPage() {
  const [pods, setPods] = useState<Pod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPods, setSelectedPods] = useState<Set<string>>(new Set())
  const [isPurging, setIsPurging] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const { success, error: showError, info } = useToast()

  const fetchPods = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiClient.getPods("all")
      setPods(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pods')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPods()
  }, [fetchPods])

  const toggleSelection = (podKey: string) => {
    setSelectedPods(prev => {
      const next = new Set(prev)
      if (next.has(podKey)) next.delete(podKey)
      else next.add(podKey)
      return next
    })
  }

  const selectAll = () => {
    if (selectedPods.size === filteredPods.length) {
      setSelectedPods(new Set())
    } else {
      setSelectedPods(new Set(filteredPods.map(pod => `${pod.namespace}:${pod.name}`)))
    }
  }

  const purgePods = async () => {
    if (selectedPods.size === 0) {
      info('No pods selected for purging')
      return
    }
    if (!confirm(`Are you sure you want to purge ${selectedPods.size} pods? This action cannot be undone.`)) return

    try {
      setIsPurging(true)
      const keys = Array.from(selectedPods)
      const results = await Promise.allSettled(
        keys.map(async (key) => {
          const [ns, name] = key.split(':')
          return apiClient.deleteResource('Pod', name, ns)
        })
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      if (successful > 0) success(`${successful} pods purged successfully`)
      if (failed > 0) showError(`${failed} pods failed to purge`)

      setSelectedPods(new Set())
      fetchPods()
    } catch (error) {
      showError('Purge operation failed')
    } finally {
      setIsPurging(false)
    }
  }

  const filteredPods = React.useMemo(() => {
    return pods.filter(pod => {
      const matchesSearch = pod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          pod.namespace.toLowerCase().includes(searchTerm.toLowerCase())

      const isGarbage =
        pod.status?.toLowerCase() === 'evicted' ||
        pod.status?.toLowerCase() === 'succeeded' ||
        pod.status?.toLowerCase() === 'failed' ||
        pod.status?.toLowerCase().includes('crashloop')

      const matchesStatus = statusFilter === "all" ||
                           (statusFilter === "garbage" && isGarbage) ||
                           (statusFilter === "healthy" && !isGarbage)

      return matchesSearch && matchesStatus
    })
  }, [pods, searchTerm, statusFilter])

  const displayedPods = React.useMemo(() => filteredPods.slice(0, 100), [filteredPods])

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Trash2 className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Cluster Janitor</h1>
              <p className="text-muted-foreground text-xs">Purge evicted, failed, and completed pods to maintain cluster hygiene</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchPods} disabled={loading}>
              <RefreshCw className={`size-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Rescan Cluster
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={purgePods}
              disabled={selectedPods.size === 0 || isPurging}
              className="shadow-sm"
            >
              {isPurging ? <Loader2 className="size-3.5 mr-2 animate-spin" /> : <Trash2 className="size-3.5 mr-2" />}
              Purge Selected ({selectedPods.size})
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search pods..."
                  className="pl-9 h-8.5"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  className="h-8.5 px-3 border border-input rounded-lg bg-background text-foreground text-xs outline-none focus:ring-1 focus:ring-primary shadow-xs"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Pods</option>
                  <option value="garbage">Only Garbage (Evicted/Failed)</option>
                  <option value="healthy">Only Healthy</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">
                    <Checkbox
                      checked={selectedPods.size === filteredPods.length && filteredPods.length > 0}
                      onCheckedChange={selectAll}
                    />
                  </TableHead>
                  <TableHead>Pod Name</TableHead>
                  <TableHead>Namespace</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Scanning cluster...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredPods.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground">
                        <CheckCircle2 className="size-8 text-emerald-500 opacity-20" />
                        <p>No pods found matching the criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedPods.map((pod) => {
                    const podKey = `${pod.namespace}:${pod.name}`
                    const isSelected = selectedPods.has(podKey)
                    const isGarbage =
                      pod.status?.toLowerCase() === 'evicted' ||
                      pod.status?.toLowerCase() === 'succeeded' ||
                      pod.status?.toLowerCase() === 'failed' ||
                      pod.status?.toLowerCase().includes('crashloop')

                    return (
                      <TableRow key={podKey} className={isSelected ? 'bg-muted/60' : ''}>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(podKey)}
                          />
                        </TableCell>
                        <TableCell className="font-semibold">
                          <span className="font-mono text-xs">{pod.name}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-mono">{pod.namespace}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isGarbage ? "destructive" : "outline"}
                            className={cn("text-xs font-mono", isGarbage && "bg-rose-500/10 text-rose-600 border-rose-500/30")}
                          >
                            {pod.status || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {pod.createdAt || '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
