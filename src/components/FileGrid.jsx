import { useState } from 'react';
import { FileText, Video, Music, Archive, File, Star, Trash2, Download, Grid, List, FolderInput, Image as ImageIcon } from 'lucide-react';
import { useStorage } from '../contexts/StorageContext';
import { motion, AnimatePresence } from 'motion/react';
const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
};
export function FileGrid({ files, onFileClick, onDelete, onToggleStar }) {
    const [viewMode, setViewMode] = useState('grid');
    const [movingFileId, setMovingFileId] = useState(null);
    const { folders, moveFile } = useStorage();
    const getFileIcon = (type) => {
        if (type.startsWith('image/'))
            return ImageIcon;
        if (type.startsWith('video/'))
            return Video;
        if (type.startsWith('audio/'))
            return Music;
        if (type.includes('pdf') || type.includes('document'))
            return FileText;
        if (type.includes('zip') || type.includes('rar'))
            return Archive;
        return File;
    };
    const handleDownload = (file, e) => {
        e.stopPropagation();
        window.open(file.url, '_blank', 'noopener,noreferrer');
    };
    const renderMoveDropdown = (file) => {
        if (movingFileId !== file.id)
            return null;
        return (<div onClick={(e) => e.stopPropagation()} className="absolute top-10 left-0 mt-1 w-48 bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden z-50 text-sm font-medium">
        <div className="px-3 py-2 border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wider">Move to...</div>
        <div className="max-h-48 overflow-y-auto">
          <button onClick={() => { moveFile(file.id, null); setMovingFileId(null); }} className="w-full text-left px-4 py-2 text-white hover:bg-blue-600 transition-colors">
            Root Directory
          </button>
          {folders.map(f => (<button key={f.id} onClick={() => { moveFile(file.id, f.id); setMovingFileId(null); }} className="w-full text-left px-4 py-2 text-white hover:bg-blue-600 transition-colors truncate">
              {f.name}
            </button>))}
        </div>
      </div>);
    };
    if (files.length === 0) {
        return (<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center h-64 bg-black/20 backdrop-blur-md border border-dashed border-white/20 rounded-2xl mx-4 my-8 shadow-inner">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-sm">
            <File className="w-10 h-10 text-gray-500"/>
          </div>
          <p className="text-xl font-semibold text-white drop-shadow-md">No files here</p>
          <p className="text-sm text-gray-400 mt-2">Upload some files to see them here</p>
        </div>
      </motion.div>);
    }
    return (<div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white drop-shadow-md">Your Files</h2>
        <div className="flex gap-1 bg-black/40 border border-white/10 p-1 rounded-xl shadow-inner backdrop-blur-sm">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/20 shadow text-blue-300' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
            <Grid className="w-4 h-4"/>
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/20 shadow text-blue-300' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
            <List className="w-4 h-4"/>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (<motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg overflow-visible">
            <table className="w-full table-fixed">
              <thead className="bg-black/20 backdrop-blur-md border-b border-white/10">
                <tr>
                  <th className="text-left py-3 px-4 sm:px-6 text-xs font-semibold text-gray-400 tracking-wider">Name</th>
                  <th className="text-left py-3 px-4 sm:px-6 text-xs font-semibold text-gray-400 tracking-wider hidden md:table-cell w-24">Size</th>
                  <th className="text-left py-3 px-4 sm:px-6 text-xs font-semibold text-gray-400 tracking-wider hidden lg:table-cell w-32">Modified</th>
                  <th className="text-right py-3 px-4 sm:px-6 text-xs font-semibold text-gray-400 tracking-wider w-[140px] sm:w-48">Actions</th>
                </tr>
              </thead>
              <motion.tbody variants={containerVariants} initial="hidden" animate="show" className="divide-y divide-white/5">
                <AnimatePresence>
                  {files.map((file) => {
                const Icon = getFileIcon(file.type);
                return (<motion.tr layout variants={itemVariants} key={file.id} onClick={() => onFileClick(file)} className="hover:bg-white/10 cursor-pointer transition-colors group relative">
                        <td className="px-4 sm:px-6 py-4 truncate">
                          <div className="flex items-center gap-3 sm:gap-4 truncate">
                            {file.type.startsWith('image/') || file.type.startsWith('video/') ? (<div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.3)] border border-white/10 overflow-hidden relative flex-shrink-0">
                                {file.type.startsWith('image/') ? (<img src={file.url} alt="" className="w-full h-full object-cover"/>) : (<video src={file.url} className="w-full h-full object-cover" muted/>)}
                              </div>) : (<div className="w-8 h-8 sm:w-10 sm:h-10 bg-black/20 rounded-lg flex items-center justify-center border border-white/10 text-blue-400 shadow-inner flex-shrink-0">
                                <Icon className="w-4 h-4 sm:w-5 sm:h-5"/>
                              </div>)}
                            <div className="min-w-0 flex-1 truncate">
                              <p className="font-semibold text-sm sm:text-base text-gray-200 truncate group-hover:text-white transition-colors">{file.name}</p>
                              <p className="text-xs text-gray-400 md:hidden mt-0.5">{formatBytes(file.size)}</p>
                            </div>
                            {file.isStarred && (<Star className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 fill-amber-400 flex-shrink-0 drop-shadow-sm"/>)}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-400 hidden md:table-cell truncate">{formatBytes(file.size)}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-400 hidden lg:table-cell truncate">
                          {new Date(file.uploadedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right overflow-visible">
                          <div className={`flex items-center justify-end gap-0.5 sm:gap-1 transition-opacity ${movingFileId === file.id ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'}`}>

                            
                            <div className="relative flex items-center justify-center">
                              <button onClick={(e) => { e.stopPropagation(); setMovingFileId(movingFileId === file.id ? null : file.id); }} className="p-2 hover:bg-white/20 rounded-lg shadow-sm text-gray-400 hover:text-blue-300 transition-colors">
                                <FolderInput className="w-4 h-4"/>
                              </button>
                              {renderMoveDropdown(file)}
                            </div>

                            <button onClick={(e) => { e.stopPropagation(); onToggleStar(file.id); }} className="p-2 hover:bg-white/20 rounded-lg shadow-sm text-gray-400 hover:text-amber-400 transition-colors">
                              <Star className={`w-4 h-4 ${file.isStarred ? 'fill-amber-400 text-amber-400' : ''}`}/>
                            </button>
                            <button onClick={(e) => handleDownload(file, e)} className="p-2 hover:bg-white/20 rounded-lg shadow-sm text-gray-400 hover:text-blue-300 transition-colors">
                              <Download className="w-4 h-4"/>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(file.id); }} className="p-2 hover:bg-red-500/20 rounded-lg shadow-sm text-gray-400 hover:text-red-400 transition-colors">
                              <Trash2 className="w-4 h-4"/>
                            </button>
                          </div>
                        </td>
                      </motion.tr>);
            })}
                </AnimatePresence>
              </motion.tbody>
            </table>
          </motion.div>) : (<motion.div key="grid" variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            <AnimatePresence>
              {files.map((file) => {
                const Icon = getFileIcon(file.type);
                return (<motion.div layout variants={itemVariants} key={file.id} onClick={() => onFileClick(file)} className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 hover:border-white/30 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer group relative overflow-visible" onMouseLeave={() => setMovingFileId(null)}>
                    <div className="aspect-[4/3] relative overflow-hidden bg-black/40 flex flex-col justify-end rounded-t-2xl shadow-inner border-b border-white/5">
                      {file.type.startsWith('image/') ? (<img src={file.url} alt={file.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"/>) : file.type.startsWith('video/') ? (<video src={file.url} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" muted loop onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}/>) : (<div className="absolute inset-0 flex items-center justify-center p-6">
                          <Icon className="w-14 h-14 text-blue-400/60 group-hover:scale-110 transition-transform duration-500 ease-out group-hover:text-blue-300"/>
                        </div>)}
                      
                      {file.isStarred && (<div className="absolute top-3 right-3 p-1.5 bg-black/40 backdrop-blur-md rounded-full shadow-lg border border-white/10 z-10 hidden lg:flex">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400"/>
                        </div>)}
                    </div>
                    
                    <div className="p-4 bg-white/5 relative z-10 rounded-b-2xl">
                      <p className="font-semibold text-sm truncate text-gray-200 group-hover:text-white transition-colors drop-shadow-sm">{file.name}</p>
                      <p className="text-xs text-gray-400 mt-1.5 font-medium">{formatBytes(file.size)}</p>
                    </div>
                    
                    {/* Hover Overlay Actions */}
                    <div className={`absolute top-3 left-3 flex gap-2 transition-all duration-300 transform z-20 ${movingFileId === file.id ? 'opacity-100 translate-y-0' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:-translate-y-2 lg:group-hover:translate-y-0'}`}>

                      <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setMovingFileId(movingFileId === file.id ? null : file.id); }} className="p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg shadow-lg hover:bg-white/20 text-gray-300 hover:text-white transition-colors">
                          <FolderInput className="w-4 h-4"/>
                        </button>
                        {renderMoveDropdown(file)}
                      </div>

                      <button onClick={(e) => { e.stopPropagation(); onToggleStar(file.id); }} className="p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg shadow-lg hover:bg-white/20 text-gray-300 hover:text-amber-400 transition-colors">
                        <Star className={`w-4 h-4 ${file.isStarred ? 'fill-amber-400 text-amber-400' : ''}`}/>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(file.id); }} className="p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg shadow-lg hover:bg-red-500/20 text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  </motion.div>);
            })}
            </AnimatePresence>
          </motion.div>)}
      </AnimatePresence>
    </div>);
}
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
