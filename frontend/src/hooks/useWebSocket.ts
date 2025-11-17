import { useEffect, useRef, useState, useCallback } from "react"
import { logger } from "../lib/utils"

type WebSocketStatus = "connecting" | "connected" | "disconnected"

interface UseWebSocketOptions {
  url: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  onError?: (error: Event) => void
}

export function useWebSocket({
  url,
  reconnectInterval = 3000,
  maxReconnectAttempts = 10,
  onError,
}: UseWebSocketOptions) {
  const [status, setStatus] = useState<WebSocketStatus>("disconnected")
  const [wsState, setWsState] = useState<WebSocket | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shouldReconnectRef = useRef(true)
  const onErrorRef = useRef(onError)
  const urlRef = useRef(url)
  const reconnectIntervalRef = useRef(reconnectInterval)
  const maxReconnectAttemptsRef = useRef(maxReconnectAttempts)
  const connectRef = useRef<(() => void) | null>(null)

  // Update refs when dependencies change
  useEffect(() => {
    onErrorRef.current = onError
    urlRef.current = url
    reconnectIntervalRef.current = reconnectInterval
    maxReconnectAttemptsRef.current = maxReconnectAttempts
  }, [onError, url, reconnectInterval, maxReconnectAttempts])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttemptsRef.current) {
      return
    }

    if (!shouldReconnectRef.current) {
      return
    }

    try {
      if (wsRef.current) {
        const oldWs = wsRef.current
        oldWs.onclose = null
        oldWs.onerror = null
        if (oldWs.readyState === WebSocket.OPEN || oldWs.readyState === WebSocket.CONNECTING) {
          oldWs.close()
        }
        wsRef.current = null
      }

      setStatus("connecting")
      logger.debug("Creating WebSocket connection to", urlRef.current)
      const ws = new WebSocket(urlRef.current)
      wsRef.current = ws

      ws.onopen = () => {
        logger.debug("WebSocket opened", { ws: ws === wsRef.current, shouldReconnect: shouldReconnectRef.current })
        if (wsRef.current === ws && shouldReconnectRef.current) {
          setStatus("connected")
          setWsState(ws)
          reconnectAttemptsRef.current = 0
          logger.debug("WebSocket state updated to connected")
        }
      }

      ws.onerror = (error) => {
        logger.error("WebSocket error", error)
        if (wsRef.current === ws) {
          setStatus("disconnected")
          setWsState(null)
          if (reconnectAttemptsRef.current === 0) {
            onErrorRef.current?.(error)
          }
        }
      }

      ws.onclose = (event) => {
        logger.debug("WebSocket closed", { code: event.code, reason: event.reason, ws: ws === wsRef.current })
        if (wsRef.current === ws) {
          setStatus("disconnected")
          setWsState(null)
          wsRef.current = null

          if (shouldReconnectRef.current && reconnectAttemptsRef.current < maxReconnectAttemptsRef.current && event.code !== 1000) {
            reconnectAttemptsRef.current += 1
            reconnectTimeoutRef.current = setTimeout(() => {
              if (shouldReconnectRef.current && connectRef.current) {
                connectRef.current()
              }
            }, reconnectIntervalRef.current)
          }
        }
      }
    } catch (error) {
      setStatus("disconnected")
      setWsState(null)
      wsRef.current = null
      if (reconnectAttemptsRef.current === 0) {
        onErrorRef.current?.(error as Event)
      }
    }
  }, [])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    logger.debug("useWebSocket effect running, connecting...")
    shouldReconnectRef.current = true
    reconnectAttemptsRef.current = 0
    
    if (wsRef.current) {
      logger.debug("Closing existing WebSocket before reconnecting")
      const oldWs = wsRef.current
      oldWs.onclose = null
      oldWs.onerror = null
      oldWs.onopen = null
      if (oldWs.readyState === WebSocket.OPEN || oldWs.readyState === WebSocket.CONNECTING) {
        oldWs.close(1000, "Reconnecting")
      }
      wsRef.current = null
    }
    
    connect()
    
    return () => {
      logger.debug("useWebSocket cleanup, disconnecting...")
      shouldReconnectRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (wsRef.current) {
        const ws = wsRef.current
        ws.onclose = null
        ws.onerror = null
        ws.onopen = null
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1000, "Component unmounting")
        }
        wsRef.current = null
      }
    }
  }, [connect])

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      const ws = wsRef.current
      ws.onclose = null
      ws.onerror = null
      ws.onopen = null
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, "Component unmounting")
      }
      wsRef.current = null
    }
    setStatus("disconnected")
    setWsState(null)
  }, [])

  const send = useCallback((data: string | object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === "string" ? data : JSON.stringify(data))
      return true
    }
    return false
  }, [])

  return {
    status,
    send,
    connect,
    disconnect,
    isConnected: status === "connected",
    ws: wsState,
  }
}

