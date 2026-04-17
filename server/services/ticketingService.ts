// Using global fetch (available in Node 18+)


export interface IncidentData {
  id: string;
  number: string;
  sys_id: string;
  title: string;
  priority: string;
  status: string;
  owner: string;
  age: string;
  serviceName: string;
  createdAt: string;
  platform: 'servicenow' | 'jira' | 'zendesk';
}

export async function fetchServiceNowIncidents(): Promise<IncidentData[]> {
  const { SERVICENOW_INSTANCE_URL, SERVICENOW_USER, SERVICENOW_PASSWORD } = process.env;
  
  if (!SERVICENOW_INSTANCE_URL || !SERVICENOW_USER || !SERVICENOW_PASSWORD) {
    return [];
  }

  try {
    const auth = Buffer.from(`${SERVICENOW_USER}:${SERVICENOW_PASSWORD}`).toString('base64');
    const response = await fetch(`${SERVICENOW_INSTANCE_URL}/api/now/table/incident?sysparm_limit=10&sysparm_query=ORDERBYDESCsys_created_on&sysparm_display_value=true`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) return [];

    const data: any = await response.json();
    return (data.result || []).map((inc: any) => ({
      id: inc.number,
      number: inc.number,
      sys_id: inc.sys_id,
      title: inc.short_description || "No description provided",
      priority: inc.priority || "P3",
      status: inc.state || "New",
      owner: inc.assigned_to?.display_value || "Unassigned",
      age: inc.sys_created_on ? new Date(inc.sys_created_on).toLocaleString() : "Recently",
      serviceName: inc.category || "General",
      createdAt: inc.sys_created_on,
      platform: 'servicenow'
    }));
  } catch (error) {
    console.error('[TicketingService] ServiceNow failed:', error);
    return [];
  }
}

export async function fetchJiraIncidents(): Promise<IncidentData[]> {
  const { JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY } = process.env;

  if (!JIRA_DOMAIN || !JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_PROJECT_KEY) {
    return [];
  }

  try {
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
    const url = `https://${JIRA_DOMAIN}/rest/api/3/search/jql?jql=project=${JIRA_PROJECT_KEY} ORDER BY created DESC&maxResults=10&fields=summary,priority,status,assignee,created,components`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) return [];

    const data: any = await response.json();
    return (data.issues || []).map((issue: any) => ({
      id: issue.key,
      number: issue.key,
      sys_id: issue.id,
      title: issue.fields.summary || "No description",
      priority: issue.fields.priority?.name || "Medium",
      status: issue.fields.status?.name || "Open",
      owner: issue.fields.assignee?.displayName || "Unassigned",
      age: issue.fields.created ? new Date(issue.fields.created).toLocaleString() : "Recently",
      serviceName: issue.fields.components?.[0]?.name || "Jira Task",
      createdAt: issue.fields.created,
      platform: 'jira'
    }));
  } catch (error) {
    console.error('[TicketingService] Jira failed:', error);
    return [];
  }
}

export async function fetchZendeskIncidents(): Promise<IncidentData[]> {
  const { ZENDESK_SUBDOMAIN, ZENDESK_EMAIL, ZENDESK_API_TOKEN } = process.env;

  if (!ZENDESK_SUBDOMAIN || !ZENDESK_EMAIL || !ZENDESK_API_TOKEN) {
    return [];
  }

  try {
    const auth = Buffer.from(`${ZENDESK_EMAIL}/token:${ZENDESK_API_TOKEN}`).toString('base64');
    const url = `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/tickets.json?sort_by=created_at&sort_order=desc&per_page=10`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) return [];

    const data: any = await response.json();
    return (data.tickets || []).map((ticket: any) => ({
      id: String(ticket.id),
      number: `#${ticket.id}`,
      sys_id: String(ticket.id),
      title: ticket.subject || "No subject",
      priority: ticket.priority || "normal",
      status: ticket.status || "open",
      owner: "Assigned",
      age: ticket.created_at ? new Date(ticket.created_at).toLocaleString() : "Recently",
      serviceName: "Customer Support",
      createdAt: ticket.created_at,
      platform: 'zendesk'
    }));
  } catch (error) {
    console.error('[TicketingService] Zendesk failed:', error);
    return [];
  }
}

export async function fetchAllIncidents(): Promise<IncidentData[]> {
  const [sn, jira, zendesk] = await Promise.all([
    fetchServiceNowIncidents(),
    fetchJiraIncidents(),
    fetchZendeskIncidents()
  ]);
  return [...sn, ...jira, ...zendesk];
}
