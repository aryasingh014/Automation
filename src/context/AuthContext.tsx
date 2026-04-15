import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAppContext } from './AppContext';

interface UserData {
  _id: string;
  name?: string;
  email: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
}

interface AuthContextType {
  user: UserData | null;
  token: string | null;
  login: (token: string, userData: UserData) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const { addNotification } = useAppContext();

  const fetchUserNotifications = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/my-notifications', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const notifications = await res.json();
        if (notifications && notifications.length > 0) {
          notifications.forEach((n: any) => {
            addNotification({
              type: n.type === 'email' ? 'info' : n.type,
              title: n.subject || 'Notification',
              message: n.message || ''
            });
          });
        }
      }
    } catch (e) {
      console.warn('[Auth] Failed to fetch notifications:', e);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
            fetchUserNotifications(token);
          } else {
            setToken(null);
            localStorage.removeItem('token');
          }
        } catch (error) {
          setToken(null);
          localStorage.removeItem('token');
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, [token]);

  const login = (newToken: string, userData: UserData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    fetchUserNotifications(newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
