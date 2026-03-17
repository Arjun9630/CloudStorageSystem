import sys
import database
import os
from dotenv import load_dotenv

load_dotenv()

def make_admin(email):
    conn = database.get_db_connection()
    if not conn:
        print("Failed to connect to the database.")
        return

    try:
        cur = conn.cursor()
        cur.execute("SELECT id, name FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        
        if not user:
            print(f"User with email '{email}' not found.")
            return

        cur.execute("UPDATE users SET is_admin = TRUE WHERE email = %s", (email,))
        conn.commit()
        print(f"Successfully promoted {user[1]} ({email}) to Admin.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python make_admin.py <email>")
    else:
        make_admin(sys.argv[1])
