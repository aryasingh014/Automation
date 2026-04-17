import { AiSettings, DEFAULT_LLM_PRICING } from "../context/AppContext";

const DEFAULT_SYSTEM_PROMPT = `You are an Enterprise IT Operations Assistant for an Observability Platform.

IMPORTANT RESPONSE RULES:
1. Use EXACT numbers from the data provided - never guess or estimate
2. If a value is 0, explicitly say "0" - do not say "none" or "no data"
3. Be direct, concise, and factual - avoid fluff phrases
4. If data is unavailable, say "No data available" - do not make up information
5. When asked for counts/cnumbers, provide the exact count from the data
6. Format responses clearly with bullet points for lists
7. Always acknowledge issues explicitly when data shows problems

Your role is to analyze platform metrics and provide actionable insights.`;

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

function buildPrompt(userPrompt: string, systemPrompt: string = DEFAULT_SYSTEM_PROMPT): string {
  return `${systemPrompt}

USER QUESTION: ${userPrompt}

Provide a direct, factual answer using ONLY the data provided above.`;
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
      messages: [
        { role: "system", content: DEFAULT_SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })
  }, 60000);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    text: data.choices[0].message.content,
    usage: {
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens
    }
  };
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
      max_tokens: 2000,
      temperature: 0.3,
      system: DEFAULT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }]
    })
  }, 60000);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    text: data.content[0].text,
    usage: {
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens
    }
  };
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
      messages: [
        { role: "system", content: DEFAULT_SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })
  }, 60000);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    text: data.choices[0].message.content,
    usage: {
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens
    }
  };
}

async function callOllama(prompt: string, settings: AiSettings) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (settings.apiKey) {
    headers['Authorization'] = `Bearer ${settings.apiKey}`;
  }

  const url = `/api/ollama/generate`;
  console.log(`[AI] Calling Ollama: ${url}`);

  const model = settings.model && settings.model.includes('.') ? settings.model : "llama3.1";
  
  const ollamaPrompt = `${DEFAULT_SYSTEM_PROMPT}

USER QUESTION: ${prompt}

Answer using ONLY the data provided. Be direct and factual. If no data, say "No data available".`;

  let response: Response;
  try {
    response = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        prompt: ollamaPrompt,
        stream: true,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          top_k: 40,
          num_ctx: 8192,
          num_predict: 2048,
        },
        format: ollamaPrompt.includes("JSON") ? "json" : undefined
      })
    }, 60000);
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
  let usage = { inputTokens: 0, outputTokens: 0 };

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
        if (chunk.done_reason === "stop" || chunk.done) {
          usage = {
            inputTokens: chunk.prompt_eval_count || 0,
            outputTokens: chunk.eval_count || 0
          };
          break;
        }
      } catch { }
    }
  }

  return { text: accumulated.trim(), usage };
}

async function callGroq(prompt: string, settings: AiSettings) {
  const model = settings.model || "llama-3.1-70b-versatile";
  const response = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: DEFAULT_SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })
  }, 60000);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    text: data.choices[0].message.content,
    usage: {
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens
    }
  };
}

async function callGemini(prompt: string, settings: AiSettings) {
  const genAI = new GoogleGenerativeAI(settings.apiKey);
  const modelName = settings.model || "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    }
  });
  
  const fullPrompt = `${DEFAULT_SYSTEM_PROMPT}

USER QUESTION: ${prompt}

Provide a direct, factual answer using ONLY the data provided.`;
  
  const result = await model.generateContent(fullPrompt);
  const response = await result.response;
  return {
    text: response.text(),
    usage: {
      inputTokens: response.usageMetadata?.promptTokenCount || 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount || 0
    }
  };
}

export async function callAI(prompt: string, settings: AiSettings): Promise<string> {
  // 1. Check Quota on Backend
  try {
    const quotaRes = await fetch(`/api/llm/check-quota/${settings.provider}/${settings.model || 'default'}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (quotaRes.ok) {
      const quota = await quotaRes.json();
      if (!quota.allowed) {
        throw new Error(`Quota Exceeded: ${quota.reason}`);
      }
    }
  } catch (e: any) {
    if (e.message.includes('Quota Exceeded')) throw e;
    console.warn('[AI] Quota check failed, proceeding anyway:', e);
  }

  let result: { text: string, usage: { inputTokens: number, outputTokens: number } };
  
  switch (settings.provider) {
    case 'openai':
      result = await callOpenAI(prompt, settings);
      break;
    case 'anthropic':
      result = await callAnthropic(prompt, settings);
      break;
    case 'azure':
      result = await callAzureOpenAI(prompt, settings);
      break;
    case 'ollama':
      result = await callOllama(prompt, settings);
      break;
    case 'gemini':
      result = await callGemini(prompt, settings);
      break;
    case 'groq':
      result = await callGroq(prompt, settings);
      break;
    case 'bedrock':
      throw new Error("AWS Bedrock is coming soon");
    case 'vertexai':
    case 'openrouter':
      throw new Error(`${settings.provider} support is coming soon`);
    default:
      throw new Error(`Unknown provider: ${settings.provider}`);
  }

  // Hook for usage tracking - we don't await this to avoid blocking the UI response
  const trackUsage = async () => {
    try {
      const providerPricing = DEFAULT_LLM_PRICING[settings.provider] || {};
      const pricing = providerPricing[settings.model] || providerPricing['default'] || { inputCost: 0, outputCost: 0 };
      const inputTokens = result.usage.inputTokens || 0;
      const outputTokens = result.usage.outputTokens || 0;
      const costRaw = (inputTokens / 1000 * pricing.inputCost) + (outputTokens / 1000 * pricing.outputCost);
      const cost = isNaN(costRaw) ? 0 : costRaw;

      await fetch('/api/llm/usage', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          provider: settings.provider,
          model: settings.model || 'default',
          inputTokens,
          outputTokens,
          cost
        })
      });
    } catch (e) {
      console.warn('[AI] Failed to track usage:', e);
    }
  };
  
  trackUsage();

  return result.text;
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
Required JSON: {"analysis": "string", "recommendations": ["string", "string", "string"], "severity": "Critical|Warning|Info"}

IMPORTANT: Respond ONLY with valid JSON. No additional text.`;

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
    const errorMsg = error.message || String(error);
    if (errorMsg.toLowerCase().includes('image') || errorMsg.toLowerCase().includes('vision') || errorMsg.toLowerCase().includes('Unsupported') || errorMsg.toLowerCase().includes('does not support')) {
      return {
        analysis: "Vision/image analysis is not supported by the selected AI model. Please use a vision-capable model in Settings.",
        recommendations: ["Switch to GPT-4o, Claude 3, or Gemini models for image analysis", "Use text-only queries instead"],
        severity: "Warning"
      };
    }
    return {
      analysis: "Error: " + errorMsg,
      recommendations: ["Manual inspection required", "Verify AI settings"],
      severity: "Critical"
    };
  }
}

export async function summarizeLogs(serviceName: string, logs: string, settings: AiSettings) {
  if (isSimulationMode(settings)) {
    return "Simulation: Logs show periodic timeouts. Check network stability.";
  }

  const prompt = `${DEFAULT_SYSTEM_PROMPT}

Summarize these logs for service "${serviceName}" and identify critical errors:

${logs}

Provide a concise summary with specific error details.`;
  
  try {
    return await callAI(prompt, settings);
  } catch (error: any) {
    const errorMsg = error.message || "Unknown error";
    if (errorMsg.toLowerCase().includes('image') || errorMsg.toLowerCase().includes('vision') || errorMsg.toLowerCase().includes('Unsupported')) {
      return "Image/vision analysis requires a vision-capable AI model. Please use GPT-4o, Claude 3, or Gemini in Settings.";
    }
    return "Error summarizing logs: " + errorMsg;
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

  if (settings.provider === 'groq' && settings.apiKey) {
    try {
      const response = await fetchWithTimeout("https://api.groq.com/openai/v1/models", {
        headers: { "Authorization": `Bearer ${settings.apiKey}` }
      }, 15000);
      if (response.ok) {
        const data = await response.json();
        return data.data?.map((m: any) => m.id) || [];
      }
    } catch (e: any) {
      console.warn("Failed to fetch Groq models:", e.message);
    }
  }

  if (settings.provider === 'openai' && settings.apiKey) {
    try {
      const response = await fetchWithTimeout("https://api.openai.com/v1/models", {
        headers: { "Authorization": `Bearer ${settings.apiKey}` }
      }, 15000);
      if (response.ok) {
        const data = await response.json();
        return data.data?.filter((m: any) => m.id.startsWith('gpt-')).map((m: any) => m.id) || [];
      }
    } catch (e: any) {
      console.warn("Failed to fetch OpenAI models:", e.message);
    }
  }

  const models: Record<string, string[]> = {
    gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    azure: ['gpt-4', 'gpt-35-turbo'],
    groq: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'llama-3-70b-8192', 'mixtral-8x7b-32768']
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
