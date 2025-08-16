const axios = require('axios');

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
if (!OPENAI_KEY) {
  console.warn('OPENAI_API_KEY not set - AI endpoints will return errors until provided');
}

const callOpenAI = async (messages, temperature = 0.2, max_tokens = 800) => {
  if (!OPENAI_KEY) throw new Error('OPENAI_API_KEY not configured');
  const resp = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: OPENAI_MODEL,
      messages,
      temperature,
      max_tokens
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`
      }
    }
  );
  return resp.data;
};

/**
 * Generate a single interview question (and ideal answer)
 * returns { questionText, idealAnswer }
 */
const generateQuestion = async (topic, difficulty) => {
  const system = `You are an expert technical interviewer. Only produce interview-related content. Do not answer unrelated requests.`;
  const user = `Generate ONE ${difficulty} interview question about "${topic}". Also provide a concise ideal answer/explanation. Respond as a JSON object only with keys: question, ideal_answer. Keep answers short (under 200 words).`;
  const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];

  const data = await callOpenAI(messages, 0.2, 600);
  const text = data.choices?.[0]?.message?.content || '';
  // try to parse JSON if returned JSON; otherwise return as text
  try {
    const parsed = JSON.parse(text);
    return { questionText: parsed.question || parsed.question_text || text, idealAnswer: parsed.ideal_answer || parsed.idealAnswer || '' };
  } catch (e) {
    // fallback: crude split
    return { questionText: text, idealAnswer: '' };
  }
};

/**
 * Grade an answer using the AI. Returns { score:0-10, feedback: "..." }
 */
const gradeAnswer = async (questionText, idealAnswer, userAnswer) => {
  const system = `You are an objective grading assistant for technical interview answers. Score from 0 to 10 and give short feedback. Respond only as JSON: {"score": <number>, "feedback": "<...>"} .`;
  const user = `Question: ${questionText}\nIdeal answer: ${idealAnswer}\nUser's answer: ${userAnswer}\nGive score and feedback in JSON.`;
  const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];

  const data = await callOpenAI(messages, 0.0, 500);
  const text = data.choices?.[0]?.message?.content || '';
  try {
    const parsed = JSON.parse(text);
    return { score: parsed.score, feedback: parsed.feedback };
  } catch (e) {
    // fallback: return null and full text as feedback
    return { score: null, feedback: text };
  }
};

module.exports = { generateQuestion, gradeAnswer };
