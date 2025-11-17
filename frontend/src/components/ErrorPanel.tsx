import { Button } from "./ui/button"
import { logger } from "../lib/utils"

interface ErrorPanelProps {
  error: string
  lastValidYaml: string
  onRevert: () => void
  isYamlError?: boolean
}

export function ErrorPanel({ error, lastValidYaml, onRevert, isYamlError = false }: ErrorPanelProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(lastValidYaml)
    logger.log("YAML copied to clipboard")
  }

  return (
    <div className="bg-red-50 p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {isYamlError ? "Invalid YAML syntax" : "Error saving configuration"}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error}</p>
          </div>
          {lastValidYaml && (
            <div className="mt-4">
              <p className="text-sm font-medium text-red-800 mb-2">
                Last valid configuration:
              </p>
              <div className="bg-white border border-red-200 rounded p-3 mb-3 shadow-sm">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono overflow-auto max-h-32">
                  {lastValidYaml}
                </pre>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={onRevert}
                  variant="outline"
                  size="sm"
                  className="text-red-700 border-red-300 hover:bg-red-100 bg-white"
                >
                  Revert to this version
                </Button>
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                  className="text-red-700 border-red-300 hover:bg-red-100 bg-white"
                >
                  Copy to clipboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

