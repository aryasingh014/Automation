import { AiSettings } from "../context/AppContext";

async function fetchWithTimeout(url: string, options: any = {}, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout / 1000}s`);
    }
    throw error;
  }
}

async function callOpenAI(prompt: string, settings: AiSettings) {
  const model = settings.model || "gpt-4o-mini";
  const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    })
  }, 60000);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callAnthropic(prompt: string, settings: AiSettings) {
  const model = settings.model || "claude-3-haiku-20240307";
  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }]
    })
  }, 60000);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callAzureOpenAI(prompt: string, settings: AiSettings) {
  const deployment = settings.model || "gpt-4";
  const endpoint = settings.endpoint || "";
  const apiVersion = "2024-02-15";
  
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": settings.apiKey
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    })
  }, 60000);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callOllama(prompt: string, settings: AiSettings) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (settings.apiKey) {
    headers['Authorization'] = `Bearer ${settings.apiKey}`;
  }

  const url = `/api/ollama/generate`;
  console.log(`[AI] Calling Ollama: ${url}`);

  let response: Response;
  try {
    response = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: settings.model || "llama3",
        prompt,
        stream: true,
        format: prompt.includes("JSON") ? "json" : undefined
      })
    }, 45000);
  } catch (error: any) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error(`Connection failed. Ensure Ollama is running on localhost:11434`);
    }
    throw error;
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Ollama Error (${response.status}): ${errorBody}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Ollama response not readable");

  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const chunk = JSON.parse(line);
        if (chunk.response) accumulated += chunk.response;
        if (chunk.done) break;
      } catch { }
    }
  }

  return accumulated;
}

async function callGemini(prompt: string, settings: AiSettings) {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(settings.apiKey);
  const modelName = settings.model || "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

export async function callAI(prompt: string, settings: AiSettings) {
  switch (settings.provider) {
    case 'openai':
      return callOpenAI(prompt, settings);
    case 'anthropic':
      return callAnthropic(prompt, settings);
    case 'azure':
      return callAzureOpenAI(prompt, settings);
    case 'ollama':
      return callOllama(prompt, settings);
    case 'gemini':
      return callGemini(prompt, settings);
    case 'bedrock':
      throw new Error("AWS Bedrock is coming soon");
    case 'vertexai':
    case 'openrouter':
    case 'groq':
      throw new Error(`${settings.provider} support is coming soon`);
    default:
      throw new Error(`Unknown provider: ${settings.provider}`);
  }
}

function isSimulationMode(settings: AiSettings) {
  return settings.provider === 'gemini' && 
    (!settings.apiKey || settings.apiKey === "MY_GEMINI_API_KEY" || settings.apiKey === "");
}

export async function analyzeIncident(serviceName: string, incidentDetails: string, settings: AiSettings) {
  if (isSimulationMode(settings)) {
    return {
      analysis: "AI Analysis is in simulation mode. Configure AI provider in Settings to enable real insights.",
      recommendations: ["Check system logs", "Verify service health", "Scale if needed"],
      severity: "Warning"
    };
  }

  const prompt = `You are an IT operations expert. Analyze this incident and respond ONLY with valid JSON.
Service: "${serviceName}"
Details: ${incidentDetails}
Required JSON: {"analysis": "string", "recommendations": ["string", "string", "string"], "severity": "Critical|Warning|Info"}`;

  try {
    const text = await callAI(prompt, settings);
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const cleanText = jsonMatch ? jsonMatch[0] : text;
      return JSON.parse(cleanText);
    } catch {
      return {
        analysis: text,
        recommendations: ["Refer to standard SOPs"],
        severity: "Warning"
      };
    }
  } catch (error: any) {
    console.error("AI Error:", error);
    return {
      analysis: "Error: " + error.message,
      recommendations: ["Manual inspection required", "Verify AI settings"],
      severity: "Critical"
    };
  }
}

export async function summarizeLogs(serviceName: string, logs: string, settings: AiSettings) {
  if (isSimulationMode(settings)) {
    return "Simulation: Logs show periodic timeouts. Check network stability.";
  }

  const prompt = `Summarize these logs for "${serviceName}" and identify critical errors: ${logs}`;
  
  try {
    return await callAI(prompt, settings);
  } catch (error: any) {
    return "Error summarizing logs: " + error.message;
  }
}

export async function getAvailableModels(settings: AiSettings) {
  if (settings.provider === 'ollama') {
    try {
      const response = await fetchWithTimeout("/api/ollama/tags", {}, 15000);
      if (!response.ok) {
        if (response.status === 404) throw new Error("Ollama not running. Start Ollama with: ollama serve");
        throw new Error(`Failed to fetch Ollama models: ${response.status}`);
      }
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (e: any) {
      throw new Error(`Ollama unavailable: ${e.message}. Make sure Ollama is running on port 11434.`);
    }
  }

  const models: Record<string, string[]> = {
    gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    azure: ['gpt-4', 'gpt-35-turbo']
  };

  return models[settings.provider] || [];
}

export async function testAiConnection(settings: AiSettings) {
  const testPrompt = "Reply with exactly: PONG";
  
  try {
    const result = await callAI(testPrompt, settings);
    return { 
      success: true, 
      message: result.trim().length > 0 ? "Connection successful!" : "Connected but empty response"
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}