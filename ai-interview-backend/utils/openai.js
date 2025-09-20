const axios = require("axios");

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.1-8b-instant";


if (!GROQ_KEY) {
  console.warn("⚠️ GROQ_API_KEY not set - AI endpoints will fail.");
}

/**
 * Generate a question + ideal answer using Groq LLaMA
 */
const generateQuestion = async (topic, difficulty, previousQuestions = "") => {
  if (!GROQ_KEY) throw new Error("No GROQ_API_KEY provided");

  const prompt = `Generate ONE ${difficulty} technical interview question about "${topic}". 
  Make sure it is DIFFERENT from these previous questions:
  ${previousQuestions}
  
Also provide a short ideal answer. 
Respond ONLY in JSON like this:
{
  "question": "your interview question here",
  "ideal_answer": "your short ideal answer here"
}`;

  try {
    const resp = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "You are an expert interview question generator." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_KEY}`
        }
      }
    );

    console.log("✅ Groq response:", JSON.stringify(resp.data, null, 2));

    const text = resp.data.choices[0].message.content.trim();

    let parsed;
    try {
      parsed = JSON.parse(text); // 👈 try direct JSON
    } catch (e) {
      // fallback regex parsing
      const qMatch = text.match(/question["']?\s*:\s*["']([^"']+)["']/i);
      const aMatch = text.match(/ideal_answer["']?\s*:\s*["']([^"']+)["']/i);
      parsed = {
        question: qMatch ? qMatch[1] : text,
        ideal_answer: aMatch ? aMatch[1] : ""
      };
    }

    return {
      questionText: parsed.question || "No question generated",
      idealAnswer: parsed.ideal_answer || ""
    };
  } catch (err) {
    if (err.response) {
      console.error("❌ Groq API Error:", err.response.status, err.response.data);
    } else {
      console.error("❌ Groq Error:", err.message);
    }

    // Safe fallback (so interview never breaks)
    return {
      questionText: "Explain polymorphism in Object-Oriented Programming.",
      idealAnswer: "Polymorphism allows objects to be treated as instances of their parent class."
    };
  }
};

/**
 * Grade user answer using Groq LLaMA
 */
const gradeAnswer = async (questionText, idealAnswer, userAnswer) => {
  if (!GROQ_KEY) throw new Error("No GROQ_API_KEY provided");

  const prompt = `Question: ${questionText}
Ideal Answer: ${idealAnswer}
User Answer: ${userAnswer}

Grade this from 0-10 with short feedback. 
Respond ONLY in JSON like this:
{
  "score": 8,
  "feedback": "your feedback here"
}`;

  try {
    const resp = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "You are a strict interview evaluator." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 300
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_KEY}`
        }
      }
    );

    console.log("✅ Groq response:", JSON.stringify(resp.data, null, 2));

    const text = resp.data.choices[0].message.content.trim();

    let parsed;
    try {
      parsed = JSON.parse(text); // try JSON parse
    } catch (e) {
      // fallback regex parsing
      const scoreMatch = text.match(/score["']?\s*:\s*([0-9]+)/i);
      const feedbackMatch = text.match(/feedback["']?\s*:\s*["']([^"']+)["']/i);
      parsed = {
        score: scoreMatch ? parseInt(scoreMatch[1]) : null,
        feedback: feedbackMatch ? feedbackMatch[1] : text
      };
    }

    return {
      score: parsed.score !== undefined ? parsed.score : null,
      feedback: parsed.feedback || "No feedback generated"
    };
  } catch (err) {
    if (err.response) {
      console.error("❌ Groq API Error:", err.response.status, err.response.data);
    } else {
      console.error("❌ Groq Error:", err.message);
    }

    // fallback grading
    return {
      score: null,
      feedback: "AI grading failed. Please review manually."
    };
  }
};

module.exports = { generateQuestion, gradeAnswer };
