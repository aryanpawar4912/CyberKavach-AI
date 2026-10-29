import React, { createContext, useContext, useEffect, useState } from 'react';
import { healthService } from '../services/otherServices';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [systemStatus, setSystemStatus] = useState('checking');

  useEffect(() => {
    const controller = new AbortController();
    healthService.check({ signal: controller.signal })
      .then((health) => setSystemStatus(health.status === 'healthy' && health.database_connected ? 'operational' : 'degraded'))
      .catch((error) => {
        if (error.code !== 'ERR_CANCELED') {
          setSystemStatus(error.response?.data?.status === 'degraded' ? 'degraded' : 'offline');
        }
      });
    return () => controller.abort();
  }, []);

  const addNotification = (n) => setNotifications((prev) => [{ id: Date.now(), ...n }, ...prev].slice(0, 50));
  const clearNotification = (id) => setNotifications((prev) => prev.filter((n) => n.id !== id));

  return (
    <AppContext.Provider value={{
      sidebarCollapsed, setSidebarCollapsed,
      notifications, addNotification, clearNotification,
      systemStatus, setSystemStatus,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
