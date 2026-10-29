import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Search, Bell, RefreshCw, ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export default function Topbar({ onRefresh }) {
  const { user, logout } = useAuth();
  const { notifications, systemStatus } = useApp();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (onRefresh) await onRefresh();
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchVal.trim();
    if (query) navigate(`/detection-history?search=${encodeURIComponent(query)}`);
  };

  const statusColors = {
    checking: 'text-text-muted',
    operational: 'text-status-safe',
    degraded: 'text-status-warning',
    offline: 'text-status-critical',
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="app-topbar h-topbar flex items-center justify-between px-4 bg-bg-secondary border-b border-border flex-shrink-0 z-30">
      {/* Left: Logo + search */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-accent-emerald" strokeWidth={1.5} />
          <span className="text-sm font-semibold text-accent-emerald tracking-tight">CyberKavach AI</span>
          <span className="hidden md:block text-2xs text-text-muted px-1.5 py-0.5 rounded border border-border ml-1">
            {import.meta.env.DEV ? 'DEV' : 'PROD'}
          </span>
        </div>
        {/* Search */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 bg-bg-primary border border-border rounded px-2.5 py-1 w-56 focus-within:border-accent-emerald/50 transition-colors">
          <Search size={11} className="text-text-muted flex-shrink-0" />
          <input
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search detections…"
            className="bg-transparent text-xs text-text-primary placeholder-text-muted outline-none w-full"
          />
          <button type="submit" className="sr-only">Search detections</button>
        </form>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* System status */}
        <div className={`hidden md:flex items-center gap-1.5 text-xs ${statusColors[systemStatus]}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full bg-current ${systemStatus === 'operational' ? 'status-dot-live' : ''}`} />
          <span className="capitalize">{systemStatus}</span>
        </div>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          className="p-1.5 rounded text-text-muted hover:text-text-secondary hover:bg-bg-elevated transition-colors"
          title="Refresh data"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-1.5 rounded text-text-muted hover:text-text-secondary hover:bg-bg-elevated transition-colors"
          >
            <Bell size={13} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 text-2xs bg-status-critical text-white rounded-full flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-8 w-72 bg-bg-card border border-border rounded shadow-panel z-50">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-xs font-medium text-text-primary">Notifications</span>
                <span className="text-2xs text-text-muted">{unreadCount} unread</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-text-muted">No notifications</div>
                ) : notifications.slice(0, 10).map((n) => (
                  <div key={n.id} className="px-3 py-2 border-b border-border/50 hover:bg-bg-elevated transition-colors">
                    <div className="text-xs text-text-primary">{n.message}</div>
                    <div className="text-2xs text-text-muted mt-0.5">{n.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <div className="w-5 h-5 rounded-full bg-accent-emerald-dim flex items-center justify-center flex-shrink-0">
              <User size={10} className="text-accent-emerald" />
            </div>
            <span className="hidden sm:block text-xs font-medium truncate max-w-24">
              {user?.username || 'No authenticated user'}
            </span>
            <ChevronDown size={10} className="text-text-muted" />
          </button>
          {showProfile && (
            <div className="absolute right-0 top-8 w-48 bg-bg-card border border-border rounded shadow-panel z-50">
              <div className="px-3 py-2 border-b border-border">
                <div className="text-xs font-medium text-text-primary">{user?.username || 'No authenticated user'}</div>
                <div className="text-2xs text-text-muted">{user?.email || 'No email on file'}</div>
              </div>
              <button
                onClick={() => { setShowProfile(false); navigate('/settings'); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
              >
                <Settings size={12} /> Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-status-critical hover:bg-bg-elevated transition-colors border-t border-border"
              >
                <LogOut size={12} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
