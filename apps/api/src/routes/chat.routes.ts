import { Router, type Request, type Response } from 'express';
import { buildKnowledgeContext } from '../services/snyprr-knowledge.js';
import { env } from '../config/env.js';

const router = Router();

// ── In-memory conversation store (dev) ───────────────────────────────────────
// Each entry: Array of { role: 'user'|'model', parts: [{text: string}] }
const conversations = new Map<string, Array<{ role: string; parts: Array<{ text: string }> }>>();

const GEMINI_MODEL = 'gemini-2.0-flash';

function buildSystemInstruction(query: string): string {
  const knowledge = buildKnowledgeContext(query);
  return `You are Snyprr.ai AI — the intelligent assistant for the Snyprr.ai trading intelligence platform.

Your role:
1. Answer Snyprr.ai platform questions using the knowledge below.
2. Educate users about cryptocurrency trading, technical analysis, risk management and trading strategies.

==================================================
SNYPRR.AI KNOWLEDGE
==================================================
${knowledge}

==================================================
RULES
==================================================
- Never invent Snyprr.ai features, prices or policies.
- If Snyprr.ai info is not in the knowledge above, say you don't have confirmed info about it.
- Do NOT give personalized financial advice or guarantee profits.
- Stay focused on Snyprr.ai and crypto trading. If asked anything completely unrelated, politely decline.
- Keep answers clear, concise and conversational.
- Use **bold** for key terms. Use bullet points for lists.`;
}

// ── POST /api/chat ────────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, conversationId } = req.body as {
      message?: string;
      conversationId?: string;
    };

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const apiKey = (env as any).GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'AI service not configured (GEMINI_API_KEY missing)' });
    }

    const userText = message.trim();

    // Get or create conversation
    const id = conversationId ?? `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    if (!conversations.has(id)) conversations.set(id, []);
    const history = conversations.get(id)!;

    // Add user message
    history.push({ role: 'user', parts: [{ text: userText }] });

    // Trim to last 20 turns
    if (history.length > 20) history.splice(0, history.length - 20);

    // Call Gemini REST API (generateContent)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const body = {
      system_instruction: { parts: [{ text: buildSystemInstruction(userText) }] },
      contents: history,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    };

    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[chat] Gemini error:', errText);
      return res.status(502).json({ error: 'AI service error', details: errText });
    }

    const data = await geminiRes.json() as any;
    const reply: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!reply) {
      return res.status(500).json({ error: 'AI returned an empty response' });
    }

    // Save model reply to history
    history.push({ role: 'model', parts: [{ text: reply }] });
    if (history.length > 20) history.splice(0, history.length - 20);

    return res.json({ reply, conversationId: id });

  } catch (err: any) {
    console.error('[chat] error:', err);
    return res.status(500).json({ error: 'Something went wrong', details: err.message });
  }
});

// ── DELETE /api/chat/:id ──────────────────────────────────────────────────────
router.delete('/:id', (req: Request, res: Response) => {
  conversations.delete(req.params.id);
  return res.json({ success: true });
});

export default router;
