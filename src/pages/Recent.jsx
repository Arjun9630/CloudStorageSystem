import { useState } from 'react';
import { useStorage } from '../contexts/StorageContext';
import { FileGrid } from '../components/FileGrid';
import { FilePreview } from '../components/FilePreview';
import { Clock } from 'lucide-react';

export function Recent() {
    const { files, deleteFile, toggleStar, renameFile, isLoading } = useStorage();
    const [selectedFile, setSelectedFile] = useState(null);
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

            {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="animate-pulse bg-white/5 border border-white/10 rounded-xl h-44"></div>
                    ))}
                </div>
            ) : recentFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <Clock className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Recent Files</h3>
                    <p className="text-gray-400 max-w-sm">
                        Files you upload or view will appear here.
                    </p>
                </div>
            ) : (
                <FileGrid files={recentFiles} onFileClick={setSelectedFile} onDelete={deleteFile} onToggleStar={toggleStar} />
            )}

            {selectedFile && (<FilePreview file={selectedFile} onClose={() => setSelectedFile(null)} onDelete={deleteFile} onToggleStar={toggleStar} onRename={renameFile} />)}
        </div>
    );
}
