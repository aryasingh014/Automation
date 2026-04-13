/**
 * ServiceNow API Client
 * Using Table API to create incidents
 */

export interface ServiceNowSettings {
  instanceUrl: string;
  user: string;
  password: string;
}

export async function createServiceNowIncident(
  shortDescription: string, 
  description: string, 
  urgency: string = "2", 
  impact: string = "2",
  settings: ServiceNowSettings
) {
  // In development, we use Vite's proxy (defined in vite.config.ts) to avoid CORS issues if URL is empty.
  // We use the provided settings for instanceUrl, user, and password.
  const isDev = import.meta.env.DEV;
  
  // If we are in dev and the URL is the default/example one, we might want to use the proxy
  // However, the user provided a URL, so we should use it. 
  // Vite proxy only works if the fetch URL starts with /api/... and doesn't have a protocol.
  // So we handle both absolute and relative (proxy) cases.
  
  let baseUrl = settings.instanceUrl;
  if (isDev && (baseUrl === "" || baseUrl.includes("dev363754.service-now.com"))) {
    // If it's the default dev instance, use the proxy for local development
    baseUrl = "";
  }

  const auth = btoa(`${settings.user}:${settings.password}`);
  
  try {
    const response = await fetch(`${baseUrl}/api/now/table/incident`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        short_description: shortDescription,
        description: description,
        urgency: urgency, // 1: High, 2: Medium, 3: Low
        impact: impact,   // 1: High, 2: Medium, 3: Low
        assignment_group: "", // Optional: Link to a specific group
        comments: "Incident created via Observability.OS Gemini AI Analysis."
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `ServiceNow Error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      number: data.result.number,
      sys_id: data.result.sys_id,
      status: data.result.state
    };
  } catch (error) {
    console.error("ServiceNow Integration Error:", error);
    throw error;
  }
}

/**
 * Checks if an active incident already exists for a given service
 */
export async function checkActiveIncident(
  serviceName: string,
  settings: ServiceNowSettings
) {
  const isDev = import.meta.env.DEV;
  let baseUrl = settings.instanceUrl;
  
  if (isDev && (baseUrl === "" || baseUrl.includes("dev363754.service-now.com"))) {
    baseUrl = "";
  }

  const auth = btoa(`${settings.user}:${settings.password}`);
  
  try {
    // URL encode the sysparm_query: short_descriptionLIKE[serviceName]^stateNOT IN6,7,8
    const query = encodeURIComponent(`short_descriptionLIKE${serviceName}^stateNOT IN6,7,8`);
    
    const response = await fetch(`${baseUrl}/api/now/table/incident?sysparm_query=${query}&sysparm_limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn("Failed to check active incidents, proceeding with creation anyway.");
      return null;
    }

    const data = await response.json();
    
    // If the result array has items, an active incident exists
    if (data.result && data.result.length > 0) {
      return {
        exists: true,
        number: data.result[0].number,
        sys_id: data.result[0].sys_id,
        state: data.result[0].state
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error checking active incidents:", error);
    return null; // Return null so the main flow can continue and attempt creation
  }
}
