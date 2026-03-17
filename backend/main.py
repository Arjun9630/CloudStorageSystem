from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import aws
import auth
import database
import os
import time
import uuid

app = FastAPI(title="CloudStorage API")

# Ensure database tables exist before taking requests
database.init_db()

# Add CORS middleware for local frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50MB
MAX_STORAGE_QUOTA_BYTES = 256 * 1024 * 1024  # 256MB

# --- Models ---
class UserLogin(BaseModel):
    email: str
    password: str

class UserSignup(BaseModel):
    name: str
    email: str
    password: str

# --- Dependencies ---
def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Extracts and verifies JWT token from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    token = authorization.split(" ")[1]
    payload = auth.decode_access_token(token)
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    conn = database.get_db_connection()
    user = conn.execute("SELECT id, name, email, total_storage_used FROM users WHERE id = ?", (payload["sub"],)).fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    return dict(user)

# --- Auth Routes ---
@app.post("/api/auth/signup")
def signup(data: UserSignup):
    conn = database.get_db_connection()
    existing_user = conn.execute("SELECT id FROM users WHERE email = ?", (data.email,)).fetchone()
    if existing_user:
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user_id = str(uuid.uuid4())
    hashed_password = auth.get_password_hash(data.password)
    
    # Generate token FIRST so if it crashes due to lib error, we haven't dirtied the DB
    try:
        token = auth.create_access_token({"sub": user_id, "email": data.email})
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Token Generation Failed: {str(e)}")
    
    # Commit the user to SQLite only after Token generation is successful
    conn.execute(
        "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
        (user_id, data.name, data.email, hashed_password)
    )
    conn.commit()
    conn.close()
    
    return {"token": token, "user": {"id": user_id, "name": data.name, "email": data.email}}

@app.post("/api/auth/login")
def login(data: UserLogin):
    conn = database.get_db_connection()
    user = conn.execute("SELECT id, name, email, password_hash FROM users WHERE email = ?", (data.email,)).fetchone()
    conn.close()
    
    if not user or not auth.verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    token = auth.create_access_token({"sub": user["id"], "email": user["email"]})
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"]}}

# --- File Routes ---
@app.get("/api/files")
async def list_files(prefix: str = "", current_user: dict = Depends(get_current_user)):
    """List objects from DB associated with current user, linked to S3 presigned URLs."""
    try:
        conn = database.get_db_connection()
        # Ensure we only fetch files for this specific user
        files_query = conn.execute("""
            SELECT id, name, type, size, s3_key, is_starred, is_trashed, uploaded_at, folder_id 
            FROM files WHERE user_id = ?
        """, (current_user["id"],)).fetchall()
        conn.close()
        
        formatted_files = []
        for row in files_query:
            formatted_files.append({
                "id": row["id"],
                "name": row["name"],
                "type": row["type"],
                "size": row["size"],
                "uploadedAt": row["uploaded_at"],
                "url": aws.get_presigned_url(row["s3_key"]),
                "folderId": row["folder_id"] if "folder_id" in row.keys() else None,
                "isStarred": bool(row["is_starred"]),
                "isTrashed": bool(row["is_trashed"])
            })
        return formatted_files
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/files/upload")
async def upload_file(
    file: UploadFile = File(...), 
    folder_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Upload a file to S3 in the user's isolated prefix + Save in DB."""
    try:
        # Read file contents and enforce size limit
        contents = await file.read()
        file_size = len(contents)
        
        if file_size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=400, detail="File exceeds 50MB limit.")
            
        # Check quota
        conn = database.get_db_connection()
        user_storage = conn.execute("SELECT total_storage_used FROM users WHERE id = ?", (current_user["id"],)).fetchone()
        
        if user_storage and user_storage["total_storage_used"] + file_size > MAX_STORAGE_QUOTA_BYTES:
            conn.close()
            raise HTTPException(status_code=400, detail="Storage quota (1GB) exceeded.")
            
        # Generate keys
        file_id = str(uuid.uuid4())
        s3_key_suffix = f"{int(time.time())}-{file_id[:8]}-{file.filename}"
        
        # Upload to S3 natively via aws module
        s3_full_key = aws.upload_s3_file(current_user["id"], contents, s3_key_suffix, file.content_type)
        
        # Save to mapping DB
        uploaded_time = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        conn.execute("""
            INSERT INTO files (id, user_id, name, type, size, s3_key, uploaded_at, folder_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (file_id, current_user["id"], file.filename, file.content_type, file_size, s3_full_key, uploaded_time, folder_id))
        
        # Update user storage quota count
        conn.execute("UPDATE users SET total_storage_used = total_storage_used + ? WHERE id = ?", (file_size, current_user["id"]))
        conn.commit()
        conn.close()
        
        return {
            "id": file_id,
            "name": file.filename,
            "type": file.content_type,
            "size": file_size,
            "uploadedAt": uploaded_time,
            "url": aws.get_presigned_url(s3_full_key),
            "folderId": folder_id,
            "isStarred": False,
            "isTrashed": False,
            "message": "File uploaded successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/files/{file_id}")
async def delete_file(file_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a file from DB and S3."""
    try:
        conn = database.get_db_connection()
        file_row = conn.execute("SELECT id, s3_key, size FROM files WHERE id = ? AND user_id = ?", (file_id, current_user["id"])).fetchone()
        
        if not file_row:
            conn.close()
            raise HTTPException(status_code=404, detail="File not found")
            
        # Delete from S3
        aws.delete_s3_file(file_row["s3_key"])
        
        # Delete from DB and update quota
        conn.execute("DELETE FROM files WHERE id = ?", (file_id,))
        conn.execute("UPDATE users SET total_storage_used = max(0, total_storage_used - ?) WHERE id = ?", (file_row["size"], current_user["id"]))
        conn.commit()
        conn.close()
        
        return {"status": "success", "message": f"Deleted file {file_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/files/{file_id}/star")
async def toggle_star(file_id: str, current_user: dict = Depends(get_current_user)):
    """Toggle the starred state of a file in the DB."""
    try:
        conn = database.get_db_connection()
        file_row = conn.execute("SELECT is_starred FROM files WHERE id = ? AND user_id = ?", (file_id, current_user["id"])).fetchone()
        
        if not file_row:
            conn.close()
            raise HTTPException(status_code=404, detail="File not found")
            
        new_val = 0 if file_row["is_starred"] else 1
        conn.execute("UPDATE files SET is_starred = ? WHERE id = ?", (new_val, file_id))
        conn.commit()
        conn.close()
        
        return {"status": "success", "isStarred": bool(new_val)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/files/{file_id}/trash")
async def toggle_trash(file_id: str, current_user: dict = Depends(get_current_user)):
    """Toggle the trashed state of a file (soft delete) in the DB."""
    try:
        conn = database.get_db_connection()
        file_row = conn.execute("SELECT is_trashed FROM files WHERE id = ? AND user_id = ?", (file_id, current_user["id"])).fetchone()
        
        if not file_row:
            conn.close()
            raise HTTPException(status_code=404, detail="File not found")
            
        new_val = 0 if file_row["is_trashed"] else 1
        conn.execute("UPDATE files SET is_trashed = ? WHERE id = ?", (new_val, file_id))
        conn.commit()
        conn.close()
        
        return {"status": "success", "isTrashed": bool(new_val)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class FileMove(BaseModel):
    folder_id: Optional[str] = None

@app.put("/api/files/{file_id}/move")
async def move_file(file_id: str, data: FileMove, current_user: dict = Depends(get_current_user)):
    """Move a file to a different folder (or root if folder_id is None)."""
    try:
        conn = database.get_db_connection()
        # Verify ownership of file
        file_row = conn.execute("SELECT id FROM files WHERE id = ? AND user_id = ?", (file_id, current_user["id"])).fetchone()
        
        if not file_row:
            conn.close()
            raise HTTPException(status_code=404, detail="File not found")
            
        # Verify ownership of target folder if it's not None
        if data.folder_id:
            folder_row = conn.execute("SELECT id FROM folders WHERE id = ? AND user_id = ?", (data.folder_id, current_user["id"])).fetchone()
            if not folder_row:
                conn.close()
                raise HTTPException(status_code=404, detail="Target folder not found")
                
        # Execute move
        conn.execute("UPDATE files SET folder_id = ? WHERE id = ?", (data.folder_id, file_id))
        conn.commit()
        conn.close()
        
        return {"status": "success", "message": "File moved successfully", "folderId": data.folder_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Folder Routes ---
class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[str] = None

@app.get("/api/folders")
async def list_folders(current_user: dict = Depends(get_current_user)):
    """List all folders for the current user."""
    try:
        conn = database.get_db_connection()
        folders_query = conn.execute("SELECT id, name, parent_id, created_at FROM folders WHERE user_id = ?", (current_user["id"],)).fetchall()
        conn.close()
        
        return [{"id": row["id"], "name": row["name"], "parentId": row["parent_id"] if "parent_id" in row.keys() else None, "createdAt": row["created_at"]} for row in folders_query]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/folders")
async def create_folder(data: FolderCreate, current_user: dict = Depends(get_current_user)):
    """Create a new folder for the current user."""
    try:
        folder_id = str(uuid.uuid4())
        created_time = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        
        conn = database.get_db_connection()
        conn.execute(
            "INSERT INTO folders (id, user_id, name, parent_id, created_at) VALUES (?, ?, ?, ?, ?)",
            (folder_id, current_user["id"], data.name, data.parent_id, created_time)
        )
        conn.commit()
        conn.close()
        
        return {"id": folder_id, "name": data.name, "parentId": data.parent_id, "createdAt": created_time}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/folders/{folder_id}")
async def delete_folder(folder_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a folder and optionally handle files within it."""
    try:
        conn = database.get_db_connection()
        
        # Verify folder ownership
        folder = conn.execute("SELECT id FROM folders WHERE id = ? AND user_id = ?", (folder_id, current_user["id"])).fetchone()
        if not folder:
            conn.close()
            raise HTTPException(status_code=404, detail="Folder not found")
            
        # Optional UX pattern: We simply set the file folder_id to NULL to push them back to root, instead of deleting physical files.
        conn.execute("UPDATE files SET folder_id = NULL WHERE folder_id = ? AND user_id = ?", (folder_id, current_user["id"]))
        # Recursively bump nested folders back to root
        conn.execute("UPDATE folders SET parent_id = NULL WHERE parent_id = ? AND user_id = ?", (folder_id, current_user["id"]))
        
        # Delete folder
        conn.execute("DELETE FROM folders WHERE id = ?", (folder_id,))
        conn.commit()
        conn.close()
        
        return {"status": "success", "message": "Folder deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

