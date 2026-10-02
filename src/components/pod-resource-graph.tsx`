"use client"

import React from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Cpu, MemoryStick } from "lucide-react"

interface MetricPoint {
  timestamp: string
  value: number
}

interface PodResourceGraphProps {
  metrics: MetricPoint[]
  type: 'cpu' | 'memory'
  unit: string
  color: string
}

function SingleMetricChart({ metrics, type, unit, color }: PodResourceGraphProps) {
  // Format data for Recharts: { time: '12:01', value: 45 }
  const data = metrics.map(m => ({
    time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    value: m.value
  })).reverse()

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
          {type === 'cpu' ? <Cpu className="size-3" /> : <MemoryStick className="size-3" />}
          <span className="uppercase">{type} Usage</span>
        </div>
        <span className="font-mono font-bold text-foreground">
          {metrics.length > 0 ? `${metrics[0].value}${unit}` : 'N/A'}
        </span>
      </div>
      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${type}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time"
              hide
            />
            <YAxis
              hide
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{ fontSize: '10px', borderRadius: '8px', backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
              itemStyle={{ fontSize: '10px' }}
              labelStyle={{ fontSize: '10px', marginBottom: '2px' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fillOpacity={1}
              fill={`url(#gradient-${type})`}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function PodResourceGraph({ metrics }: { metrics: any[] }) {
  // Separate metrics by type
  const cpuMetrics = metrics
    .filter(m => m.type === 'cpu')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const memMetrics = metrics
    .filter(m => m.type === 'memory')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-border/70 bg-muted/20">
      <SingleMetricChart
        metrics={cpuMetrics}
        type="cpu"
        unit="%"
        color="hsl(var(--primary))"
      />
      <SingleMetricChart
        metrics={memMetrics}
        type="memory"
        unit="Mi"
        color="hsl(var(--sky-500))"
      />
    </div>
  )
}
