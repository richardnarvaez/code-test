from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import config, websocket

app = FastAPI(title="YAML Config Editor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(config.router)
app.include_router(websocket.router)


@app.get("/")
async def root():
    return {"message": "YAML Config Editor API"}

