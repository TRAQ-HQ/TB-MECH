import io

from fastapi.testclient import TestClient

from app.main import app

c = TestClient(app)


def test_health_meta_demo():
    assert c.get("/api/health").json() == {"status": "ok"}
    m = c.get("/api/meta").json()
    assert m["gnani_mock"] is True and "hi-IN" in m["languages"]
    assert len(c.get("/api/demo-isolates").json()) == 4


def test_full_mock_flow():
    r = c.post("/api/voice/transcribe", files={"audio": ("a.webm", io.BytesIO(b"x"), "audio/webm")},
               data={"language_code": "hi-IN", "mock_text": "rpoB S450L aur katG S315T"})
    assert r.status_code == 200 and r.json()["source"] == "mock"
    cands = r.json()["parsed"]["candidates"]
    assert len(cands) == 2

    a = c.post("/api/analyze", json={"variants": [x["raw"] for x in cands], "phenotype": {"rifampicin": "R"}}).json()
    aid = a["analysis_id"]
    assert a["synthetic"] is True and len(a["hypotheses"]) == 2

    assert c.get(f"/api/analysis/{aid}").status_code == 200
    g = c.get(f"/api/analysis/{aid}/graph").json()
    assert g["nodes"] and g["edges"]
    w = c.post(f"/api/analysis/{aid}/whatif", json={"remove": ["rpoB_S450L"]}).json()
    assert "H_direct:rpoB_S450L" in w["lost_hypotheses"]

    ans = c.post("/api/assistant/ask", json={"analysis_id": aid, "question": "explain the evidence", "language": "hi-IN"}).json()
    assert ans["source"] == "template" and ans["answer_text"] and ans["guardrail"]["passed"]

    sp = c.post("/api/voice/speak", json={"text": ans["answer_text"], "language": "hi-IN"})
    assert sp.status_code == 200 and sp.headers["content-type"] == "audio/wav" and sp.headers["x-tts-source"] == "mock"

    assert c.get(f"/api/report/{aid}.json").json()["components"]["gnani_mock"] is True
    md = c.get(f"/api/report/{aid}.md").text
    assert "Limitations" in md and "UNVERIFIED" in md


def test_errors_are_structured():
    assert c.get("/api/analysis/doesnotexist1").status_code == 404
    assert c.post("/api/analyze", json={"variants": []}).status_code == 400
    r = c.post("/api/voice/speak", json={"text": "  ", "language": "hi-IN"})
    assert r.status_code == 400 and r.json()["error"]["code"] == "empty_text"


def test_static_index_served():
    r = c.get("/")
    assert r.status_code == 200 and "TB-MECH Voice" in r.text
