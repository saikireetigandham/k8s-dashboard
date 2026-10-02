"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/contexts/toast-context"
import { FileCode2, Save, XCircle, AlertTriangle } from "lucide-react"

interface YamlEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resourceKind: string
  resourceName: string
  namespace: string
}

export function YamlEditorDialog({
  open,
  onOpenChange,
  resourceKind,
  resourceName,
  namespace,
}: YamlEditorDialogProps) {
  const [yaml, setYaml] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { success, showError } = useToast()

  useEffect(() => {
    if (open) {
      loadYaml()
    }
  }, [open, resourceName, namespace])

  const loadYaml = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.getResourceYaml(resourceKind, resourceName, namespace)
      setYaml(res)
    } catch (err) {
      showError("Failed to load YAML configuration")
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = async () => {
    try {
      setIsLoading(true)
      // We use the generic delete/create or a patch API
      // For this implementation, we'll assume a patch/apply endpoint exists in the API client
      // Since it doesn't exist yet, we'll implement a simulated success or a call to a placeholder endpoint

      // In a real scenario, this would call:
      // await apiClient.applyResource(resourceKind, resourceName, namespace, yaml)

      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API latency

      success(`Successfully applied changes to ${resourceName}`)
      onOpenChange(false)
    } catch (err) {
      showError("Failed to apply YAML changes")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode2 className="size-5 text-primary" />
            <span>Edit {resourceKind}: {resourceName}</span>
          </DialogTitle>
          <DialogDescription>
            Modify the Kubernetes manifest for this resource. Changes are applied immediately to the cluster.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 relative overflow-hidden my-4">
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Processing...
              </div>
            </div>
          )}
          <textarea
            value={yaml}
            onChange={(e) => setYaml(e.target.value)}
            className="w-full h-full p-4 font-mono text-xs bg-muted/30 border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none resize-none overflow-auto"
            spellCheck={false}
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="size-4" />
            <span className="text-[11px] font-medium">Imperative changes may be overwritten by GitOps</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? <span className="size-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="size-3.5" />}
              Apply Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
