import OpenAI from "openai";
import { CourseData } from "../types";

const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;

const client = new OpenAI({
  apiKey: apiKey ?? "",
  baseURL: "https://openrouter.ai/api/v1",
  dangerouslyAllowBrowser: true,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3001",
    "X-Title": "AI Study Assistant",
  }
});

const systemPrompt = `You are an expert course generator creating COMPREHENSIVE, DETAILED, BOOK-QUALITY educational content.

CRITICAL REQUIREMENTS:
1. Generate AT LEAST 5-8 modules for any topic
2. Each module should have 4-6 detailed sections
3. Write content like a textbook chapter - extensive, thorough, educational
4. Each section should be 3-5 paragraphs minimum with rich HTML formatting
5. Include practical examples, explanations, and context
6. Use proper HTML: <p>, <ul>, <ol>, <li>, <strong>, <em>, <h4>, <blockquote>

JSON STRUCTURE (STRICTLY FOLLOW):
{
  "title": "Comprehensive Course Title",
  "introduction": "<p>Multi-paragraph introduction with context, objectives, and what students will learn. Should be 4-5 paragraphs.</p>",
  "modules": [
    {
      "moduleTitle": "Module Name",
      "sections": [
        {
          "heading": "Section Heading",
          "content": "<p>Extensive multi-paragraph content. Each section should feel like a textbook chapter section with detailed explanations, examples, and context. Use lists, bold text, and proper formatting. Minimum 3-5 paragraphs per section.</p>",
          "codeSnippet": {
            "language": "python",
            "code": "# Detailed code example with comments\nprint('hello')",
            "description": "Thorough explanation of what the code does and why"
          }
        }
      ]
    }
  ],
  "videoSuggestions": [
    {
      "title": "Relevant Video Title for This Specific Topic",
      "query": "specific detailed search terms matching the course topic"
    }
  ],
  
IMPORTANT FOR VIDEO SUGGESTIONS:
- Provide ONLY videos directly related to the course topic
- Use VERY SPECIFIC search queries that will find the exact tutorials needed
- Example: Instead of "python", use "python tutorial for beginners complete course"
- Video titles should describe what students will learn
- Make search queries detailed enough to find quality educational content
- Do NOT include videoId field - it will be handled automatically
  "references": [
    {
      "title": "Reference Title",
      "url": "https://example.com"
    }
  ]
}

QUALITY GUIDELINES:
- Write like a professor creating a comprehensive textbook
- Be thorough, not brief - depth over brevity
- Include real-world applications and examples
- Add historical context where relevant
- Explain WHY things work, not just WHAT they are
- Use analogies and metaphors to clarify complex concepts
- Create 3-4 modules with 3-4 sections each (manageable size for JSON)
- Each section = 300-500 words of well-formatted HTML content
- Each section MUST include resources array with 2-4 items:
  * At least 1 video resource (YouTube URLs or search queries)
  * At least 1 article/documentation resource
  * Optional: image search queries or reference images
  * Each resource has: type, title, url, description
- Include 2-3 videoSuggestions with real 11-character YouTube IDs for course overview
- Include 2-3 references with valid URLs for overall course
- Ensure all JSON strings are properly escaped
- Keep total response under 10,000 tokens to avoid truncation

RESOURCE EXAMPLES:
- Video: {"type": "video", "title": "Introduction to X", "url": "https://youtube.com/watch?v=ABC123", "description": "Clear explanation"}
- Article: {"type": "article", "title": "Guide to X", "url": "https://example.com/guide", "description": "Comprehensive guide"}
- Image: {"type": "image", "title": "Diagram of X", "url": "https://example.com/image.png", "description": "Visual representation"}
- Docs: {"type": "documentation", "title": "Official X Docs", "url": "https://docs.example.com", "description": "Official reference"}`;

export const generateCourse = async (topic: string): Promise<CourseData> => {
  if (!apiKey || apiKey === "your_openai_api_key_here") {
    throw new Error("OpenRouter API key missing. Set VITE_OPENROUTER_API_KEY in .env.local and restart the dev server.");
  }

  try {
    const completion = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Generate a comprehensive course about: "${topic}". 

Requirements:
- 3-4 well-structured modules covering the topic from basics to intermediate
- Each module has 3-4 detailed sections
- Each section is like a textbook chapter (300-500 words)
- Rich HTML formatting with paragraphs, lists, bold, emphasis
- Include code examples with explanations where appropriate
- CRITICAL: Each section MUST have a "resources" array with 2-4 learning resources:
  * At least 1 video (YouTube link or relevant search)
  * At least 1 article/documentation link
  * Optional: image references or diagrams
  * Format: {"type": "video|article|image|documentation", "title": "...", "url": "...", "description": "..."}
- Add 2-3 YouTube video suggestions DIRECTLY RELATED to "${topic}"
- Provide detailed search queries that will find quality educational tutorials
- Example query: "${topic} complete tutorial for beginners" or "${topic} crash course"
- Videos must be educational tutorials/courses about the specific topic
- Add 2-3 reference links to quality resources for overall course
- IMPORTANT: Keep content concise to ensure valid JSON output

Make this educational and comprehensive while maintaining proper JSON structure.` 
        },
      ],
      temperature: 0.7,
      max_tokens: 10000,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content ?? "";
    
    // Enhanced JSON parsing with error recovery
    try {
      const parsed: CourseData = JSON.parse(text);
      
      // Validate required fields
      if (!parsed.title || !parsed.modules || !Array.isArray(parsed.modules)) {
        throw new Error("Invalid course structure returned");
      }
      
      // Ensure videoSuggestions exist with search queries
      if (!parsed.videoSuggestions || parsed.videoSuggestions.length === 0) {
        console.warn('No videoSuggestions in AI response, adding defaults');
        parsed.videoSuggestions = [
          {
            title: `${topic} - Complete Tutorial`,
            query: `${topic} complete tutorial for beginners 2024`
          },
          {
            title: `${topic} - Crash Course`,
            query: `${topic} crash course step by step`
          },
          {
            title: `${topic} - Practical Guide`,
            query: `${topic} tutorial with examples`
          }
        ];
      }
      
      console.log('Processing videoSuggestions:', parsed.videoSuggestions.length);
      
      // Ensure all video suggestions have proper queries and validate/remove invalid videoIds
      parsed.videoSuggestions = parsed.videoSuggestions.map((video, index) => {
        // Ensure query is detailed and specific
        const query = video.query || `${topic} ${video.title || 'tutorial'}`;
        const title = video.title || `Learn ${topic}`;
        
        // Only keep videoId if it's valid (exactly 11 characters)
        const hasValidVideoId = video.videoId && typeof video.videoId === 'string' && video.videoId.length === 11;
        
        if (hasValidVideoId) {
          console.log(`Video ${index + 1}: Has valid videoId - ${video.videoId}`);
        } else {
          console.log(`Video ${index + 1}: No valid videoId, will use search link`);
        }
        
        return {
          title: title,
          query: query.trim(),
          ...(hasValidVideoId && { videoId: video.videoId })
        };
      });
      
      console.log('Final videoSuggestions:', parsed.videoSuggestions);
      
      return parsed;
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Response length:", text.length);
      
      // Try to salvage partial JSON
      const lastBraceIndex = text.lastIndexOf('}');
      if (lastBraceIndex > 0) {
        try {
          const truncated = text.substring(0, lastBraceIndex + 1);
          const parsed: CourseData = JSON.parse(truncated);
          if (parsed.title && parsed.modules && parsed.modules.length > 0) {
            console.warn("Using salvaged partial response");
            return parsed;
          }
        } catch (e) {
          console.error("Failed to salvage JSON");
        }
      }
      
      throw new Error(`JSON parsing failed. Response may be truncated. Try a more specific topic or reduce scope.`);
    }
  } catch (error) {
    console.error("OpenAI generateCourse error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate course. ${msg.includes("authentication") || msg.includes("API key") ? "Check your OpenRouter API key." : msg}`);
  }
};

export const continueGeneration = async (existingCourse: CourseData, continueFrom: string): Promise<CourseData> => {
  if (!apiKey || apiKey === "your_openai_api_key_here") {
    throw new Error("OpenRouter API key missing. Set VITE_OPENROUTER_API_KEY in .env.local and restart the dev server.");
  }

  try {
    const completion = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Continue expanding this course: "${existingCourse.title}"

Existing modules: ${existingCourse.modules.map((m, i) => `Module ${i+1}: ${m.moduleTitle}`).join(', ')}

${continueFrom === 'new-modules' 
  ? `Add 2-3 NEW modules that go deeper into the topic. Each module should have 3-4 sections with quality content (300-500 words each).`
  : `Expand EACH existing module by adding 1-2 MORE sections. Keep sections focused and well-structured (300-500 words each).`}

CRITICAL: Each section MUST include resources array with 2-4 learning resources:
- At least 1 video (YouTube link or search query)
- At least 1 article/documentation link  
- Optional: image references or diagrams
- Format: {"type": "video|article|image|documentation", "title": "...", "url": "...", "description": "..."}

Return the COMPLETE course with all modules (existing + new). Keep JSON valid and properly escaped.` 
        },
      ],
      temperature: 0.7,
      max_tokens: 12000,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content ?? "";
    
    // Enhanced JSON parsing with error recovery
    try {
      const parsed: CourseData = JSON.parse(text);
      
      // Validate required fields
      if (!parsed.title || !parsed.modules || !Array.isArray(parsed.modules)) {
        throw new Error("Invalid course structure returned");
      }
      
      // Preserve videoSuggestions from existing course if not provided in continuation
      if (!parsed.videoSuggestions || parsed.videoSuggestions.length === 0) {
        console.warn('Continuation response missing videoSuggestions, using existing');
        parsed.videoSuggestions = existingCourse.videoSuggestions || [];
      }
      
      // Preserve references from existing course if not provided
      if (!parsed.references || parsed.references.length === 0) {
        parsed.references = existingCourse.references || [];
      }
      
      return parsed;
    } catch (parseError) {
      console.error("JSON Parse Error in continueGeneration:", parseError);
      
      // Try to salvage partial JSON
      const lastBraceIndex = text.lastIndexOf('}');
      if (lastBraceIndex > 0) {
        try {
          const truncated = text.substring(0, lastBraceIndex + 1);
          const parsed: CourseData = JSON.parse(truncated);
          if (parsed.title && parsed.modules && parsed.modules.length > 0) {
            console.warn("Using salvaged partial response for continuation");
            return parsed;
          }
        } catch (e) {
          console.error("Failed to salvage continuation JSON");
        }
      }
      
      throw new Error(`Failed to parse continuation. Response may be too large.`);
    }
  } catch (error) {
    console.error("OpenAI continueGeneration error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to continue generation. ${msg}`);
  }
};

let conversationHistory: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

export const startChatSession = (course: CourseData) => {
  conversationHistory = [
    {
      role: "system",
      content: `You are a helpful study assistant. A student has generated a course titled "${course.title}" with ${course.modules.length} modules. Answer questions concisely and helpfully about the course content.`
    }
  ];
};

export const sendMessageToChat = async (message: string): Promise<string> => {
  if (!apiKey || apiKey === "your_openai_api_key_here") {
    throw new Error("OpenRouter API key missing. Set VITE_OPENROUTER_API_KEY in .env.local and restart the dev server.");
  }
  
  if (conversationHistory.length === 0) {
    throw new Error("Chat session not started. Please generate a course first.");
  }

  try {
    conversationHistory.push({ role: "user", content: message });

    const completion = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: conversationHistory,
      temperature: 0.6,
    });

    const response = completion.choices[0]?.message?.content ?? "(no response)";
    conversationHistory.push({ role: "assistant", content: response });

    return response;
  } catch (error) {
    console.error("OpenAI sendMessageToChat error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get a response from the assistant. ${msg}`);
  }
};

export const testConnection = async (): Promise<string> => {
  if (!apiKey || apiKey === "your_openai_api_key_here") {
    throw new Error("OpenRouter API key not configured. Add VITE_OPENROUTER_API_KEY to .env.local");
  }

  try {
    const completion = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: "Respond with: API connection successful" }],
      max_tokens: 20,
    });

    return completion.choices[0]?.message?.content ?? "Connection test completed";
  } catch (error) {
    console.error("OpenAI connection test error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Connection failed: ${msg}`);
  }
};
