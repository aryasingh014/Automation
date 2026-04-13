# Observability.OS - Enterprise IT Observability Dashboard

---

## Project Overview

**Observability.OS** is a high-fidelity, enterprise-grade observability platform that provides full-stack visibility into complex application ecosystems. It consolidates metrics, logs, and traces into a unified "Mission Control" interface designed for IT Operations (NOC), Site Reliability Engineers (SRE), and Executives.

---

## Key Features

### 1. **Executive Dashboard**
- **Portfolio Health Summary**: High-level KPIs including Average Latency, Error Rate, Overall Health, and SLA Compliance
- **Health Distribution Chart**: Pie chart showing Critical, Warning, and Healthy application counts
- **Performance Trends**: Real-time area charts for throughput and latency
- **Critical Service Impact Table**: Business-critical services with status, impact level, revenue risk, and AI investigation actions
- **Export Functionality**: PDF and CSV export of executive reports

### 2. **Application Portfolio**
- **App Grid View**: Visual cards displaying all applications with health status, latency, error rates
- **Detailed Metrics Table**: Sortable table with extended metrics including owner and uptime
- **Quick Actions**: View details, restart service, copy app ID, manage alerts, decommission
- **Auto-Incident Generation**: Automatically raises ServiceNow incidents for critical applications
- **Search & Filter**: Filter by name, ID, or tier

### 3. **Infrastructure Health**
- **Resource Utilization**: Real-time CPU and Memory usage charts
- **Cluster Status**: Multi-region cluster monitoring (US-East-1, US-West-2, EU-Central-1, AP-South-1)
- **Component Cards**: Compute instances, database clusters, network links, storage volumes
- **Infrastructure Inventory**: Resource inventory with type, environment, region, status
- **CMDB Sync**: Synchronization with master CMDB and CSV export

### 4. **NOC / Operations**
- **Alert Feed**: Real-time active alert feed with severity indicators
- **ServiceNow Integration**: Live incident queue from ServiceNow
- **AI Log Analysis**: AI-powered log analysis for alerts
- **Autonomous Engine**: Automatically creates ServiceNow incidents for critical telemetry anomalies
- **Alert Filtering**: Filter by All Events or Critical only

### 5. **Onboarding Factory**
- **Wave Progress**: Track onboarding phases (Pilot, Scale, Full Rollout)
- **Definition of Done Checklist**: Track onboarding completion tasks
- **New Onboarding Request**: Modal form to register new applications
- **Recently Onboarded Apps**: List of recently registered applications with search

### 6. **AI Intelligence**
- **Multi-Provider Support**: OpenAI, Ollama, Anthropic, Azure, Google Gemini
- **Incident Analysis**: AI-powered analysis of service incidents with recommendations
- **Log Summarization**: AI-generated summaries of application logs
- **Model Selection**: Fetch and select from available models per provider
- **Connection Testing**: Verify AI provider connectivity

### 7. **ServiceNow Integration**
- **Incident Creation**: Automatic and manual incident creation
- **Incident Deduplication**: Check for existing active incidents before creating new ones
- **Auto-Incident Mode**: Toggle for autonomous incident generation based on critical alerts
- **Credential Management**: Configure instance URL, username, and password

### 8. **Settings & Configuration**
- **Theme Selection**: Light and Dark mode
- **Demo Mode**: Live simulation of application health changes
- **Alert Thresholds**: Configurable CPU, Memory, Latency, and Error Rate thresholds
- **Environment Selector**: Development, Staging, Production environments

### 9. **Global Search**
- **Quick Navigation**: Search across all dashboards and features
- **Keyboard Shortcut**: Cmd/Ctrl+K for quick access

### 10. **Authentication**
- **Login Screen**: User authentication with JWT tokens
- **Session Management**: Secure session handling with auto-refresh

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript |
| **Styling** | Tailwind CSS 4 |
| **Animations** | Motion (Framer Motion) |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Notifications** | Sonner |
| **Build Tool** | Vite 6 |
| **Backend** | Express.js |
| **Database** | MongoDB (Mongoose) |
| **WebSockets** | ws (Telemetry & Incidents) |
| **AI Integration** | Ollama, OpenAI, Anthropic, Google Gemini |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (React + Vite)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │Executive│  │Application│  │Infrastructure│ │ NOC/Operations│ │
│  │Dashboard│  │Dashboard │  │ Dashboard  │  │   Dashboard   │ │
│  └─────────┘  └──────────┘  └──────────┘  └──────────────┘ │
│                                                              │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌───────────┐  │
│  │Onboarding│  │ Global    │  │ Settings │  │ Login     │  │
│  │Tracker   │  │ Search    │  │ Modal    │  │ Screen    │  │
│  └──────────┘  └────────────┘  └──────────┘  └───────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │              App Context (State Management)              ││
│  │  - Portfolio Apps  - AI Settings   - ServiceNow Config  ││
│  │  - Theme         - Alert Rules    - Notifications       ││
│  └──────────────────────────────────────────────────────────┘│
│                           │                                    │
│                    ┌──────┴──────┐                            │
│                    │  Auth Context │                           │
│                    └──────────────┘                            │
└─────────────────────────────────────────────────────────────┘
                              │
                    WebSocket / HTTP
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Server (Express.js)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌────────────┐  ┌───────────────────────┐  │
│  │ Auth Routes │  │ Data Routes│  │ WebSocket Servers    │  │
│  │ - /api/auth │  │ - /api/*  │  │ - Telemetry WS       │  │
│  │             │  │            │  │ - Incident WS        │  │
│  └─────────────┘  └────────────┘  └───────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │              External Integrations                       ││
│  │  - ServiceNow API (Incidents)                           ││
│  │  - Ollama AI (Local LLMs)                                ││
│  │  - OpenAI / Anthropic / Gemini (Cloud AI)                ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌──────────────────────┐                                    │
│  │   MongoDB Database   │                                    │
│  │   - Users            │                                    │
│  │   - Telemetry Data   │                                    │
│  └──────────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/data/telemetry` | Get telemetry data |
| GET | `/api/incidents` | Fetch ServiceNow incidents |
| GET | `/api/ollama/tags` | Get available Ollama models |
| POST | `/api/ollama/generate` | Generate AI response |
| GET | `/api/health` | Server health check |

---

## Running the Application

### Prerequisites
- Node.js v18+
- MongoDB (optional, runs in limited mode if unavailable)
- Ollama (optional, for local AI)

### Installation
```bash
npm install
```

### Development (Client + Server)
```bash
npm run dev:all
```
- Client: http://localhost:3000
- Server: http://localhost:5000

### Production Build
```bash
npm run build
npm run preview
```

---

## Environment Variables

Create a `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/observability
GEMINI_API_KEY=your_gemini_key
SERVICENOW_INSTANCE_URL=https://your-instance.service-now.com
SERVICENOW_USER=admin
SERVICENOW_PASSWORD=your_password
```

---

## Code Review Summary

### Strengths
1. **Clean Architecture**: Separation of concerns with dedicated components, contexts, and services
2. **Type Safety**: TypeScript throughout with proper interfaces
3. **Modern UI**: Tailwind CSS 4 with dark/light theme support
4. **Real-time**: WebSocket integration for live telemetry
5. **AI Integration**: Multi-provider AI support with streaming
6. **Error Handling**: Toast notifications and error boundaries

### Potential Improvements
1. **Testing**: No unit/e2e tests visible in the codebase
2. **Caching**: Consider adding Redis for telemetry data
3. **Rate Limiting**: Add API rate limiting for production
4. **Logging**: Structured logging (e.g., Winston/Pino)
5. **Security Headers**: Add Helmet.js for security

---

## File Structure

```
src/
├── components/
│   ├── ExecutiveDashboard.tsx
│   ├── ApplicationDashboard.tsx
│   ├── InfrastructureDashboard.tsx
│   ├── NOCDashboard.tsx
│   ├── OnboardingTracker.tsx
│   ├── SettingsModal.tsx
│   ├── GlobalSearchModal.tsx
│   ├── LoginScreen.tsx
│   ├── EnvironmentSelector.tsx
│   ├── NotificationPanel.tsx
│   └── ErrorBoundary.tsx
├── context/
│   ├── AppContext.tsx
│   └── AuthContext.tsx
├── hooks/
│   └── useTelemetry.ts
├── lib/
│   ├── ai.ts
│   ├── servicenow.ts
│   └── utils.ts
├── App.tsx
├── main.tsx
└── index.css
```

---

*Generated: April 2026 | Observability.OS v2.0*