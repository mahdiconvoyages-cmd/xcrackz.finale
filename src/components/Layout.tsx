import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import FloatingParticles from './FloatingParticles';
import ChatAssistant from './ChatAssistant';
import { LayoutDashboard, Users, Car, Settings, LogOut, Menu, X, CircleUser as UserCircle, MapPin, ShoppingBag, Shield, Building2, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isAdmin } = useAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [forceHide, setForceHide] = useState(false);
  const [firstName, setFirstName] = useState<string>('');

  useEffect(() => {
    loadUserProfile();
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data?.first_name) {
        setFirstName(data.first_name);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', color: 'text-blue-400', hoverColor: 'group-hover:text-blue-300' },
    { path: '/team-missions', icon: Users, label: 'Équipe & Missions', color: 'text-teal-400', hoverColor: 'group-hover:text-teal-300' },
    { path: '/tracking', icon: MapPin, label: 'Tracking', color: 'text-green-400', hoverColor: 'group-hover:text-green-300' },
    { path: '/contacts', icon: Users, label: 'Contacts', color: 'text-violet-400', hoverColor: 'group-hover:text-violet-300' },
    { path: '/crm', icon: Building2, label: 'CRM & Commercial', color: 'text-indigo-400', hoverColor: 'group-hover:text-indigo-300' },
    { path: '/rapports-inspection', icon: ClipboardCheck, label: 'Rapports Inspection', color: 'text-purple-400', hoverColor: 'group-hover:text-purple-300' },
    { path: '/covoiturage', icon: Car, label: 'Covoiturage', color: 'text-cyan-400', hoverColor: 'group-hover:text-cyan-300' },
    { path: '/shop', icon: ShoppingBag, label: 'Boutique', color: 'text-emerald-400', hoverColor: 'group-hover:text-emerald-300' },
  ];

  const shouldShowSidebar = !forceHide && (sidebarPinned || sidebarHovered || sidebarOpen);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-teal-50 text-slate-900 flex relative">
      <FloatingParticles />
      <aside
        onMouseEnter={() => {
          if (!forceHide) {
            setSidebarHovered(true);
          }
        }}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`
        fixed inset-y-0 left-0 z-50
        w-64 backdrop-blur-2xl bg-gradient-to-b from-slate-900/50 via-slate-800/55 to-slate-900/60 border-r border-teal-400/20 text-white shadow-depth-xl shadow-teal-500/10
        transform transition-transform duration-300 ease-in-out
        flex flex-col
        ${shouldShowSidebar ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-teal-400/20 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 flex items-center justify-between flex-shrink-0 relative">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 hover:scale-105 transition-transform group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/50 transition-shadow">
              <span className="text-white font-black text-lg">XZ</span>
            </div>
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
              xCrackz
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (sidebarPinned) {
                  setSidebarPinned(false);
                  setSidebarHovered(false);
                  setForceHide(true);
                  setTimeout(() => setForceHide(false), 500);
                } else {
                  setSidebarPinned(true);
                  setForceHide(false);
                }
              }}
              className="hidden lg:block text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-lg transition"
              title={sidebarPinned ? "Désépingler et fermer" : "Épingler la sidebar"}
            >
              {sidebarPinned ? (
                <X className="w-5 h-5" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-lg transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
                           (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300
                  ${isActive
                    ? 'bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-md text-white shadow-lg shadow-black/20 border border-white/30'
                    : 'text-slate-300 hover:bg-white/10 hover:backdrop-blur-sm hover:text-white hover:shadow-md hover:border hover:border-white/20'
                  }
                `}
              >
                <Icon className={`w-5 h-5 transition-all duration-300 flex-shrink-0 ${isActive ? `scale-110 ${item.color} drop-shadow-lg` : `${item.color} ${item.hoverColor} group-hover:scale-110 group-hover:rotate-6 group-hover:drop-shadow-lg`}`} />
                <span className={`font-semibold text-sm tracking-wide transition-all duration-300 ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 space-y-2 border-t border-teal-400/20 bg-gradient-to-r from-teal-500/5 to-cyan-500/5 flex-shrink-0">
          {isAdmin && (
            <>
              <Link
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className={`
                  group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300
                  ${location.pathname === '/admin'
                    ? 'bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-md text-white shadow-lg shadow-black/20 border border-white/30'
                    : 'text-slate-300 hover:bg-white/10 hover:backdrop-blur-sm hover:text-white hover:shadow-md hover:border hover:border-white/20'
                  }
                `}
              >
                <Shield className={`w-5 h-5 transition-all duration-300 flex-shrink-0 ${location.pathname === '/admin' ? 'scale-110 text-red-400 drop-shadow-lg' : 'text-red-400 group-hover:text-red-300 group-hover:scale-110 group-hover:rotate-6 group-hover:drop-shadow-lg'}`} />
                <span className={`font-semibold text-sm tracking-wide transition-all duration-300 ${location.pathname === '/admin' ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>Administration</span>
              </Link>
            </>
          )}

          <Link
            to="/profile"
            onClick={() => setSidebarOpen(false)}
            className={`
              group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300
              ${location.pathname === '/profile'
                ? 'bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-md text-white shadow-lg shadow-black/20 border border-white/30'
                : 'text-slate-300 hover:bg-white/10 hover:backdrop-blur-sm hover:text-white hover:shadow-md hover:border hover:border-white/20'
              }
            `}
          >
            <UserCircle className={`w-5 h-5 transition-all duration-300 flex-shrink-0 ${location.pathname === '/profile' ? 'scale-110 text-indigo-400 drop-shadow-lg' : 'text-indigo-400 group-hover:text-indigo-300 group-hover:scale-110 group-hover:rotate-6 group-hover:drop-shadow-lg'}`} />
            <span className={`font-semibold text-sm tracking-wide transition-all duration-300 ${location.pathname === '/profile' ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>Profil</span>
          </Link>

          <Link
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className={`
              group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300
              ${location.pathname === '/settings'
                ? 'bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-md text-white shadow-lg shadow-black/20 border border-white/30'
                : 'text-slate-300 hover:bg-white/10 hover:backdrop-blur-sm hover:text-white hover:shadow-md hover:border hover:border-white/20'
              }
            `}
          >
            <Settings className={`w-5 h-5 transition-all duration-300 flex-shrink-0 ${location.pathname === '/settings' ? 'scale-110 text-slate-400 drop-shadow-lg' : 'text-slate-400 group-hover:text-slate-300 group-hover:scale-110 group-hover:rotate-12 group-hover:drop-shadow-lg'}`} />
            <span className={`font-semibold text-sm tracking-wide transition-all duration-300 ${location.pathname === '/settings' ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>Paramètres</span>
          </Link>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl w-full bg-gradient-to-r from-red-500/80 to-rose-500/80 hover:from-red-600/90 hover:to-rose-600/90 backdrop-blur-md text-white transition-all duration-300 hover:shadow-xl hover:shadow-red-500/40 hover:-translate-y-1 border border-red-400/40 hover:border-red-300/60 group"
          >
            <LogOut className="w-5 h-5 text-red-200 group-hover:text-white group-hover:scale-110 transition-all duration-300 group-hover:-rotate-12 flex-shrink-0 drop-shadow-lg" />
            <span className="font-bold text-sm tracking-wide">Déconnexion</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarPinned ? 'lg:ml-64' : 'lg:ml-0'}`}>
        <header
          className="backdrop-blur-2xl bg-gradient-to-r from-slate-900/50 via-slate-800/55 to-teal-900/50 border-b border-teal-400/20 p-3 lg:p-4 shadow-depth-xl shadow-teal-500/10 sticky top-0 z-40"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition"
              >
                <Menu className="w-6 h-6" />
              </button>
              {!sidebarPinned && (
                <button
                  onClick={() => setSidebarPinned(true)}
                  className="hidden lg:block text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition"
                  title="Épingler la sidebar"
                >
                  <Menu className="w-6 h-6" />
                </button>
              )}
            </div>

            <div className="flex-1 lg:flex-none"></div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-md bg-white/10 border border-white/20">
                <div className="text-right">
                  <p className="text-xs font-semibold text-white leading-none">{firstName || 'Utilisateur'}</p>
                </div>
              </div>
              <Link
                to="/profile"
                className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm hover:shadow-glow-teal transition-all hover:scale-105 shadow-lg border-2 border-white/30 hover:border-white/50"
              >
                {firstName ? firstName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto relative z-10">
          {children}
        </main>
      </div>

      {/* Clara - Assistant IA flottant */}
      <ChatAssistant />
    </div>
  );
}
