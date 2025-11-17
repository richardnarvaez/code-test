import { useEffect, useRef } from "react"
import Editor from "@monaco-editor/react"
import type { Monaco } from "@monaco-editor/react"
import type { editor } from "monaco-editor"
import { languages } from "monaco-editor"
import { useWebSocket } from "../hooks/useWebSocket"
import { logger } from "../lib/utils"

interface YAMLEditorProps {
  value: string
  onChange: (value: string) => void
  hasError?: boolean
}

interface PendingRequest {
  resolve: (value: languages.CompletionList | null | undefined) => void
  timeout: ReturnType<typeof setTimeout>
  range?: { startLineNumber: number; endLineNumber: number; startColumn: number; endColumn: number }
}

export function YAMLEditor({ value, onChange, hasError = false }: YAMLEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const pendingRequestRef = useRef<PendingRequest | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const isConnectedRef = useRef(false)
  const sendRef = useRef<((data: string | object) => boolean) | null>(null)

  const { send, isConnected, ws } = useWebSocket({
    url: "ws://localhost:8000/ws/completion",
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    onError: () => {
      logger.warn("WebSocket connection error, completion may be unavailable")
    },
  })

  useEffect(() => {
    wsRef.current = ws
    isConnectedRef.current = isConnected
    sendRef.current = send
    logger.debug("WebSocket refs updated", {
      hasWs: !!ws,
      isConnected,
      wsReadyState: ws?.readyState,
      wsReadyStateName: ws?.readyState === WebSocket.OPEN ? "OPEN" : ws?.readyState === WebSocket.CONNECTING ? "CONNECTING" : "CLOSED"
    })
  }, [ws, isConnected, send])

  useEffect(() => {
    if (!isConnected || !ws || ws.readyState !== WebSocket.OPEN) {
      logger.debug("WebSocket not ready for message handler", {
        isConnected,
        hasWs: !!ws,
        readyState: ws?.readyState
      })
      return
    }

    logger.debug("Registering WebSocket message handler")

    const messageHandler = (event: MessageEvent) => {
      logger.debug("Received WebSocket message", event.data)
      const request = pendingRequestRef.current
      if (!request) {
        logger.debug("No pending request for this message")
        return
      }

      clearTimeout(request.timeout)
      pendingRequestRef.current = null

      try {
        const data = JSON.parse(event.data) as { completions?: Array<{ label: string; kind: string; insertText: string; detail?: string }> }
        logger.debug("Parsed completion data", { completionsCount: data.completions?.length || 0 })
        const suggestions: languages.CompletionItem[] = (data.completions || []).map((item) => ({
          label: item.label,
          kind:
            item.kind === "struct"
              ? languages.CompletionItemKind.Struct
              : item.kind === "property"
              ? languages.CompletionItemKind.Property
              : item.kind === "enum"
              ? languages.CompletionItemKind.Enum
              : languages.CompletionItemKind.Text,
          insertText: item.insertText,
          detail: item.detail,
          insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: request.range || {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
          },
        }))

        logger.debug("Resolving with suggestions", suggestions.length)
        request.resolve({ suggestions })
      } catch (error) {
        logger.error("Error parsing completion response", error)
        request.resolve({ suggestions: [] })
      }
    }

    ws.addEventListener("message", messageHandler)

    return () => {
      logger.debug("Unregistering WebSocket message handler")
      ws.removeEventListener("message", messageHandler)
      if (pendingRequestRef.current) {
        clearTimeout(pendingRequestRef.current.timeout)
        pendingRequestRef.current = null
      }
    }
  }, [isConnected, ws])

  useEffect(() => {
    return () => {
      if (pendingRequestRef.current) {
        clearTimeout(pendingRequestRef.current.timeout)
        pendingRequestRef.current = null
      }
    }
  }, [])

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor
    logger.debug("Editor mounted, registering completion provider")

    monaco.languages.setMonarchTokensProvider("yaml", {
      tokenizer: {
        root: [
          [/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:/, "key"],
          [/:\s*["'].*["']/, "string"],
          [/:\s*\d+/, "number"],
          [/:\s*(true|false)/, "boolean"],
        ],
      },
    })

    const provider = monaco.languages.registerCompletionItemProvider("yaml", {
      triggerCharacters: [":", " ", "\n"],
      provideCompletionItems: async (model, position) => {
        const currentWs = wsRef.current
        const currentIsConnected = isConnectedRef.current
        const currentSend = sendRef.current

        logger.debug("Autocomplete triggered", {
          isConnected: currentIsConnected,
          hasWs: !!currentWs,
          wsReadyState: currentWs?.readyState,
          wsReadyStateName: currentWs?.readyState === WebSocket.OPEN ? "OPEN" : currentWs?.readyState === WebSocket.CONNECTING ? "CONNECTING" : "CLOSED",
          hasSend: !!currentSend,
          position: { line: position.lineNumber, column: position.column },
          word: model.getWordUntilPosition(position)
        })

        if (!currentIsConnected || !currentWs || currentWs.readyState !== WebSocket.OPEN) {
          logger.debug("WebSocket not ready, returning empty suggestions")
          return { suggestions: [], incomplete: false }
        }

        if (pendingRequestRef.current) {
          logger.debug("Cancelling previous pending request")
          clearTimeout(pendingRequestRef.current.timeout)
          pendingRequestRef.current.resolve({ suggestions: [] })
        }

        const fullText = model.getValue()
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            if (pendingRequestRef.current) {
              logger.debug("Autocomplete timeout")
              pendingRequestRef.current = null
              resolve({ suggestions: [] })
            }
          }, 1000)

          pendingRequestRef.current = { resolve, timeout, range }

          if (!currentSend) {
            logger.debug("No send function available")
            clearTimeout(timeout)
            pendingRequestRef.current = null
            resolve({ suggestions: [] })
            return
          }

          const requestData = {
            yaml: fullText,
            line: position.lineNumber - 1,
            column: position.column - 1,
          }

          logger.debug("Sending autocomplete request", requestData)
          const sent = currentSend(requestData)

          if (!sent) {
            logger.debug("Failed to send autocomplete request")
            clearTimeout(timeout)
            pendingRequestRef.current = null
            resolve({ suggestions: [] })
          } else {
            logger.debug("Autocomplete request sent successfully")
          }
        })
      },
    })

    return () => {
      provider.dispose()
    }
  }

  const handleChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue)
    }
  }

  return (
    <div
      className={`h-full w-full rounded-md overflow-hidden transition-all duration-300 ease-in-out ${
        hasError ? "border border-red-500" : "border border-gray-300"
      }`}
    >
      <Editor
        height="100%"
        defaultLanguage="yaml"
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        theme="vs"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
          },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnCommitCharacter: true,
          tabCompletion: "on",
          wordBasedSuggestions: "off",
        }}
      />
    </div>
  )
}
