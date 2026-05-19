import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Shield, LayoutGrid, Clock, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'home',      label: 'Home',      icon: Home,       path: '/dashboard' },
    { id: 'vault',     label: 'Vault',     icon: Shield,     path: '/vault' },
    { id: 'portfolio', label: 'Portfolio', icon: LayoutGrid, path: '/portfolio' },
    { id: 'activity',  label: 'Activity',  icon: Clock,      path: '/dashboard' },
    { id: 'profile',   label: 'Profile',   icon: User,       path: '/profile' },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'rgba(15,23,42,0.97)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(139,92,246,0.3)',
        padding: '8px 0 4px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
      }}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.path) && !(tab.path === '/dashboard' && location.pathname.includes('profile'));
        const profileActive = tab.id === 'profile' && location.pathname.startsWith('/profile');
        const finalActive = profileActive || (tab.id !== 'profile' && active);

        return (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.08, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(tab.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '6px 12px',
              borderRadius: 12,
              background: 'none',
              border: finalActive ? '0 0 2px 0' : 'none',
              borderBottom: finalActive ? '2px solid rgb(168,85,247)' : '2px solid transparent',
              color: finalActive ? '#c084fc' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s',
              minWidth: 56,
            }}
          >
            <tab.icon size={22} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>{tab.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
