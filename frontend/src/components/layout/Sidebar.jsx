import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Network, ShieldAlert, Database, History,
  BarChart2, Bell, Search, FileText, ScrollText, Settings,
  ChevronLeft, ChevronRight, Shield, Microscope
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/network', label: 'Network Monitor', icon: Network },
  { to: '/threat-detection', label: 'Threat Detection', icon: ShieldAlert },
  { to: '/datasets', label: 'Datasets', icon: Database },
  { to: '/detection-history', label: 'Detection History', icon: History },
  { to: '/ml-analytics', label: 'ML Analytics', icon: BarChart2 },
  { to: '/explainability', label: 'Explainability & SHAP', icon: Microscope },
  { to: '/alerts', label: 'Security Alerts', icon: Bell },
  { to: '/incidents', label: 'Incident Investigation', icon: Microscope },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 60 : 232 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="app-sidebar relative flex flex-col bg-bg-secondary border-r border-border overflow-hidden flex-shrink-0"
      style={{ height: '100%' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-3 border-b border-border flex-shrink-0">
        <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center">
          <Shield size={20} className="text-accent-emerald" strokeWidth={1.5} />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="sidebar-brand-copy min-w-0"
            >
              <div className="text-sm font-semibold text-accent-emerald leading-tight tracking-tight">
                CyberKavach
              </div>
              <div className="text-2xs text-text-muted leading-tight">AI Security Platform</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
          const isActive = exact
            ? location.pathname === to
            : location.pathname.startsWith(to);

          return (
            <NavLink
              key={to}
              to={to}
              title={sidebarCollapsed ? label : undefined}
              className={`
                group flex items-center gap-3 px-3 py-2 mx-1 my-0.5 rounded text-xs font-medium
                transition-all duration-100 cursor-pointer no-underline
                ${isActive
                  ? 'text-accent-emerald bg-accent-glow border-l-2 border-accent-emerald pl-2.5'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated border-l-2 border-transparent'
                }
              `}
            >
              <Icon
                size={15}
                strokeWidth={isActive ? 2 : 1.5}
                className={`flex-shrink-0 ${isActive ? 'text-accent-emerald' : 'text-text-secondary group-hover:text-text-primary'}`}
              />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="sidebar-nav-label truncate"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2 flex-shrink-0">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-full flex items-center justify-center p-1.5 rounded text-text-muted hover:text-text-secondary hover:bg-bg-elevated transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed
            ? <ChevronRight size={14} />
            : <ChevronLeft size={14} />
          }
        </button>
      </div>
    </motion.aside>
  );
}
