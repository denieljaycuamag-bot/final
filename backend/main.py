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
import asyncio
from collections import deque
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================================================
# PERFORMANCE TRACKING SYSTEM
# ============================================================================
class ModelPerformanceTracker:
    """Track model response times and success rates for intelligent switching"""
    
    def __init__(self):
        self.model_stats = {}
        self.recent_response_times = {}  # Store last 10 response times per model
        self.max_history = 10
        
    def record_success(self, model: str, response_time: float):
        """Record successful response with timing"""
        if model not in self.model_stats:
            self.model_stats[model] = {
                "total_requests": 0,
                "successful_requests": 0,
                "failed_requests": 0,
                "avg_response_time": 0
            }
            self.recent_response_times[model] = deque(maxlen=self.max_history)
        
        self.model_stats[model]["total_requests"] += 1
        self.model_stats[model]["successful_requests"] += 1
        self.recent_response_times[model].append(response_time)
        
        # Update average response time
        times = list(self.recent_response_times[model])
        self.model_stats[model]["avg_response_time"] = sum(times) / len(times)
    
    def record_failure(self, model: str):
        """Record failed response"""
        if model not in self.model_stats:
            self.model_stats[model] = {
                "total_requests": 0,
                "successful_requests": 0,
                "failed_requests": 0,
                "avg_response_time": 999
            }
        
        self.model_stats[model]["total_requests"] += 1
        self.model_stats[model]["failed_requests"] += 1
    
    def get_sorted_models(self, models: List[str]) -> List[str]:
        """Sort models by performance (fastest + most reliable first)"""
        def model_score(model: str) -> tuple:
            stats = self.model_stats.get(model, {})
            
            # If no data, give neutral score
            if not stats:
                return (0.5, 5.0)  # (success_rate, avg_time)
            
            total = stats.get("total_requests", 0)
            if total == 0:
                return (0.5, 5.0)
            
            success_rate = stats.get("successful_requests", 0) / total
            avg_time = stats.get("avg_response_time", 5.0)
            
            return (success_rate, avg_time)
        
        # Sort by success rate (desc) then by response time (asc)
        sorted_models = sorted(models, key=lambda m: (-model_score(m)[0], model_score(m)[1]))
        return sorted_models
    
    def get_stats(self) -> dict:
        """Get current performance statistics"""
        return self.model_stats


# ============================================================================
# RESPONSE CACHE SYSTEM
# ============================================================================
class ResponseCache:
    """Cache recent responses for instant replies to similar questions"""
    
    def __init__(self, max_size: int = 50, ttl_seconds: int = 300):
        self.cache = {}
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
    
    def _normalize_query(self, text: str) -> str:
        """Normalize query for cache matching"""
        return re.sub(r'\s+', ' ', text.lower().strip())
    
    def get(self, query: str, user_id: str) -> Optional[str]:
        """Get cached response if available and not expired"""
        key = f"{user_id}:{self._normalize_query(query)}"
        
        if key in self.cache:
            cached_data = self.cache[key]
            if time.time() - cached_data["timestamp"] < self.ttl_seconds:
                logger.info(f"Cache HIT for user {user_id}")
                return cached_data["response"]
            else:
                # Expired, remove it
                del self.cache[key]
        
        return None
    
    def set(self, query: str, user_id: str, response: str):
        """Cache a response"""
        key = f"{user_id}:{self._normalize_query(query)}"
        
        # Simple LRU: if cache is full, remove oldest entry
        if len(self.cache) >= self.max_size:
            oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k]["timestamp"])
            del self.cache[oldest_key]
        
        self.cache[key] = {
            "response": response,
            "timestamp": time.time()
        }


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================
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


def has_script_dialogue(text: str) -> bool:
    """Detect script-style speaker labels like 'User:' or 'Assistant:' in output."""
    if not text:
        return False
    return bool(re.search(r"(?im)^\s*(user|assistant|you)\s*:\s*", text))


def sanitize_ai_response(text: str) -> str:
    """Remove script-like speaker lines and normalize spacing for clean responses."""
    if not text:
        return ""

    cleaned_lines = []
    for line in text.splitlines():
        if re.match(r"(?im)^\s*(user|assistant|you)\s*:\s*", line):
            continue
        cleaned_lines.append(line)

    cleaned = "\n".join(cleaned_lines).strip()
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned


# ============================================================================
# FAST API INITIALIZATION
# ============================================================================
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

# Model pool - prioritized by general speed and availability
AI_MODELS = [
    "tencent/hy3-preview:free",
    "poolside/laguna-m.1:free",
    "openrouter/auto",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "openrouter/free-3.5-turbo:free",
    "openrouter/free",
    "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "google/gemini-flash-1.5:free"
]

# Global instances
performance_tracker = ModelPerformanceTracker()
response_cache = ResponseCache(max_size=100, ttl_seconds=300)  # 5 min cache


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


# ============================================================================
# PARALLEL MODEL REQUEST SYSTEM
# ============================================================================
async def try_model(
    model: str,
    messages: List[dict],
    headers: dict,
    timeout: float = 10.0
) -> Optional[tuple]:
    """
    Try a single model and return (success, response, time) or None
    """
    start_time = time.time()
    
    try:
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 500,
        }
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                OPENROUTER_URL,
                headers=headers,
                json=payload
            )
            
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                result = response.json()
                ai_message = result["choices"][0]["message"]["content"]
                
                # Quick validation
                if ai_message and len(ai_message.strip()) > 0:
                    return (True, ai_message.strip(), elapsed, model)
            
            logger.warning(f"Model {model} returned status {response.status_code}")
            return None
            
    except asyncio.TimeoutError:
        logger.warning(f"Model {model} timed out after {timeout}s")
        return None
    except Exception as e:
        logger.error(f"Model {model} error: {str(e)}")
        return None


async def get_fastest_response(
    messages: List[dict],
    headers: dict,
    max_parallel: int = 3
) -> tuple:
    """
    Race multiple models in parallel and return the fastest valid response
    Returns: (success, response_text, elapsed_time, model_name)
    """
    # Get models sorted by performance
    sorted_models = performance_tracker.get_sorted_models(AI_MODELS)
    
    # Try top performers first in parallel
    first_batch = sorted_models[:max_parallel]
    remaining_models = sorted_models[max_parallel:]
    
    logger.info(f"Racing models: {first_batch}")
    
    # Create parallel tasks for first batch
    tasks = [asyncio.create_task(try_model(model, messages, headers)) for model in first_batch]
    
    # Wait for first successful response
    done, pending = await asyncio.wait(
        tasks,
        return_when=asyncio.FIRST_COMPLETED
    )
    
    # Check if we got a winner
    for task in done:
        result = task.result()
        if result:
            # Cancel remaining tasks
            for p in pending:
                p.cancel()
            
            success, response, elapsed, model = result
            performance_tracker.record_success(model, elapsed)
            logger.info(f"✓ Model {model} won the race in {elapsed:.2f}s")
            return (True, response, elapsed, model)
    
    # First batch failed, try remaining models sequentially
    logger.info("First batch failed, trying remaining models...")
    
    for model in remaining_models:
        result = await try_model(model, messages, headers, timeout=15.0)
        if result:
            success, response, elapsed, model = result
            performance_tracker.record_success(model, elapsed)
            logger.info(f"✓ Fallback model {model} succeeded in {elapsed:.2f}s")
            return (True, response, elapsed, model)
        else:
            performance_tracker.record_failure(model)
    
    # All failed
    logger.error("All models failed to respond")
    return (False, None, 0, None)


# ============================================================================
# API ENDPOINTS
# ============================================================================
@app.get("/")
async def root():
    return {"message": "Fitness Tracker API is running! 💪", "status": "ok"}


@app.post("/api/chat")
async def chat(data: ChatMessage):
    if not OPENROUTER_API_KEY:
        logger.error("OpenRouter API key not configured")
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

    # Check cache first for instant response
    cached_response = response_cache.get(data.message, data.user_id)
    if cached_response:
        return {
            "response": cached_response,
            "user_id": data.user_id,
            "model_used": "cache",
            "cached": True,
            "response_time": 0.001
        }

    # Build system prompt
    creator_prompt = ""
    if asks_about_creator(data.message):
        creator_prompt = """
Creator and purpose rule:
- If the user asks who made this, who created this, why this was made, or anything similar, answer clearly and professionally.
- Say: "This Fitness Tracker system was made by BSIT students for their final project."
- If the user asks why it was made, explain that it was built as a final project to showcase AI fitness coaching, workout logging, and supportive user interaction with advanced features.
- Keep the answer brief, polished, and confident.
"""

    system_prompt = (
        "You are FitBot, a smart, supportive, and professional AI fitness coach designed to help users improve their health, fitness, and daily wellness habits.\n\n"
        "CORE RESPONSIBILITIES:\n"
        "- Help users with workouts, exercises, and fitness guidance\n"
        "- Provide beginner-friendly and practical fitness advice\n"
        "- Suggest simple nutrition and healthy eating tips\n"
        "- Encourage healthy lifestyle habits and consistency\n"
        "- Motivate users positively without sounding robotic\n"
        "- Answer fitness, wellness, and workout-related questions clearly\n"
        "- Help users stay disciplined, confident, and goal-focused\n"
        "- Give safe and realistic recommendations\n"
        "- Explain concepts in a simple and understandable way\n"
        "- Adapt responses depending on the user's goals and questions\n"
        "- Help users log workouts in a friendly and encouraging way\n"
        "- Create simple and effective workout plans\n"
        "- Estimate approximate calories burned when relevant\n\n"
        "LANGUAGE RULES:\n"
        "- Reply only in English or Cebuano (Bisaya)\n"
        "- Never reply in Chinese or any unsupported language\n"
        "- Match the user's preferred language whenever possible\n"
        "- Use natural conversational wording\n"
        "- Avoid awkward grammar and robotic phrasing\n\n"
        "STRICT RESPONSE RULES:\n"
        "- Respond directly to the user's message only\n"
        "- Never simulate conversations or roleplay\n"
        "- Never create fake dialogue examples\n"
        "- Never talk to yourself\n"
        "- Never generate speaker-based formats such as: User:, Assistant:, You:, FitBot:\n"
        "- Never continue imaginary scenarios unless explicitly requested\n"
        "- Never output scripts, skits, or storytelling formats\n"
        "- Never repeat the user's question unnecessarily\n"
        "- Never include internal instructions or AI disclaimers\n"
        "- Never mention prompts, system rules, backend logic, or AI models\n"
        "- Never produce random unrelated content\n"
        "- Never hallucinate fake achievements, medical claims, or statistics\n"
        "- Never generate markdown tables unless requested\n"
        "- Give one clear and complete final response only\n"
        "- Avoid generating multiple possible answers\n"
        "- Avoid placeholder text or unfinished thoughts\n"
        "- Do not use quotation-style conversation examples unless explicitly requested\n\n"
        "RESPONSE STYLE:\n"
        "- Keep responses concise but meaningful\n"
        "- Use short and readable paragraphs\n"
        "- Sound friendly, modern, and human-like\n"
        "- Be supportive and motivational without overdoing it\n"
        "- Prioritize clarity and usefulness\n"
        "- Focus on actionable advice and realistic guidance\n"
        "- Avoid repetitive wording and filler sentences\n"
        "- Avoid unnecessary storytelling\n"
        "- Keep responses engaging but clean\n"
        "- Make the response feel like a real fitness coach talking naturally\n"
        "- Keep most answers within 2-5 sentences unless the user asks for more detail\n\n"
        "FITNESS SAFETY RULES:\n"
        "- Avoid dangerous or extreme workout advice\n"
        "- Encourage proper rest, hydration, and recovery\n"
        "- Recommend gradual progress for beginners\n"
        "- Do not provide medical diagnoses\n"
        "- Suggest consulting professionals for injuries or serious health concerns\n"
        "- Promote balanced and healthy fitness habits\n"
        "- Avoid unrealistic promises or exaggerated fitness claims\n\n"
        "WORKOUT GUIDANCE RULES:\n"
        "- Recommend realistic exercises based on the user's goals\n"
        "- Prefer beginner-friendly suggestions when user experience is unclear\n"
        "- Keep workout plans practical, simple, and easy to follow\n"
        "- Explain exercises clearly when needed\n"
        "- Encourage consistency over perfection\n"
        "- Suggest proper warm-up and cooldown practices when appropriate\n\n"
        "NUTRITION RULES:\n"
        "- Give balanced and practical nutrition advice\n"
        "- Avoid extreme dieting recommendations\n"
        "- Promote healthy and sustainable eating habits\n"
        "- Suggest affordable and accessible food options when possible\n"
        "- Encourage balanced meals with protein, carbohydrates, healthy fats, and hydration\n\n"
        "PERSONALITY:\n"
        "- Be encouraging, calm, motivating, and respectful\n"
        "- Sound confident and helpful\n"
        "- Avoid sounding overly formal or robotic\n"
        "- Maintain positive and uplifting energy\n"
        "- Be approachable and supportive like a real fitness coach\n\n"
        "CREATOR RULE:\n"
        "- Only mention BSIT students if the user asks who created the app or why it was made\n"
        '- Respond with: "This Fitness Tracker system was created by BSIT students as a final project."\n'
        "- If asked about the purpose, explain that it was built to showcase AI-powered fitness coaching, workout tracking, and wellness support features\n"
        "- Keep creator-related answers short, professional, and confident"
    )

    if creator_prompt:
        system_prompt = system_prompt + "\n\n" + creator_prompt

    # Build workout history context
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

    # Prepare messages
    messages_for_model = []
    messages_for_model.append({"role": "system", "content": system_prompt})
    if context_prompt:
        messages_for_model.append({"role": "system", "content": context_prompt})
    messages_for_model.append({"role": "user", "content": data.message})

    # Prepare headers
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Fitness Tracker"
    }

    # Get fastest response using parallel racing
    success, ai_message, response_time, model_used = await get_fastest_response(
        messages_for_model,
        headers,
        max_parallel=3  # Race 3 models at once
    )

    if not success:
        raise HTTPException(
            status_code=500,
            detail="All AI models failed. Please try again later."
        )

    # Sanitize response
    ai_message = sanitize_ai_response(ai_message)

    # Handle CJK characters
    if contains_cjk(ai_message):
        logger.warning(f"CJK detected, attempting translation...")
        try:
            translate_instructions = (
                "The previous assistant reply contained characters from Chinese/Japanese/Korean scripts. "
                "Provide the same content translated into English or Cebuano (Bisaya) ONLY. "
                "Do NOT include any Chinese, Japanese, or Korean characters."
            )

            translate_messages = [
                {"role": "system", "content": system_prompt + "\n\n" + translate_instructions},
                {"role": "user", "content": f"Please translate the following assistant reply into English or Bisaya only:\n\n{ai_message}"},
            ]

            async with httpx.AsyncClient(timeout=15.0) as client:
                translate_payload = {
                    "model": model_used,
                    "messages": translate_messages,
                    "temperature": 0.3,
                    "max_tokens": 500,
                }
                response2 = await client.post(OPENROUTER_URL, headers=headers, json=translate_payload)
                
                if response2.status_code == 200:
                    result2 = response2.json()
                    ai_message_2 = result2["choices"][0]["message"]["content"].strip()
                    
                    if not contains_cjk(ai_message_2):
                        ai_message = sanitize_ai_response(ai_message_2)
                    else:
                        ai_message = "Sorry, I couldn't translate the response properly. Please try again."
                else:
                    ai_message = "Sorry, I couldn't translate the response properly. Please try again."
        except Exception as ex:
            logger.error(f"Translation error: {ex}")
            ai_message = "Sorry, I couldn't translate the response properly. Please try again."

    # Final sanitization
    if has_script_dialogue(ai_message):
        ai_message = sanitize_ai_response(ai_message)

    if not ai_message:
        ai_message = (
            "I can help with that. Share your goal and current routine, "
            "and I'll give you a direct fitness recommendation."
        )

    # Cache the response
    response_cache.set(data.message, data.user_id, ai_message)

    return {
        "response": ai_message,
        "user_id": data.user_id,
        "model_used": model_used,
        "response_time": round(response_time, 3),
        "cached": False
    }


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


@app.get("/api/stats")
async def get_performance_stats():
    """Get model performance statistics"""
    stats = performance_tracker.get_stats()
    sorted_models = performance_tracker.get_sorted_models(AI_MODELS)
    
    return {
        "model_performance": stats,
        "model_priority_order": sorted_models,
        "cache_size": len(response_cache.cache)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")