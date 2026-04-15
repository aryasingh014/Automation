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
  if (!settings.instanceUrl || !settings.user || !settings.password) {
    throw new Error("ServiceNow is not configured. Please configure ServiceNow in Settings.");
  }

  const isDev = import.meta.env.DEV;
  
  let baseUrl = settings.instanceUrl;
  if (isDev && (baseUrl === "" || baseUrl.includes("dev363754.service-now.com"))) {
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
      const contentType = response.headers.get('content-type') || '';
      let errorMessage = `ServiceNow Error: ${response.status}`;
      if (contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorData.result?.error?.message || errorMessage;
        } catch {
          errorMessage = `ServiceNow Error: ${response.status} - ${response.statusText}`;
        }
      } else {
        const errorText = await response.text();
        if (errorText.includes('<html>')) {
          errorMessage = `ServiceNow connection failed (${response.status}). Check your instance URL and credentials.`;
        } else {
          errorMessage = `ServiceNow Error: ${response.status} - ${errorText.substring(0, 100)}`;
        }
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const bodyText = await response.text();
      if (bodyText.includes('<html') || bodyText.includes('<!DOCTYPE')) {
        throw new Error('ServiceNow returned an HTML page (possible login redirect). Check your instance URL and credentials.');
      }
      throw new Error(`ServiceNow returned unexpected content-type: ${contentType}`);
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

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.warn("ServiceNow returned non-JSON response when checking incidents, skipping check.");
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
