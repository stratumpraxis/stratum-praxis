import json
import os
import re
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI(title="SpendLens Agent", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

SAMPLE_STACK = [
    {"name":"ChatGPT Team","category":"AI assistant","annual_cost":1800,"seats":5,"active_seats":3,"renewal_days":42},
    {"name":"Claude Team","category":"AI assistant","annual_cost":1800,"seats":5,"active_seats":2,"renewal_days":88},
    {"name":"Jasper","category":"AI writing","annual_cost":708,"seats":1,"active_seats":0,"renewal_days":17},
    {"name":"Zapier","category":"Automation","annual_cost":1068,"seats":1,"active_seats":1,"renewal_days":31},
    {"name":"Make","category":"Automation","annual_cost":588,"seats":1,"active_seats":1,"renewal_days":210},
    {"name":"Canva Teams","category":"Design","annual_cost":600,"seats":5,"active_seats":2,"renewal_days":54},
    {"name":"Notion AI","category":"AI productivity","annual_cost":960,"seats":8,"active_seats":4,"renewal_days":63},
    {"name":"Loom","category":"Video","annual_cost":900,"seats":5,"active_seats":1,"renewal_days":9},
    {"name":"Miro","category":"Collaboration","annual_cost":1080,"seats":6,"active_seats":2,"renewal_days":120},
    {"name":"Grammarly Business","category":"AI writing","annual_cost":1816,"seats":8,"active_seats":3,"renewal_days":70}
]

class StackRequest(BaseModel):
    subscriptions: list[dict[str, Any]] = Field(default_factory=lambda: SAMPLE_STACK)
    goal: str = "Reduce SaaS and AI spend without breaking important workflows."

class ExecuteRequest(BaseModel):
    action_ids: list[str]
    analysis: dict[str, Any]

SYSTEM_INSTRUCTION = """You are SpendLens, an autonomous SaaS-spend recovery agent.
Your job is not to chat. Inspect a software stack, detect waste, decide what to do,
quantify the impact, and output an execution-ready recovery plan.
Be conservative: do not recommend cancellation when evidence is weak.
Return JSON only with these keys:
current_annual_spend (number), recoverable_savings (number), duplicate_tools (integer),
oversized_plans (integer), renewal_risks (integer),
findings (array of objects with id,type,tool,reason,annual_savings,confidence),
actions (array of objects with id,when,tool,action,annual_savings,risk,why),
what_if (array of objects with title,current_cost,optimized_cost,annual_savings,migration_effort,workflow_risk),
executive_summary (string).
Use when values exactly: today, this_week, or before_renewal.
"""

def extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)

@app.get("/health")
def health():
    return {"ok": True, "model": MODEL}

@app.get("/sample")
def sample():
    return {"subscriptions": SAMPLE_STACK}

@app.post("/analyze")
def analyze(req: StackRequest):
    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured.")
    total = sum(float(x.get("annual_cost", 0)) for x in req.subscriptions)
    prompt = {
        "goal": req.goal,
        "known_total_annual_spend": total,
        "subscriptions": req.subscriptions,
        "instructions": [
            "Find duplicated categories, unused seats, overlapping AI tools, and near-term renewal risks.",
            "Prefer downgrade or consolidation before cancellation when evidence is ambiguous.",
            "Produce at least 3 concrete actions and 3 what-if scenarios.",
            "Keep savings internally consistent and never exceed current annual spend."
        ]
    }
    response = client.models.generate_content(
        model=MODEL,
        contents=json.dumps(prompt),
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json"
        )
    )
    try:
        return extract_json(response.text)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Model returned invalid JSON: {exc}") from exc

@app.post("/execute")
def execute(req: ExecuteRequest):
    actions = req.analysis.get("actions", [])
    selected_ids = set(req.action_ids)
    selected = [a for a in actions if a.get("id") in selected_ids]
    recovered = sum(float(a.get("annual_savings", 0)) for a in selected)
    return {
        "status": "execution_plan_created",
        "mode": "safe_simulation",
        "selected_actions": selected,
        "projected_annual_savings": recovered,
        "next_step": "Connect vendor or procurement APIs to turn approved actions into real mutations."
    }
