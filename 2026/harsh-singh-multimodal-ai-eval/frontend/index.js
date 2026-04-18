// ========== GLOBAL STATE ==========
let mediaRecorder = null;
let recordingChunks = [];
let recordedBlob = null;
let currentSubject = null;
let totalQuestions = 5;
let isSpeaking = false;
let currentAudio = null;

// ========== DOM ELEMENTS ==========
const welcomeState       = document.getElementById("welcomeState");
const interviewState     = document.getElementById("interviewState");
const subjectBtns        = document.querySelectorAll(".subject-btn");
const customSubjectInput = document.getElementById("customSubjectInput");
const startCustomBtn     = document.getElementById("startCustomBtn");
const subjectBadge       = document.getElementById("subjectBadge");
const subjectIcon        = document.getElementById("subjectIcon");
const questionNum        = document.getElementById("questionNum");
const totalQuestionsEl   = document.getElementById("totalQuestions");
const speakingBubble     = document.getElementById("speakingBubble");
const startInterviewBtn  = document.getElementById("startInterviewBtn");
const recordBtn          = document.getElementById("recordBtn");
const micIcon            = document.getElementById("micIcon");
const stopIcon           = document.getElementById("stopIcon");
const recordingStatus    = document.getElementById("recordingStatus");
const submitBtn          = document.getElementById("submitBtn");
const endInterviewBtn    = document.getElementById("endInterviewBtn");
const feedbackSection    = document.getElementById("feedbackSection");
const getFeedbackArea    = document.getElementById("getFeedbackArea");
const getFeedbackBtn     = document.getElementById("getFeedbackBtn");
const feedbackContent    = document.getElementById("feedbackContent");
const feedbackSubject    = document.getElementById("feedbackSubject");
const scoreCircle        = document.getElementById("scoreCircle");
const scoreValue         = document.getElementById("scoreValue");
const feedbackText       = document.getElementById("feedbackText");
const improvementText    = document.getElementById("improvementText");
const newInterviewBtn    = document.getElementById("newInterviewBtn");

// ========== SUBJECT ICON MAP ==========

const iconMap = {
    "Self Introduction": "fas fa-user text-blue-400",
    "Generative AI":     "fas fa-brain text-purple-400",
    "Python":            "fab fa-python text-yellow-400",
    "English":           "fas fa-language text-green-400",
    "HTML":              "fab fa-html5 text-orange-400",
    "CSS":               "fab fa-css3-alt text-blue-400",
};

const DEFAULT_ICON = "fas fa-lightbulb text-pink-400";

// ========== STROKE DASH CONSTANT ==========
// Circumference of score circle (r=40): 2 * π * 40 ≈ 251.2
// Must match stroke dasharray value in index.html
const CIRCLE_CIRCUMFERENCE = 251.2;


// ========== UI STATE FUNCTIONS ==========

function showInterviewPanel(subject) {
    currentSubject = subject;

    subjectBtns.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.subject === subject);
    });

    welcomeState.classList.add("hidden");
    interviewState.classList.remove("hidden");
    feedbackSection.classList.add("hidden");

    subjectBadge.textContent = subject;
    // Use mapped icon or fall back to default for custom subjects
    subjectIcon.className = (iconMap[subject] || DEFAULT_ICON) + " text-2xl";
    questionNum.textContent = "1";
    totalQuestionsEl.textContent = totalQuestions;

    speakingBubble.classList.add("hidden");
    startInterviewBtn.classList.remove("hidden");
    recordBtn.classList.add("hidden");
    recordBtn.disabled = true;
    submitBtn.disabled = true;
    endInterviewBtn.disabled = true;
    recordingStatus.textContent = "Click Start Interview to begin";
}

function updateQuestionNumber(number) {
    questionNum.textContent = number;
}

function enableRecording() {
    recordBtn.disabled = false;
    endInterviewBtn.disabled = false;
    recordingStatus.textContent = "Click to record";
}

function disableRecording() {
    recordBtn.disabled = true;
    submitBtn.disabled = true;
    submitBtn.classList.add("hidden");
}

function showFeedbackSection() {
    feedbackSection.classList.remove("hidden");
    getFeedbackArea.classList.remove("hidden");
    feedbackContent.classList.add("hidden");
    endInterviewBtn.disabled = true;
    disableRecording();
    recordingStatus.textContent = "Interview ended";
    speakingBubble.classList.add("hidden");
}

function displayFeedback(data) {
    feedbackSubject.textContent = data.subject || currentSubject;
    scoreValue.textContent = data.candidate_score || 0;

    // Animate score circle — offset goes from full (hidden) to partial (shown)
    const offset = CIRCLE_CIRCUMFERENCE - ((data.candidate_score || 0) / 5) * CIRCLE_CIRCUMFERENCE;
    scoreCircle.style.strokeDashoffset = offset;

    feedbackText.textContent = data.feedback || "No feedback available";
    improvementText.textContent = data.areas_of_improvement || "No suggestions available";

    getFeedbackArea.classList.add("hidden");
    feedbackContent.classList.remove("hidden");
}

function resetToWelcome() {
    currentSubject = null;
    totalQuestions = 5;
    isSpeaking = false;
    mediaRecorder = null;
    recordingChunks = [];
    recordedBlob = null;

    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }

    subjectBtns.forEach((btn) => btn.classList.remove("active"));

    // Clear custom input
    if (customSubjectInput) customSubjectInput.value = "";

    welcomeState.classList.remove("hidden");
    interviewState.classList.add("hidden");

    recordBtn.classList.remove("bg-red-500", "text-white", "recording-active");
    recordBtn.classList.add("bg-zinc-800/80", "text-gray-400");
    micIcon.classList.remove("hidden");
    stopIcon.classList.add("hidden");
    submitBtn.classList.add("hidden");
    speakingBubble.classList.add("hidden");

    scoreCircle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
    getFeedbackBtn.textContent = "Get Feedback";
    getFeedbackBtn.disabled = false;
}


// ========== AUDIO STREAMING ==========

function handleAudioStream(response, onComplete) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const mediaSource = new MediaSource();
    const audioUrl = URL.createObjectURL(mediaSource);
    let sourceBuffer;
    const queue = [];
    let isSourceBufferReady = false;

    speakingBubble.classList.remove("hidden");
    isSpeaking = true;
    recordBtn.disabled = true;
    recordingStatus.textContent = "Listening...";

    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }

    currentAudio = new Audio(audioUrl);
    currentAudio.play().catch(() => {});

    mediaSource.addEventListener("sourceopen", () => {
        sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
        isSourceBufferReady = true;

        while (queue.length > 0 && !sourceBuffer.updating) {
            sourceBuffer.appendBuffer(queue.shift());
        }

        sourceBuffer.addEventListener("updateend", () => {
            if (queue.length > 0 && !sourceBuffer.updating) {
                sourceBuffer.appendBuffer(queue.shift());
            }
        });
    });

    function processChunk({ done, value }) {
        if (done) {
            if (mediaSource.readyState === "open") {
                try { mediaSource.endOfStream(); } catch (e) {}
            }
            if (onComplete) onComplete();
            return;
        }

        const textChunk = decoder.decode(value, { stream: true });
        textChunk.split("\n").forEach((line) => {
            if (line.trim()) {
                try {
                    const binaryString = atob(line);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    if (isSourceBufferReady && !sourceBuffer.updating) {
                        sourceBuffer.appendBuffer(bytes);
                    } else {
                        queue.push(bytes);
                    }
                } catch (e) {
                    console.error("Base64 decode error:", e);
                }
            }
        });

        reader.read().then(processChunk);
    }

    reader.read().then(processChunk);

    currentAudio.onended = () => {
        isSpeaking = false;
        speakingBubble.classList.add("hidden");
        enableRecording();
        URL.revokeObjectURL(audioUrl);
    };

    currentAudio.onerror = () => {
        isSpeaking = false;
        speakingBubble.classList.add("hidden");
        enableRecording();
        URL.revokeObjectURL(audioUrl);
    };
}


// ========== RECORDING ==========

function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? { mimeType: "audio/webm;codecs=opus" }
            : { mimeType: "audio/webm" };

        mediaRecorder = new MediaRecorder(stream, options);
        recordingChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordingChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            recordedBlob = new Blob(recordingChunks, { type: "audio/webm" });
            stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();

        recordBtn.classList.remove("bg-zinc-800/80", "text-gray-400");
        recordBtn.classList.add("bg-red-500", "text-white", "recording-active");
        micIcon.classList.add("hidden");
        stopIcon.classList.remove("hidden");
        recordingStatus.textContent = "Recording...";
        submitBtn.classList.add("hidden");
        endInterviewBtn.disabled = true;
    });
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();

        recordBtn.classList.remove("bg-red-500", "text-white", "recording-active");
        recordBtn.classList.add("bg-zinc-800/80", "text-gray-400");
        micIcon.classList.remove("hidden");
        stopIcon.classList.add("hidden");
        recordingStatus.textContent = "Recording complete";
        submitBtn.classList.remove("hidden");
        submitBtn.disabled = false;
    }
}


// ========== API CALLS ==========

const API_BASE = "http://127.0.0.1:8000";

async function startInterview() {
    startInterviewBtn.classList.add("hidden");
    recordBtn.classList.remove("hidden");
    recordingStatus.textContent = "Connecting...";

    try {
        const response = await fetch(`${API_BASE}/start-interview`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                subject: currentSubject,
                total_questions: totalQuestions,
            }),
        });

        if (response.headers.get("content-type")?.includes("text/plain")) {
            handleAudioStream(response, () => {
                endInterviewBtn.disabled = false;
            });
        } else {
            await response.json();
            enableRecording();
            endInterviewBtn.disabled = false;
        }
    } catch (error) {
        recordingStatus.textContent = "Backend not connected";
        speakingBubble.classList.add("hidden");
        recordBtn.classList.add("hidden");
        startInterviewBtn.classList.remove("hidden");
    }
}

async function submitAnswer() {
    if (!recordedBlob) return;

    disableRecording();
    recordingStatus.textContent = "Submitting...";

    const formData = new FormData();
    formData.append("audio", recordedBlob, "answer.webm");
    formData.append("total_questions", totalQuestions);

    try {
        const response = await fetch(`${API_BASE}/submit-answer`, {
            method: "POST",
            body: formData,
        });

        const isComplete    = response.headers.get("X-Interview-Complete") === "true";
        const questionNumber = response.headers.get("X-Question-Number");

        if (questionNumber) updateQuestionNumber(questionNumber);

        if (response.headers.get("content-type")?.includes("text/plain")) {
            handleAudioStream(response, () => {
                recordedBlob = null;
                recordingChunks = [];

                if (isComplete) {
                    currentAudio.onended = () => {
                        isSpeaking = false;
                        speakingBubble.classList.add("hidden");
                        showFeedbackSection();
                    };
                } else {
                    endInterviewBtn.disabled = false;
                }
            });
        } else {
            recordedBlob = null;
            recordingChunks = [];
            isComplete ? showFeedbackSection() : enableRecording();
            if (!isComplete) endInterviewBtn.disabled = false;
        }
    } catch (error) {
        recordingStatus.textContent = "Connection error";
        speakingBubble.classList.add("hidden");
        enableRecording();
    }
}

async function endInterview() {
    if (!confirm("End interview and get feedback?")) return;
    disableRecording();
    endInterviewBtn.disabled = true;
    recordingStatus.textContent = "Ending interview...";
    await getFeedback();
}

async function getFeedback() {
    showFeedbackSection();
    getFeedbackBtn.textContent = "Generating...";
    getFeedbackBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/get-feedback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });

        const data = await response.json();
        if (data.success) displayFeedback(data.feedback);
    } catch (error) {
        getFeedbackBtn.textContent = "Error — Retry";
        getFeedbackBtn.disabled = false;
    }
}


// ========== EVENT LISTENERS ==========

// Preset subject buttons
subjectBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        if (currentSubject === btn.dataset.subject) return;
        resetToWelcome();
        showInterviewPanel(btn.dataset.subject);
    });
});

// Custom subject — start on button click
startCustomBtn.addEventListener("click", () => {
    const value = customSubjectInput.value.trim();
    if (!value) {
        customSubjectInput.classList.add("border-red-500");
        customSubjectInput.placeholder = "Please enter a subject first";
        setTimeout(() => {
            customSubjectInput.classList.remove("border-red-500");
            customSubjectInput.placeholder = "e.g. Machine Learning, React, SQL...";
        }, 2000);
        return;
    }
    resetToWelcome();
    showInterviewPanel(value);
});

// Custom subject — also start on Enter key
customSubjectInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") startCustomBtn.click();
});

startInterviewBtn.addEventListener("click", startInterview);

recordBtn.addEventListener("click", () => {
    if (isSpeaking || recordBtn.disabled) return;
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        startRecording();
    } else {
        stopRecording();
    }
});

submitBtn.addEventListener("click", submitAnswer);
endInterviewBtn.addEventListener("click", endInterview);
getFeedbackBtn.addEventListener("click", getFeedback);
newInterviewBtn.addEventListener("click", resetToWelcome);
