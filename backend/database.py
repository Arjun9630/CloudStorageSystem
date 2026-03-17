import sqlite3
from sqlite3 import Error
import os

DB_FILE = "cloudstore.db"

def get_db_connection():
    """Create a database connection to the SQLite database."""
    conn = None
    try:
        conn = sqlite3.connect(DB_FILE)
        # Enable row factory to return Dict instead of Tuple
        conn.row_factory = sqlite3.Row
        return conn
    except Error as e:
        print(f"Error connecting to database: {e}")
    return conn

def init_db():
    conn = get_db_connection()
    if conn is not None:
        try:
            cursor = conn.cursor()
            
            # Create Users Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                total_storage_used INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            
            # Create Folders Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS folders (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
            """)

            # Create Files Metadata Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS files (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                size INTEGER NOT NULL,
                s3_key TEXT NOT NULL,
                is_starred BOOLEAN DEFAULT 0,
                is_trashed BOOLEAN DEFAULT 0,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
            """)
            
            conn.commit()

            # Safely attempt to add folder_id if it doesn't exist (migration for existing DBs)
            try:
                cursor.execute("ALTER TABLE files ADD COLUMN folder_id TEXT REFERENCES folders(id);")
                conn.commit()
            except sqlite3.OperationalError:
                pass # Column already exists

            # Safely add parent_id to folders for nested folder support
            try:
                cursor.execute("ALTER TABLE folders ADD COLUMN parent_id TEXT REFERENCES folders(id);")
                conn.commit()
            except sqlite3.OperationalError:
                pass

            print("Database tables initialized.")
        except Error as e:
            print(f"Error creating tables: {e}")
        finally:
            conn.close()
    else:
        print("Error! cannot create the database connection.")

# Initialize the DB on module load if it doesn't exist
if not os.path.exists(DB_FILE):
    init_db()
