import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Dynamically find the root .env file relative to this main.py file
BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path)

# Initialize the core FastAPI engine instance
app = FastAPI(title="Verdict AI Decision Intelligence Platform")

# Retrieve the API key from the environment variables safely
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError(f"Critical System Failure: GEMINI_API_KEY variable is missing from the environment configuration. Looked in: {env_path}")

# Initialize the official modern Google GenAI Client
client = genai.Client(api_key=GEMINI_API_KEY)

# Define the structured data template for incoming request validations
class DecisionRequest(BaseModel):
    prompt: str

# System instructions to explicitly govern the AI's persona and analytical layout framework
VERDICT_SYSTEM_INSTRUCTION = """
You are Verdict, an elite executive decision-intelligence engine. Your goal is to eliminate cognitive overload and provide immediate clarity.
Analyze the user's situation and format your response strictly using these exact section headers in ALL CAPS, with no markdown hashes (#) on the headers:

QUICK RECOMMENDATION:
Provide a 1-2 sentence decisive action path.

DETAILED ANALYSIS:
Deconstruct the core trade-offs and structural mechanics of the decision.

PROS & CONS:
Use clean bullet points starting with ' * ' for both pros and cons.

RISKS & TRADE-OFFS:
Highlight critical downside exposures or hidden friction points.

PRACTICAL EXECUTION ROADMAP:
Provide actionable 3-4 sequential steps to implement immediately.

Keep the tone objective, highly articulate, direct, and authoritative. Avoid fluff, filler phrases, or soft conversational intros.
"""

@app.post("/api/decide")
async def generate_decision_stream(request: DecisionRequest):
    """
    POST API Endpoint that connects to the Google Gemini API, captures the response token
    by token, and streams live text directly down to the Vanilla JavaScript client wrapper.
    """
    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="The decision prompt parameter cannot be blank.")
        
    try:
        # Request a real-time token stream from the Gemini 2.5 Flash model
        response_stream = client.models.generate_content_stream(
            model='gemini-2.5-flash',
            contents=request.prompt,
            config=types.GenerateContentConfig(
                system_instruction=VERDICT_SYSTEM_INSTRUCTION,
                temperature=0.3, # Muted creativity setting for predictable, highly logical outcomes
            )
        )
        
        # Generator function that iterates over return chunks and feeds them into the response pipe
        def text_chunk_generator():
            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text

        return StreamingResponse(text_chunk_generator(), media_type="text/plain")

    except Exception as system_exception:
        print(f"Gemini API Operational Error: {str(system_exception)}")
        raise HTTPException(status_code=500, detail=f"Internal decision processing anomaly: {str(system_exception)}")

# Dynamically locate the Frontend directory relative to the project root
frontend_dir = BASE_DIR / "Frontend"

# Mount the static frontend assets directory securely
app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")

