import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import FloatingParticles from './FloatingParticles';
import SupportChat from './SupportChat';
import { LayoutDashboard, Users, Settings, LogOut, Menu, X, CircleUser as UserCircle, MapPin, ShoppingBag, Shield, Building2, MessageCircle, Smartphone, Camera, FileText, Share2 } from 'lucide-react';
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
  // Par défaut: épinglé uniquement sur desktop (>= 1024px)
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1024;
  });
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [forceHide, setForceHide] = useState(false);
  const [firstName, setFirstName] = useState<string>('');
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    loadUserProfile();
    loadUnreadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel('support_messages_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
        },
        async (payload) => {
          // Check if message is from admin to current user
          if (payload.new.sender_type === 'admin') {
            // Get conversation to check if it belongs to current user
            const { data: conversation } = await supabase
              .from('support_conversations')
              .select('user_id')
              .eq('id', payload.new.conversation_id)
              .single();
            
            if ((conversation as any)?.user_id === user?.id) {
              loadUnreadMessages();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Adapter le pin de la sidebar aux changements de taille d'écran
  useEffect(() => {
    const onResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      setSidebarPinned(isDesktop);
      if (!isDesktop) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Empêcher le scroll du contenu quand le menu mobile est ouvert
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (isMobile) {
      document.body.style.overflow = sidebarOpen ? 'hidden' : '';
      document.documentElement.style.overflow = sidebarOpen ? 'hidden' : '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [sidebarOpen]);

  const loadUnreadMessages = async () => {
    if (!user) return;

    try {
      // Count conversations with unread admin messages
      const { data: conversations } = await supabase
        .from('support_conversations')
        .select('id')
        .eq('user_id', user.id);

      if (!conversations || conversations.length === 0) {
        setUnreadMessagesCount(0);
        return;
      }

      const conversationIds = (conversations as any[]).map(c => c.id);

      // Get last read timestamp for user (we'll use a simple approach: messages after last visit)
      const { data: messages } = await supabase
        .from('support_messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .eq('sender_type', 'admin')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24h

      setUnreadMessagesCount(messages?.length || 0);
    } catch (error) {
      console.error('Error loading unread messages:', error);
    }
  };

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if ((data as any)?.first_name) {
        setFirstName((data as any).first_name);
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
    { path: '/scanner', icon: Camera, label: 'Scanner Documents', color: 'text-orange-400', hoverColor: 'group-hover:text-orange-300' },
    { path: '/crm', icon: Building2, label: 'CRM & Commercial', color: 'text-indigo-400', hoverColor: 'group-hover:text-indigo-300' },
    { path: '/planning-network', icon: Share2, label: 'Réseau Planning', color: 'text-pink-400', hoverColor: 'group-hover:text-pink-300' },
    { path: '/billing-profile', icon: FileText, label: 'Profil Facturation', color: 'text-violet-400', hoverColor: 'group-hover:text-violet-300' },
    { path: '/shop', icon: ShoppingBag, label: 'Abonnements', color: 'text-emerald-400', hoverColor: 'group-hover:text-emerald-300' },
  ];

  const shouldShowSidebar = !forceHide && (sidebarPinned || sidebarHovered || sidebarOpen);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-teal-50 text-slate-900 flex relative overflow-x-hidden w-full max-w-full">
      <FloatingParticles />
      
      {/* Overlay mobile pour fermer le menu */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <aside
        onMouseEnter={() => {
          if (!forceHide && window.innerWidth >= 1024) {
            setSidebarHovered(true);
          }
        }}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`
        fixed inset-y-0 left-0 z-50
        w-64 lg:w-64 sm:w-72
        backdrop-blur-2xl bg-gradient-to-b from-slate-900/50 via-slate-800/55 to-slate-900/60 border-r border-teal-400/20 text-white shadow-depth-xl shadow-teal-500/10
        transform transition-transform duration-300 ease-in-out
        flex flex-col
        ${shouldShowSidebar ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-teal-400/20 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 flex items-center justify-between flex-shrink-0 relative">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 hover:scale-105 transition-transform group"
          >
            <img src="/logo.png?v=5" alt="CHECKSFLEET Logo" className="w-10 h-10 rounded-xl shadow-lg group-hover:shadow-teal-500/30 transition-shadow" />
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
              CHECKSFLEET
            </span>
          </Link>
          
          {/* Bouton fermer/épingler unique */}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                // Mobile: ferme complètement
                setSidebarOpen(false);
                setSidebarPinned(false);
                setSidebarHovered(false);
                setForceHide(true);
                setTimeout(() => setForceHide(false), 500);
              } else {
                // Desktop: toggle pin
                if (sidebarPinned) {
                  setSidebarPinned(false);
                  setSidebarHovered(false);
                  setForceHide(true);
                  setTimeout(() => setForceHide(false), 500);
                } else {
                  setSidebarPinned(true);
                  setForceHide(false);
                }
              }
            }}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200 group"
            title={window.innerWidth < 1024 ? "Fermer" : (sidebarPinned ? "Désépingler et fermer" : "Épingler la sidebar")}
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
          </button>
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

      <div className={`flex-1 flex flex-col min-h-screen w-0 min-w-0 transition-all duration-300 ${sidebarPinned ? 'lg:ml-64' : 'lg:ml-0'}`}>
        <header
          className="backdrop-blur-2xl bg-gradient-to-r from-slate-900/50 via-slate-800/55 to-teal-900/50 border-b border-teal-400/20 p-3 lg:p-4 shadow-depth-xl shadow-teal-500/10 sticky top-0 z-40 w-full"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition touch-manipulation"
                aria-label="Ouvrir le menu"
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
              {/* Mobile Download Button */}
              <Link
                to="/mobile-download"
                className="relative group text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-300"
                title="Télécharger l'app mobile"
              >
                <Smartphone className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </Link>

              {/* Support Button with Notification Badge */}
              <Link
                to="/support"
                className="relative group text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-300"
                title="Support & Assistance"
                onClick={() => loadUnreadMessages()} // Reset count on click
              >
                <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pulse">
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </span>
                )}
              </Link>

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-md bg-white/10 border border-white/20">
                <div className="text-right">
                  <p className="text-xs font-semibold text-white leading-none truncate max-w-[120px]">{firstName || 'Utilisateur'}</p>
                </div>
              </div>
              <Link
                to="/profile"
                className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm hover:shadow-glow-teal transition-all hover:scale-105 shadow-lg border-2 border-white/30 hover:border-white/50 flex-shrink-0"
                aria-label="Profil utilisateur"
              >
                {firstName ? firstName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden overflow-y-auto relative z-10 w-full max-w-full">
          {children}
        </main>
      </div>

      {/* Support Chat - Contactez l'équipe */}
      <SupportChat />
    </div>
  );
}
