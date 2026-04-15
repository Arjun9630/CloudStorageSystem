import React, { createContext, useContext, useState, useEffect } from 'react';
import { uploadFile as apiUploadFile, listFiles as apiListFiles, deleteFile as apiDeleteFile, toggleStarredAPI, toggleTrashedAPI, listFolders as apiListFolders, createFolderAPI, deleteFolderAPI, moveFileAPI, renameFileAPI, renameFolderAPI, togglePinnedAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
const StorageContext = createContext(undefined);
/* eslint-disable react-refresh/only-export-components */
export function StorageProvider({ children }) {
    const [files, setFiles] = useState([]);
    const [folders, setFolders] = useState([]);
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const toast = useToast();

    useEffect(() => {
        if (!user) {
            setFiles([]);
            setFolders([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        // Attempt to sync from FastAPI Backend
        Promise.all([apiListFiles(), apiListFolders()])
            .then(([serverFiles, serverFolders]) => {
            // serverFiles will have uploadedAt as string; map it properly
            const mappedFiles = serverFiles.map((f) => ({
                ...f,
                uploadedAt: new Date(f.uploadedAt),
            }));
            setFiles(mappedFiles);
            const mappedFolders = serverFolders.map(f => ({
                ...f,
                isPinned: !!f.isPinned
            }));
            setFolders(mappedFolders);
            setIsLoading(false);
        })
            .catch((err) => {
            console.error('Failed to load from backend, falling back to local storage:', err);
            // Fallback for development if backend isn't running
            const storedFiles = localStorage.getItem('cloudStorage_files');
            if (storedFiles) {
                const parsedFiles = JSON.parse(storedFiles);
                setFiles(parsedFiles.map((f) => ({
                    ...f,
                    uploadedAt: new Date(f.uploadedAt),
                })));
            }
            const storedFolders = localStorage.getItem('cloudStorage_folders');
            if (storedFolders)
                setFolders(JSON.parse(storedFolders));
            
            setIsLoading(false);
        });
    }, [user]);
    useEffect(() => {
        if (user) {
            localStorage.setItem('cloudStorage_folders', JSON.stringify(folders));
        }
    }, [folders, user]);
    useEffect(() => {
        if (user) {
            localStorage.setItem('cloudStorage_files', JSON.stringify(files));
        }
    }, [files, user]);
    const uploadFiles = async (fileList, targetFolderId) => {
        setIsUploading(true);
        setUploadProgress(0);
        const total = fileList.length;
        let completed = 0;
        for (const file of Array.from(fileList)) {
            try {
                // Upload immediately to the python backend
                const result = await apiUploadFile(file, targetFolderId);
                const serverFile = {
                    ...result,
                    uploadedAt: new Date(result.uploadedAt)
                };
                // Render it in state
                setFiles(prev => [...prev, serverFile]);
                toast.success(`${file.name} uploaded successfully`, 2000);
            }
            catch (error) {
                console.error(`Failed to upload ${file.name} to Backend:`, error);
                toast.error(error.message || `Failed to upload ${file.name}`);
                // Fallback: Local UI simulation if backend is down
                const previewUrl = URL.createObjectURL(file);
                const isImage = file.type.startsWith('image/');
                const newFile = {
                    id: `${Date.now()}-${file.name}`,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    uploadedAt: new Date(),
                    url: previewUrl,
                    thumbnail: isImage ? previewUrl : undefined,
                    folderId: targetFolderId,
                    isStarred: false,
                    isTrashed: false,
                };
                setFiles(prev => [...prev, newFile]);
            }
            completed++;
            setUploadProgress(Math.round((completed / total) * 100));
        }
        // Hold 100% briefly before dismissing
        setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(0);
        }, 800);
    };
    const createFolder = async (name, parentId) => {
        try {
            const newFolder = await createFolderAPI(name, parentId);
            setFolders(prev => [...prev, newFolder]);
            toast.success("Folder created");
        }
        catch (error) {
            console.error('Failed to create folder:', error);
            toast.error(error.message || 'Failed to create folder');
        }
    };
    const deleteFolder = async (id) => {
        try {
            await deleteFolderAPI(id);
            setFolders(prev => prev.filter(f => f.id !== id));
            // Files physically linked to this folder on backend are updated to NULL. 
            // Reflect this locally:
            setFiles(prev => prev.map(f => f.folderId === id ? { ...f, folderId: undefined } : f));
            if (currentFolderId === id)
                setCurrentFolderId(null);
            toast.success("Folder deleted");
        }
        catch (error) {
            console.error('Failed to delete folder:', error);
            toast.error(error.message || 'Failed to delete folder');
        }
    };
    const renameFolder = async (id, newName) => {
        try {
            await renameFolderAPI(id, newName);
            setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
            toast.success("Folder renamed");
        }
        catch (error) {
            console.error('Failed to rename folder:', error);
            toast.error(error.message || 'Failed to rename folder');
        }
    };
    const deleteFile = async (id) => {
        // Soft Delete (Trash) via Backend toggle API
        try {
            await toggleTrashedAPI(id);
            setFiles(prev => prev.map(f => f.id === id ? { ...f, isTrashed: true } : f));
            toast.success("File moved to trash");
        }
        catch (error) {
            console.error('Failed to trash file:', error);
            toast.error(error.message || 'Failed to move file to trash');
        }
    };
    const moveFile = async (id, folderId) => {
        try {
            await moveFileAPI(id, folderId);
            setFiles(prev => prev.map(f => f.id === id ? { ...f, folderId: folderId || undefined } : f));
            toast.success("File moved");
        }
        catch (error) {
            console.error('Failed to move file:', error);
            toast.error(error.message || 'Failed to move file');
        }
    };
    const permanentlyDeleteFile = async (id) => {
        // Permanent Delete via Backend physical deletion footprint API
        try {
            await apiDeleteFile(id);
            setFiles(prev => prev.filter(f => f.id !== id));
            toast.success("File deleted permanently");
        }
        catch (error) {
            console.error('Failed to permanently delete file:', error);
            toast.error(error.message || 'Failed to delete file');
        }
    };
    const restoreFile = async (id) => {
        // Restore from Trash via Backend API
        try {
            await toggleTrashedAPI(id);
            setFiles(prev => prev.map(f => f.id === id ? { ...f, isTrashed: false } : f));
            toast.success("File restored");
        }
        catch (error) {
            console.error('Failed to restore file:', error);
            toast.error(error.message || 'Failed to restore file');
        }
    };
    const toggleStar = async (id) => {
        try {
            await toggleStarredAPI(id);
            setFiles(prev => prev.map(f => f.id === id ? { ...f, isStarred: !f.isStarred } : f));
        }
        catch (error) {
            console.error('Failed to star file:', error);
            toast.error(error.message || 'Failed to update file');
        }
    };
    const renameFile = async (id, newName) => {
        try {
            await renameFileAPI(id, newName);
            setFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
            toast.success("File renamed");
        }
        catch (error) {
            console.error('Failed to rename file:', error);
            toast.error(error.message || 'Failed to rename file');
        }
    };
    const togglePinFolder = async (id) => {
        try {
            const folder = folders.find(f => f.id === id);
            if (!folder) return;

            // Check limit if pinning
            if (!folder.isPinned) {
                const pinnedCount = folders.filter(f => f.isPinned).length;
                if (pinnedCount >= 6) {
                    toast.error("Maximum 6 folders can be pinned");
                    return;
                }
            }

            const result = await togglePinnedAPI(id);
            setFolders(prev => prev.map(f => f.id === id ? { ...f, isPinned: result.isPinned } : f));
            toast.success(result.isPinned ? "Folder pinned" : "Folder unpinned");
        }
        catch (error) {
            console.error('Failed to toggle pin:', error);
            toast.error(error.message || 'Failed to pin folder');
        }
    };
    const totalStorage = 256 * 1024 * 1024; // 256 MB Server Size Match
    const usedStorage = files.filter(f => !f.isTrashed).reduce((acc, f) => acc + f.size, 0);
    const storageByType = files
        .filter(f => !f.isTrashed)
        .reduce((acc, file) => {
        const category = getFileCategory(file.type);
        const existing = acc.find(item => item.type === category);
        if (existing) {
            existing.size += file.size;
            existing.count += 1;
        }
        else {
            acc.push({ type: category, size: file.size, count: 1 });
        }
        return acc;
    }, []);
    return (<StorageContext.Provider value={{
            files,
            folders,
            uploadFiles,
            createFolder,
            deleteFolder,
            currentFolderId,
            setCurrentFolderId,
            deleteFile,
            moveFile,
            restoreFile,
            permanentlyDeleteFile,
            toggleStar,
            renameFile,
            renameFolder,
            togglePinFolder,
            totalStorage,
            usedStorage,
            storageByType,
            isUploading,
            uploadProgress,
            isLoading,
        }}>
      {children}
    </StorageContext.Provider>);
}
export function useStorage() {
    const context = useContext(StorageContext);
    if (context === undefined) {
        throw new Error('useStorage must be used within a StorageProvider');
    }
    return context;
}
function getFileCategory(mimeType) {
    if (!mimeType)
        return 'Other';
    const type = mimeType.toLowerCase();
    if (type.startsWith('image/'))
        return 'Images';
    if (type.startsWith('video/'))
        return 'Videos';
    if (type.startsWith('audio/'))
        return 'Audio';
    if (type.includes('pdf'))
        return 'PDFs';
    if (type.includes('word') || type.includes('document'))
        return 'Documents';
    if (type.includes('sheet') || type.includes('excel') || type.includes('csv'))
        return 'Spreadsheets';
    if (type.includes('presentation') || type.includes('powerpoint'))
        return 'Presentations';
    if (type.includes('zip') || type.includes('rar') || type.includes('compressed') || type.includes('tar') || type.includes('gz'))
        return 'Archives';
    if (type.includes('text') || type.includes('json') || type.includes('xml') || type.includes('html') || type.includes('css') || type.includes('javascript') || type.includes('python'))
        return 'Code & Text';
    if (type.includes('font'))
        return 'Fonts';
    if (type.includes('model'))
        return '3D Models';
    return 'Other';
}
