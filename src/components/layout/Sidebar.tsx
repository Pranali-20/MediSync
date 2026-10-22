import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  PackageCheck,
  Pill,
  Boxes,
  Receipt,
  Truck,
  ClockAlert,
  BarChart3,
  Sparkles,
  ScanLine,
  Settings,
  UserCheck,
  LogOut,
  X,
  Building2,
  Store,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  highlight?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { lowStockCount, expiringSoonCount } = useApp();
  const { logout, user, pharmacyType, isHospital, isRetail, isHybrid } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Grouped Navigation based on Pharmacy Type
  const getNavGroups = (): { title?: string; items: NavItem[] }[] => {
    const groups: { title?: string; items: NavItem[] }[] = [];

    // 1. Overview
    groups.push({
      items: [{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }],
    });

    // 2. Medicines & Stock
    groups.push({
      title: 'Medicines & Stock',
      items: [
        { label: 'Medicines Catalog', path: '/medicines', icon: Pill },
        {
          label: 'Inventory',
          path: '/inventory',
          icon: Boxes,
          badge: lowStockCount > 0 ? `${lowStockCount} low` : undefined,
          badgeColor: 'bg-amber-100 text-amber-800',
        },
        {
          label: 'Expiry (FEFO)',
          path: '/expiry',
          icon: ClockAlert,
          badge: expiringSoonCount > 0 ? `${expiringSoonCount}` : undefined,
          badgeColor: 'bg-rose-100 text-rose-800',
        },
        { label: 'Barcode Scanner', path: '/scanner', icon: ScanLine },
      ],
    });

    // 3. Sales & Billing
    groups.push({
      title: 'Sales & Billing',
      items: [
        { label: isHospital ? 'Hospital Billing' : 'Counter POS Bill', path: '/billing', icon: Receipt },
      ],
    });

    // 4. Clinical / Prescriptions (Hospital or Hybrid)
    if (isHospital || isHybrid) {
      groups.push({
        title: 'Prescriptions & Patients',
        items: [
          { label: 'Patients Directory', path: '/patients', icon: Users },
          { label: 'Prescriptions', path: '/prescriptions', icon: FileText },
          { label: 'Dispensing Queue', path: '/dispensing', icon: PackageCheck },
        ],
      });
    }

    // 5. Purchases & Suppliers
    groups.push({
      title: 'Purchases & Restocking',
      items: [
        { label: 'Purchase Orders', path: '/purchases', icon: ShoppingBag },
        { label: 'Suppliers Directory', path: '/suppliers', icon: Truck },
      ],
    });

    // 6. AI & Reports
    groups.push({
      title: 'Intelligence & Reports',
      items: [
        {
          label: 'AI Restock Insights',
          path: '/ai-insights',
          icon: Sparkles,
          highlight: true,
        },
        { label: 'Analytics & Reports', path: '/analytics', icon: BarChart3 },
      ],
    });

    return groups;
  };

  const navGroups = getNavGroups();

  const secondaryNav = [
    { label: 'My Profile', path: '/profile', icon: UserCheck },
    { label: 'Settings & Team', path: '/settings', icon: Settings },
  ];

  const typeConfig = {
    hospital: { label: 'Hospital-Attached', icon: Building2, color: 'text-blue-700 bg-blue-50 border-blue-200' },
    retail: { label: 'Open-Counter / Retail', icon: Store, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    hybrid: { label: 'Hybrid Operations', icon: Layers, color: 'text-purple-700 bg-purple-50 border-purple-200' },
  };

  const currentType = typeConfig[pharmacyType] || typeConfig.retail;
  const TypeIcon = currentType.icon;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-brand-border flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header & Logo */}
        <div className="flex flex-col h-full min-h-0">
          <div className="h-16 flex items-center justify-between px-5 border-b border-brand-border/80 shrink-0">
            <Logo size="md" showTagline={false} onClick={() => navigate('/dashboard')} />
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Pharmacy Type Indicator */}
          <div className="px-4 py-2.5 bg-[#F9FBFA] border-b border-brand-border/60 shrink-0">
            <div className="text-[11px] font-medium text-brand-muted mb-1 truncate">
              {user?.pharmacyName || 'MediSync Workspace'}
            </div>
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${currentType.color}`}>
              <TypeIcon className="w-3 h-3" />
              <span>{currentType.label}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-0.5">
                {group.title && (
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {group.title}
                  </div>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all group ${
                          isActive
                            ? 'bg-pharmagreen-50 text-pharmagreen-800 font-semibold shadow-xs'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-3.5 h-3.5 text-brand-muted group-hover:text-pharmagreen-600 transition-colors shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}
                      {item.highlight && !item.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-pharmagreen-100 text-pharmagreen-800 uppercase tracking-wider">
                          AI
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            ))}

            <div className="pt-2 border-t border-brand-border/60 space-y-0.5">
              <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                System
              </div>
              {secondaryNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all group ${
                        isActive
                          ? 'bg-pharmagreen-50 text-pharmagreen-800 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <Icon className="w-3.5 h-3.5 text-brand-muted group-hover:text-pharmagreen-600 transition-colors shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Bottom User Card & Logout */}
        <div className="p-3 border-t border-brand-border bg-[#FAFCFA]">
          <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-brand-border/70 shadow-2xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img
                src={user?.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=250&auto=format&fit=crop'}
                alt="Pharmacist avatar"
                className="w-8 h-8 rounded-full object-cover border border-pharmagreen-200 shrink-0"
              />
              <div className="truncate">
                <div className="text-xs font-bold text-[#166534] truncate">{user?.name || 'Dr. Pharmacist'}</div>
                <div className="text-[11px] text-brand-muted truncate">{user?.role || 'Chief Pharmacist'}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
