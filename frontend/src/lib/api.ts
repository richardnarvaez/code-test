import axios from "axios"

const API_BASE_URL = "http://localhost:8000"

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

export const getConfig = async (): Promise<string> => {
  const response = await api.get("/api/config")
  return response.data.yaml
}

export const saveConfig = async (yaml: string): Promise<void> => {
  await api.put("/api/config", { yaml })
}

