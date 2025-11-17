import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getConfig, saveConfig } from "../lib/api"
import { useDebounce } from "./useDebounce"
import * as yamlLib from "js-yaml"
import { logger } from "../lib/utils"

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

type ChangeSource = "yaml" | "form" | "server" | null

export interface ValidationError {
  field: string
  message: string
}

function validateConfig(config: ConfigData): ValidationError[] {
  const errors: ValidationError[] = []

  if (config.server.host) {
    const host = config.server.host.trim()

    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/
    if (ipPattern.test(host)) {
      const parts = host.split(".").map(Number)
      if (parts.some((p) => p < 0 || p > 255 || isNaN(p))) {
        errors.push({
          field: "server.host",
          message: "Invalid IP address (each octet must be 0-255)",
        })
      }
    } else {
      if (host.length > 253) {
        errors.push({
          field: "server.host",
          message: "Hostname too long (max 253 characters)",
        })
      } else {
        const hostnamePattern =
          /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
        if (!hostnamePattern.test(host)) {
          errors.push({
            field: "server.host",
            message: "Invalid hostname format",
          })
        }
      }
    }
  } else {
    errors.push({
      field: "server.host",
      message: "Host is required",
    })
  }

  if (config.server.port < 1 || config.server.port > 65535 || isNaN(config.server.port)) {
    errors.push({
      field: "server.port",
      message: "Port must be between 1 and 65535",
    })
  }

  if (!config.logging.file || !config.logging.file.trim()) {
    errors.push({
      field: "logging.file",
      message: "Log file path cannot be empty",
    })
  }

  return errors
}

function parseYAMLConfig(yamlString: string): ConfigData | null {
  if (!yamlString || yamlString.trim() === "") {
    return null
  }

  try {
    const parsed = yamlLib.load(yamlString)
    
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null
    }

    const config = parsed as Record<string, unknown>
    
    if (!config.server || typeof config.server !== "object" || Array.isArray(config.server)) {
      return null
    }
    
    if (!config.logging || typeof config.logging !== "object" || Array.isArray(config.logging)) {
      return null
    }

    const server = config.server as Record<string, unknown>
    const logging = config.logging as Record<string, unknown>

    if (
      typeof server.host === "string" &&
      typeof server.port === "number" &&
      typeof server.use_ssl === "boolean" &&
      typeof logging.level === "string" &&
      ["debug", "info", "warn", "error"].includes(logging.level) &&
      typeof logging.file === "string"
    ) {
      return {
        server: {
          host: server.host,
          port: server.port,
          use_ssl: server.use_ssl,
        },
        logging: {
          level: logging.level as ConfigData["logging"]["level"],
          file: logging.file,
        },
      }
    }

    return null
  } catch (e) {
    logger.warn("Failed to parse YAML:", e)
    return null
  }
}

function configToYAML(configData: ConfigData): string {
  return yamlLib.dump(configData, { indent: 2, lineWidth: -1 })
}

export function useYAMLConfig() {
  const queryClient = useQueryClient()
  const lastValidYamlRef = useRef<string>("")
  const [yaml, setYaml] = useState<string>("")
  const [changeSource, setChangeSource] = useState<ChangeSource>(null)
  const [lastValidYaml, setLastValidYaml] = useState<string>("")
  const [isSavingState, setIsSavingState] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])

  const { data: serverYaml, isLoading, error: queryError } = useQuery({
    queryKey: ["config"],
    queryFn: getConfig,
    staleTime: Infinity,
    retry: 1,
    refetchInterval: false,
    refetchOnReconnect: false,
  })

  const mutation = useMutation({
    mutationFn: saveConfig,
    onSuccess: (_, savedYaml) => {
      lastValidYamlRef.current = savedYaml
      setLastValidYaml(savedYaml)
      queryClient.setQueryData(["config"], savedYaml)
      setChangeSource(null)
      setIsSavingState(false)
      logger.log("Config saved successfully")
    },
    onError: (error: unknown) => {
      logger.error("Failed to save config:", error)
      setChangeSource(null)
      setIsSavingState(false)
    },
  })

  const config = useMemo(() => {
    if (!yaml || yaml.trim() === "") {
      return null
    }
    return parseYAMLConfig(yaml)
  }, [yaml])

  const debouncedYaml = useDebounce(yaml, 500)

  useEffect(() => {
    if (serverYaml === undefined) {
      return
    }

    if (yaml === "" && serverYaml.trim() !== "") {
      setYaml(serverYaml)
      setChangeSource("server")
      lastValidYamlRef.current = serverYaml
      setLastValidYaml(serverYaml)
      logger.log("YAML loaded from server (initial)")
      return
    }

    if (
      changeSource !== "server" &&
      changeSource !== "form" &&
      serverYaml !== yaml &&
      serverYaml !== lastValidYamlRef.current &&
      !mutation.isPending
    ) {
      setYaml(serverYaml)
      setChangeSource("server")
      lastValidYamlRef.current = serverYaml
      setLastValidYaml(serverYaml)
      logger.log("YAML updated from server (external change)")
    }
  }, [serverYaml, yaml, changeSource, mutation.isPending])

  useEffect(() => {
    if (changeSource === "server") {
      return
    }

    if (!debouncedYaml || debouncedYaml.trim() === "" || debouncedYaml === lastValidYamlRef.current) {
      return
    }

    if (mutation.isPending) {
      return
    }

    const parsed = parseYAMLConfig(debouncedYaml)

    if (parsed) {
      const errors = validateConfig(parsed)
      if (errors.length === 0) {
        setValidationErrors([])
        logger.debug("Saving debounced YAML changes", { source: changeSource })
        setIsSavingState(true)
        mutation.mutate(debouncedYaml)
      } else {
        setValidationErrors(errors)
        logger.warn("Validation errors, not saving:", errors)
      }
    } else {
      setValidationErrors([])
    }
  }, [debouncedYaml, changeSource, mutation.isPending, mutation.mutate])


  const yamlError = useMemo(() => {
    if (!yaml || yaml.trim() === "" || isLoading) {
      return null
    }

    try {
      yamlLib.load(yaml)
      const isValidConfig = parseYAMLConfig(yaml)
      if (!isValidConfig && yaml.trim().length > 10) {
        return "YAML syntax is valid but structure doesn't match expected schema"
      }
      return null
    } catch (e) {
      if (yaml.trim().length > 10) {
        const errorMessage = e instanceof Error ? e.message : "Invalid YAML syntax"
        return `Invalid YAML syntax: ${errorMessage}`
      }
      return null
    }
  }, [yaml, isLoading])

  const getSaveError = (): string | null => {
    if (!mutation.error) return null

    const err = mutation.error as { response?: { data?: { detail?: string } }; message?: string }
    if (err.response?.data?.detail) {
      return err.response.data.detail
    }
    if (err.message) {
      return err.message
    }
    return "Failed to save configuration"
  }

  const error = queryError ? (queryError as Error).message : yamlError

  const validationError = useMemo(() => {
    if (validationErrors.length === 0) return null
    const messages = validationErrors.map((e) => `${e.field}: ${e.message}`).join("; ")
    return `Validation errors: ${messages}`
  }, [validationErrors])

  const saveSuccess = useMemo(() => {
    return (
      yaml === lastValidYaml &&
      !mutation.isPending &&
      !mutation.error &&
      yaml.trim() !== "" &&
      validationErrors.length === 0
    )
  }, [yaml, lastValidYaml, mutation.isPending, mutation.error, validationErrors.length])

  const updateYAML = useCallback((newYaml: string) => {
    setYaml(newYaml)
    setChangeSource("yaml")
  }, [])

  const updateConfig = useCallback((newConfig: ConfigData) => {
    const newYaml = configToYAML(newConfig)
    setYaml(newYaml)
    setChangeSource("form")
    logger.debug("Config updated from form, new YAML length:", newYaml.length)
  }, [])

  const revertToLastValid = useCallback(() => {
    if (lastValidYaml) {
      setYaml(lastValidYaml)
      setChangeSource("server")
      setValidationErrors([])
      logger.log("Reverted to last valid YAML")
    }
  }, [lastValidYaml])

  return {
    yaml,
    config,
    error,
    yamlError,
    isLoading,
    isSaving: isSavingState || mutation.isPending,
    saveError: getSaveError(),
    saveSuccess,
    lastValidYaml,
    revertToLastValid,
    updateYAML,
    updateConfig,
    validationErrors,
    validationError,
  }
}
