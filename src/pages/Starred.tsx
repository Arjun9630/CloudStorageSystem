import { useState } from 'react';
import { useStorage } from '../contexts/StorageContext';
import { FileGrid } from '../components/FileGrid';
import { FilePreview } from '../components/FilePreview';
import { CloudFile } from '../contexts/StorageContext';

export function Starred() {
  const { files, deleteFile, toggleStar, renameFile } = useStorage();
  const [selectedFile, setSelectedFile] = useState<CloudFile | null>(null);

  const starredFiles = files.filter(f => !f.isTrashed && f.isStarred);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white drop-shadow-md">Starred Files</h1>
        <p className="text-gray-300 mt-1 drop-shadow-sm">{starredFiles.length} starred files</p>
      </div>

      <FileGrid
        files={starredFiles}
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
