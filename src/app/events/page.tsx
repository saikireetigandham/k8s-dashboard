"use client"

import { useEffect, useState, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { useClusterEvents } from "@/hooks/use-cluster-events"
import {
  AlertCircle,
  CheckCircle2,
  Info,
  RefreshCw,
  Search,
  Filter,
  Loader2,
  Bell
} from "lucide-react"

export default function EventsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const { events, isConnected, error, refresh } = useClusterEvents()

  const filteredEvents = events.filter(event => {
    const matchesSearch =
      event.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.objectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.namespace.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" ||
                         (statusFilter === "warning" && event.type === "Warning") ||
                         (statusFilter === "normal" && event.type === "Normal")

    return matchesSearch && matchesStatus
  })

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'Warning': return <AlertCircle className="size-3.5 text-rose-500" />
      case 'Normal': return <CheckCircle2 className="size-3.5 text-emerald-500" />
      default: return <Info className="size-3.5 text-sky-500" />
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 border border-sky-500/20">
              <Bell className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Cluster Events</h1>
              <p className="text-muted-foreground text-xs">Real-time activity stream, warnings, and lifecycle events from the API server</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={error !== null}
            >
              <RefreshCw className="size-3.5 mr-2" />
              Refresh Feed
            </Button>
            <Badge variant="outline" className="text-[11px] font-medium gap-1.5 px-2 py-0.5 h-7 border-sky-500/30 bg-sky-500/5 text-foreground rounded-lg">
              <span className={cn(
                "size-2 rounded-full animate-pulse",
                isConnected ? "bg-emerald-500" : "bg-rose-500"
              )} />
              <span className={cn(
                "font-semibold",
                isConnected ? "text-emerald-600" : "text-rose-600"
              )}>
                {isConnected ? 'Streaming' : 'Offline'}
              </span>
            </Badge>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search events by message, reason or object..."
                  className="pl-9 h-8.5"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg border border-border/50 bg-muted/20">
                  <Filter className="size-3.5 text-muted-foreground" />
                  <select
                    className="h-7 px-1 border-none bg-transparent text-foreground text-xs outline-none focus:ring-0 cursor-pointer"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Events</option>
                    <option value="warning">Warnings Only</option>
                    <option value="normal">Normal Only</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Timestamp</TableHead>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead>Object</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-24">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {error ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground">
                        <AlertCircle className="size-8 text-destructive opacity-50" />
                        <p>{error}</p>
                        <Button variant="outline" size="sm" onClick={refresh}>Retry</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground">
                        <Bell className="size-8 opacity-20" />
                        <p>No cluster events found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((event, idx) => (
                    <TableRow key={`${event.timestamp}-${idx}`} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-[10px] text-muted-foreground">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {getEventTypeIcon(event.type)}
                          <span className="text-xs font-medium">{event.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold font-mono">{event.objectName}</span>
                          <span className="text-[10px] text-muted-foreground">{event.objectKind} / {event.namespace}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-mono h-5">
                          {event.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-md truncate" title={event.message}>
                        {event.message}
                      </TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground">
                        {event.source}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
