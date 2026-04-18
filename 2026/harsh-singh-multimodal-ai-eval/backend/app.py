from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.prebuilt import create_react_agent
import assemblyai as aai
import os
import base64
import requests
import tempfile
import json

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
MURF_API_KEY = os.getenv("MURF_API_KEY")
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")

aai.settings.api_key = ASSEMBLYAI_API_KEY

model = init_chat_model(
    "google_genai:gemini-2.5-flash",
    api_key=GOOGLE_API_KEY
)

checkpointer = None
agent = None

question_count = 0
current_subject = ""
thread_id = "interview_session"

INTERVIEW_PROMPT = """You are Natalie, a friendly and conversational interviewer conducting a natural {subject} interview.

IMPORTANT GUIDELINES:
1. Ask exactly {total_questions} questions total throughout the interview
2. Keep questions SHORT and CRISP (1-2 sentences maximum)
3. ALWAYS reference what the candidate ACTUALLY said in their previous answer do NOT make up or assume their answers
4. Show genuine interest with brief acknowledgments based on their REAL responses
5. Adapt questions based on their ACTUAL responses go deeper if they're strong, adjust if uncertain
6. Be warm and conversational but CONCISE
7. No lengthy explanations just ask clear, direct questions

CRITICAL: Read the conversation history carefully. Only acknowledge what the candidate truly said, not what you think they might have said.

Keep it short, conversational, and adaptive!"""

FEEDBACK_PROMPT = """Based on our complete interview conversation, provide detailed feedback as JSON only:
    {{
    "subject": "<topic>",
    "candidate_score": <1-5>,
    "feedback": "<detailed strengths with specific examples from their ACTUAL answers>",
    "areas_of_improvement": "<constructive suggestions based on gaps you noticed>"
    }}
    Be specific reference ACTUAL things they said during the interview."""


app = Flask(__name__)

CORS(app,
     origins="*",
     expose_headers=["X-Question-Number", "X-Interview-Complete"],
     allow_headers=["Content-Type", "multipart/form-data"],
     methods=["GET", "POST", "OPTIONS"]
)


def stream_audio(text):
    """Convert text to speech using Murf.AI Falcon and stream audio chunks."""
    BASE_URL = "https://global.api.murf.ai/v1/speech/stream"
    payload = {
        "text": text,
        "voiceId": "en-US-natalie",
        "model": "FALCON",
        "multiNativeLocale": "en-US",
        "sampleRate": 24000,
        "format": "MP3",
    }
    headers = {
        "Content-Type": "application/json",
        "api-key": MURF_API_KEY,
    }
    response = requests.post(
        BASE_URL,
        headers=headers,
        data=json.dumps(payload),
        stream=True,
    )
    for chunk in response.iter_content(chunk_size=4096):
        if chunk:
            yield base64.b64encode(chunk).decode("utf-8") + "\n"


def speech_to_text(audio_path):
    """Convert audio file to text using AssemblyAI."""
    transcriber = aai.Transcriber()
    config = aai.TranscriptionConfig(
        speech_models=["universal-3-pro", "universal-2"],
        language_detection=True,
    )
    transcript = transcriber.transcribe(audio_path, config=config)
    return transcript.text if transcript.text else ""


@app.route("/start-interview", methods=["POST"])
def start_interview():
    """
    Start a fresh interview session.

    Accepts JSON body:
        subject        (str) — topic chosen or typed by the user
        total_questions (int) — number of questions, default 5
    """
    global question_count, current_subject, checkpointer, agent

    data = request.json
    current_subject = data.get("subject", "Python").strip()
    total_questions = int(data.get("total_questions", 5))

    if not current_subject:
        return jsonify({"error": "Subject cannot be empty."}), 400

    question_count = 1

    checkpointer = InMemorySaver()
    agent = create_react_agent(
        model=model,
        tools=[],
        checkpointer=checkpointer,
    )

    config = {"configurable": {"thread_id": thread_id}}
    formatted_prompt = INTERVIEW_PROMPT.format(
        subject=current_subject,
        total_questions=total_questions,
    )

    response = agent.invoke(
        {
            "messages": [
                {"role": "system", "content": formatted_prompt},
                {
                    "role": "user",
                    "content": (
                        f"Start the interview with a warm greeting and ask the first "
                        f"question about {current_subject}. Keep it SHORT (1-2 sentences)."
                    ),
                },
            ]
        },
        config=config,
    )

    question = response["messages"][-1].content
    print(f"\n[Question {question_count}] {question}")

    return Response(stream_audio(question), mimetype="text/plain")


@app.route("/submit-answer", methods=["POST"])
def submit_answer():
    """
    Receive a recorded audio answer, transcribe it,
    store it in agent memory, and return the next question as audio.
    """
    global question_count

    audio_file = request.files["audio"]
    total_questions = int(request.form.get("total_questions", 5))

    # Save audio to a temp file for AssemblyAI
    temp_path = tempfile.NamedTemporaryFile(delete=False, suffix=".webm").name
    audio_file.save(temp_path)

    answer = speech_to_text(temp_path)
    os.unlink(temp_path)

    if not answer or answer.strip() == "":
        answer = "[Candidate provided a verbal response]"

    print(f"[Answer {question_count}] {answer}")

    config = {"configurable": {"thread_id": thread_id}}

    # Store the answer in agent memory
    agent.invoke(
        {"messages": [{"role": "user", "content": answer}]},
        config=config,
    )

    if question_count >= total_questions:
        response = agent.invoke(
            {
                "messages": [
                    {
                        "role": "user",
                        "content": (
                            f"That was question {total_questions} — the final question. "
                            "Briefly acknowledge their ACTUAL answer and warmly let them "
                            "know the interview is now complete. Keep it SHORT."
                        ),
                    }
                ]
            },
            config=config,
        )
        closing_message = response["messages"][-1].content
        print(f"\n[Closing] {closing_message}")

        return Response(
            stream_audio(closing_message),
            mimetype="text/plain",
            headers={"X-Interview-Complete": "true"},
        )

    question_count += 1

    prompt = (
        f"The candidate just answered question {question_count - 1}.\n\n"
        "Look at their ACTUAL answer above. Do NOT assume or make up what they said.\n\n"
        f"Now ask question {question_count} of {total_questions}:\n"
        "1. Briefly acknowledge what they ACTUALLY said (1 sentence)\n"
        "2. Ask your next question that builds on their REAL response (1-2 sentences)\n"
        "3. If they said 'I don't know' or gave a wrong answer, acknowledge that and ask something simpler\n"
        "4. Keep the TOTAL response under 3 sentences\n\n"
        "Be conversational but CONCISE. Only reference what they truly said."
    )

    response = agent.invoke(
        {"messages": [{"role": "user", "content": prompt}]},
        config=config,
    )

    question = response["messages"][-1].content
    print(f"\n[Question {question_count}] {question}")

    return Response(
        stream_audio(question),
        mimetype="text/plain",
        headers={"X-Question-Number": str(question_count)},
    )


@app.route("/get-feedback", methods=["POST"])
def get_feedback():
    """Generate structured feedback for the completed interview."""
    config = {"configurable": {"thread_id": thread_id}}

    response = agent.invoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": (
                        f"{FEEDBACK_PROMPT}\n\n"
                        f"Review our complete {current_subject} interview conversation "
                        "and provide detailed feedback."
                    ),
                }
            ]
        },
        config=config,
    )

    text = response["messages"][-1].content
    print(f"\n[Feedback Generated]\n{text}\n")

    cleaned = text.strip()
    if "```" in cleaned:
        cleaned = cleaned.split("```")[1].replace("json", "").strip()

    try:
        feedback = json.loads(cleaned)
    except json.JSONDecodeError:
        feedback = {
            "subject": current_subject,
            "candidate_score": 0,
            "feedback": "Could not generate feedback — no answers were recorded.",
            "areas_of_improvement": "Please complete at least one question before requesting feedback."
        }
    return jsonify({"success": True, "feedback": feedback})


if __name__ == "__main__":
    app.run(debug=True, port=8000)
