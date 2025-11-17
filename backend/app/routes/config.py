import yaml
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from app.models import AppConfig

router = APIRouter()

CONFIG_FILE = Path(__file__).parent.parent / "config.yaml"


@router.get("/api/config")
async def get_config():
    try:
        with open(CONFIG_FILE, "r") as f:
            content = f.read()
        return {"yaml": content}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Config file not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading config: {str(e)}")


@router.put("/api/config")
async def put_config(data: dict):
    yaml_content = data.get("yaml", "")
    
    if not yaml_content:
        raise HTTPException(status_code=400, detail="YAML content is required")
    
    try:
        parsed = yaml.safe_load(yaml_content)
        AppConfig(**parsed)
    except yaml.YAMLError as e:
        raise HTTPException(status_code=400, detail=f"Invalid YAML: {str(e)}")
    except ValidationError as e:
        error_messages = []
        for error_detail in e.errors():
            field_path = " -> ".join(str(loc) for loc in error_detail["loc"])
            error_messages.append(f"{field_path}: {error_detail['msg']}")
        
        error_msg = "; ".join(error_messages) if error_messages else str(e)
        raise HTTPException(
            status_code=400, 
            detail=f"Validation error: {error_msg}"
        )
    
    try:
        with open(CONFIG_FILE, "w") as f:
            f.write(yaml_content)
        return {"message": "Config saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving config: {str(e)}")

