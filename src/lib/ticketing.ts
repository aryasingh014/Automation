import { toast } from 'sonner';

const PROXY_URL = '/api/ticketing/proxy';

function sanitizeDomain(domain: string): string {
  return domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function sanitizeUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export type TicketingPlatform = 'servicenow' | 'jira' | 'zendesk';

export interface TicketData {
  shortDescription: string;
  description: string;
  urgency: string;
  impact: string;
  serviceName?: string;
}

export interface TicketResult {
  success: boolean;
  number?: string;
  ticketId?: string;
  sys_id?: string;
  platform: TicketingPlatform;
  url?: string;
  message?: string;
}

export interface PlatformCredentials {
  servicenow?: {
    instanceUrl: string;
    user: string;
    password: string;
  };
  jira?: {
    domain: string;
    email: string;
    apiToken: string;
    projectKey: string;
    issueType?: string;
  };
  zendesk?: {
    subdomain: string;
    email: string;
    apiToken: string;
  };
}

export interface TicketingSettings {
  platform: TicketingPlatform;
  servicenow: {
    instanceUrl: string;
    user: string;
    password: string;
    autoIncidentEnabled: boolean;
  };
  jira: {
    domain: string;
    email: string;
    apiToken: string;
    projectKey: string;
    issueType: string;
  };
  zendesk: {
    subdomain: string;
    email: string;
    apiToken: string;
  };
}

export const DEFAULT_TICKETING_SETTINGS: TicketingSettings = {
  platform: 'servicenow',
  servicenow: {
    instanceUrl: '',
    user: '',
    password: '',
    autoIncidentEnabled: false,
  },
  jira: {
    domain: '',
    email: '',
    apiToken: '',
    projectKey: '',
    issueType: 'Task',
  },
  zendesk: {
    subdomain: '',
    email: '',
    apiToken: '',
  },
};

export const PLATFORM_INFO: Record<TicketingPlatform, { name: string; color: string; description: string }> = {
  servicenow: {
    name: 'ServiceNow',
    color: 'text-[#81B5A1]',
    description: 'Enterprise ITSM and incident management',
  },
  jira: {
    name: 'Jira',
    color: 'text-[#0052CC]',
    description: 'Dev teams, agile workflows, engineering tickets',
  },
  zendesk: {
    name: 'Zendesk',
    color: 'text-[#03363D]',
    description: 'Customer support and helpdesk',
  },
};

export async function createTicket(
  data: TicketData,
  settings: TicketingSettings
): Promise<TicketResult> {
  switch (settings.platform) {
    case 'servicenow':
      return createServiceNowTicket(data, settings.servicenow);
    case 'jira':
      return createJiraTicket(data, settings.jira);
    case 'zendesk':
      return createZendeskTicket(data, settings.zendesk);
    default:
      throw new Error(`Unsupported platform: ${settings.platform}`);
  }
}

async function createServiceNowTicket(
  data: TicketData,
  credentials: TicketingSettings['servicenow']
): Promise<TicketResult> {
  if (!credentials.instanceUrl || !credentials.user || !credentials.password) {
    throw new Error('ServiceNow is not configured. Please configure in Settings.');
  }

  const cleanUrl = sanitizeUrl(credentials.instanceUrl);
  const auth = btoa(`${credentials.user}:${credentials.password}`);

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `${cleanUrl}/api/now/table/incident`,
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: {
          short_description: data.shortDescription,
          description: data.description,
          urgency: data.urgency,
          impact: data.impact,
          comments: 'Incident created via Observability.OS AI Analysis.',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `ServiceNow Error: ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      number: result.result.number,
      sys_id: result.result.sys_id,
      platform: 'servicenow',
      url: `${cleanUrl}/nav_to.do?uri=incident.do?sys_id=${result.result.sys_id}`,
    };
  } catch (error: any) {
    console.error('ServiceNow ticket creation failed:', error);
    throw error;
  }
}

async function createJiraTicket(
  data: TicketData,
  credentials: TicketingSettings['jira']
): Promise<TicketResult> {
  if (!credentials.domain || !credentials.email || !credentials.apiToken || !credentials.projectKey) {
    throw new Error('Jira is not configured. Please configure in Settings.');
  }

  const cleanDomain = sanitizeDomain(credentials.domain);
  const auth = btoa(`${credentials.email}:${credentials.apiToken}`);
  const priorityMap: Record<string, string> = {
    '1': 'Highest',
    '2': 'High',
    '3': 'Medium',
  };

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `https://${cleanDomain}/rest/api/3/issue`,
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: {
          fields: {
            project: {
              key: credentials.projectKey,
            },
            summary: data.shortDescription,
            description: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: data.description,
                    },
                  ],
                },
              ],
            },
            issuetype: {
              name: credentials.issueType || 'Task',
            },
            priority: {
              name: priorityMap[data.urgency] || 'Medium',
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = errorData.errorMessages?.[0];
      
      if (!errorMessage && errorData.errors) {
        // Extract field-specific errors like "issuetype: Specify a valid issue type"
        errorMessage = Object.entries(errorData.errors)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join(', ');
      }
      
      throw new Error(errorMessage || `Jira Error: ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      ticketId: result.id,
      number: result.key,
      platform: 'jira',
      url: `https://${cleanDomain}/browse/${result.key}`,
    };
  } catch (error: any) {
    console.error('Jira ticket creation failed:', error);
    throw error;
  }
}

async function createZendeskTicket(
  data: TicketData,
  credentials: TicketingSettings['zendesk']
): Promise<TicketResult> {
  if (!credentials.subdomain || !credentials.email || !credentials.apiToken) {
    throw new Error('Zendesk is not configured. Please configure in Settings.');
  }

  const cleanSubdomain = sanitizeDomain(credentials.subdomain);
  const auth = btoa(`${credentials.email}/token:${credentials.apiToken}`);
  const priorityMap: Record<string, string> = {
    '1': 'urgent',
    '2': 'high',
    '3': 'normal',
  };

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `https://${cleanSubdomain}.zendesk.com/api/v2/tickets.json`,
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: {
          ticket: {
            subject: data.shortDescription,
            comment: {
              body: data.description,
            },
            priority: priorityMap[data.urgency] || 'normal',
            type: 'problem',
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.description || `Zendesk Error: ${response.status}`);
    }

    const result = await response.json();
    const ticket = result.ticket;
    return {
      success: true,
      ticketId: String(ticket.id),
      number: `#${ticket.id}`,
      platform: 'zendesk',
      url: `https://${cleanSubdomain}.zendesk.com/agent/tickets/${ticket.id}`,
    };
  } catch (error: any) {
    console.error('Zendesk ticket creation failed:', error);
    throw error;
  }
}

export async function checkExistingTicket(
  serviceName: string,
  settings: TicketingSettings
): Promise<{ exists: boolean; number?: string; url?: string } | null> {
  switch (settings.platform) {
    case 'servicenow':
      return checkServiceNowIncident(serviceName, settings.servicenow);
    case 'jira':
      return null;
    case 'zendesk':
      return checkZendeskTicket(serviceName, settings.zendesk);
    default:
      return null;
  }
}

async function checkServiceNowIncident(
  serviceName: string,
  credentials: TicketingSettings['servicenow']
): Promise<{ exists: boolean; number?: string; url?: string } | null> {
  if (!credentials.instanceUrl || !credentials.user || !credentials.password) {
    return null;
  }

  const cleanUrl = sanitizeUrl(credentials.instanceUrl);
  const auth = btoa(`${credentials.user}:${credentials.password}`);

  try {
    const query = encodeURIComponent(`short_descriptionLIKE${serviceName}^stateNOT IN6,7,8`);
    const url = `${cleanUrl}/api/now/table/incident?sysparm_query=${query}&sysparm_limit=1`;
    
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.result && data.result.length > 0) {
      return {
        exists: true,
        number: data.result[0].number,
        url: `${cleanUrl}/nav_to.do?uri=incident.do?sys_id=${data.result[0].sys_id}`,
      };
    }
    return null;
  } catch {
    return null;
  }
}