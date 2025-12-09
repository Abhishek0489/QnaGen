require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = 5000;

// Configure Gemini (Google Generative AI)
const GEMINI_API_KEY=process.env.GEMINI_API_KEY;

// Debug: Check if API key is loaded (don't log the actual key)
if (!GEMINI_API_KEY) {
  console.warn("⚠️  WARNING: GEMINI_API_KEY not found in environment variables!");
  console.warn("   Make sure you have a .env file in the Server folder with: GEMINI_API_KEY=your_key");
} else {
  console.log("✅ GEMINI_API_KEY loaded successfully");
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Middleware
app.use(cors()); // Enable CORS for frontend
app.use(express.json());

// Simple health route
app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

// Helper: run the Python script and return the transcript text
function getTranscriptFromPython(videoUrl) {
  const scriptPath = path.join(__dirname, "generateTranscript.py");
  
  // Use Python from virtual environment if it exists, otherwise use system Python
  const venvPythonPath = path.join(__dirname, ".venv", "Scripts", "python.exe"); // Windows
  const venvPythonPathUnix = path.join(__dirname, ".venv", "bin", "python"); // Linux/Mac
  const fs = require("fs");
  
  let pythonExecutable = "python"; // fallback to system Python
  if (fs.existsSync(venvPythonPath)) {
    pythonExecutable = venvPythonPath;
  } else if (fs.existsSync(venvPythonPathUnix)) {
    pythonExecutable = venvPythonPathUnix;
  }

  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(pythonExecutable, [scriptPath, videoUrl], {
      cwd: __dirname,
    });

    let output = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });

    pythonProcess.stderr.on("data", (chunk) => {
      errorOutput += chunk.toString();
    });

    pythonProcess.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve(output.trim());
      } else {
        const message =
          errorOutput || output || `Python script failed with code ${exitCode}`;
        reject(new Error(message));
      }
    });
  });
}

// 1) Endpoint: get transcript from YouTube URL
app.post("/api/transcript", async (req, res) => {
  const { url } = req.body || {};

  if (!url) {
    return res.status(400).json({ error: "Missing 'url' in request body." });
  }

  try {
    const transcript = await getTranscriptFromPython(url);
    res.json({ transcript });
  } catch (err) {
    console.error("Transcript error:", err);
    res.status(500).json({ error: err.message || "Failed to get transcript." });
  }
});

// 2) Endpoint: generate quiz questions from transcript using Google Gemini
app.post("/api/generate-quiz", async (req, res) => {
  const { transcript, maxQuestions = 5 } = req.body || {};

  if (!transcript) {
    return res
      .status(400)
      .json({ error: "Missing 'transcript' in request body." });
  }

  if (!genAI) {
    return res.status(500).json({
      error:
        "GEMINI_API_KEY is not set. Please set it in your environment before using this endpoint.",
    });
  }

  try {
    // Try gemini-pro first (most stable), fallback to gemini-1.5-pro if needed
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are creating a quiz from a YouTube video transcript.
Transcript:
${transcript}

Generate up to ${maxQuestions} multiple-choice questions in JSON format only.
The JSON should be an array of objects, each with this shape:
{
  "id": number,
  "question": string,
  "options": string[],
  "correctAnswer": string
}

Rules:
- Do NOT include any extra text before or after the JSON.
- Each question must have 4 options.
- "correctAnswer" value must exactly match one of the options.`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();


    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    let questions;
    try {
      questions = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", text);
      return res.status(500).json({
        error: "Gemini response was not valid JSON. Check server logs.",
      });
    }

    res.json({ questions });
  } catch (err) {
    console.error("Gemini generate-quiz error:", err);
    res
      .status(500)
      .json({ error: err.message || "Failed to generate quiz with Gemini." });
  }
});

// 3) Endpoint: score answers
// Expects: { questions: [...], answers: { [id]: "chosenOption" } }
app.post("/api/score", (req, res) => {
  const { questions, answers } = req.body || {};

  if (!Array.isArray(questions) || !answers) {
    return res
      .status(400)
      .json({ error: "Missing 'questions' array or 'answers' object." });
  }

  let total = questions.length;
  let correct = 0;

  const details = questions.map((q) => {
    const userAnswer = answers[q.id];
    const isCorrect = userAnswer === q.correctAnswer;
    if (isCorrect) correct += 1;

    return {
      id: q.id,
      question: q.question,
      correctAnswer: q.correctAnswer,
      userAnswer: userAnswer ?? null,
      isCorrect,
    };
  });

  res.json({
    total,
    correct,
    details,
  });
});

app.listen(port, () => {
  console.log(`listening at port ${port}`);
});