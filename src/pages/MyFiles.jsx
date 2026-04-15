import { useState } from 'react';
import { useStorage } from '../contexts/StorageContext';
import { FileGrid } from '../components/FileGrid';
import { FilePreview } from '../components/FilePreview';
import { FileUpload } from '../components/FileUpload';
import { Search, Folder, ChevronRight, Trash2, FolderPlus, Edit2, Pin, PinOff } from 'lucide-react';
export function MyFiles() {
    const { files, folders, currentFolderId, setCurrentFolderId, createFolder, deleteFolder, renameFolder, deleteFile, toggleStar, renameFile, togglePinFolder } = useStorage();
    const [selectedFile, setSelectedFile] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;
    // Build breadcrumbs dynamically from children backwards
    const buildBreadcrumbs = () => {
        const crumbs = [];
        let curr = currentFolderId;
        while (curr) {
            const folder = folders.find(f => f.id === curr);
            if (folder) {
                crumbs.unshift(folder);
                curr = folder.parentId || null;
            }
            else {
                break;
            }
        }
        return crumbs;
    };
    const breadcrumbs = buildBreadcrumbs();
    const activeFiles = files.filter(f => {
        if (f.isTrashed)
            return false;
        const isMatchedFolder = currentFolderId ? f.folderId === currentFolderId : !f.folderId;
        return isMatchedFolder;
    });
    const filteredFiles = activeFiles.filter(file => file.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return (<div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white drop-shadow-md">My Files</h1>
          <p className="text-gray-300 mt-1 drop-shadow-sm">{activeFiles.length} files in this view</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => {
            const name = window.prompt('Enter new folder name:');
            if (name && name.trim())
                createFolder(name.trim(), currentFolderId || undefined);
        }} className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-md text-white border border-white/20 font-medium rounded-xl hover:bg-white/20 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
            <FolderPlus className="w-5 h-5 text-blue-300"/>
            <span className="hidden sm:inline">New Folder</span>
          </button>
          <FileUpload />
        </div>
      </div>

      {/* Breadcrumbs Navigation */}
      <div className="flex items-center gap-2 text-sm text-gray-300 flex-wrap bg-black/20 px-4 py-3 rounded-xl border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.1)] backdrop-blur-sm w-fit">
        <button onClick={() => setCurrentFolderId(null)} className={`px-2 py-1 rounded-md transition-colors ${!currentFolderId ? 'font-semibold text-white bg-white/20 shadow-inner' : 'hover:bg-white/10 hover:text-white'}`}>
          Root Directory
        </button>
        {breadcrumbs.map((crumb, idx) => (<div key={crumb.id} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-gray-400"/>
            <button onClick={() => setCurrentFolderId(crumb.id)} className={`px-2 py-1 rounded-md transition-colors ${crumb.id === currentFolderId ? 'font-semibold text-white bg-blue-500/30 border border-blue-400/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'hover:bg-white/10 hover:text-white'}`}>
              {crumb.name}
            </button>
          </div>))}
      </div>

      {/* Folders List Grid */}
      {(() => {
            const visibleFolders = folders.filter(f => (currentFolderId ? f.parentId === currentFolderId : !f.parentId));
            if (visibleFolders.length === 0)
                return null;
            return (<div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 drop-shadow-sm">Folders</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
              {visibleFolders.map(folder => (<div key={folder.id} onClick={() => setCurrentFolderId(folder.id)} className="px-4 py-2 h-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 hover:border-white/40 shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] cursor-pointer transition-all flex items-center justify-between gap-3 group min-w-0" title={folder.name}>
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <div className="flex-shrink-0">
                      <Folder className="w-6 h-6 text-blue-300 group-hover:text-blue-200 drop-shadow-sm"/>
                    </div>
                    <span className="text-[14px] font-medium text-gray-200 truncate whitespace-nowrap leading-tight drop-shadow-sm group-hover:text-white flex-1">{folder.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all shrink-0">
                    <button onClick={(e) => {
                        e.stopPropagation();
                        togglePinFolder(folder.id);
                    }} className={`p-1 rounded transition-all ${folder.isPinned ? 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`} title={folder.isPinned ? "Unpin folder" : "Pin folder"}>
                      {folder.isPinned ? <PinOff className="w-4 h-4"/> : <Pin className="w-4 h-4"/>}
                    </button>
                    <button onClick={(e) => {
                        e.stopPropagation();
                        const newName = window.prompt('Rename folder to:', folder.name);
                        if (newName && newName.trim() && newName.trim() !== folder.name) {
                            renameFolder(folder.id, newName.trim());
                        }
                    }} className="p-1 hover:bg-white/20 text-blue-300 rounded transition-all" title="Rename folder">
                      <Edit2 className="w-4 h-4"/>
                    </button>
                    <button onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete folder? Files and nested folders inside will be moved back to the root directory.')) {
                            deleteFolder(folder.id);
                        }
                    }} className="p-1 hover:bg-red-500/20 text-red-300 rounded transition-all" title="Delete folder">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>))}
            </div>
          </div>);
        })()}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
        <input type="text" placeholder="Search files..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-black/40 backdrop-blur-md border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all"/>
      </div>

      <FileGrid files={filteredFiles} onFileClick={setSelectedFile} onDelete={deleteFile} onToggleStar={toggleStar}/>

      {selectedFile && (<FilePreview file={selectedFile} onClose={() => setSelectedFile(null)} onDelete={deleteFile} onToggleStar={toggleStar} onRename={renameFile}/>)}
    </div>);
}
