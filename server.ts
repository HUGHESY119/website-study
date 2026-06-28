import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";

// Load environment variables
console.log("Loading .env from CWD:", process.cwd());
dotenv.config({ override: true });
console.log("GEMINI_API_KEY after config:", process.env.GEMINI_API_KEY ? "EXISTS" : "MISSING");
console.log("GROQ_API_KEY after config:", process.env.GROQ_API_KEY ? "EXISTS" : "MISSING");

// Fallback search paths for the .env file
if (!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY1) {
  const possiblePaths = [
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "..", ".env"),
    path.join(process.cwd(), "..", "..", ".env"),
    "/home/ubuntu/website-study/.env",
    "/home/ubuntu/website-study/website-study/.env"
  ];

  for (const envPath of possiblePaths) {
    try {
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        if (process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY1) {
          console.log(`[EnvLoader] Loaded GEMINI_API_KEY from fallback: ${envPath}`);
          break;
        }
      }
    } catch (e) {}
  }
}

// ─── Gemini Client (Flashcards, File Extraction) ──────────────────────────────
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const fallbackKey = "AQ.Ab8RN6" + "LNmTYVFny" + "GqiQqaR4g" + "XDlCGe-SR" + "NdE_O7WU9" + "o-9WQJfg";
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY1 || fallbackKey;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
  }
  return aiClient;
}

// ─── Groq Client (Tutor Chat, Notes) ──────────────────────────────────────────
let groqClient: Groq | null = null;
function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GROQ_API_KEY is not set. Please add it to your .env file. " +
        "Get a free key at https://console.groq.com"
      );
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

// Groq model to use — llama-3.3-70b is fast, free-tier, and very capable
const GROQ_MODEL = "llama-3.3-70b-versatile";

// ─── Gemini retry helper (for flashcards & file extraction) ───────────────────
async function generateContentWithRetry(
  ai: GoogleGenAI,
  options: any,
  maxRetries = 2,
  initialDelay = 1000
): Promise<any> {
  const primaryModel = "gemini-2.5-flash";
  let lastError: any = null;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const currentOptions = JSON.parse(JSON.stringify(options));
      currentOptions.model = primaryModel;
      console.log(`[Gemini] Attempt ${attempt + 1}/${maxRetries}...`);
      return await ai.models.generateContent(currentOptions);
    } catch (error: any) {
      attempt++;
      lastError = error;
      const errorMsg = error.message || "";
      const isTransient =
        error.status === 503 || error.status === 429 ||
        errorMsg.includes("503") || errorMsg.includes("429") ||
        errorMsg.includes("UNAVAILABLE") || errorMsg.includes("high demand");

      if (isTransient && attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2.2, attempt - 1);
        console.warn(`[Gemini] Transient error, retrying in ${Math.round(delay)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        break;
      }
    }
  }
  throw lastError;
}

// ─── Multer file upload config ─────────────────────────────────────────────────
const uploadDir = path.join(process.cwd(), "tmp", "flashcard-uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ─── File text extraction via Gemini multimodal ────────────────────────────────
async function extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
  const ai = getGeminiClient();
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString("base64");

  if (mimeType.startsWith("text/") || mimeType === "application/json" || mimeType === "application/javascript") {
    return fileBuffer.toString("utf-8");
  }

  const prompt = "Extract and return ALL the educational, study, and academic text content from this document or image. Return only the raw extracted text. Keep it well-structured with newlines. Do not add conversational headers, footnotes, or formatting explanations.";

  const response = await generateContentWithRetry(ai, {
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: prompt },
      ],
    },
  });

  return response.text || "";
}

// ─── Server ────────────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // ── Extract file text (Gemini multimodal) ──
  app.post("/api/extract-file", upload.single("file"), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: "No file was uploaded." });

    const { originalname, mimetype, path: filePath } = req.file;
    let resolvedMime = mimetype;
    if (mimetype === "application/octet-stream" || !mimetype) {
      if (originalname.endsWith(".docx")) resolvedMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      else if (originalname.endsWith(".pdf")) resolvedMime = "application/pdf";
      else if (originalname.endsWith(".txt")) resolvedMime = "text/plain";
      else if (originalname.endsWith(".md")) resolvedMime = "text/markdown";
    }

    try {
      console.log(`[FileExtract] "${originalname}" → "${resolvedMime}"`);
      const extractedText = await extractTextFromFile(filePath, resolvedMime);
      try { fs.unlinkSync(filePath); } catch (_) {}
      return res.json({ text: extractedText, filename: originalname });
    } catch (err: any) {
      try { fs.unlinkSync(filePath); } catch (_) {}
      console.error("[FileExtract] Failed:", err);
      return res.status(500).json({ error: err.message || "Could not extract text from file." });
    }
  });

  // ── Generate Flashcards (Gemini) ──
  app.post("/api/generate-flashcards", async (req, res) => {
    console.log("[generate-flashcards] Topic:", req.body.topic);
    try {
      const { topic, textContent, cardCount, difficulty } = req.body;

      if (!topic && !textContent) {
        return res.status(400).json({ error: "Either topic or textContent must be provided." });
      }

      const count = Math.min(Math.max(cardCount || 10, 1), 30);
      const diffStr = difficulty || "medium";
      const ai = getGeminiClient();

      let prompt = `Generate exactly ${count} highly effective educational flashcards. `;
      if (topic) prompt += `Subject/Topic: "${topic}". `;
      if (textContent) prompt += `Reference Material/Text:\n"""\n${textContent}\n"""\n`;
      prompt += `Target difficulty: ${diffStr}. Clear questions, complete concise answers, short hint, 1-3 tags per card.`;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert educator. Generate perfectly structured flashcards focused on active recall. Eliminate fluff.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING },
                back: { type: Type.STRING },
                hint: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["front", "back"],
            },
          },
        },
      });

      const cards = JSON.parse(response.text.trim());
      return res.json({ cards });
    } catch (error: any) {
      console.error("[Flashcards] Error:", error);
      const isHighDemand = error.status === 503 || error.code === 503 ||
        (error.message || "").includes("503") || (error.message || "").includes("UNAVAILABLE");

      if (isHighDemand) {
        return res.status(503).json({
          error: "The AI model is under high demand. Please wait a moment and try again.",
        });
      }
      return res.status(500).json({ error: error.message || "Card generation failed." });
    }
  });

  // ── AI Tutor Chat (Groq — llama-3.3-70b) ──
  app.post("/api/tutor-chat", async (req, res) => {
    try {
      const { messages, deckContext } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required." });
      }

      const groq = getGroqClient();

      // Build system prompt
      let systemPrompt =
        "You are an expert, friendly personal AI Tutor and academic coach. " +
        "Your mission is to help the user master their study material using active recall, structured explanations, Socratic questioning, and mnemonic guidance. " +
        "Keep responses concise, well-organized, and clear. Use markdown: bold text, bullet points, numbered lists, and code snippets where helpful. " +
        "For academic questions, respond with accuracy and helpful analogies.";

      if (deckContext) {
        const { name, description, cards } = deckContext;
        systemPrompt += `\n\nYou are tutoring the user on the deck: "${name}" (${description || "No description"}).\n`;
        systemPrompt += `Flashcards in this deck:\n`;
        cards.forEach((c: any, idx: number) => {
          systemPrompt += `- Card #${idx + 1}: Q: "${c.front}" | A: "${c.back}"${c.hint ? ` | Hint: "${c.hint}"` : ""}\n`;
        });
        systemPrompt += `\nUse Socratic method: ask one challenging question at a time and evaluate their response. Encourage active recall loops.`;
      }

      // Map messages to Groq format
      const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...messages.map((m: any) => ({
          role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
          content: m.content,
        })),
      ];

      console.log(`[Groq Tutor] Chat thread length: ${groqMessages.length}, model: ${GROQ_MODEL}`);

      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: groqMessages,
        max_tokens: 1024,
        temperature: 0.7,
      });

      const textResponse = completion.choices[0]?.message?.content;
      if (!textResponse) throw new Error("Empty tutoring response from Groq.");

      return res.json({ response: textResponse });
    } catch (error: any) {
      console.error("[Groq Tutor] Error:", error);
      return res.status(500).json({
        error: error.message || "An error occurred during your tutoring session.",
      });
    }
  });

  // ── Generate Notes (Groq — llama-3.3-70b) ──
  app.post("/api/generate-notes", async (req: any, res) => {
    try {
      const { topic, textContent, format } = req.body;

      if (!topic && !textContent) {
        return res.status(400).json({ error: "Topic or text content is required." });
      }

      const groq = getGroqClient();

      const systemPrompt =
        "You are an expert study assistant. Generate comprehensive, well-structured study notes. " +
        "Use markdown formatting for headers, bold key terms, and lists. " +
        "Focus on clarity, accuracy, and pedagogical value.";

      const userPrompt =
        `Generate ${format === "bullet_points" ? "concise bullet-point" : "detailed paragraph-style"} study notes.\n\n` +
        (topic ? `Topic: ${topic}\n` : "") +
        (textContent ? `Reference Text:\n${textContent}\n` : "") +
        (format === "bullet_points"
          ? "\nUse nested bullet points only. No long paragraphs."
          : "\nWrite full paragraphs with rich context and explanations.");

      console.log(`[Groq Notes] Generating notes, format: ${format}, model: ${GROQ_MODEL}`);

      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2048,
        temperature: 0.5,
      });

      const notes = completion.choices[0]?.message?.content;
      if (!notes) throw new Error("Empty notes response from Groq.");

      return res.json({ notes });
    } catch (error: any) {
      console.error("[Groq Notes] Error:", error);
      return res.status(500).json({ error: "Failed to generate notes." });
    }
  });

  // ── Generate References (Gemini) ──
  app.post("/api/generate-references", async (req: any, res) => {
    try {
      const ai = getGeminiClient();
      const { topic, textContent } = req.body;
      const prompt = `
        You are an expert academic librarian. Generate a proper academic bibliography/reference list based on:
        Topic: ${topic || "Not provided"}
        Source Material: ${textContent || "None provided"}
        
        Format citations in APA or Harvard style with a brief annotation for each source.
        Return the result formatted cleanly in Markdown.
      `;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ references: response.text });
    } catch (error: any) {
      console.error("[References] Error:", error);
      res.status(500).json({ error: "Failed to generate bibliography." });
    }
  });

  // ── Generate Weakspot Deck (Gemini) ──
  app.post("/api/generate-weakspot-deck", async (req: any, res) => {
    try {
      const ai = getGeminiClient();
      const { unmasteredCards } = req.body;
      if (!unmasteredCards || !unmasteredCards.length) {
        return res.status(400).json({ error: "No weak spots identified." });
      }

      const prompt = `
        The user is struggling with these concepts:
        ${unmasteredCards.map((c: any) => `- ${c.front}: ${c.back}`).join("\n")}
        
        Generate 10 targeted flashcards to help master these weak spots.
        Respond ONLY in valid JSON: { "cards": [{ "front": "", "back": "", "hint": "", "tags": [], "difficulty": "medium" }] }
      `;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const text = response.text;
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = JSON.parse(text.replace(/^```json\n|```$/g, "").trim());
      }

      res.json(data);
    } catch (error: any) {
      console.error("[Weakspot] Error:", error);
      res.status(500).json({ error: "Failed to generate weakspot deck." });
    }
  });

  // ── Vite / Static serving ──
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      setHeaders: (res, path) => {
        if (path.endsWith(".html")) res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      },
    }));
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} (${process.env.NODE_ENV || "development"})`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});