# Observability.OS - Enterprise Monitoring Dashboard

Observability.OS is a high-fidelity, enterprise-grade observability platform designed to provide full-stack visibility into complex application ecosystems. It consolidates metrics, logs, and traces into a unified "Mission Control" interface.

## 🚀 What it Does

This platform serves as a central hub for IT Operations (NOC), Site Reliability Engineers (SRE), and Executives. It provides:
- **Executive Overview**: High-level health scores and performance trends for business stakeholders.
- **Application Portfolio**: Real-time telemetry (latency, error rates, health) for custom-built software.
- **Infrastructure Health**: Monitoring for servers, databases, and network components.
- **NOC / Operations**: A real-time incident control center integrated with simulated ServiceNow queues.
- **Onboarding Factory**: A structured pipeline for registering and connecting new applications to the monitoring stream.

## 🛠️ Tech Stack

- **Frontend**: React 18+ with TypeScript
- **Styling**: Tailwind CSS (Utility-first CSS)
- **Animations**: Framer Motion (Smooth transitions and layout animations)
- **Charts**: Recharts (Data visualization)
- **Icons**: Lucide React
- **Notifications**: Sonner (Real-time feedback)
- **Build Tool**: Vite

## 🏁 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:3000`.

## 📂 Project Structure

- `src/App.tsx`: The main entry point and layout manager.
- `src/components/`:
  - `ExecutiveDashboard.tsx`: Business-centric health and performance views.
  - `ApplicationDashboard.tsx`: Detailed application telemetry and metrics.
  - `InfrastructureDashboard.tsx`: Resource utilization and inventory management.
  - `NOCDashboard.tsx`: Incident management and alert feeds.
  - `OnboardingTracker.tsx`: Application intake form and pipeline tracking.
- `src/lib/utils.ts`: Tailwind CSS class merging utilities.

## 🔮 Future Enhancements

1. **Real-time Data Integration**: Connect to live Prometheus/Grafana or OpenTelemetry backends using WebSockets.
2. **User Authentication**: Implement OAuth2/OIDC for secure access control.
3. **Custom Alert Builder**: Allow users to define complex alerting logic (e.g., "Alert if latency > 500ms for 5 minutes").
4. **Log Explorer**: Add a dedicated view for searching and filtering raw log data.
5. **Service Map**: Implement a D3.js powered visualization of service-to-service dependencies.
6. **Mobile App**: Develop a responsive mobile view or native app for on-the-go incident management.

## 📦 Required Packages (Already Included)
- `lucide-react`: Icon library.
- `motion/react`: Animation engine.
- `recharts`: Charting library.
- `sonner`: Toast notifications.
- `clsx` & `tailwind-merge`: CSS class management.

---
*Developed as a high-performance observability prototype.*
