from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import yaml
from typing import List, Dict, Any

router = APIRouter()


def get_completions(context: Dict[str, Any], line: str, column: int) -> List[Dict[str, Any]]:
    completions = []
    
    if not context or "server" not in context:
        completions.append({
            "label": "server",
            "kind": "struct",
            "insertText": "server:\n  host: \"127.0.0.1\"\n  port: 3000\n  use_ssl: true",
            "detail": "Server configuration block"
        })
    
    if not context or "logging" not in context:
        completions.append({
            "label": "logging",
            "kind": "struct",
            "insertText": "logging:\n  level: \"debug\"\n  file: \"./debug.log\"",
            "detail": "Logging configuration block"
        })
    
    if context.get("server"):
        server = context["server"]
        
        if "host" not in server:
            completions.append({
                "label": "host",
                "kind": "property",
                "insertText": "host: \"127.0.0.1\"",
                "detail": "hostname or IP address"
            })
        
        if "port" not in server:
            completions.append({
                "label": "port",
                "kind": "property",
                "insertText": "port: 3000",
                "detail": "port number (1-65535)"
            })
        
        if "use_ssl" not in server:
            completions.append({
                "label": "use_ssl",
                "kind": "property",
                "insertText": "use_ssl: true",
                "detail": "whether to enable SSL"
            })
    
    if context.get("logging"):
        logging = context["logging"]
        
        if "level" not in logging:
            completions.extend([
                {
                    "label": "level: debug",
                    "kind": "enum",
                    "insertText": "level: \"debug\"",
                    "detail": "log level"
                },
                {
                    "label": "level: info",
                    "kind": "enum",
                    "insertText": "level: \"info\"",
                    "detail": "log level"
                },
                {
                    "label": "level: warn",
                    "kind": "enum",
                    "insertText": "level: \"warn\"",
                    "detail": "log level"
                },
                {
                    "label": "level: error",
                    "kind": "enum",
                    "insertText": "level: \"error\"",
                    "detail": "log level"
                }
            ])
        
        if "file" not in logging:
            completions.append({
                "label": "file",
                "kind": "property",
                "insertText": "file: \"./debug.log\"",
                "detail": "path to log file"
            })
    
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

