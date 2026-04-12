const API_BASE_URL = import.meta.env.DEV
    ? (import.meta.env.VITE_API_URL || 'http://localhost:8000/api')
    : '/api';
/** Helper to get Auth Header */
function getAuthHeader() {
    const token = localStorage.getItem('cloudStorage_token') || sessionStorage.getItem('cloudStorage_token');
    if (!token)
        return {};
    return { 'Authorization': `Bearer ${token}` };
}
/**
 * Lists all files from the backend securely.
 */
export async function listFiles(prefix = '') {
    try {
        const response = await fetch(`${API_BASE_URL}/files?prefix=${encodeURIComponent(prefix)}`, {
            method: 'GET',
            headers: {
                ...getAuthHeader()
            }
        });
        if (!response.ok) {
            if (response.status === 401)
                throw new Error('Unauthorized');
            throw new Error(`Failed to list files: ${response.statusText}`);
        }
        return await response.json();
    }
    catch (error) {
        console.error('API listFiles Error:', error);
        throw error;
    }
}
/**
 * Uploads a file to the backend safely.
 */
export async function uploadFile(file, folderId) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        if (folderId) {
            formData.append('folder_id', folderId);
        }
        const response = await fetch(`${API_BASE_URL}/files/upload`, {
            method: 'POST',
            headers: {
                ...getAuthHeader()
                // DO NOT set Content-Type header manually here when using FormData, fetch does it automatically with bounds
            },
            body: formData,
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `Upload failed: ${response.status}`);
        }
        return await response.json();
    }
    catch (error) {
        console.error('API uploadFile Error:', error);
        throw error;
    }
}
/**
 * Deletes a file permanently securely.
 */
export async function deleteFile(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: {
                ...getAuthHeader()
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to delete file: ${response.statusText}`);
        }
        return await response.json();
    }
    catch (error) {
        console.error('API deleteFile Error:', error);
        throw error;
    }
}
/**
 * Toggle a file's starred state.
 */
export async function toggleStarredAPI(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(id)}/star`, {
            method: 'PUT',
            headers: { ...getAuthHeader() }
        });
        if (!response.ok)
            throw new Error(`Star toggle failed`);
        return await response.json();
    }
    catch (error) {
        throw error;
    }
}
/**
 * Toggle a file's trashed state.
 */
export async function toggleTrashedAPI(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(id)}/trash`, {
            method: 'PUT',
            headers: { ...getAuthHeader() }
        });
        if (!response.ok)
            throw new Error(`Trash toggle failed`);
        return await response.json();
    }
    catch (error) {
        throw error;
    }
}
/**
 * Move a file to a new folder (or root).
 */
export async function moveFileAPI(id, folderId) {
    try {
        const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(id)}/move`, {
            method: 'PUT',
            headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder_id: folderId })
        });
        if (!response.ok)
            throw new Error(`Move file failed`);
        return await response.json();
    }
    catch (error) {
        throw error;
    }
}
/**
 * Rename a file.
 */
export async function renameFileAPI(id, newName) {
    try {
        const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(id)}/rename`, {
            method: 'PUT',
            headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        if (!response.ok)
            throw new Error(`Rename file failed`);
        return await response.json();
    }
    catch (error) {
        throw error;
    }
}
// ---- Folders Methods ----
export async function listFolders() {
    const response = await fetch(`${API_BASE_URL}/folders`, {
        headers: { ...getAuthHeader() }
    });
    if (!response.ok) {
        if (response.status === 401)
            throw new Error('Unauthorized');
        throw new Error(`Failed to list folders`);
    }
    return await response.json();
}
export async function createFolderAPI(name, parentId) {
    const response = await fetch(`${API_BASE_URL}/folders`, {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parent_id: parentId })
    });
    if (!response.ok)
        throw new Error('Failed to create folder');
    return await response.json();
}
export async function deleteFolderAPI(id) {
    const response = await fetch(`${API_BASE_URL}/folders/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
    });
    if (!response.ok)
        throw new Error('Failed to delete folder');
    return await response.json();
}
/**
 * Rename a folder.
 */
export async function renameFolderAPI(id, newName) {
    try {
        const response = await fetch(`${API_BASE_URL}/folders/${encodeURIComponent(id)}/rename`, {
            method: 'PUT',
            headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        if (!response.ok)
            throw new Error(`Rename folder failed`);
        return await response.json();
    }
    catch (error) {
        throw error;
    }
}
// ---- Auth Methods ----
export async function loginAPI(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Login failed');
    }
    return await response.json();
}
export async function signupAPI(name, email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Signup failed');
    }
    return await response.json();
}
// ---- Admin Methods ----
export async function adminListUsersAPI() {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: { ...getAuthHeader() }
    });
    if (!response.ok)
        throw new Error('Failed to fetch users');
    return await response.json();
}
export async function adminDeleteUserAPI(userId) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
    });
    if (!response.ok)
        throw new Error('Failed to delete user');
    return await response.json();
}
/**
 * Triggers a global S3-to-DB synchronization for all users.
 * RESTRICTED: Admin only.
 */
export async function adminSyncAPI() {
    const response = await fetch(`${API_BASE_URL}/admin/sync`, {
        method: 'POST',
        headers: { ...getAuthHeader() }
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Global sync failed');
    }
    return await response.json();
}
