import { useRef, useState } from 'react';
import { Upload, X, CloudUpload } from 'lucide-react';
import { useStorage } from '../contexts/StorageContext';
import { motion, AnimatePresence } from 'motion/react';

export function FileUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFiles, isUploading, uploadProgress, currentFolderId } = useStorage();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    uploadFiles(files, currentFolderId || undefined);
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => fileInputRef.current?.click()}
        className="relative overflow-hidden group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all border border-blue-500/20"
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
        <Upload className="w-5 h-5 relative z-10" />
        <span className="hidden sm:inline relative z-10">Upload Files</span>
      </motion.button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files);
          }
        }}
        className="hidden"
      />

      <AnimatePresence>
        {(isDragging || isUploading) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-black/80 backdrop-blur-2xl border border-white/20 rounded-3xl p-10 max-w-lg w-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden text-center"
            >
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <div className="relative w-24 h-24 mb-6">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, ease: "linear", repeat: Infinity }}
                      className="absolute inset-0 rounded-full border-[4px] border-blue-100 border-t-blue-600"
                    />
                    <CloudUpload className="absolute inset-0 m-auto w-10 h-10 text-blue-600" />
                  </div>
                  <motion.h3 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-4"
                  >
                    Uploading...
                  </motion.h3>
                  
                  {/* Progress Bar Container */}
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ ease: "easeInOut" }}
                    />
                  </div>
                  <div className="flex justify-between w-full text-sm font-semibold text-gray-500">
                    <span>{uploadProgress}%</span>
                    <span>{uploadProgress === 100 ? 'Complete' : 'Processing...'}</span>
                  </div>
                </div>
              ) : (
                <div className={`transition-all duration-300 rounded-2xl border-2 border-dashed p-10 flex flex-col items-center ${
                  isDragging ? 'border-blue-400 bg-blue-500/20' : 'border-white/20 hover:border-blue-400'
                }`}>
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-20 h-20 bg-black/40 text-blue-400 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/10"
                  >
                    <Upload className="w-10 h-10" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-sm">Drop files here</h3>
                  <p className="text-gray-400 text-sm max-w-[200px] mx-auto">
                    Release to upload securely to your cloud storage
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
