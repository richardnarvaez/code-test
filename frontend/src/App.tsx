import { useState } from "react"
import { useYAMLConfig } from "./hooks/useYAMLConfig"
import { YAMLEditor } from "./components/YAMLEditor"
import { ConfigForm } from "./components/ConfigForm"
import { ErrorPanel } from "./components/ErrorPanel"
import { StatusIndicator } from "./components/StatusIndicator"
import { Button } from "./components/ui/button"
import { AlertCircle } from "lucide-react"

function App() {
  const {
    yaml,
    config,
    error,
    yamlError,
    isLoading,
    isSaving,
    saveError,
    saveSuccess,
    lastValidYaml,
    revertToLastValid,
    updateYAML,
    updateConfig,
    validationErrors,
    validationError,
  } = useYAMLConfig()

  const [showErrorOverlay, setShowErrorOverlay] = useState(false)
  const hasError = !!yamlError || !!saveError || !!validationError

  const handleRevert = () => {
    revertToLastValid()
    setShowErrorOverlay(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading configuration...</div>
      </div>
    )
  }

  if (error && !yaml) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">Error loading configuration</div>
          <div className="text-sm text-gray-600">{error}</div>
          <div className="text-xs text-gray-500 mt-4">Make sure the backend is running on http://localhost:8000</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">YAML Configuration Editor</h1>
          </div>
          <div className="flex items-center">
            <StatusIndicator
              isSaving={isSaving}
              saveSuccess={saveSuccess}
              saveError={saveError}
              yamlError={yamlError}
              validationError={validationError}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-120px)]">
          <div className="flex flex-col relative">
            <div className="flex items-center justify-between mb-2">
              <div>
              <h2 className="text-lg font-semibold">YAML Editor</h2>
              <p className="text-sm text-gray-500">Edit the YAML configuration file</p>
              </div>
              {hasError && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowErrorOverlay(!showErrorOverlay)}
                  className={`flex items-center gap-2 ${
                    showErrorOverlay 
                      ? "border-red-500 bg-red-50 text-red-700 hover:bg-red-100" 
                      : "border-red-300 text-red-600 hover:bg-red-50"
                  }`}
                >
                  <AlertCircle className="h-4 w-4" />
                  <span>{showErrorOverlay ? "Hide Errors" : "Show Errors"}</span>
                </Button>
              )}
            </div>
            <div className="flex-1 bg-white rounded-md shadow-sm relative">
              <YAMLEditor value={yaml} onChange={updateYAML} hasError={hasError} />
              
              {hasError && showErrorOverlay && (
                <div className="absolute inset-0 bg-red-50 z-10 overflow-y-auto rounded-md border border-red-500 overflow-hidden">
                  <div className="p-4">
                    <ErrorPanel
                      error={saveError || validationError || yamlError || "Unknown error"}
                      lastValidYaml={lastValidYaml || ""}
                      onRevert={handleRevert}
                      isYamlError={!!yamlError && !saveError && !validationError}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="mb-2">
              <h2 className="text-lg font-semibold">Form Editor</h2>
              <p
                className={`text-sm transition-all duration-300 ${
                  config ? "text-gray-500" : "text-amber-600"
                }`}
              >
                {config
                  ? "Edit the configuration form"
                  : "YAML is invalid or empty. Using default values."}
              </p>
            </div>
            <div className="flex-1 bg-white rounded-md shadow-sm overflow-y-auto border border-gray-300">
              <ConfigForm config={config} onChange={updateConfig} validationErrors={validationErrors} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
