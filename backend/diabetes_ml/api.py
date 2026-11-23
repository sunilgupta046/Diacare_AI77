from __future__ import annotations

import os
import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from openai import OpenAI
except Exception:  # pragma: no cover - optional for offline use.
    OpenAI = None

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"), override=False)

app = FastAPI(title="DiaCare API", version="1.0.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

patients: Dict[str, Dict[str, Any]] = {}
DATABASE_PATH = Path(os.getenv("DIACARE_DATABASE_PATH", Path(__file__).resolve().parents[1] / "diacare.db"))


def _connect_database() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(DATABASE_PATH)


def _load_patients() -> None:
    with _connect_database() as connection:
        connection.execute(
            "CREATE TABLE IF NOT EXISTS patients (patient_id TEXT PRIMARY KEY, record_json TEXT NOT NULL)"
        )
        rows = connection.execute("SELECT patient_id, record_json FROM patients").fetchall()

    for patient_id, record_json in rows:
        record = json.loads(record_json)
        if isinstance(record, dict):
            patients[patient_id] = record


def _persist_patient(patient_id: str) -> None:
    patient = patients[patient_id]
    with _connect_database() as connection:
        connection.execute(
            """
            INSERT INTO patients (patient_id, record_json)
            VALUES (?, ?)
            ON CONFLICT(patient_id) DO UPDATE SET record_json = excluded.record_json
            """,
            (patient_id, json.dumps(patient, ensure_ascii=False)),
        )


_load_patients()


class Hba1cRequest(BaseModel):
    readings: List[float] = Field(..., min_length=1)


class PatientCreateRequest(BaseModel):
    patient_id: str
    name: Optional[str] = "Dia Care user"
    age: Optional[int] = None
    gender: Optional[str] = "Unspecified"
    diabetes_type: Optional[str] = "Unspecified"
    baseline_icr: Optional[float] = Field(default=None, gt=0)
    target_glucose: Optional[int] = Field(default=100, gt=0)


class MealItem(BaseModel):
    food_query: str
    quantity: float = Field(default=1, gt=0, le=20)


class MealPredictionRequest(BaseModel):
    food_query: Optional[str] = None
    meal_time: str = "Lunch"
    baseline_icr: Optional[float] = Field(default=None, gt=0)
    quantity: float = Field(default=1, gt=0, le=20)
    meals: Optional[List[MealItem]] = Field(default=None, min_length=1, max_length=20)


class CalibrationRequest(BaseModel):
    meal_query: str
    actual_units: float
    meal_time: str = "Lunch"


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _estimate_carbs_from_text(food_query: str) -> int:
    text = (food_query or "").lower()
    tokens = {
        "roti": 30,
        "chapati": 30,
        "rice": 45,
        "dal": 20,
        "curry": 25,
        "bread": 30,
        "idli": 25,
        "dosa": 35,
        "fruit": 20,
        "banana": 27,
        "apple": 15,
        "oatmeal": 35,
        "yogurt": 15,
        "milk": 12,
        "pizza": 50,
        "burger": 40,
        "salad": 10,
        "pasta": 50,
        "noodles": 45,
        "paneer": 18,
        "soup": 15,
        "biryani": 55,
        "meal": 40,
    }
    for keyword, carbs in tokens.items():
        if keyword in text:
            return carbs
    # fallback: simple heuristic based on words like "large", "small", "extra"
    if any(word in text for word in ["large", "heavy", "big", "full"]):
        return 60
    if any(word in text for word in ["small", "light", "snack"]):
        return 20
    return 30


def _predict_hba1c(values: List[float]) -> float:
    cleaned = [float(value) for value in values if value is not None]
    if not cleaned:
        raise ValueError("At least one glucose reading is required.")
    mean_value = sum(cleaned) / len(cleaned)
    result = (mean_value + 46.7) / 28.7
    return round(result, 1)


def _get_patient(patient_id: str) -> Dict[str, Any]:
    patient = patients.get(patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found.")
    return patient


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/health")
def health_v1() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/hba1c/predict")
def predict_hba1c(payload: Hba1cRequest) -> Dict[str, Any]:
    try:
        predicted = _predict_hba1c(payload.readings)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "predicted_hba1c_pct": predicted,
        "predicted_hba1c": predicted,
        "method": "clinical_adag",
        "value_count": len(payload.readings),
    }


@app.get("/api/v1/patients/{patient_id}")
def get_patient(patient_id: str) -> Dict[str, Any]:
    return _get_patient(patient_id)


@app.post("/api/v1/patients")
def create_patient(payload: PatientCreateRequest) -> Dict[str, Any]:
    patient_id = payload.patient_id.strip()
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required.")

    if patient_id in patients:
        return patients[patient_id]

    patient_record: Dict[str, Any] = {
        "patient_id": patient_id,
        "name": payload.name or "Dia Care user",
        "age": payload.age,
        "gender": payload.gender or "Unspecified",
        "diabetes_type": payload.diabetes_type or "Unspecified",
        "baseline_icr": payload.baseline_icr or 12,
        "target_glucose": payload.target_glucose or 100,
        "created_at": _iso_now(),
        "updated_at": _iso_now(),
        "history": [],
    }
    patients[patient_id] = patient_record
    _persist_patient(patient_id)
    return patient_record


@app.post("/api/v1/patients/{patient_id}/predict-food")
def predict_food(patient_id: str, payload: MealPredictionRequest) -> Dict[str, Any]:
    patient = _get_patient(patient_id)
    requested_items = payload.meals or (
        [MealItem(food_query=payload.food_query or "", quantity=payload.quantity)]
    )
    meal_items = []
    for item in requested_items:
        query = item.food_query.strip()
        if not query:
            raise HTTPException(status_code=400, detail="Every meal item needs a food description.")
        carbs_per_portion = _estimate_carbs_from_text(query)
        meal_items.append({
            "food_query": query,
            "quantity": item.quantity,
            "carbs_per_portion_g": carbs_per_portion,
            "carbs_g": round(carbs_per_portion * item.quantity, 1),
        })

    meal_carbs = round(sum(item["carbs_g"] for item in meal_items), 1)
    baseline_icr = payload.baseline_icr if payload.baseline_icr is not None else patient.get("baseline_icr") or 12
    estimated_units = max(0.5, round(meal_carbs / baseline_icr, 1))
    meal_summary = " + ".join(
        f'{item["quantity"]:g} × {item["food_query"]}' for item in meal_items
    )

    now = _iso_now()
    calibration_count = sum(item.get("type") == "calibration" for item in patient.get("history", []))
    explanation = f"Estimated from {meal_carbs:g} g total carbohydrates using the entered ratio of 1 unit per {baseline_icr:g} g."
    alerts = ["This is an estimate, not a prescription. Follow your clinician's dosing plan."]
    prediction = {
        "food_name": meal_summary,
        "meals": meal_items,
        "quantity": sum(item["quantity"] for item in meal_items),
        "carbs_per_portion_g": None if len(meal_items) != 1 else meal_items[0]["carbs_per_portion_g"],
        "meal_time": payload.meal_time or "Lunch",
        "carb_estimate_g": meal_carbs,
        "carbs_g": meal_carbs,
        "carb_ratio_g_per_u": baseline_icr,
        "effective_icr": baseline_icr,
        "estimated_units": estimated_units,
        "predicted_units": estimated_units,
        "suggested_pen_units": estimated_units,
        "confidence": "moderate",
        "model_type": "carbohydrate-ratio estimate",
        "training_samples": calibration_count,
        "explanation": explanation,
        "alerts": alerts,
    }

    patient.setdefault("history", []).append({
        "id": uuid.uuid4().hex,
        "type": "meal_prediction",
        "created_at": now,
        "timestamp": now,
        "meal_query": meal_summary,
        "food_query": meal_summary,
        "meals": meal_items,
        "quantity": sum(item["quantity"] for item in meal_items),
        "carbs_per_portion_g": None if len(meal_items) != 1 else meal_items[0]["carbs_per_portion_g"],
        "carbs_g": meal_carbs,
        "carb_estimate_g": meal_carbs,
        "meal_time": payload.meal_time or "Lunch",
        "carb_ratio_g_per_u": baseline_icr,
        "effective_icr": baseline_icr,
        "confidence": prediction["confidence"],
        "model_type": prediction["model_type"],
        "training_samples": calibration_count,
        "estimated_units": estimated_units,
        "predicted_units": estimated_units,
        "explanation": explanation,
        "alerts": alerts,
    })
    patient["updated_at"] = now
    _persist_patient(patient_id)
    return {"insulin_prediction": prediction}


@app.post("/api/v1/patients/{patient_id}/quick-calibrate")
def quick_calibrate(patient_id: str, payload: CalibrationRequest) -> Dict[str, Any]:
    patient = _get_patient(patient_id)
    query = (payload.meal_query or "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="meal_query is required.")
    if payload.actual_units <= 0:
        raise HTTPException(status_code=400, detail="actual_units must be greater than zero.")

    carbs = _estimate_carbs_from_text(query)
    adjusted_icr = round(max(1.0, carbs / payload.actual_units), 1)
    patient["baseline_icr"] = adjusted_icr
    patient["updated_at"] = _iso_now()
    now = _iso_now()
    patient.setdefault("history", []).append({
        "id": uuid.uuid4().hex,
        "type": "calibration",
        "created_at": now,
        "timestamp": now,
        "meal_query": query,
        "food_query": query,
        "carbs_g": carbs,
        "carb_estimate_g": carbs,
        "actual_units": payload.actual_units,
        "meal_time": payload.meal_time or "Lunch",
        "adjusted_icr": adjusted_icr,
    })
    patient["updated_at"] = now
    _persist_patient(patient_id)
    return {
        "updated_patient": patient,
        "calibration": {
            "meal_query": query,
            "actual_units": payload.actual_units,
            "meal_time": payload.meal_time or "Lunch",
            "adjusted_icr": adjusted_icr,
        },
    }


@app.get("/api/v1/patients/{patient_id}/history")
def history(patient_id: str, limit: int = Query(default=20, ge=1, le=100)) -> Dict[str, Any]:
    patient = _get_patient(patient_id)
    history_items = list(reversed(patient.get("history", [])[-limit:]))
    return {"patient_id": patient_id, "history": history_items}


def _chat_fallback(messages: List[ChatMessage]) -> str:
    latest = next((message.content for message in reversed(messages) if message.role == "user"), "")
    latest_lower = latest.lower()
    if "hba1c" in latest_lower:
        return "HbA1c is an average blood sugar measure over 2–3 months. In DiaCare, it is estimated from your recent glucose readings and can help track your long-term control."
    if "insulin" in latest_lower or "meal" in latest_lower or "carb" in latest_lower:
        return "For meal insulin, DiaCare estimates the dose by looking at the meal description, carbohydrate estimate, and your carb ratio. A realistic starting point is to enter a meal and adjust the carb ratio based on real-life readings."
    if "reading" in latest_lower or "tracker" in latest_lower or "glucose" in latest_lower:
        return "Use the Daily Habit Tracker to log fasting and post-meal readings. DiaCare then uses those values to estimate HbA1c and highlight patterns that may need attention."
    if not latest:
        return "Ask about HbA1c, insulin, meal planning, or how to log readings in DiaCare."
    return f"Here is a quick answer: focus on consistent logging, review your recent glucose patterns, and speak with your clinician for personalized targets and treatment changes."


@app.post("/api/v1/chat")
async def chat(request: ChatRequest) -> Dict[str, str]:
    if not request.messages:
        raise HTTPException(status_code=400, detail="At least one chat message is required.")

    api_key = os.getenv("OPENAI_API_KEY")
    model_name = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
    if api_key and OpenAI is not None:
        try:
            client = OpenAI(api_key=api_key)
            messages_payload = [{"role": message.role, "content": message.content} for message in request.messages]
            response = client.responses.create(
                model=model_name,
                input=messages_payload,
            )
            text = getattr(response, "output_text", None) or "I’m here to help."
            return {"reply": str(text)}
        except Exception:
            pass

    return {"reply": _chat_fallback(request.messages)}
