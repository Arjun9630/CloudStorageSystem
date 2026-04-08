from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import aws
import auth
import database
import os
import time
import uuid
import psycopg2.extras

app = FastAPI(title="CloudStorage API")

# Ensure database tables exist before taking requests
if database.DATABASE_URL:
    database.init_db()

# Add CORS middleware
allowed_origins = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
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
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("SELECT id, name, email, total_storage_used, is_admin FROM users WHERE id = %s", (payload["sub"],))
    user = cur.fetchone()
    cur.close()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    return dict(user)

# --- Auth Routes ---
@app.post("/api/auth/signup")
def signup(data: UserSignup):
    conn = database.get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("SELECT id FROM users WHERE email = %s", (data.email,))
    existing_user = cur.fetchone()
    if existing_user:
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user_id = str(uuid.uuid4())
    hashed_password = auth.get_password_hash(data.password)
    
    # Generate token FIRST
    try:
        token = auth.create_access_token({"sub": user_id, "email": data.email})
    except Exception as e:
        cur.close()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Token Generation Failed: {str(e)}")
    
    # Commit the user
    cur.execute(
        "INSERT INTO users (id, name, email, password_hash) VALUES (%s, %s, %s, %s)",
        (user_id, data.name, data.email, hashed_password)
    )
    conn.commit()
    cur.close()
    conn.close()
    
    return {"token": token, "user": {"id": user_id, "name": data.name, "email": data.email, "isAdmin": False}}

@app.post("/api/auth/login")
def login(data: UserLogin):
    conn = database.get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("SELECT id, name, email, password_hash, is_admin FROM users WHERE email = %s", (data.email,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    
    if not user or not auth.verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    token = auth.create_access_token({"sub": user["id"], "email": user["email"]})
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "isAdmin": user["is_admin"]}}

# --- File Routes ---
@app.get("/api/files")
async def list_files(prefix: str = "", current_user: dict = Depends(get_current_user)):
    try:
        conn = database.get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("""
            SELECT id, name, type, size, s3_key, is_starred, is_trashed, uploaded_at, folder_id 
            FROM files WHERE user_id = %s
        """, (current_user["id"],))
        files_query = cur.fetchall()
        cur.close()
        conn.close()
        
        formatted_files = []
        for row in files_query:
            formatted_files.append({
                "id": row["id"],
                "name": row["name"],
                "type": row["type"],
                "size": row["size"],
                "uploadedAt": row["uploaded_at"].isoformat() if hasattr(row["uploaded_at"], "isoformat") else row["uploaded_at"],
                "url": aws.get_presigned_url(row["s3_key"], row["name"]),
                "folderId": row["folder_id"],
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
    try:
        # Use file.size which is available in FastAPI/Starlette for UploadFile
        file_size = file.size 
        
        conn = database.get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT total_storage_used FROM users WHERE id = %s", (current_user["id"],))
        user_storage = cur.fetchone()
        
        if user_storage and user_storage["total_storage_used"] + file_size > MAX_STORAGE_QUOTA_BYTES:
            cur.close()
            conn.close()
            raise HTTPException(status_code=400, detail=f"Storage quota exceeded. Available: {(MAX_STORAGE_QUOTA_BYTES - user_storage['total_storage_used']) / (1024*1024):.2f}MB, Requested: {file_size / (1024*1024):.2f}MB")
            
        file_id = str(uuid.uuid4())
        s3_key_suffix = f"{int(time.time())}-{file_id[:8]}-{file.filename}"
        
        # Pass file.file (the spooled temporary file) directly for streaming
        s3_full_key = aws.upload_s3_file(current_user["id"], file.file, s3_key_suffix, file.content_type)
        
        uploaded_time = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        cur.execute("""
            INSERT INTO files (id, user_id, name, type, size, s3_key, uploaded_at, folder_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (file_id, current_user["id"], file.filename, file.content_type, file_size, s3_full_key, uploaded_time, folder_id))
        
        cur.execute("UPDATE users SET total_storage_used = total_storage_used + %s WHERE id = %s", (file_size, current_user["id"]))
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            "id": file_id,
            "name": file.filename,
            "type": file.content_type,
            "size": file_size,
            "uploadedAt": uploaded_time,
            "url": aws.get_presigned_url(s3_full_key, file.filename),
            "folderId": folder_id,
            "isStarred": False,
            "isTrashed": False
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/files/{file_id}")
async def delete_file(file_id: str, current_user: dict = Depends(get_current_user)):
    try:
        conn = database.get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT id, s3_key, size FROM files WHERE id = %s AND user_id = %s", (file_id, current_user["id"]))
        file_row = cur.fetchone()
        
        if not file_row:
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail="File not found")
            
        aws.delete_s3_file(file_row["s3_key"])
        
        cur.execute("DELETE FROM files WHERE id = %s", (file_id,))
        cur.execute("UPDATE users SET total_storage_used = GREATEST(0, total_storage_used - %s) WHERE id = %s", (file_row["size"], current_user["id"]))
        conn.commit()
        cur.close()
        conn.close()
        
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/files/{file_id}/star")
async def toggle_star(file_id: str, current_user: dict = Depends(get_current_user)):
    try:
        conn = database.get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT is_starred FROM files WHERE id = %s AND user_id = %s", (file_id, current_user["id"]))
        file_row = cur.fetchone()
        
        if not file_row:
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail="File not found")
            
        new_val = not file_row["is_starred"]
        cur.execute("UPDATE files SET is_starred = %s WHERE id = %s", (new_val, file_id))
        conn.commit()
        cur.close()
        conn.close()
        
        return {"status": "success", "isStarred": new_val}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/files/{file_id}/trash")
async def toggle_trash(file_id: str, current_user: dict = Depends(get_current_user)):
    try:
        conn = database.get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT is_trashed FROM files WHERE id = %s AND user_id = %s", (file_id, current_user["id"]))
        file_row = cur.fetchone()
        
        if not file_row:
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail="File not found")
            
        new_val = not file_row["is_trashed"]
        cur.execute("UPDATE files SET is_trashed = %s WHERE id = %s", (new_val, file_id))
        conn.commit()
        cur.close()
        conn.close()
        
        return {"status": "success", "isTrashed": new_val}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class FileMove(BaseModel):
    folder_id: Optional[str] = None

@app.put("/api/files/{file_id}/move")
async def move_file(file_id: str, data: FileMove, current_user: dict = Depends(get_current_user)):
    try:
        conn = database.get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT id FROM files WHERE id = %s AND user_id = %s", (file_id, current_user["id"]))
        if not cur.fetchone():
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail="File not found")
            
        cur.execute("UPDATE files SET folder_id = %s WHERE id = %s", (data.folder_id, file_id))
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class RenameRequest(BaseModel):
    name: str

@app.put("/api/files/{file_id}/rename")
async def rename_file(file_id: str, data: RenameRequest, current_user: dict = Depends(get_current_user)):
    try:
        conn = database.get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE files SET name = %s WHERE id = %s AND user_id = %s", (data.name, file_id, current_user["id"]))
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Folder Routes ---
class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[str] = None

@app.get("/api/folders")
async def list_folders(current_user: dict = Depends(get_current_user)):
    try:
        conn = database.get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT id, name, parent_id, created_at FROM folders WHERE user_id = %s", (current_user["id"],))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [{"id": r["id"], "name": r["name"], "parentId": r["parent_id"], "createdAt": r["created_at"].isoformat() if hasattr(r["created_at"], "isoformat") else r["created_at"]} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/folders")
async def create_folder(data: FolderCreate, current_user: dict = Depends(get_current_user)):
    try:
        folder_id = str(uuid.uuid4())
        created_time = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        conn = database.get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO folders (id, user_id, name, parent_id, created_at) VALUES (%s, %s, %s, %s, %s)",
            (folder_id, current_user["id"], data.name, data.parent_id, created_time)
        )
        conn.commit()
        cur.close()
        conn.close()
        return {"id": folder_id, "name": data.name, "parentId": data.parent_id, "createdAt": created_time}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/folders/{folder_id}")
async def delete_folder(folder_id: str, current_user: dict = Depends(get_current_user)):
    try:
        conn = database.get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE files SET folder_id = NULL WHERE folder_id = %s AND user_id = %s", (folder_id, current_user["id"]))
        cur.execute("UPDATE folders SET parent_id = NULL WHERE parent_id = %s AND user_id = %s", (folder_id, current_user["id"]))
        cur.execute("DELETE FROM folders WHERE id = %s AND user_id = %s", (folder_id, current_user["id"]))
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/folders/{folder_id}/rename")
async def rename_folder(folder_id: str, data: RenameRequest, current_user: dict = Depends(get_current_user)):
    try:
        conn = database.get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE folders SET name = %s WHERE id = %s AND user_id = %s", (data.name, folder_id, current_user["id"]))
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Admin Routes ---
@app.get("/api/admin/users")
async def admin_list_users(current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        conn = database.get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        # Fetch users with their file counts and total storage used
        cur.execute("""
            SELECT u.id, u.name, u.email, u.total_storage_used, u.created_at, u.is_admin,
            (SELECT COUNT(*) FROM files f WHERE f.user_id = u.id) as file_count
            FROM users u
            ORDER BY u.created_at DESC
        """)
        users = cur.fetchall()
        cur.close()
        conn.close()
        
        return [{
            "id": u["id"],
            "name": u["name"],
            "email": u["email"],
            "totalStorageUsed": u["total_storage_used"],
            "fileCount": u["file_count"],
            "isAdmin": u["is_admin"],
            "createdAt": u["created_at"].isoformat() if hasattr(u["created_at"], "isoformat") else u["created_at"]
        } for u in users]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    try:
        conn = database.get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # 1. Get all file S3 keys for cleanup
        cur.execute("SELECT s3_key FROM files WHERE user_id = %s", (user_id,))
        files = cur.fetchall()
        
        # 2. Cleanup S3
        for f in files:
            try:
                aws.delete_s3_file(f["s3_key"])
            except:
                pass # Continue even if one file fail
        
        # 3. Delete from DB (cascade manual cleanup)
        cur.execute("DELETE FROM files WHERE user_id = %s", (user_id,))
        cur.execute("DELETE FROM folders WHERE user_id = %s", (user_id,))
        cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {"status": "success", "message": "User and all associated data deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/sync")
async def admin_global_sync(current_user: dict = Depends(get_current_user)):
    """
    Syncs the database with S3 for ALL users. 
    Removes database records that don't exist in S3.
    """
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        conn = database.get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # 1. Fetch all users
        cur.execute("SELECT id, email FROM users")
        users = cur.fetchall()
        
        summary = {
            "total_users_processed": len(users),
            "total_files_removed": 0,
            "users_synced": []
        }
        
        for user in users:
            user_id = user["id"]
            
            # 2. Get all S3 objects for this user
            # aws.list_s3_files returns a list of dictionaries with 'Key' and 'Size'
            s3_objects = aws.list_s3_files(user_id)
            s3_keys = {obj["Key"] for obj in s3_objects}
            
            # 3. Get all file records from DB for this user
            cur.execute("SELECT id, s3_key, size FROM files WHERE user_id = %s", (user_id,))
            db_files = cur.fetchall()
            
            removed_count = 0
            remaining_size = 0
            
            # 4. Identify ghosts and remove them
            for db_f in db_files:
                if db_f["s3_key"] not in s3_keys:
                    cur.execute("DELETE FROM files WHERE id = %s", (db_f["id"],))
                    removed_count += 1
                else:
                    remaining_size += db_f["size"]
            
            # 5. Update user total storage used to be accurate
            cur.execute("UPDATE users SET total_storage_used = %s WHERE id = %s", (remaining_size, user_id))
            
            if removed_count > 0:
                summary["total_files_removed"] += removed_count
                summary["users_synced"].append({
                    "email": user["email"],
                    "files_removed": removed_count
                })
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {"status": "success", "summary": summary}
        
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# --- Static File Serving (Production) ---
# Mount the React build directory
dist_path = os.path.join(os.path.dirname(__file__), "../dist")
if os.path.exists(dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Allow API routes to be handled first (FastAPI does this by order)
        # If it's not an API route, serve index.html
        if full_path.startswith("api"):
             raise HTTPException(status_code=404)
        
        index_file = os.path.join(dist_path, "index.html")
        return FileResponse(index_file)
else:
    print("Warning: 'dist' directory not found. Frontend will not be served.")
