import OpenAI from "openai";
import { CourseData } from "../types";

const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;

// Groq exposes an OpenAI-compatible API
const client = new OpenAI({
  apiKey: apiKey ?? "",
  baseURL: "https://api.groq.com/openai",
});

const systemPrompt = `You are an expert course generator. ALWAYS respond with JSON that matches this TypeScript interface strictly:
{
  "title": string,
  "introduction": string, // HTML string, no code blocks
  "modules": Array<{
    "moduleTitle": string,
    "sections": Array<{
      "heading": string,
      "content": string, // HTML string
      "codeSnippet"?: {
        "language": string,
        "code": string,
        "description": string
      }
    }>
  }>,
  "videoSuggestions": Array<{ "title": string, "query": string, "videoId": string }>,
  "references": Array<{ "title": string, "url": string }>
}
Only output JSON; DO NOT include markdown, prose, or commentary.`;

export const generateCourse = async (topic: string): Promise<CourseData> => {
  if (!apiKey) {
    throw new Error("Groq API key missing. Set VITE_GROQ_API_KEY in .env.local and restart the dev server.");
  }
  const userPrompt = `Generate a comprehensive, detailed, beginner-friendly course about: \"${topic}\". Follow the schema and requirements above. Use clear HTML in content fields. Include 2-3 videoSuggestions with good YouTube search queries.`;

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const parsed: CourseData = JSON.parse(text);
    return parsed;
  } catch (error) {
    console.error("Groq generateCourse error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate course. ${msg.includes("authentication") ? "Check your Groq API key." : msg}`);
  }
};

let conversationId: string | null = null;

export const startChatSession = (course: CourseData) => {
  // Groq/OpenAI doesn't require explicit session creation; we'll thread via conversationId if desired.
  conversationId = crypto.randomUUID();
};

export const sendMessageToChat = async (message: string): Promise<string> => {
  if (!apiKey) {
    throw new Error("Groq API key missing. Set VITE_GROQ_API_KEY in .env.local and restart the dev server.");
  }
  if (!conversationId) {
    throw new Error("Chat session not started. Please generate a course first.");
  }

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a helpful study assistant. Be concise and helpful." },
        { role: "user", content: message },
      ],
      temperature: 0.5,
    });

    return completion.choices[0]?.message?.content ?? "(no response)";
  } catch (error) {
    console.error("Groq sendMessageToChat error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get a response from the assistant. ${msg}`);
  }
};
