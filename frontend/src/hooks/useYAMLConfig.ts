import { useState, useEffect, useCallback } from "react"
import { getConfig, saveConfig } from "../lib/api"
import { useDebounce } from "./useDebounce"

export interface ConfigData {
  server: {
    host: string
    port: number
    use_ssl: boolean
  }
  logging: {
    level: "debug" | "info" | "warn" | "error"
    file: string
  }
}

export function useYAMLConfig() {
  const [yaml, setYaml] = useState<string>("")
  const [config, setConfig] = useState<ConfigData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const debouncedYaml = useDebounce(yaml, 500)

  const parseYAML = useCallback((yamlString: string): ConfigData | null => {
    try {
      const parsed = yamlString
        .split("\n")
        .reduce((acc: any, line: string) => {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith("#")) return acc

          if (trimmed.includes(":")) {
            const [key, ...valueParts] = trimmed.split(":")
            const value = valueParts.join(":").trim().replace(/^["']|["']$/g, "")

            if (key === "server" || key === "logging") {
              acc[key] = acc[key] || {}
            } else if (key.startsWith("  ")) {
              const parentKey = trimmed.includes("server") ? "server" : "logging"
              const cleanKey = key.trim()
              
              if (cleanKey === "host" || cleanKey === "file") {
                acc[parentKey][cleanKey] = value
              } else if (cleanKey === "port") {
                acc[parentKey][cleanKey] = parseInt(value, 10)
              } else if (cleanKey === "use_ssl") {
                acc[parentKey][cleanKey] = value === "true"
              } else if (cleanKey === "level") {
                acc[parentKey][cleanKey] = value
              }
            }
          }
          return acc
        }, {})

      if (parsed.server && parsed.logging) {
        return parsed as ConfigData
      }
      return null
    } catch (e) {
      return null
    }
  }, [])

  const yamlToConfig = useCallback((yamlString: string): ConfigData | null => {
    try {
      const lines = yamlString.split("\n")
      const result: any = { server: {}, logging: {} }
      let currentSection: "server" | "logging" | null = null

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) continue

        if (trimmed === "server:") {
          currentSection = "server"
        } else if (trimmed === "logging:") {
          currentSection = "logging"
        } else if (trimmed.startsWith("-") || trimmed.includes(":")) {
          const match = trimmed.match(/^\s*(\w+):\s*(.+)$/)
          if (match && currentSection) {
            const [, key, value] = match
            const cleanValue = value.replace(/^["']|["']$/g, "")

            if (key === "host" || key === "file") {
              result[currentSection][key] = cleanValue
            } else if (key === "port") {
              result[currentSection][key] = parseInt(cleanValue, 10)
            } else if (key === "use_ssl") {
              result[currentSection][key] = cleanValue === "true" || cleanValue === true
            } else if (key === "level") {
              result[currentSection][key] = cleanValue
            }
          }
        }
      }

      if (result.server.host && result.logging.level) {
        return result as ConfigData
      }
      return null
    } catch {
      return null
    }
  }, [])

  const configToYAML = useCallback((configData: ConfigData): string => {
    return `server:
  host: "${configData.server.host}"
  port: ${configData.server.port}
  use_ssl: ${configData.server.use_ssl}
logging:
  level: "${configData.logging.level}"
  file: "${configData.logging.file}"
`
  }, [])

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true)
        const yamlContent = await getConfig()
        setYaml(yamlContent)
        const parsed = yamlToConfig(yamlContent)
        setConfig(parsed)
        setError(null)
      } catch (err: any) {
        setError(err.message || "Failed to load config")
      } finally {
        setIsLoading(false)
      }
    }

    loadConfig()
  }, [yamlToConfig])

  useEffect(() => {
    if (debouncedYaml && debouncedYaml !== "") {
      const parsed = yamlToConfig(debouncedYaml)
      setConfig(parsed)
      
      if (parsed) {
        setError(null)
        const save = async () => {
          try {
            setIsSaving(true)
            setSaveError(null)
            await saveConfig(debouncedYaml)
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 2000)
          } catch (err: any) {
            setSaveError(err.response?.data?.detail || err.message || "Failed to save config")
          } finally {
            setIsSaving(false)
          }
        }
        save()
      } else {
        setError("Invalid YAML format")
      }
    }
  }, [debouncedYaml, yamlToConfig])

  const updateYAML = useCallback((newYaml: string) => {
    setYaml(newYaml)
  }, [])

  const updateConfig = useCallback((newConfig: ConfigData) => {
    setConfig(newConfig)
    const newYaml = configToYAML(newConfig)
    setYaml(newYaml)
  }, [configToYAML])

  return {
    yaml,
    config,
    error,
    isLoading,
    isSaving,
    saveError,
    saveSuccess,
    updateYAML,
    updateConfig,
  }
}

