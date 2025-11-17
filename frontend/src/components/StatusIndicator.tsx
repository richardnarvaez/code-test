import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"

interface StatusIndicatorProps {
  isSaving: boolean
  saveSuccess: boolean
  saveError: string | null
  yamlError: string | null
  validationError: string | null
}

export function StatusIndicator({ isSaving, saveSuccess, saveError, yamlError, validationError }: StatusIndicatorProps) {
  const baseClasses = "flex items-center gap-2 transition-all duration-300 ease-in-out"

  if (isSaving) {
    return (
      <div className={`${baseClasses} text-blue-600 animate-status-fade`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm font-medium">Saving...</span>
      </div>
    )
  }

  if (saveError) {
    return (
      <div className={`${baseClasses} text-red-600 animate-status-fade`} title={saveError || ""}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Save failed</span>
      </div>
    )
  }

  if (validationError) {
    return (
      <div className={`${baseClasses} text-amber-600 animate-status-fade`} title={validationError || ""}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Validation error</span>
      </div>
    )
  }

  if (yamlError) {
    return (
      <div className={`${baseClasses} text-amber-600 animate-status-fade`} title={yamlError || ""}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Invalid YAML</span>
      </div>
    )
  }

  if (saveSuccess) {
    return (
      <div className={`${baseClasses} text-green-600 animate-status-fade`}>
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-sm font-medium">Saved</span>
      </div>
    )
  }

  return null
}

