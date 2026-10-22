import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  Search,
  ScanLine,
  CheckCheck,
  Sparkles,
  Layers,
  Clock,
  Package,
  Wifi,
  WifiOff,
  AlertTriangle,
  ShoppingBag,
  FileText,
} from 'lucide-react';
import { notificationApi } from '../../services/extraApis';
import { useAuth } from '../../context/AuthContext';
import { NotificationItem } from '../../types';

interface NavbarProps {
  onOpenMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileMenu }) => {
  const { user, pharmacy } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const notifRef = useRef<HTMLDivElement>(null);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch real live notifications
  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.getNotifications();
      if (res) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000); // 45s refresh
    return () => clearInterval(interval);
  }, []);

  // Click outside to close notification dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/medicines?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.clearAll();
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'OUT_OF_STOCK':
      case 'stock':
        return <Package className="w-4 h-4 text-rose-600" />;
      case 'LOW_STOCK':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'NEAR_EXPIRY':
      case 'EXPIRED':
      case 'expiry':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'PENDING_PO':
        return <ShoppingBag className="w-4 h-4 text-blue-600" />;
      case 'PENDING_PRESCRIPTION':
        return <FileText className="w-4 h-4 text-purple-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-pharmagreen-600" />;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-brand-border sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left side: Hamburger & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search input form */}
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search medicine master, generic salt, batch, or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F8FAF9] hover:bg-white focus:bg-white text-xs sm:text-sm pl-9 pr-4 py-2 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:ring-1 focus:ring-pharmagreen-500 focus:outline-none transition-all placeholder:text-gray-400"
          />
        </form>
      </div>

      {/* Right side: Network status & Notification Bell */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Network Connectivity Badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${isOnline ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800 animate-pulse'}`}>
          {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-red-600" />}
          <span className="hidden sm:inline">{isOnline ? 'Connected' : 'Offline Mode'}</span>
        </div>

        {/* Barcode Scanner Shortcut */}
        <button
          onClick={() => navigate('/scanner')}
          title="Quick Barcode Scanner"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-pharmagreen-700 transition-colors"
        >
          <ScanLine className="w-3.5 h-3.5 text-pharmagreen-600" />
          <span>Scanner</span>
        </button>

        {/* Notification Bell with Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 relative focus:outline-none transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Menu */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-brand-border overflow-hidden z-50 animate-fadeIn">
              <div className="p-3 border-b border-brand-border flex items-center justify-between bg-[#F8FAF9]">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Operational Alerts
                  </h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold bg-pharmagreen-100 text-pharmagreen-800 px-2 py-0.5 rounded-full">
                      {unreadCount} active
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-pharmagreen-700 hover:text-pharmagreen-900 font-medium flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-brand-muted">
                    No active inventory alerts or notifications.
                  </div>
                ) : (
                  notifications.map((notif, idx) => (
                    <div
                      key={notif._id || notif.id || idx}
                      onClick={() => {
                        if (notif.link) {
                          navigate(notif.link);
                          setShowNotifications(false);
                        }
                      }}
                      className={`p-3 text-left flex gap-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notif.read ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-white border border-gray-200 shrink-0 self-start mt-0.5">
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
                            {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-brand-border bg-[#F8FAF9] text-center">
                <button
                  onClick={() => {
                    navigate('/ai-insights');
                    setShowNotifications(false);
                  }}
                  className="text-xs font-semibold text-pharmagreen-700 hover:text-pharmagreen-800"
                >
                  View Restocking Recommendations →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pharmacy Store & User Role Badge */}
        <div className="hidden sm:block text-right pl-2 border-l border-gray-200">
          <div className="text-xs font-bold text-gray-800 truncate max-w-[140px]">
            {user?.pharmacyName || pharmacy?.name || 'MediSync'}
          </div>
          <div className="text-[10px] text-pharmagreen-700 font-semibold uppercase tracking-wider">
            {user?.role || 'Pharmacist'} • Verified
          </div>
        </div>
      </div>
    </header>
  );
};
export default Navbar;
