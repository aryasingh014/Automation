# Observability.OS
## Enterprise IT Observability Dashboard

---

# 📋 Project Overview

**Observability.OS** is an enterprise-grade monitoring and observability platform designed to provide full-stack visibility into complex application ecosystems. It serves as a central "Mission Control" interface for IT Operations teams, Site Reliability Engineers (SRE), and Business Executives.

---

# 🎯 What Does This Project Do?

Observability.OS consolidates multiple monitoring capabilities into a single unified platform:

| Capability | Description |
|-----------|------------|
| **Real-time Monitoring** | Live telemetry data for all applications |
| **AI-Powered Analysis** | Intelligent incident detection and analysis |
| **Incident Management** | ServiceNow integration for automated ticketing |
| **Infrastructure View** | Complete visibility of servers, databases, and networks |
| **Application Portfolio** | Health tracking for your entire application ecosystem |
| **Onboarding Pipeline** | Structured process for adding new applications |

---

# 💡 Who Is This For?

| User Type | Benefit |
|----------|---------|
| **Executive Leadership** | High-level health scores, performance trends, business risk assessment |
| **IT Operations (NOC)** | Real-time incident control, alert management, ServiceNow integration |
| **Site Reliability Engineers (SRE)** | Infrastructure monitoring, resource utilization, SLA tracking |
| **Application Owners** | Application health, latency, error rates, uptime metrics |
| **DevOps Teams** | Onboarding new applications, CMDB sync, automated incident creation |

---

# ⚙️ How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     Observability.OS                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Executive │  │Application│  │Infra-    │  │  NOC    │  │
│  │Dashboard │  │Portfolio  │  │structure │  │Operations│  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │             │             │             │             │        │
│  ┌────┴────────────┴────────────┴────────────┴────────┐  │
│  │              Central Data Layer                    │  │
│  └────┬────────────┬────────────┬────────────┬────────┘  │
│       │             │             │             │          │
├───────┼─────────────┼─────────────┼─────────────┼──────────┤
│       ▼             ▼             ▼             ▼          │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐  │
│  │WebSocket│  │  MongoDB │  │ServiceNow│  │ Ollama/AI │  │
│  │Real-time│  │Database  │  │  API    │  │  Models  │  │
│  │Updates │  │         │  │Incidents │  │Analysis │  │
│  └────────┘  └──────────┘  └─────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow:
1. **Data Collection** → Applications send telemetry (latency, errors, health)
2. **Real-time Processing** → WebSocket pushes live updates to all dashboards
3. **AI Analysis** → When issues detected, AI analyzes logs and provides recommendations
4. **Incident Creation** → Critical issues auto-create ServiceNow tickets
5. **Visualization** → All data displayed in interactive dashboards

---

# 🚀 How It Helps Your Organization

## Benefits Summary

| Category | Benefit |
|----------|---------|
| **Faster Incident Response** | AI-powered analysis reduces MTTR (Mean Time To Resolution) |
| **Proactive Monitoring** | Detect issues before they impact customers |
| **Unified View** | Single pane of glass for all monitoring needs |
| **Automated Operations** | Auto-create ServiceNow incidents for critical issues |
| **Executive Reporting** | Generate PDF/CSV reports for stakeholders |
| **Complete Visibility** | From infrastructure to business metrics |

## Key Features

✅ **Real-time Dashboard** - Live updating telemetry with sub-second refresh  
✅ **AI-Powered Insights** - Intelligent analysis of incidents and logs  
✅ **ServiceNow Integration** - Bi-directional incident sync with your ITSM  
✅ **Autonomous Engine** - Auto-create incidents for critical issues  
✅ **Export Capabilities** - PDF reports and CSV data for external analysis  
✅ **Role-Based Views** - Tailored dashboards for different stakeholders  
✅ **Demo Mode** - Built-in simulation for presentations and training  

---

# 📊 Dashboard Overview

The platform includes 5 main dashboards, each serving different purposes:

---

## 1️⃣ Executive Dashboard

**Purpose:** Business-focused overview for leadership and stakeholders

**What it shows:**
- Average Latency KPI
- Error Rate percentage
- Overall Health Score
- SLA Compliance metric
- Portfolio Distribution (pie chart)
- System Performance Trends (live chart)
- Critical Service Impact table

**Key Actions:**
- Export to PDF (one-click executive report)
- Export to CSV (data analysis)
- AI Investigation of critical services

**Best for:** C-level presentations, board meetings, stakeholder updates

---

## 2️⃣ Application Portfolio

**Purpose:** Detailed view of all applications in your ecosystem

**What it shows:**
- Total application count
- Critical/Warning/Healthy breakdown
- Application cards with health indicators
- Detailed metrics table (latency, errors, health score)
- Tier classification (T1, T2, T3)
- Owner information

**Key Actions:**
- Search and filter applications
- View detailed application info
- Restart services
- Configure alerts per application
- Decommission old applications
- Copy application IDs

**Best for:** Application managers, DevOps teams, technical leads

---

## 3️⃣ Infrastructure Dashboard

**Purpose:** Monitoring of servers, databases, and networks

**What it shows:**
- CPU and Memory utilization charts
- Cluster status (US-East-1, US-West-2, EU-Central-1, etc.)
- Resource cards (Compute, Database, Network, Storage)
- Infrastructure inventory table
- Resource trends over time

**Key Actions:**
- Export inventory to CSV
- Sync with CMDB
- Configure individual nodes
- SSH console access (simulated)
- Restart nodes

**Best for:** SRE teams, infrastructure engineers, cloud architects

---

## 4️⃣ NOC / Operations Dashboard ⭐ (Most Advanced)

**Purpose:** Real-time incident control center

**What it shows:**
- Active Alert Feed with severity levels
- Filter: All Events / Critical only
- ServiceNow Incident Queue
- Live incident sync from ServiceNow
- Alert acknowledgment tracking

**Key Actions:**
- AI Log Analysis - Analyze logs with AI
- Autonomous Incident Creation - Auto-create tickets
- Acknowledge alerts
- Refresh ServiceNow incidents

**AI Capabilities:**
- Analyze error logs automatically
- Provide strategic recommendations
- Auto-create ServiceNow incidents for critical issues
- Deduplicate similar incidents

**Best for:** NOC operators, incident responders, on-call engineers

---

## 5️⃣ Onboarding Factory

**Purpose:** Structured pipeline for adding new applications

**What it shows:**
- Wave Progress (Pilot → Scale → Full Rollout)
- Definition of Done checklist
- Recently onboarded applications
- Onboarding status tracker

**Key Actions:**
- Create new onboarding request
- Specify: App name, tier, owner, environment
- Track onboarding progress

**Best for:** Application onboarding teams, transformation projects

---

# 🔧 Settings & Configuration

The Settings modal allows customization of:

| Setting | Options |
|---------|---------|
| **Theme** | Light / Dark mode |
| **Demo Mode** | ON/OFF with speed control |
| **Alert Thresholds** | CPU, Memory, Latency, Error Rate |
| **AI Provider** | Ollama, OpenAI, Anthropic, Azure, AWS, Google Cloud |
| **ServiceNow** | Instance URL, credentials, Autonomous Engine |

---

# 🔌 Integration Points

### Current Integrations:

| Integration | Function |
|-------------|----------|
| **ServiceNow** | Incident creation and sync |
| **Ollama** | Local AI/LLM for analysis |
| **OpenAI** | Cloud AI analysis (configurable) |
| **Anthropic** | Claude-based analysis |
| **Azure OpenAI** | Enterprise AI deployment |
| **MongoDB** | D
