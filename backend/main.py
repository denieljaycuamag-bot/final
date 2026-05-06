from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv
import logging
from typing import Dict, List, Optional
from datetime import datetime
import re
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def contains_cjk(text: str) -> bool:
    """Return True if text contains CJK (Chinese/Japanese/Korean) characters."""
    if not text:
        return False
    return bool(re.search(r"[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u3000-\u303F]", text))


def asks_about_creator(text: str) -> bool:
    """Return True when the user is asking who made the app or why it was made."""
    if not text:
        return False

    normalized = text.lower()
    keywords = [
        "who made this",
        "who created this",
        "who built this",
        "who developed this",
        "made this",
        "created this",
        "built this",
        "developed this",
        "why made this",
        "why was this made",
        "why is this made",
        "why create this",
        "why did you make this",
        "about the creator",
        "who is the creator",
        "final project",
    ]

    return any(keyword in normalized for keyword in keywords)

load_dotenv()

app = FastAPI()
allowed_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if origin.strip()]
allowed_origin_regex = os.getenv("CORS_ORIGIN_REGEX", r"https://.*\\.vercel\\.app$")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allowed_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

AI_MODELS = [
    "openrouter/auto",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "openrouter/free-3.5-turbo:free",
    "openrouter/free",
    "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "google/gemini-flash-1.5:free"
]

class ChatMessage(BaseModel):
    message: str
    user_id: str


class WorkoutLog(BaseModel):
    exercise: str
    reps: int
    user_id: str
    sets: int = 1
    duration_minutes: int = 0
    notes: Optional[str] = None


workout_history: Dict[str, List[dict]] = {}


@app.get("/")
async def root():
    return {"message": "Fitness Tracker API is running! 💪", "status": "ok"}


@app.post("/api/chat")
async def chat(data: ChatMessage):

    if not OPENROUTER_API_KEY:
        logger.error("OpenRouter API key not configured")
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

    creator_prompt = ""
    if asks_about_creator(data.message):
        creator_prompt = """
Creator and purpose rule:
- If the user asks who made this, who created this, why this was made, or anything similar, answer clearly and professionally.
- Say: "This Fitness Tracker system was made by BSIT students for their final project."
- If the user asks why it was made, explain that it was built as a final project to showcase AI fitness coaching, workout logging, and supportive user interaction with advanced features.
- Keep the answer brief, polished, and confident.
"""

    system_prompt = """You are an enthusiastic and knowledgeable AI fitness coach named FitBot. Your role is to:

1. Help users log their workouts in a friendly way
2. Provide encouragement and motivation
3. Give practical fitness advice
4. Answer nutrition questions
5. Create simple workout plans
6. Calculate approximate calories burned

Important language rules:
- Always reply only in Cebuano (Bisaya) or English. Do NOT reply in Chinese or any other language.
- If the user writes in a different language, respond in English or Bisaya (prefer the user's language if it's English or Bisaya).

Response tone and format:
- Keep responses concise (2-4 sentences), friendly, and actionable.
- Use a supportive, energetic tone without being overwhelming.

Only mention Deniel Cuamag when the user asks who made this, who created this, why it was made, or a similar question about the creator or purpose.

Examples:
User: "I did 20 pushups"
You: "Great work! 20 pushups is solid. That burned approximately 30-40 calories. Keep building that upper body strength! — Deniel Cuamag"

User: "Give me a workout plan"
You: "I'd love to help! What's your main goal - building muscle, losing weight, or general fitness? And how many days per week can you commit?"
"""

    if creator_prompt:
        system_prompt = system_prompt + "\n\n" + creator_prompt
    
    last_error = None
  
    for model in AI_MODELS:
        try:
            logger.info(f"Trying model: {model}")
            
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Fitness Tracker"
            }

            history = workout_history.get(data.user_id, [])
            context_lines = []
            if history:
                for e in history[-6:]:
                    parts = []
                    if e.get("exercise"):
                        parts.append(str(e.get("exercise")))
                    sets = e.get("sets")
                    reps = e.get("reps")
                    if sets or reps:
                        parts.append(f"{sets} sets x {reps} reps")
                    if e.get("duration_minutes"):
                        parts.append(f"{e.get('duration_minutes')} min")
                    if e.get("notes"):
                        parts.append(f"notes: {e.get('notes')}")
                    ts = e.get("timestamp")
                    context_lines.append(" | ".join(parts) + (f" ({ts})" if ts else ""))

            context_prompt = ""
            if context_lines:
                context_prompt = "Recent workouts:\n" + "\n".join(context_lines)

            messages_for_model = []
       
            messages_for_model.append({"role": "system", "content": system_prompt})
           
            if context_prompt:
                messages_for_model.append({"role": "system", "content": context_prompt})
            
            messages_for_model.append({"role": "user", "content": data.message})

            payload = {
                "model": model,
                "messages": messages_for_model,
                "temperature": 0.7,
                "max_tokens": 500,
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    OPENROUTER_URL,
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    result = response.json()
                    ai_message = result["choices"][0]["message"]["content"]

                    ai_message = ai_message.strip()
                    
                    if contains_cjk(ai_message):
                        logger.warning(f"CJK detected in model response for user {data.user_id} using {model}")
                        try:
                            translate_instructions = (
                                "The previous assistant reply contained characters from Chinese/Japanese/Korean scripts. "
                                "Provide the same content translated into English or Cebuano (Bisaya) ONLY. "
                                "Do NOT include any Chinese, Japanese, or Korean characters. "
                                "Keep the response concise and end with the signature: — Deniel Cuamag"
                            )

                            translate_messages = [
                                {"role": "system", "content": system_prompt + "\n\n" + translate_instructions},
                                {"role": "user", "content": f"Please translate the following assistant reply into English or Bisaya only:\n\n{ai_message}"},
                            ]

                            translate_payload = {
                                "model": model,
                                "messages": translate_messages,
                                "temperature": 0.3,
                                "max_tokens": 500,
                            }

                            response2 = await client.post(OPENROUTER_URL, headers=headers, json=translate_payload)
                            if response2.status_code == 200:
                                result2 = response2.json()
                                ai_message_2 = result2["choices"][0]["message"]["content"].strip()

                                if contains_cjk(ai_message_2):
                                    logger.warning(
                                        f"CJK still detected after translation retry for user {data.user_id} using {model}"
                                    )
                                    ai_message = (
                                        "Sorry, I couldn't translate the assistant reply right now. "
                                        "Please try again. — Deniel Cuamag"
                                    )
                                else:
                                    ai_message = ai_message_2
                            else:
                                logger.warning(f"Translation request failed with status {response2.status_code}")
                                ai_message = (
                                    "Sorry, I couldn't translate the assistant reply right now. "
                                    "Please try again."
                                )
                        except Exception as ex:
                            logger.error(f"Translation retry error: {ex}")
                            ai_message = (
                                "Sorry, I couldn't translate the assistant reply right now. "
                                "Please try again."
                            )

                    logger.info(f"Success with model: {model}")

                    return {
                        "response": ai_message,
                        "user_id": data.user_id,
                        "model_used": model
                    }
                else:
                    logger.warning(f"Model {model} failed with status {response.status_code}")
                    last_error = f"Status code: {response.status_code}"
                    continue
                    
        except Exception as e:
            logger.error(f"Error with model {model}: {str(e)}")
            last_error = str(e)
            continue
    
    logger.error(f"All models failed. Last error: {last_error}")
    raise HTTPException(
        status_code=500, 
        detail=f"All AI models failed. Please try again later. Error: {last_error}"
    )


@app.post("/api/workout/log")
async def log_workout(workout: WorkoutLog):
    """Log workout to database"""
    entry = {
        "exercise": workout.exercise,
        "reps": workout.reps,
        "sets": workout.sets,
        "duration_minutes": workout.duration_minutes,
        "notes": workout.notes,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    workout_history.setdefault(workout.user_id, []).append(entry)

    return {
        "message": "Workout logged successfully!",
        "data": {
            **workout.dict(),
            "timestamp": entry["timestamp"],
        }
    }


@app.get("/api/workouts/{user_id}")
async def get_workouts(user_id: str):
    """Get user's workout history"""
    return {
        "user_id": user_id,
        "workouts": workout_history.get(user_id, [])
    }


@app.put("/api/workouts/{user_id}/{workout_id}")
async def update_workout(user_id: str, workout_id: str, workout: WorkoutLog):
    """Update a workout in the history"""
    if user_id not in workout_history:
        raise HTTPException(status_code=404, detail="No workouts found for this user")
    
    for i, w in enumerate(workout_history[user_id]):
        if w.get("id") == workout_id or str(i) == workout_id:
            workout_history[user_id][i].update({
                "exercise": workout.exercise,
                "reps": workout.reps,
                "sets": workout.sets,
                "duration_minutes": workout.duration_minutes,
                "notes": workout.notes,
            })
            return {
                "message": "Workout updated successfully!",
                "data": workout_history[user_id][i]
            }
    
    raise HTTPException(status_code=404, detail="Workout not found")


@app.delete("/api/workouts/{user_id}/{workout_id}")
async def delete_workout(user_id: str, workout_id: str):
    """Delete a workout from the history"""
    if user_id not in workout_history:
        raise HTTPException(status_code=404, detail="No workouts found for this user")
    
    for i, w in enumerate(workout_history[user_id]):
        if w.get("id") == workout_id or str(i) == workout_id:
            deleted = workout_history[user_id].pop(i)
            return {
                "message": "Workout deleted successfully!",
                "deleted_workout": deleted
            }
    
    raise HTTPException(status_code=404, detail="Workout not found")


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "openrouter_configured": bool(OPENROUTER_API_KEY),
        "available_models": AI_MODELS
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")