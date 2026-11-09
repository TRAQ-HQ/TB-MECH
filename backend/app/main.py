from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .api import analysis, assistant, report, voice
from .config import ROOT
from .gnani.errors import GnaniError

app = FastAPI(title="TB-MECH Voice", version="0.1.0")


@app.exception_handler(GnaniError)
async def gnani_error_handler(_: Request, exc: GnaniError):
    return JSONResponse(status_code=exc.status, content={"error": {"code": exc.code, "message": exc.user_message}})


@app.exception_handler(ValueError)
async def value_error_handler(_: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={"error": {"code": "bad_request", "message": str(exc)}})


for r in (analysis.router, voice.router, assistant.router, report.router):
    app.include_router(r, prefix="/api")

app.mount("/", StaticFiles(directory=ROOT / "static", html=True), name="static")
