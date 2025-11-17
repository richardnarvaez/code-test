from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import yaml
from typing import List, Dict, Any

KEY_SUGGESTIONS = [
    {
        "label": "server",
        "kind": "struct",
        "insertText": "server:\n  host: \"127.0.0.1\"\n  port: 3000\n  use_ssl: true",
        "detail": "Server configuration block",
    },
    {
        "label": "logging",
        "kind": "struct",
        "insertText": "logging:\n  level: \"debug\"\n  file: \"./debug.log\"",
        "detail": "Logging configuration block",
    },
    {
        "label": "host",
        "kind": "property",
        "insertText": "host: \"127.0.0.1\"",
        "detail": "hostname or IP address",
    },
    {
        "label": "port",
        "kind": "property",
        "insertText": "port: 3000",
        "detail": "port number (1-65535)",
    },
    {
        "label": "use_ssl",
        "kind": "property",
        "insertText": "use_ssl: true",
        "detail": "whether to enable SSL",
    },
    {
        "label": "level",
        "kind": "property",
        "insertText": "level: \"debug\"",
        "detail": "log level",
    },
    {
        "label": "file",
        "kind": "property",
        "insertText": "file: \"./debug.log\"",
        "detail": "path to log file",
    },
]

router = APIRouter()


def get_completions(context: Dict[str, Any], line: str, column: int) -> List[Dict[str, Any]]:
    completions: List[Dict[str, Any]] = []
    added_labels = set()

    def add_completion(item: Dict[str, Any]):
        label = item.get("label")
        if label and label not in added_labels:
            completions.append(item)
            added_labels.add(label)

    if not context or "server" not in context:
        add_completion(KEY_SUGGESTIONS[0])

    if not context or "logging" not in context:
        add_completion(KEY_SUGGESTIONS[1])

    if context.get("server"):
        server = context["server"]

        if "host" not in server:
            add_completion(KEY_SUGGESTIONS[2])

        if "port" not in server:
            add_completion(KEY_SUGGESTIONS[3])

        if "use_ssl" not in server:
            add_completion(KEY_SUGGESTIONS[4])

    if context.get("logging"):
        logging = context["logging"]

        if "level" not in logging:
            add_completion(KEY_SUGGESTIONS[5])

        if "file" not in logging:
            add_completion(KEY_SUGGESTIONS[6])

    if line.strip().endswith(":"):
        if "level" in line:
            completions.extend([
                {"label": "debug", "kind": "enum", "insertText": "\"debug\""},
                {"label": "info", "kind": "enum", "insertText": "\"info\""},
                {"label": "warn", "kind": "enum", "insertText": "\"warn\""},
                {"label": "error", "kind": "enum", "insertText": "\"error\""}
            ])
        elif "use_ssl" in line:
            completions.extend([
                {"label": "true", "kind": "value", "insertText": "true"},
                {"label": "false", "kind": "value", "insertText": "false"}
            ])

    if not line:
        return completions

    prefix = line[:column].rstrip()
    token = prefix.split()[-1] if prefix else ""
    token = token.rstrip(":").lower()
    if token:
        for suggestion in KEY_SUGGESTIONS:
            if suggestion["label"].lower().startswith(token):
                add_completion(suggestion)

    return completions


@router.websocket("/ws/completion")
async def websocket_completion(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_json()

            yaml_content = data.get("yaml", "")
            line = data.get("line", 0)
            column = data.get("column", 0)

            context = {}
            try:
                context = yaml.safe_load(yaml_content) or {}
            except:
                pass

            completions = get_completions(context, yaml_content.split("\n")[line] if yaml_content else "", column)

            await websocket.send_json({"completions": completions})
    
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.close(code=1011, reason=str(e))

