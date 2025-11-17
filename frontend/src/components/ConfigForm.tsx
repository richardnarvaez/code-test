import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Checkbox } from "./ui/checkbox"
import { Select } from "./ui/select"
import type { ConfigData, ValidationError } from "../hooks/useYAMLConfig"

interface ConfigFormProps {
  config: ConfigData | null
  onChange: (config: ConfigData) => void
  validationErrors?: ValidationError[]
}

export function ConfigForm({ config, onChange, validationErrors = [] }: ConfigFormProps) {
  const defaultConfig: ConfigData = {
    server: {
      host: "127.0.0.1",
      port: 3000,
      use_ssl: true,
    },
    logging: {
      level: "debug",
      file: "./debug.log",
    },
  }

  const currentConfig = config || defaultConfig

  const getFieldError = (field: string): string | undefined => {
    return validationErrors.find((e) => e.field === field)?.message
  }

  const handleServerChange = (field: keyof ConfigData["server"], value: string | number | boolean) => {
    onChange({
      ...currentConfig,
      server: {
        ...currentConfig.server,
        [field]: value,
      },
    })
  }

  const handleLoggingChange = (field: keyof ConfigData["logging"], value: string) => {
    onChange({
      ...currentConfig,
      logging: {
        ...currentConfig.logging,
        [field]: value,
      },
    })
  }

  return (
    <div className="p-6 space-y-6">
      {!config && (
        <div className="text-sm text-gray-500 mb-4">
          YAML is invalid or empty. Using default values.
        </div>
      )}
      <div>
        <h2 className="text-xl font-semibold mb-4">Server Configuration</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="host">Host</Label>
            <Input
              id="host"
              type="text"
              value={currentConfig.server.host}
              onChange={(e) => handleServerChange("host", e.target.value)}
              className={`mt-1 ${getFieldError("server.host") ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
            />
            {getFieldError("server.host") && (
              <p className="text-sm text-red-600 mt-1">{getFieldError("server.host")}</p>
            )}
          </div>
          <div>
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="number"
              value={currentConfig.server.port}
              onChange={(e) => handleServerChange("port", parseInt(e.target.value, 10))}
              className={`mt-1 ${getFieldError("server.port") ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
              min={1}
              max={65535}
            />
            {getFieldError("server.port") && (
              <p className="text-sm text-red-600 mt-1">{getFieldError("server.port")}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="use_ssl"
              checked={currentConfig.server.use_ssl}
              onChange={(e) => handleServerChange("use_ssl", e.target.checked)}
            />
            <Label htmlFor="use_ssl" className="cursor-pointer">
              Use SSL
            </Label>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Logging Configuration</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="level">Level</Label>
            <Select
              id="level"
              value={currentConfig.logging.level}
              onChange={(e) => handleLoggingChange("level", e.target.value as ConfigData["logging"]["level"])}
              className="mt-1"
            >
              <option value="debug">debug</option>
              <option value="info">info</option>
              <option value="warn">warn</option>
              <option value="error">error</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              type="text"
              value={currentConfig.logging.file}
              onChange={(e) => handleLoggingChange("file", e.target.value)}
              className={`mt-1 ${getFieldError("logging.file") ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
            />
            {getFieldError("logging.file") && (
              <p className="text-sm text-red-600 mt-1">{getFieldError("logging.file")}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
