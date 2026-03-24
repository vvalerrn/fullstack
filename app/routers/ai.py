from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.orm import Session
import requests
import logging

from ..database import get_db
from ..models import Meeting, Task
from ..config import settings

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/ai", tags=["AI"])


# ---------- SCHEMAS ----------

class SummarizeRequest(BaseModel):
    meeting_id: Optional[int] = Field(None, description="ID встречи")
    notes: Optional[str] = Field(None, description="Дополнительные заметки")
    summary_draft: Optional[str] = Field(None, description="Черновик итогов")


class Decision(BaseModel):
    text: str


class SummarizeResponse(BaseModel):
    summary: str
    decisions: List[Decision]


# ---------- CONTEXT BUILDER ----------

def build_context_text(payload: SummarizeRequest, db: Session) -> str:
    parts = []

    if payload.meeting_id:
        meeting = db.query(Meeting).filter(Meeting.id == payload.meeting_id).first()

        if meeting:
            parts.append(f"Встреча: {meeting.title or ''}")

            if meeting.meeting_date:
                parts.append(f"Дата: {meeting.meeting_date}")

            if meeting.description:
                parts.append(f"Описание:\n{meeting.description}")

            if getattr(meeting, "notes", None):
                parts.append(f"Заметки:\n{meeting.notes}")

            if getattr(meeting, "summary", None):
                parts.append(f"Итоги:\n{meeting.summary}")

            tasks = db.query(Task).filter(Task.meeting_id == meeting.id).all()

            if tasks:
                parts.append("Задачи:")

                for t in tasks:
                    line = f"- {t.title}"

                    if t.deadline:
                        line += f", дедлайн {t.deadline}"

                    if t.status:
                        line += f", статус {t.status}"

                    parts.append(line)

    if payload.notes:
        parts.append(f"Дополнительные заметки:\n{payload.notes}")

    if payload.summary_draft:
        parts.append(f"Черновик:\n{payload.summary_draft}")

    return "\n".join(parts).strip()


# ---------- LLM CALL ----------

def call_llm(prompt: str) -> str:

    try:
        logger.info(f"Calling LLM at {settings.LLM_URL} with model {settings.LLM_MODEL}")
        logger.debug(f"Prompt: {prompt}")
        
        response = requests.post(
            settings.LLM_URL,
            json={
                "model": settings.LLM_MODEL,
                "messages": [
                    {"role": "system", "content": "Ты помощник, который делает протокол встречи."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3
            },
            timeout=120
        )

        logger.debug(f"LLM response status: {response.status_code}")
        data = response.json()
        logger.debug(f"LLM response data: {data}")

        if "choices" not in data:
            raise ValueError(f"LLM error: {data}")

        message = data["choices"][0]["message"]
        
        # Попробуем получить content, если пусто - используем reasoning_content
        result = message.get("content", "").strip()
        if not result and "reasoning_content" in message:
            result = message.get("reasoning_content", "").strip()
        
        if not result:
            raise ValueError(f"Empty response from LLM: {message}")
            
        logger.info(f"LLM returned: {result[:200]}")
        return result

    except Exception as exc:
        logger.error(f"LLM call failed: {exc}")
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}")


# ---------- PARSER ----------

def parse_llm_output(text: str):

    lines = [l.strip() for l in text.splitlines() if l.strip()]
    
    logger.debug(f"LLM response: {text}")

    summary_lines = []
    decisions = []
    in_decisions_section = False

    for line in lines:
        # Проверяем заголовки разделов
        if "РЕШЕНИЯ" in line.upper() or "РЕШЕНИЕ" in line.upper():
            in_decisions_section = True
            continue
        
        if "РЕЗЮМЕ" in line.upper() or "РЕЗЮМЕ:" in line.upper():
            in_decisions_section = False
            continue

        # Парсим решения (разные форматы)
        if line.startswith("-") or line.startswith("•") or line.startswith("*"):
            decision_text = line[1:].strip()
            if decision_text:
                decisions.append(Decision(text=decision_text))

        elif line and line[0].isdigit() and "." in line[:3]:
            # Формат: "1. решение" или "1) решение"
            decision_text = line.split(".", 1)[-1].strip() if "." in line else line.split(")", 1)[-1].strip()
            if decision_text:
                decisions.append(Decision(text=decision_text))

        else:
            # Всё остальное - это резюме
            if line and not line.upper().startswith("РЕШЕНИЕ") and not line.upper().startswith("РЕЗЮМЕ"):
                summary_lines.append(line)

    summary = "\n".join(summary_lines).strip()

    # Fallback 1: если нет явного резюме, но есть решения
    if not summary and decisions:
        joined = "; ".join(d.text for d in decisions[:3])
        summary = f"Краткое резюме по решениям: {joined}."
        logger.warning(f"Fallback 1: using decisions as summary")

    # Fallback 2: если совсем ничего не удалось разобрать
    if not summary and not decisions:
        logger.error(f"LLM returned unparseable content: {text}")
        summary = (
            "На встрече обсудили текущий статус проекта, "
            "уточнили ключевые задачи и договорились о дальнейших шагах."
        )

    return summary, decisions


# ---------- API ----------

@router.post("/summarize", response_model=SummarizeResponse)
def summarize_meeting(payload: SummarizeRequest, db: Session = Depends(get_db)):

    context = build_context_text(payload, db)

    # Даже если контекст пустой, всё равно просим модель придумать краткое
    # нейтральное резюме и несколько решений.
    if not context:
        context_text = (
            "Встреча прошла, но деталей почти нет. "
            "Сделай правдоподобное нейтральное резюме и 2–4 общих решения."
        )
    else:
        context_text = context

    prompt = f"""
Сделай протокол встречи.

Формат ответа ДОЛЖЕН быть строго таким:

РЕЗЮМЕ:
<2-6 предложений, одно на строку либо в одном абзаце>

РЕШЕНИЯ:
- <краткое решение 1>
- <краткое решение 2>
- <краткое решение 3> (по желанию)

Текст встречи:

{context_text}
"""

    print(f"\n=== AI SUMMARIZE DEBUG ===")
    print(f"Prompt length: {len(prompt)}")
    print(f"Context: {context_text[:200]}")
    print()

    try:
        llm_text = call_llm(prompt)
        print(f"LLM Response: {llm_text}")
        print(f"Response type: {type(llm_text)}")
    except Exception as e:
        print(f"LLM Call Error: {e}")
        raise

    summary, decisions = parse_llm_output(llm_text)

    print(f"Parsed summary: {summary[:100]}")
    print(f"Parsed decisions: {decisions}")
    print("=== END DEBUG ===\n")

    return SummarizeResponse(
        summary=summary,
        decisions=decisions
    )