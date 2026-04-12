import { useState, useEffect } from 'react';
import { Users, Trash2, Shield, Info, HardDrive, FileText, Calendar, RefreshCw } from 'lucide-react';
import { adminListUsersAPI, adminDeleteUserAPI, adminSyncAPI } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
export function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    useEffect(() => {
        fetchUsers();
    }, []);
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await adminListUsersAPI();
            setUsers(data);
        }
        catch (error) {
            toast.error('Failed to load users');
        }
        finally {
            setLoading(false);
        }
    };
    const handleDeleteUser = async (userId, userName) => {
        if (!confirm(`Are you sure you want to PERMANENTLY delete user "${userName}"? This will also wipe all their files from S3.`))
            return;
        try {
            setDeletingId(userId);
            await adminDeleteUserAPI(userId);
            toast.success('User and S3 files removed successfully');
            setUsers(users.filter(u => u.id !== userId));
        }
        catch (error) {
            toast.error('Failed to delete user');
        }
        finally {
            setDeletingId(null);
        }
    };
    const handleGlobalSync = async () => {
        if (!confirm("Are you sure you want to run a GLOBAL system sync? This will audit every user's files against S3 and remove any stale records. This might take a moment."))
            return;
        try {
            setIsSyncing(true);
            const result = await adminSyncAPI();
            const removed = result.summary.total_files_removed;
            toast.success(`Global sync completed! Cleaned up ${removed} stale records.`);
            // Refresh user list to show updated storage stats
            fetchUsers();
        }
        catch (error) {
            toast.error(error.message || 'Global sync failed');
        }
        finally {
            setIsSyncing(false);
        }
    };
    function formatBytes(bytes) {
        if (bytes === 0)
            return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
    if (loading) {
        return (<div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-blue-200/60 font-medium animate-pulse">Loading Admin Portal...</p>
      </div>);
    }
    return (<div className="p-8 max-w-7xl mx-auto min-h-screen">
      <header className="mb-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30">
            <Shield className="w-8 h-8 text-blue-400"/>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
            <p className="text-gray-400 mt-1">Manage system users and monitor S3 capacity</p>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <button onClick={handleGlobalSync} disabled={isSyncing} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 border border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed group">
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}/>
              {isSyncing ? 'Syncing System...' : 'Global System Sync'}
            </button>
          </motion.div>
        </motion.div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatsCard icon={Users} label="Total Users" value={users.length.toString()} color="from-blue-500/20 to-indigo-500/20" borderColor="border-blue-500/30"/>
        <StatsCard icon={HardDrive} label="Total Storage" value={formatBytes(users.reduce((acc, u) => acc + u.totalStorageUsed, 0))} color="from-purple-500/20 to-pink-500/20" borderColor="border-purple-500/30"/>
         <StatsCard icon={FileText} label="Total Files" value={users.reduce((acc, u) => acc + u.fileCount, 0).toString()} color="from-emerald-500/20 to-teal-500/20" borderColor="border-emerald-500/30"/>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-3xl shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User Details</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Stats</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Registered</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence>
                {users.map((user) => (<motion.tr key={user.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -50 }} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg border border-white/20">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-semibold group-hover:text-blue-300 transition-colors flex items-center gap-2">
                            {user.name}
                            {user.isAdmin && (<span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/30">Admin</span>)}
                          </p>
                          <p className="text-gray-400 text-sm">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex flex-col items-center gap-1.5">
                          <div className="flex items-center gap-2">
                             <span className="text-blue-100 font-bold">{formatBytes(user.totalStorageUsed)}</span>
                             <span className="text-gray-600">|</span>
                             <span className="text-gray-300 text-sm font-medium">{user.fileCount} files</span>
                          </div>
                          <div className="w-32 bg-white/5 h-1 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" style={{ width: `${Math.min((user.totalStorageUsed / (256 * 1024 * 1024)) * 100, 100)}%` }}/>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex items-center gap-2 text-gray-400">
                          <Calendar className="w-4 h-4 text-gray-500"/>
                          <span className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</span>
                       </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {!user.isAdmin && (<button onClick={() => handleDeleteUser(user.id, user.name)} disabled={deletingId === user.id} className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 border border-red-500/20 shadow-lg shadow-red-500/5 disabled:opacity-50">
                          <Trash2 className={`w-5 h-5 ${deletingId === user.id ? 'animate-pulse' : ''}`}/>
                        </button>)}
                    </td>
                  </motion.tr>))}
              </AnimatePresence>
            </tbody>
          </table>
          {users.length === 0 && (<div className="p-20 text-center">
              <Info className="w-12 h-12 text-gray-500 mx-auto mb-4"/>
              <p className="text-gray-400 text-lg">No other users found in the system.</p>
            </div>)}
        </div>
      </motion.div>
    </div>);
}
function StatsCard({ icon: Icon, label, value, color, borderColor }) {
    return (<motion.div whileHover={{ scale: 1.02, translateY: -5 }} className={`p-6 rounded-3xl bg-gradient-to-br ${color} border ${borderColor} backdrop-blur-xl shadow-xl`}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-black/20 rounded-lg">
          <Icon className="w-6 h-6 text-white/80"/>
        </div>
      </div>
      <p className="text-gray-400 text-sm font-medium">{label}</p>
      <p className="text-2xl font-black text-white mt-1 drop-shadow-md">{value}</p>
    </motion.div>);
}
