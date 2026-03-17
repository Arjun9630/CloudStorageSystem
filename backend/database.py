import psycopg2
from psycopg2 import Error, extras
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    """Create a database connection to the Postgres database."""
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
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
                total_storage_used BIGINT DEFAULT 0,
                is_admin BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            
            # Create Folders Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS folders (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                parent_id TEXT REFERENCES folders(id),
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
                size BIGINT NOT NULL,
                s3_key TEXT NOT NULL,
                is_starred BOOLEAN DEFAULT FALSE,
                is_trashed BOOLEAN DEFAULT FALSE,
                folder_id TEXT REFERENCES folders(id),
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
            """)
            
            conn.commit()

            # Migration: Ensure is_admin exists (for existing Postgres DBs if any)
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;")
                conn.commit()
            except Error:
                conn.rollback()

            print("Database tables initialized.")
        except Error as e:
            print(f"Error creating tables: {e}")
        finally:
            cursor.close()
            conn.close()
    else:
        print("Error! cannot create the database connection.")

# Initialize the DB if configured
if DATABASE_URL:
    init_db()
else:
    print("WARNING: DATABASE_URL not found in environment. Database not initialized.")
