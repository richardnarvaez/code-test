from enum import Enum
from pydantic import BaseModel, Field, field_validator
import ipaddress
import re


class LogLevel(str, Enum):
    debug = "debug"
    info = "info"
    warn = "warn"
    error = "error"


class ServerConfig(BaseModel):
    host: str = Field(..., description="hostname or IP address")
    port: int = Field(..., ge=1, le=65535, description="port number")
    use_ssl: bool = Field(..., description="whether to enable SSL")

    @field_validator('host')
    @classmethod
    def validate_host(cls, v: str) -> str:
        v = v.strip()
        
        if not v:
            raise ValueError("Host cannot be empty")
        
        try:
            ipaddress.ip_address(v)
            return v
        except ValueError:
            pass
        
        # Validate hostname (RFC 1123)
        if len(v) > 253:
            raise ValueError("Hostname too long (max 253 characters)")
        
        hostname_pattern = re.compile(
            r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$'
        )
        if not hostname_pattern.match(v):
            raise ValueError("Invalid hostname format")
        
        return v


class LoggingConfig(BaseModel):
    level: LogLevel = Field(..., description="log level")
    file: str = Field(..., description="path to log file")
    
    @field_validator('file')
    @classmethod
    def validate_file(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Log file path cannot be empty")
        return v


class AppConfig(BaseModel):
    server: ServerConfig
    logging: LoggingConfig

