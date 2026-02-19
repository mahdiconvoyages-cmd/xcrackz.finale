// @ts-nocheck
import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, Users, CreditCard, MapPin, MessageCircle, Smartphone, 
  Shield, ChevronLeft, Menu, Activity, Bell, Package
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: BarChart3, exact: true },
  { path: '/admin/users', label: 'Utilisateurs', icon: Users },
  { path: '/admin/subscriptions', label: 'Abonnements', icon: Package },
  { path: '/admin/tracking', label: 'Missions GPS', icon: MapPin },
  { path: '/admin/support', label: 'Support', icon: MessageCircle },
  { path: '/admin/apk', label: 'Versions APK', icon: Smartphone },
  { path: '/admin/security', label: 'Sécurité', icon: Shield },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supportCount, setSupportCount] = useState(0);

  useEffect(() => {
    loadSupportCount();
    const ch = supabase
      .channel('admin-layout-support')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_conversations' }, () => loadSupportCount())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadSupportCount = async () => {
    const { count } = await supabase
      .from('support_conversations')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'pending']);
    setSupportCount(count || 0);
  };

  const isActive = (item: typeof NAV_ITEMS[0]) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-700/50">
            <Link to="/admin" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-white font-black text-lg tracking-tight">Admin</h1>
                <p className="text-slate-400 text-xs">ChecksFleet</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map(item => {
              const active = isActive(item);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200
                    ${active
                      ? 'bg-gradient-to-r from-teal-500/20 to-blue-500/10 text-white border border-teal-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 ${active ? 'text-teal-400' : ''}`} />
                  <span>{item.label}</span>
                  {item.path === '/admin/support' && supportCount > 0 && (
                    <span className="absolute right-3 bg-red-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                      {supportCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700/50">
            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
              Retour à l'app
            </Link>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Top bar mobile */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg">
            <Menu className="w-6 h-6 text-slate-700" />
          </button>
          <h1 className="text-lg font-black text-slate-900">Admin ChecksFleet</h1>
        </header>

        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
