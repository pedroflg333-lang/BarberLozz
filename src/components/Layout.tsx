import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useBusinessStore } from '../stores/businessStore';
import { useAppointmentStore } from '../stores/appointmentStore';
import { Button, Badge } from '../ui';
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  Users,
  Sparkles,
  Scissors,
  Settings,
  LogOut,
  BarChart3,
  Terminal,
  MoreHorizontal,
  X,
  PlusCircle,
  UserCircle,
  ClipboardList
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: any;
}

const MAIN_NAV: (NavItem & { badge?: boolean })[] = [
  { path: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { path: '/calendar', label: 'Agenda', icon: CalendarIcon },
  { path: '/assistant', label: 'IA', icon: Sparkles },
  { path: '/booking-requests', label: 'Solicitudes', icon: ClipboardList, badge: true },
  { path: '/customers', label: 'Clientes', icon: Users },
];

const MORE_NAV: (NavItem & { highlight?: boolean; danger?: boolean; badge?: boolean })[] = [
  { path: '/services', label: 'Servicios', icon: Scissors },
  { path: '/statistics', label: 'Estadísticas', icon: BarChart3 },
  { path: '/settings', label: 'Configuración', icon: Settings },
  { path: '/lab', label: 'Laboratorio IA', icon: Terminal },
];

const SECTION_TITLES: Record<string, string> = {
  '/dashboard': 'Inicio',
  '/calendar': 'Agenda',
  '/assistant': 'Recepcionista IA',
  '/customers': 'Clientes',
  '/services': 'Servicios',
  '/statistics': 'Estadísticas',
  '/settings': 'Configuración',
  '/lab': 'Laboratorio IA',
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, profile, signOut } = useAuthStore();
  const { business, fetchBusiness } = useBusinessStore();
  const { pendingRequests, fetchPendingRequests } = useAppointmentStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (user) { fetchBusiness(); fetchPendingRequests(); }
  }, [user, fetchBusiness, fetchPendingRequests]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchPendingRequests, 15000);
    return () => clearInterval(interval);
  }, [user, fetchPendingRequests]);

  const handleLogout = async () => {
    setMoreOpen(false);
    await signOut();
    navigate('/login');
  };

  const sectionName = SECTION_TITLES[location.pathname] || 'Inicio';
  const businessName = business?.nombre || 'Mi Barbería';

  const sidebarNav: (NavItem & { highlight?: boolean })[] = [
    ...MAIN_NAV,
    ...MORE_NAV,
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-surface-muted">
      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside className="hidden md:flex flex-col w-72 bg-surface-dark text-text-inverse p-6 border-r border-border-dark">
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-border-dark">
          {business?.logo_url ? (
            <img src={business.logo_url} alt={businessName} className="w-12 h-12 rounded-xl object-cover border-2 border-gold" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gold text-black flex items-center justify-center font-bold text-xl">
              {businessName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-inverse m-0 line-clamp-1">{businessName}</h1>
            <p className="text-xs text-neutral-400 m-0">SaaS Premium</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {sidebarNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const badgeCount = item.path === '/booking-requests' ? pendingRequests.length : 0;
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium transition-all ${
                  item.highlight
                    ? 'bg-gold text-black hover:bg-opacity-90 font-bold'
                    : isActive
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Icon className={`w-6 h-6 ${item.highlight ? 'text-black' : isActive ? 'text-gold' : ''}`} />
                <span className="flex-1">{item.label}</span>
                {badgeCount > 0 && <Badge variant="warning" size="sm">{badgeCount}</Badge>}
              </Link>
            );
          })}
        </nav>

        <div className="pt-6 border-t border-border-dark">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center text-white font-bold">
              {profile?.full_name?.slice(0, 1).toUpperCase() || 'P'}
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold text-text-inverse m-0 truncate">{profile?.full_name || 'Peluquero'}</p>
              <p className="text-xs text-neutral-400 m-0 capitalize">{profile?.role === 'admin' ? 'Dueño' : 'Equipo'}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-950/20 text-base font-medium transition-all cursor-pointer">
            <LogOut className="w-5 h-5" /><span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN PANEL ─── */}
      <div className="flex-1 flex flex-col min-w-0" style={{ paddingBottom: 'max(72px, env(safe-area-inset-bottom, 72px))' }}>
        {/* Mobile Header */}
        <header className="md:hidden bg-surface border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {business?.logo_url ? (
              <img src={business.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover border border-gold shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gold text-black flex items-center justify-center font-bold text-sm shrink-0">
                {businessName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs text-text-tertiary m-0 font-medium leading-tight">{businessName}</p>
              <h1 className="text-sm font-bold text-text-primary m-0 leading-tight truncate">{sectionName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<PlusCircle className="w-5 h-5" />} onClick={() => navigate('/new-appointment')} />
            <Button variant="ghost" size="sm" icon={<UserCircle className="w-5 h-5 text-text-secondary" />} onClick={() => navigate('/settings')} />
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex bg-surface border-b border-border px-6 py-4 md:py-5 items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <span className="text-text-secondary font-medium">Panel de Gestión</span>
            <span className="text-text-tertiary">/</span>
            <span className="text-text-primary font-semibold">{sectionName}</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="success" size="sm" icon={<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}>
              WhatsApp Activo
            </Badge>
            {location.pathname !== '/new-appointment' && (
              <Button variant="secondary" icon={<PlusCircle className="w-4 h-4" />} onClick={() => navigate('/new-appointment')}>
                Nueva Cita
              </Button>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>

      {/* ─── MOBILE BOTTOM NAV ─── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50 flex items-center justify-around shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {MAIN_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const badgeCount = item.path === '/booking-requests' ? pendingRequests.length : 0;
          return (
            <Link key={item.path} to={item.path}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 min-w-0 flex-1 transition-all relative ${
                isActive ? 'text-text-primary' : 'text-text-tertiary'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-gold/10' : ''} relative`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-gold' : ''}`} />
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] font-black px-1 rounded-full min-w-[14px] text-center leading-4">
                    {badgeCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold leading-tight ${isActive ? 'text-text-primary' : 'text-text-tertiary'}`}>
                {item.label}
              </span>
              {isActive && <div className="w-5 h-0.5 bg-gold rounded-full mt-0.5" />}
            </Link>
          );
        })}

        <button onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-0.5 py-2 px-3 min-w-0 flex-1 text-text-tertiary transition-all cursor-pointer">
          <div className="p-1 rounded-lg"><MoreHorizontal className="w-5 h-5" /></div>
          <span className="text-[10px] font-semibold leading-tight">Más</span>
        </button>
      </nav>

      {/* ─── MÁS BOTTOM SHEET ─── */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl shadow-2xl animate-slide-up overflow-hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-neutral-300" />
            </div>

            <div className="flex items-center justify-between px-6 pb-3 border-b border-border">
              <h2 className="text-lg font-bold text-text-primary m-0">Más opciones</h2>
              <Button variant="ghost" size="sm" icon={<X className="w-5 h-5" />} onClick={() => setMoreOpen(false)} />
            </div>

            <div className="p-4 space-y-1 max-h-[60vh] overflow-y-auto">
              {MORE_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const badgeCount = item.path === '/booking-requests' ? pendingRequests.length : 0;
                return (
                  <Link key={item.path} to={item.path} onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-semibold transition-all ${
                      isActive ? 'bg-gold/10 text-gold-dark' : 'text-text-secondary hover:bg-neutral-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-gold' : 'text-text-tertiary'}`} />
                    <span className="flex-1">{item.label}</span>
                    {badgeCount > 0 && <Badge variant="warning" size="sm">{badgeCount}</Badge>}
                  </Link>
                );
              })}
            </div>

            <div className="border-t border-border p-4">
              <button onClick={handleLogout}
                className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-base font-semibold text-red-600 hover:bg-red-50 transition-all cursor-pointer">
                <LogOut className="w-5 h-5" /><span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
