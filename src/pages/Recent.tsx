import { useState } from 'react';
import { useStorage } from '../contexts/StorageContext';
import { FileGrid } from '../components/FileGrid';
import { FilePreview } from '../components/FilePreview';
import { CloudFile } from '../contexts/StorageContext';

export function Recent() {
  const { files, deleteFile, toggleStar, renameFile } = useStorage();
  const [selectedFile, setSelectedFile] = useState<CloudFile | null>(null);

  const recentFiles = files
    .filter(f => !f.isTrashed)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white drop-shadow-md">Recent Files</h1>
        <p className="text-gray-300 mt-1 drop-shadow-sm">Files you've recently uploaded or accessed</p>
      </div>

      <FileGrid
        files={recentFiles}
        onFileClick={setSelectedFile}
        onDelete={deleteFile}
        onToggleStar={toggleStar}
      />

      {selectedFile && (
        <FilePreview
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onDelete={deleteFile}
          onToggleStar={toggleStar}
          onRename={renameFile}
        />
      )}
    </div>
  );
}
