import { GoogleGenerativeAI } from "@google/generative-ai";
import { AiSettings } from "../context/AppContext";

/**
 * AI Analysis logic that supports multiple providers with reliability fixes
 */

/**
 * Helper to perform fetch with a timeout
 */
async function fetchWithTimeout(url: string, options: any = {}, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout / 1000}s. The AI service might be overloaded or unreachable.`);
    }
    throw error;
  }
}

async function callGemini(prompt: string, settings: AiSettings) {
  const genAI = new GoogleGenerativeAI(settings.apiKey);
  // Default to 1.5-flash for speed
  const modelName = settings.model || "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

async function callOllama(prompt: string, settings: AiSettings) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (settings.apiKey) {
    headers['Authorization'] = `Bearer ${settings.apiKey}`;
  }

  // Route through Express backend at /api/ollama/* which proxies to Ollama server-side.
  // This avoids any browser CORS / Cloudflare tunnel restrictions.
  const url = `/api/ollama/generate`;
  console.log(`[AI_DEBUG] Fetching Ollama via backend proxy: ${url}`);

  let response: Response;
  try {
    response = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: settings.model || "llama3",
        prompt,
        stream: true,   // stream tokens — prevents idle-connection timeouts
        format: prompt.includes("JSON") ? "json" : undefined
      })
    }, 15000); // 15 s is plenty just to open the connection
  } catch (error: any) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('net::ERR')) {
      throw new Error(`Connection failed. Ensure Ollama is running on localhost:11434 and the Vite dev server is active.`);
    }
    throw error;
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`AI Provider Error (${response.status}): ${errorBody || response.statusText}`);
  }

  // Read the NDJSON stream and accumulate the full text
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Ollama response body is not readable.");

  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // Each NDJSON line is a complete JSON object
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // keep incomplete trailing chunk
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const chunk = JSON.parse(line);
        if (chunk.response) accumulated += chunk.response;
        if (chunk.done) break;
      } catch {
        // ignore malformed lines
      }
    }
  }

  return accumulated;
}

export async function analyzeIncident(serviceName: string, incidentDetails: string, settings: AiSettings) {
  // Check for simulation mode (no API key for Gemini)
  if (settings.provider === 'gemini' && (!settings.apiKey || settings.apiKey === "MY_GEMINI_API_KEY" || settings.apiKey === "")) {
    return {
      analysis: "AI Analysis is currently in simulation mode. Please provide a valid VITE_GEMINI_API_KEY in the .env file or settings to enable real insights.",
      recommendations: [
        "Check system logs for similar patterns",
        "Verify downstream service health",
        "Scale the target service if CPU usage is high"
      ],
      severity: "Warning"
    };
  }

  // Concise prompt — fewer output tokens = faster response on local models
  const prompt = `You are an IT operations expert. Analyze this incident and reply ONLY with valid JSON (no markdown).
Service: "${serviceName}"
Details: ${incidentDetails}
Required JSON fields: "analysis" (string), "recommendations" (array of 3 strings), "severity" ("Critical"|"Warning"|"Info").`;

  try {
    let text = "";
    if (settings.provider === 'ollama') {
      text = await callOllama(prompt, settings);
    } else if (settings.provider === 'bedrock') {
      throw new Error("AWS Bedrock support is coming soon.");
    } else {
      text = await callGemini(prompt, settings);
    }
    
    // Attempt to parse JSON from the response
    try {
      // Find the first { and last } to extract JSON if there's markdown fluff
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const cleanText = jsonMatch ? jsonMatch[0] : text;
      return JSON.parse(cleanText);
    } catch (e) {
      return {
        analysis: text,
        recommendations: ["Refer to standard SOPs for " + serviceName],
        severity: "Warning"
      };
    }
  } catch (error: any) {
    console.error("AI API Error:", error);
    const errorMsg = error.message || String(error);
    if (errorMsg.toLowerCase().includes('image') || errorMsg.toLowerCase().includes('vision') || errorMsg.toLowerCase().includes('Unsupported')) {
      return {
        analysis: "Vision/image analysis is not supported by the current AI model. Please use a vision-capable model like gemini-1.5-pro or gpt-4o for image analysis.",
        recommendations: ["Switch to a vision-enabled AI model in Settings", "Use text-only queries instead", "Try gemini-1.5-pro or OpenAI GPT-4o for image tasks"],
        severity: "Warning"
      };
    }
    return {
        analysis: "Error: " + errorMsg,
        recommendations: ["Manual inspection required", "Verify AI Endpoint settings"],
        severity: "Critical"
    };
  }
}

export async function summarizeLogs(serviceName: string, logs: string, settings: AiSettings) {
  if (settings.provider === 'gemini' && (!settings.apiKey || settings.apiKey === "MY_GEMINI_API_KEY" || settings.apiKey === "")) {
    return "Log summarization simulation: Logs show periodic timeouts and intermittent connection drops. Recommended action: Check network stability.";
  }

  const prompt = `Summarize these logs for service "${serviceName}" and identify any critical errors: ${logs}`;

  try {
    if (settings.provider === 'ollama') {
      return await callOllama(prompt, settings);
    } else if (settings.provider === 'bedrock') {
       throw new Error("AWS Bedrock support is coming soon.");
    } else {
      return await callGemini(prompt, settings);
    }
  } catch (error: any) {
    console.error("AI API Error:", error);
    const errorMsg = error.message || "Unknown error";
    if (errorMsg.toLowerCase().includes('image') || errorMsg.toLowerCase().includes('vision') || errorMsg.toLowerCase().includes('Unsupported')) {
      return "Log summarization requires text-based AI. The current model does not support image inputs. Please switch to a model like gemini-1.5-flash in Settings.";
    }
    return "Error summarizing logs: " + errorMsg;
  }
}

export async function getAvailableModels(settings: AiSettings) {
  if (settings.provider === 'ollama') {
    // Route through the Express backend — no CORS, no tunnel issues.
    const url = `/api/ollama/tags`;

    try {
      const response = await fetchWithTimeout(url, {}, 15000); // Allow up to 15s for Ollama to respond
      if (!response.ok) throw new Error("Failed to fetch Ollama models");
      const data = await response.json();
      if (!data.models) return [];
      return data.models.map((m: any) => m.name);
    } catch (e: any) {
      console.error("Ollama Discovery Error:", e);
      throw new Error(`Discovery failed: ${e.message}. Ensure Ollama is running on localhost:11434.`);
    }
  }

  if (settings.provider === 'gemini') {
    return ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'];
  }

  return [];
}

export async function testAiConnection(settings: AiSettings) {
  const testPrompt = "Ping. Respond with 'PONG' and nothing else.";
  
  try {
    let result = "";
    if (settings.provider === 'ollama') {
      result = await callOllama(testPrompt, settings);
    } else if (settings.provider === 'gemini') {
      result = await callGemini(testPrompt, settings);
    } else {
      throw new Error("Provider not supported for testing yet.");
    }

    return { 
      success: true, 
      message: result.trim().length > 0 ? "Connection Successful!" : "Connection established but empty response."
    };
  } catch (error: any) {
    return { 
      success: false, 
      message: error.message || String(error) 
    };
  }
}


