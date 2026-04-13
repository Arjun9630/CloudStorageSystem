import { useState } from 'react';
import { NavLink } from 'react-router';
import { Home, Clock, Star, Trash2, Cloud, Menu, X, LogOut, Folder, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStorage } from '../contexts/StorageContext';
export function MobileSidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const { logout, user } = useAuth();
    const { usedStorage, totalStorage } = useStorage();
    const storagePercent = (usedStorage / totalStorage) * 100;
    const navItems = [
        { path: '/', icon: Home, label: 'Dashboard' },
        { path: '/files', icon: Folder, label: 'My Files' },
        { path: '/recent', icon: Clock, label: 'Recent' },
        { path: '/starred', icon: Star, label: 'Starred' },
        { path: '/trash', icon: Trash2, label: 'Trash' },
    ];
    if (user?.isAdmin) {
        navItems.push({ path: '/admin', icon: Shield, label: 'Admin Panel' });
    }

    return (<>
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-black/40 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <Cloud className="w-6 h-6 text-blue-400"/>
          <span className="text-lg font-semibold text-white">CloudStore</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 hover:bg-white/10 text-white rounded-lg transition-colors">
          <Menu className="w-6 h-6"/>
        </button>
      </header>

      {isOpen && (<>
          <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setIsOpen(false)}/>
          <aside className="lg:hidden fixed top-0 left-0 bottom-0 w-64 bg-black/40 backdrop-blur-2xl border-r border-white/10 z-50 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-8 h-8 text-blue-400"/>
                <span className="text-xl font-semibold text-white drop-shadow-md">CloudStore</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 text-white rounded-lg transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => (<NavLink key={item.path} to={item.path} end={item.path === '/'} onClick={() => setIsOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${isActive
                    ? 'bg-blue-600/20 text-blue-400 shadow-inner border border-blue-400/20'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
                  <item.icon className="w-5 h-5"/>
                  <span className="font-medium">{item.label}</span>
                </NavLink>))}
            </nav>

            <div className="p-4 space-y-5 border-t border-white/10">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Storage</span>
                  <span className="text-xs font-bold text-white">
                    {formatBytes(usedStorage)} / {formatBytes(totalStorage)}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(storagePercent, 100)}%` }}/>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 font-medium">
                  {storagePercent.toFixed(1)}% capacity used
                </p>
              </div>

              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email}</p>
                </div>
              </div>

              <button onClick={() => {
                logout();
                setIsOpen(false);
            }} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition-all font-medium border border-transparent hover:border-red-500/20">
                <LogOut className="w-5 h-5"/>
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </>)}

    </>);
}
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
