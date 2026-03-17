const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/** Helper to get Auth Header */
function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('cloudStorage_token') || sessionStorage.getItem('cloudStorage_token');
  if (!token) return {};
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
      if(response.status === 401) throw new Error('Unauthorized');
      throw new Error(`Failed to list files: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API listFiles Error:', error);
    throw error;
  }
}

/**
 * Uploads a file to the backend safely.
 */
export async function uploadFile(file: File, folderId?: string) {
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
        const errData = await response.json().catch(()=>({}));
        throw new Error(errData.detail || `Upload failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API uploadFile Error:', error);
    throw error;
  }
}

/**
 * Deletes a file permanently securely.
 */
export async function deleteFile(id: string) {
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
  } catch (error) {
    console.error('API deleteFile Error:', error);
    throw error;
  }
}

/**
 * Toggle a file's starred state.
 */
export async function toggleStarredAPI(id: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(id)}/star`, {
      method: 'PUT',
      headers: { ...getAuthHeader() }
    });
    if (!response.ok) throw new Error(`Star toggle failed`);
    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Toggle a file's trashed state.
 */
export async function toggleTrashedAPI(id: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(id)}/trash`, {
      method: 'PUT',
      headers: { ...getAuthHeader() }
    });
    if (!response.ok) throw new Error(`Trash toggle failed`);
    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Move a file to a new folder (or root).
 */
export async function moveFileAPI(id: string, folderId: string | null) {
  try {
    const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(id)}/move`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: folderId })
    });
    if (!response.ok) throw new Error(`Move file failed`);
    return await response.json();
  } catch (error) {
    throw error;
  }
}

// ---- Folders Methods ----

export async function listFolders() {
  const response = await fetch(`${API_BASE_URL}/folders`, {
    headers: { ...getAuthHeader() }
  });
  if (!response.ok) {
    if(response.status === 401) throw new Error('Unauthorized');
    throw new Error(`Failed to list folders`);
  }
  return await response.json();
}

export async function createFolderAPI(name: string, parentId?: string) {
  const response = await fetch(`${API_BASE_URL}/folders`, {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parent_id: parentId })
  });
  if (!response.ok) throw new Error('Failed to create folder');
  return await response.json();
}

export async function deleteFolderAPI(id: string) {
  const response = await fetch(`${API_BASE_URL}/folders/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() }
  });
  if (!response.ok) throw new Error('Failed to delete folder');
  return await response.json();
}

// ---- Auth Methods ----

export async function loginAPI(email: string, password: string) {
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

export async function signupAPI(name: string, email: string, password: string) {
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
  if (!response.ok) throw new Error('Failed to fetch users');
  return await response.json();
}

export async function adminDeleteUserAPI(userId: string) {
  const response = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() }
  });
  if (!response.ok) throw new Error('Failed to delete user');
  return await response.json();
}
