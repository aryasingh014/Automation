import { useAuth } from '../context/AuthContext';

interface Permissions {
  isAdmin: boolean;
  isUser: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canConfigureAlerts: boolean;
  canConfigureIntegrations: boolean;
  canCreateIncidents: boolean;
  canAcknowledgeInsights: boolean;
}

export const usePermissions = (): Permissions => {
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'admin';
  const isUser = user?.role === 'user';
  
  return {
    isAdmin,
    isUser,
    canManageUsers: isAdmin,
    canManageSettings: isAdmin,
    canConfigureAlerts: isAdmin,
    canConfigureIntegrations: isAdmin,
    canCreateIncidents: true,
    canAcknowledgeInsights: true,
  };
};