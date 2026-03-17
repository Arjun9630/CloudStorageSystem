import { NavLink } from 'react-router';
import { Home, Files, Clock, Star, Trash2, Cloud, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStorage } from '../contexts/StorageContext';
import { motion } from 'motion/react';

export function Sidebar() {
  const { logout, user } = useAuth();
  const { usedStorage, totalStorage } = useStorage();

  const storagePercent = (usedStorage / totalStorage) * 100;

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/files', icon: Files, label: 'My Files' },
    { path: '/recent', icon: Clock, label: 'Recent' },
    { path: '/starred', icon: Star, label: 'Starred' },
    { path: '/trash', icon: Trash2, label: 'Trash' },
  ];

  if (user?.isAdmin) {
    navItems.push({ path: '/admin', icon: Shield, label: 'Admin Panel' });
  }

  return (
    <aside className="w-64 bg-black/40 backdrop-blur-2xl border-r border-white/10 flex flex-col h-screen sticky top-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)] z-10">
      <div className="p-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center justify-center text-white border border-white/20">
            <Cloud className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300 drop-shadow-md">
            CloudStore
          </span>
        </motion.div>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item, index) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
          >
            {({ isActive }) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group cursor-pointer"
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 bg-white/10 border border-white/20 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                
                <item.icon className={`w-5 h-5 relative z-10 transition-colors duration-300 ${isActive ? 'text-blue-400 scale-110 drop-shadow-sm' : 'text-gray-400 group-hover:text-white'}`} />
                <span className={`relative z-10 font-medium transition-colors duration-300 ${isActive ? 'text-blue-100 drop-shadow-sm' : 'text-gray-400 group-hover:text-white'}`}>{item.label}</span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 space-y-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-lg shadow-black/20"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-300">Storage</span>
            <span className="text-xs font-bold text-gray-200 bg-white/10 px-2 py-1 rounded-md shadow-inner border border-white/20">
              {formatBytes(usedStorage)}
            </span>
          </div>
          <div className="w-full bg-black/40 rounded-full h-1.5 mb-2 overflow-hidden shadow-inner flex shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(storagePercent, 100)}%` }}
              transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
              className="bg-gradient-to-r from-blue-400 to-indigo-400 h-full rounded-full shadow-[0_0_10px_rgba(96,165,250,0.8)]"
            />
          </div>
          <p className="text-[11px] text-gray-400 font-medium">
            {formatBytes(totalStorage)} total • {storagePercent.toFixed(1)}% used
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-between gap-3 px-3 py-2 bg-white/5 border border-white/10 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-[0_0_10px_rgba(99,102,241,0.5)] border border-white/20">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate drop-shadow-sm">{user?.name}</p>
              <p className="text-xs text-blue-200 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-red-400/80 hover:text-red-400 transition-colors" />
          </button>
        </motion.div>
      </div>
    </aside>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
