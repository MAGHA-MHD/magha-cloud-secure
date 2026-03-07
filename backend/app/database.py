import sqlite3
import os
from contextlib import contextmanager

# Use /data/app.db for persistent storage in production, local for dev
DB_PATH = os.getenv("DATABASE_PATH", "app.db")


def get_db_path():
    return DB_PATH


def init_db():
    """Initialize the database with all required tables."""
    conn = sqlite3.connect(get_db_path())
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            full_name TEXT DEFAULT '',
            plan TEXT DEFAULT 'free',
            storage_used INTEGER DEFAULT 0,
            storage_limit INTEGER DEFAULT 524288000,
            mfa_enabled INTEGER DEFAULT 0,
            mfa_secret TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            original_filename TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            mime_type TEXT DEFAULT 'application/octet-stream',
            encryption_key TEXT NOT NULL,
            encryption_iv TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS file_shares (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id INTEGER NOT NULL,
            owner_id INTEGER NOT NULL,
            shared_with_id INTEGER,
            shared_with_email TEXT,
            permission TEXT DEFAULT 'read',
            share_token TEXT UNIQUE,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
            FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (shared_with_id) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_files_owner ON files(owner_id);
        CREATE INDEX IF NOT EXISTS idx_shares_file ON file_shares(file_id);
        CREATE INDEX IF NOT EXISTS idx_shares_shared_with ON file_shares(shared_with_id);
        CREATE INDEX IF NOT EXISTS idx_shares_token ON file_shares(share_token);
    """)

    conn.commit()
    conn.close()


@contextmanager
def get_db():
    """Context manager for database connections."""
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
