import React, { createContext, useContext, useState, useEffect } from 'react';
import { uploadFile as apiUploadFile, listFiles as apiListFiles, deleteFile as apiDeleteFile, toggleStarredAPI, toggleTrashedAPI, listFolders as apiListFolders, createFolderAPI, deleteFolderAPI, moveFileAPI, renameFileAPI, renameFolderAPI } from '../services/api';
import { useAuth } from './AuthContext';
const StorageContext = createContext(undefined);
/* eslint-disable react-refresh/only-export-components */
export function StorageProvider({ children }) {
    const [files, setFiles] = useState([]);
    const [folders, setFolders] = useState([]);
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const { user } = useAuth();
    useEffect(() => {
        if (!user) {
            setFiles([]);
            setFolders([]);
            return;
        }
        // Attempt to sync from FastAPI Backend
        Promise.all([apiListFiles(), apiListFolders()])
            .then(([serverFiles, serverFolders]) => {
            // serverFiles will have uploadedAt as string; map it properly
            const mappedFiles = serverFiles.map((f) => ({
                ...f,
                uploadedAt: new Date(f.uploadedAt),
            }));
            setFiles(mappedFiles);
            setFolders(serverFolders);
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
            }
            catch (error) {
                console.error(`Failed to upload ${file.name} to Backend:`, error);
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
        }
        catch (error) {
            console.error('Failed to create folder:', error);
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
        }
        catch (error) {
            console.error('Failed to delete folder:', error);
        }
    };
    const renameFolder = async (id, newName) => {
        try {
            await renameFolderAPI(id, newName);
            setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
        }
        catch (error) {
            console.error('Failed to rename folder:', error);
        }
    };
    const deleteFile = async (id) => {
        // Soft Delete (Trash) via Backend toggle API
        try {
            await toggleTrashedAPI(id);
            setFiles(prev => prev.map(f => f.id === id ? { ...f, isTrashed: true } : f));
        }
        catch (error) {
            console.error('Failed to trash file:', error);
        }
    };
    const moveFile = async (id, folderId) => {
        try {
            await moveFileAPI(id, folderId);
            setFiles(prev => prev.map(f => f.id === id ? { ...f, folderId: folderId || undefined } : f));
        }
        catch (error) {
            console.error('Failed to move file:', error);
        }
    };
    const permanentlyDeleteFile = async (id) => {
        // Permanent Delete via Backend physical deletion footprint API
        try {
            await apiDeleteFile(id);
            setFiles(prev => prev.filter(f => f.id !== id));
        }
        catch (error) {
            console.error('Failed to permanently delete file:', error);
        }
    };
    const restoreFile = async (id) => {
        // Restore from Trash via Backend API
        try {
            await toggleTrashedAPI(id);
            setFiles(prev => prev.map(f => f.id === id ? { ...f, isTrashed: false } : f));
        }
        catch (error) {
            console.error('Failed to restore file:', error);
        }
    };
    const toggleStar = async (id) => {
        try {
            await toggleStarredAPI(id);
            setFiles(prev => prev.map(f => f.id === id ? { ...f, isStarred: !f.isStarred } : f));
        }
        catch (error) {
            console.error('Failed to star file:', error);
        }
    };
    const renameFile = async (id, newName) => {
        try {
            await renameFileAPI(id, newName);
            setFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
        }
        catch (error) {
            console.error('Failed to rename file:', error);
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
            totalStorage,
            usedStorage,
            storageByType,
            isUploading,
            uploadProgress,
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
