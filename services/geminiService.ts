
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { CourseData } from '../types';

// Read the API key from Vite env (must be prefixed with VITE_ to be exposed to the client)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

if (!GEMINI_API_KEY) {
  throw new Error("VITE_GEMINI_API_KEY is not set. Add it to your .env.local file.");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const courseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'The main title of the course.' },
    introduction: { type: Type.STRING, description: 'A brief introduction to the course topic, formatted as clean, semantic HTML.' },
    modules: {
      type: Type.ARRAY,
      description: "An array of course modules.",
      items: {
        type: Type.OBJECT,
        properties: {
          moduleTitle: { type: Type.STRING, description: "The title of this module." },
          sections: {
            type: Type.ARRAY,
            description: 'An array of sections within this module.',
            items: {
              type: Type.OBJECT,
              properties: {
                heading: { type: Type.STRING, description: 'The heading for this section.' },
                content: { type: Type.STRING, description: 'The detailed content for this section, formatted as HTML using paragraphs, lists, bold text, etc. Do NOT include large code blocks here; use the codeSnippet field instead.' },
                codeSnippet: {
                    type: Type.OBJECT,
                    description: "Optional. A code example if the concept requires practical demonstration or syntax showcasing.",
                    properties: {
                        language: { type: Type.STRING, description: "The programming language, e.g., 'python', 'javascript', 'sql'."},
                        code: { type: Type.STRING, description: "The actual code snippet. Ensure correct indentation."},
                        description: { type: Type.STRING, description: "Brief explanation of what the code does."}
                    },
                    required: ['language', 'code', 'description']
                }
              },
              required: ['heading', 'content']
            }
          }
        },
        required: ['moduleTitle', 'sections']
      }
    },
    videoSuggestions: {
      type: Type.ARRAY,
      description: 'An array of 2-3 suggested YouTube videos.',
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'A descriptive title for the video suggestion.' },
          query: { type: Type.STRING, description: 'A search query to find the video on YouTube.' },
          videoId: { type: Type.STRING, description: 'A valid YouTube video ID for embedding.' }
        },
        required: ['title', 'query', 'videoId']
      }
    },
    references: {
      type: Type.ARRAY,
      description: 'An array of 2-3 reference links for further reading.',
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'The title of the reference article or book.' },
          url: { type: Type.STRING, description: 'The valid URL for the reference.' }
        },
        required: ['title', 'url']
      }
    }
  },
  required: ['title', 'introduction', 'modules', 'videoSuggestions', 'references']
};

export const generateCourse = async (topic: string): Promise<CourseData> => {
    const prompt = `Generate a comprehensive, detailed, beginner-friendly course on the topic: "${topic}". Structure the course into logical modules, where each module contains several detailed sections. Each section should be written in the style of an in-depth blog post. Format textual content as clean, semantic HTML. If a concept (like programming, math, or data structures) is best explained with code, extract that code into the 'codeSnippet' field rather than embedding it in the HTML. For video lessons, provide a valid YouTube video ID.`;
    
    try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: courseSchema,
        temperature: 0.7,
      },
    });
        
    const jsonText = response.text;
        const parsedData: CourseData = JSON.parse(jsonText);
        return parsedData;

    } catch (error) {
    console.error("Error generating course:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate course. ${message.includes('API') ? 'Check your API key and billing status.' : 'The topic might be too broad or restricted.'}`);
    }
};

let chatInstance: Chat | null = null;

export const startChatSession = (course: CourseData): Chat => {
    const courseSummary = `Title: ${course.title}. Modules: ${course.modules.map(m => `${m.moduleTitle}: ${m.sections.map(s => s.heading).join(', ')}`).join('; ')}.`;
    chatInstance = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: `You are a helpful study assistant. A student has just generated a course and is asking follow-up questions. Be concise and helpful. The course context is: ${courseSummary}`,
        },
    });
    return chatInstance;
};

export const sendMessageToChat = async (message: string): Promise<string> => {
    if (!chatInstance) {
        throw new Error("Chat session not started. Please generate a course first.");
    }
    
    try {
        const response = await chatInstance.sendMessage({ message });
        return response.text;
    } catch (error) {
        console.error("Error sending chat message:", error);
        throw new Error("Failed to get a response from the assistant.");
    }
};
