import { X, Download, Star, Trash2, Edit2, FolderInput } from 'lucide-react';
import { CloudFile, useStorage } from '../contexts/StorageContext';
import { useState } from 'react';

interface FilePreviewProps {
  file: CloudFile;
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleStar: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

export function FilePreview({ file, onClose, onDelete, onToggleStar, onRename }: FilePreviewProps) {
  const { folders, moveFile } = useStorage();
  const [isRenaming, setIsRenaming] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [newName, setNewName] = useState(file.name);

  const handleRename = () => {
    if (newName.trim() && newName !== file.name) {
      onRename(file.id, newName.trim());
    }
    setIsRenaming(false);
  };

  const handleDownload = () => {
    window.open(file.url, '_blank', 'noopener,noreferrer');
  };

  const handleMove = (folderId: string | null) => {
    moveFile(file.id, folderId);
    setIsMoving(false);
  };

  const renderPreview = () => {
    if (file.type.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-900 p-4">
          <img
            src={file.url}
            alt={file.name}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    }

    if (file.type.startsWith('video/')) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-900 p-4">
          <video
            src={file.url}
            controls
            className="max-w-full max-h-full"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (file.type.startsWith('audio/')) {
      return (
        <div className="flex items-center justify-center h-full bg-black/40 backdrop-blur-md">
          <div className="text-center">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              <svg className="w-12 h-12 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
            <audio src={file.url} controls className="mx-auto" />
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-full bg-black/40 backdrop-blur-md">
        <div className="text-center">
          <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/20">
            <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-gray-300 drop-shadow-sm font-semibold">No preview available</p>
          <p className="text-sm text-gray-400 mt-1">{file.type || 'Unknown file type'}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-50 flex flex-col">
      <div className="bg-black/40 text-white px-4 py-3 flex items-center justify-between gap-4 border-b border-white/10">
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setIsRenaming(false);
              }}
              className="bg-white/10 text-white px-3 py-1 rounded border border-white/20 focus:outline-none focus:border-blue-400 focus:bg-white/20 w-full max-w-md transition-all drop-shadow-md"
              autoFocus
            />
          ) : (
            <h2 className="font-semibold text-lg drop-shadow-md truncate">{file.name}</h2>
          )}
          <p className="text-sm text-gray-400">
            {formatBytes(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isMoving ? (
            <div className="relative">
              <button
                onClick={() => setIsMoving(false)}
                className="p-2 bg-white/20 rounded-lg transition-colors text-blue-300 hover:bg-white/30"
                title="Cancel Move"
              >
                <FolderInput className="w-5 h-5" />
              </button>
              
              <div 
                className="absolute top-12 right-0 w-48 bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden z-50 text-sm font-medium"
              >
                <div className="px-3 py-2 border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wider">Move to...</div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                  <button 
                    onClick={() => handleMove(null)}
                    className="w-full text-left px-4 py-2 text-white hover:bg-blue-600 transition-colors"
                  >
                    Root Directory
                  </button>
                  {folders.map(f => (
                    <button 
                      key={f.id}
                      onClick={() => handleMove(f.id)}
                      className="w-full text-left px-4 py-2 text-white hover:bg-blue-600 transition-colors truncate"
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsMoving(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white"
              title="Move File"
            >
              <FolderInput className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setIsRenaming(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white"
            title="Rename"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => onToggleStar(file.id)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-amber-400"
            title={file.isStarred ? 'Unstar' : 'Star'}
          >
            <Star className={`w-5 h-5 ${file.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              onDelete(file.id);
              onClose();
            }}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400 hover:text-red-300"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {renderPreview()}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
