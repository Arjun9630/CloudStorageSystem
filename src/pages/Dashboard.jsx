import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Files, HardDrive, Upload, TrendingUp, Folder, Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useStorage } from '../contexts/StorageContext';
import { FileUpload } from '../components/FileUpload';
// 256MB Quota Limit defined explicitly for Dashboard aesthetics matching Backend
const QUOTA_LIMIT = 256 * 1024 * 1024;
export function Dashboard() {
    const { files, folders, usedStorage, storageByType, createFolder, setCurrentFolderId } = useStorage();
    const navigate = useNavigate();
    const activeFiles = files.filter(f => !f.isTrashed);
    const recentFiles = [...activeFiles].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()).slice(0, 5);
    const storagePercent = (usedStorage / QUOTA_LIMIT) * 100;
    const freeStorage = Math.max(0, QUOTA_LIMIT - usedStorage);
    const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1'];
    const totalStorageByType = storageByType.reduce((acc, curr) => acc + curr.size, 0);
    const renderLegend = (props) => {
        const { payload } = props;
        return (<ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-2">
        {payload.map((entry, index) => {
                const percent = totalStorageByType > 0 ? (entry.payload.size / totalStorageByType) * 100 : 0;
                return (<li key={`item-${index}`} className="flex items-center gap-2 text-sm text-white font-medium">
              <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}/>
              {entry.value} <span className="text-gray-300">({percent.toFixed(2)}%)</span>
            </li>);
            })}
      </ul>);
    };
    return (<div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white drop-shadow-md">Dashboard</h1>
          <p className="text-gray-300 mt-1 font-medium drop-shadow-sm">Welcome back! Here's your storage overview</p>
        </div>
        <div className="w-fit">
          <FileUpload />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/15 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Total Files</p>
              <p className="text-3xl font-bold text-white mt-2 drop-shadow-sm">{activeFiles.length}</p>
            </div>
            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <Files className="w-7 h-7 text-blue-400"/>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/15 transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"/>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Storage Used</p>
              <p className="text-3xl font-bold text-white mt-2 drop-shadow-sm">{storagePercent.toFixed(1)}%</p>
            </div>
            <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center border border-purple-400/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <HardDrive className="w-7 h-7 text-purple-400"/>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/15 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Recent Uploads</p>
              <p className="text-3xl font-bold text-white mt-2 drop-shadow-sm">{recentFiles.length}</p>
            </div>
            <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center border border-green-400/30 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              <Upload className="w-7 h-7 text-green-400"/>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/15 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-300 uppercase tracking-wide">File Types</p>
              <p className="text-3xl font-bold text-white mt-2 drop-shadow-sm">{storageByType.length}</p>
            </div>
            <div className="w-14 h-14 bg-orange-500/20 rounded-2xl flex items-center justify-center border border-orange-400/30 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              <TrendingUp className="w-7 h-7 text-orange-400"/>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage by Type */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg relative">
          <h2 className="text-lg font-bold text-white mb-6 border-b border-white/10 pb-4 drop-shadow-sm">Storage by Type</h2>
          {storageByType.length > 0 ? (<ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={storageByType} dataKey="size" nameKey="type" cx="50%" cy="45%" innerRadius={65} outerRadius={105} paddingAngle={5}>
                  {storageByType.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0}/>))}
                </Pie>
                <Tooltip formatter={(value) => formatBytes(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                <Legend content={renderLegend} verticalAlign="bottom"/>
              </PieChart>
            </ResponsiveContainer>) : (<div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
               <TrendingUp className="w-12 h-12 mb-3 text-gray-500"/>
              <p>No storage utilized yet</p>
            </div>)}
        </div>

        {/* Folders Overview */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <h2 className="text-lg font-bold text-white drop-shadow-sm">Your Folders</h2>
            <button onClick={() => {
            const name = window.prompt('Enter folder name:');
            if (name && name.trim())
                createFolder(name.trim());
        }} className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 border border-blue-400/30 transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)]">
              <Plus className="w-5 h-5"/>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pr-2">
            {folders.length > 0 ? (<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {folders.map(folder => (<div key={folder.id} onClick={() => {
                    setCurrentFolderId(folder.id);
                    navigate('/files');
                }} className="p-4 bg-black/20 border border-white/5 rounded-xl hover:bg-white/10 hover:border-white/20 cursor-pointer transition-all flex flex-col items-center justify-center text-center group shadow-inner">
                    <Folder className="w-8 h-8 text-blue-400/80 mb-2 group-hover:text-blue-400 transition-colors drop-shadow-md"/>
                    <span className="text-sm font-semibold text-gray-300 truncate w-full group-hover:text-white transition-colors">{folder.name}</span>
                  </div>))}
              </div>) : (<div className="h-full flex flex-col items-center justify-center text-gray-400 min-h-[200px]">
                <Folder className="w-12 h-12 mb-3 text-gray-500"/>
                <p>No folders created yet</p>
              </div>)}
          </div>
        </div>
      </div>

      {/* Recent Files */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-6 border-b border-white/10 pb-4 drop-shadow-sm">Recent Files</h2>
        {recentFiles.length > 0 ? (<div className="space-y-3">
            {recentFiles.map((file) => (<div key={file.id} className="flex items-center gap-4 p-4 hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/10">
                {file.thumbnail ? (<img src={file.thumbnail} alt="" className="w-12 h-12 object-cover rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.3)] border border-white/10"/>) : (<div className="w-12 h-12 bg-black/20 rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                    <Files className="w-6 h-6 text-blue-400"/>
                  </div>)}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-200 truncate">{file.name}</p>
                  <p className="text-sm font-medium text-gray-500 mt-0.5">
                    {formatBytes(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>))}
          </div>) : (<div className="text-center py-10 text-gray-400">
            <Files className="w-12 h-12 mx-auto mb-3 text-gray-600"/>
            <p className="font-medium">No files uploaded yet</p>
          </div>)}
      </div>
    </div>);
}
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
