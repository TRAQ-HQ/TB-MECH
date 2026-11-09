from fastapi import APIRouter, HTTPException

from .. import store
from ..core import composer
from ..core.kb import get_kb
from ..schemas import AskRequest

router = APIRouter()


@router.post("/assistant/ask")
async def ask(req: AskRequest):
    a = store.load(req.analysis_id)
    if not a:
        raise HTTPException(404, {"code": "not_found", "message": "Analysis not found."})
    return await composer.compose(a, req.question, req.language, get_kb())
