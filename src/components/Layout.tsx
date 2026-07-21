import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useBusinessStore } from '../stores/businessStore';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  PlusCircle, 
  Users, 
  Scissors, 
  Settings, 
  LogOut,
  Sparkles,
  BarChart3,
  Terminal
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, profile, signOut } = useAuthStore();
  const { business, fetchBusiness } = useBusinessStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchBusiness();
    }
  }, [user, fetchBusiness]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  interface NavItem {
    path: string;
    label: string;
    icon: any;
    highlight?: boolean;
  }

  const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/assistant', label: 'Recepcionista IA', icon: Sparkles },
    { path: '/calendar', label: 'Agenda', icon: CalendarIcon },
    { path: '/customers', label: 'Clientes', icon: Users },
    { path: '/services', label: 'Servicios', icon: Scissors },
    { path: '/statistics', label: 'Estadísticas', icon: BarChart3 },
    { path: '/settings', label: 'Ajustes', icon: Settings },
    { path: '/lab', label: 'Laboratorio IA', icon: Terminal },
  ];

  const businessName = business?.nombre || 'Mi Barbería';

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F5F5F7]">
      {/* Sidebar - Desktop (hidden on mobile) */}
      <aside className="hidden md:flex flex-col w-72 bg-[#111111] text-white p-6 border-r border-neutral-800">
        {/* Business Brand Header */}
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-neutral-800">
          {business?.logo_url ? (
            <img 
              src={business.logo_url} 
              alt={businessName} 
              className="w-12 h-12 rounded-xl object-cover border-2 border-gold"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gold text-black flex items-center justify-center font-bold text-xl">
              {businessName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white m-0 line-clamp-1">{businessName}</h1>
            <p className="text-xs text-neutral-400 m-0">SaaS Premium</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium transition-all ${
                  item.highlight
                    ? 'bg-gold text-black hover:bg-opacity-90 font-bold'
                    : isActive
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Icon className={`w-6 h-6 ${item.highlight ? 'text-black' : isActive ? 'text-gold' : ''}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer/Logout */}
        <div className="pt-6 border-t border-neutral-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center text-white font-bold">
              {profile?.full_name?.slice(0, 1).toUpperCase() || 'P'}
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold text-white m-0 truncate">{profile?.full_name || 'Peluquero'}</p>
              <p className="text-xs text-neutral-400 m-0 capitalize">{profile?.role === 'admin' ? 'Dueño' : 'Equipo'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-950/20 text-base font-medium transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        {/* Top bar - Mobile & Desktop Header */}
        <header className="bg-white border-b border-neutral-200 px-6 py-4 md:py-5 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3 md:hidden">
            {business?.logo_url ? (
              <img 
                src={business.logo_url} 
                alt={businessName} 
                className="w-10 h-10 rounded-lg object-cover border border-gold"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gold text-black flex items-center justify-center font-bold text-lg">
                {businessName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <h1 className="text-lg font-bold text-black tracking-tight line-clamp-1">{businessName}</h1>
          </div>
          
          <div className="hidden md:flex items-center gap-2">
            <span className="text-neutral-500 font-medium">Panel de Gestión</span>
            <span className="text-neutral-300">/</span>
            <span className="text-black font-semibold">
              {navItems.find(item => item.path === location.pathname)?.label || 'Inicio'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick WhatsApp Share option or quick install info */}
            <span className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              WhatsApp Activo
            </span>
            
            {/* Giant Easy Action Button */}
            {location.pathname !== '/new-appointment' && (
              <button
                onClick={() => navigate('/new-appointment')}
                className="bg-gold hover:bg-gold-dark text-black font-bold px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 shadow-sm transition-all border border-gold"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Nueva Cita</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Bottom Navigation - Mobile only (extremely simple and reachable) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 py-2 px-3 flex justify-around items-center z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 justify-center flex-1 py-1 px-2 rounded-lg text-center transition-all ${
                item.highlight
                  ? 'text-gold font-bold scale-110'
                  : isActive
                    ? 'text-black font-bold'
                    : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              <div className={`p-1 rounded-full ${item.highlight ? 'bg-black text-gold shadow-md' : ''}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
