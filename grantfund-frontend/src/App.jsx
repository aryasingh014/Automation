// Main App — Routing + Providers
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Grants from './pages/Grants';
import Expenses from './pages/Expenses';
import ApprovalPanel from './pages/ApprovalPanel';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import AiSuggestions from './pages/AiSuggestions';
import GlobalChatbot from './pages/GlobalChatbot';
import ProposalDraft from './pages/ProposalDraft';
import Compliance from './pages/Compliance';
import Vendors from './pages/Vendors';
import PackageReview from './pages/PackageReview';
import Proposals from './pages/Proposals';
import History from './pages/History';
import PublicShare from './pages/PublicShare';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/public/share/:shareId" element={<PublicShare />} />

          {/* Protected — inside Layout */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="grants" element={<Grants />} />
            <Route path="compliance/:grantId" element={<Compliance />} />
            <Route path="vendors" element={<Vendors />} />
            <Route path="package-review/:grantId" element={<PackageReview />} />
            <Route path="proposal-draft" element={<ProposalDraft />} />
            <Route path="proposals" element={<Proposals />} />
            <Route path="knowledge-base" element={<ProtectedRoute adminOnly><History /></ProtectedRoute>} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="approvals" element={<ProtectedRoute adminOnly><ApprovalPanel /></ProtectedRoute>} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={<ProtectedRoute adminOnly><UserManagement /></ProtectedRoute>} />
            <Route path="ai-suggestions" element={<AiSuggestions />} />
            <Route path="help" element={<GlobalChatbot />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '12px', background: '#fff', color: '#1e293b', fontSize: '14px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.06)' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </AuthProvider>
  );
}

export default App;
