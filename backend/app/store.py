"""In-memory analysis store with JSON snapshots in data/runs/ (gitignored)."""
import json
import re

from .config import get_settings

_mem: dict[str, dict] = {}
_ID = re.compile(r"^[a-f0-9]{12}$")


def save(analysis: dict) -> None:
    _mem[analysis["analysis_id"]] = analysis
    try:
        d = get_settings().runs_dir
        d.mkdir(parents=True, exist_ok=True)
        (d / f"{analysis['analysis_id']}.json").write_text(json.dumps(analysis, ensure_ascii=False, indent=2), encoding="utf-8")
    except OSError:
        pass


def load(analysis_id: str) -> dict | None:
    if not _ID.match(analysis_id):
        return None
    if analysis_id in _mem:
        return _mem[analysis_id]
    p = get_settings().runs_dir / f"{analysis_id}.json"
    if p.exists():
        _mem[analysis_id] = json.loads(p.read_text(encoding="utf-8"))
        return _mem[analysis_id]
    return None
