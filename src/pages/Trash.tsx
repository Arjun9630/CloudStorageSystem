import { useState } from 'react';
import { useStorage } from '../contexts/StorageContext';
import { CloudFile } from '../contexts/StorageContext';
import { RotateCcw, Trash2 } from 'lucide-react';

export function Trash() {
  const { files, restoreFile, permanentlyDeleteFile } = useStorage();
  const trashedFiles = files.filter(f => f.isTrashed);

  const handleRestore = (id: string) => {
    restoreFile(id);
  };

  const handleEmptyTrash = async () => {
    if (window.confirm('Are you sure you want to permanently delete all items in the trash? This action cannot be undone.')) {
      for (const file of trashedFiles) {
        await permanentlyDeleteFile(file.id);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white drop-shadow-md">Trash</h1>
          <p className="text-gray-300 mt-1 drop-shadow-sm">{trashedFiles.length} files in trash</p>
        </div>
        {trashedFiles.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-300 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-all border border-red-400/30 shadow-[0_4px_12px_rgba(239,68,68,0.2)]"
          >
            <Trash2 className="w-4 h-4" />
            Empty Trash
          </button>
        )}
      </div>

      {trashedFiles.length > 0 ? (
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-black/20 border-b border-white/10 backdrop-blur-md">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Size</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Deleted</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {trashedFiles.map((file) => (
                <tr key={file.id} className="hover:bg-white/10 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {file.thumbnail ? (
                        <img src={file.thumbnail} alt="" className="w-10 h-10 object-cover rounded shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-white/10" />
                      ) : (
                        <div className="w-10 h-10 bg-black/20 rounded shadow-inner flex items-center justify-center border border-white/10">
                          <Trash2 className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-200 truncate group-hover:text-white transition-colors">{file.name}</p>
                        <p className="text-sm text-gray-400 md:hidden">{formatBytes(file.size)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400 hidden md:table-cell">{formatBytes(file.size)}</td>
                  <td className="px-6 py-4 text-gray-400 hidden lg:table-cell">
                    {new Date(file.uploadedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleRestore(file.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all border border-blue-400/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span className="hidden sm:inline">Restore</span>
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this file permanently?')) {
                            permanentlyDeleteFile(file.id);
                          }
                        }}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-transparent hover:border-red-400/30"
                        title="Delete Forever"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 p-12 shadow-inner">
          <div className="text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Trash2 className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white drop-shadow-sm mb-2">Trash is Empty</h3>
            <p className="text-gray-400">Deleted files will appear here</p>
          </div>
        </div>
      )}
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
