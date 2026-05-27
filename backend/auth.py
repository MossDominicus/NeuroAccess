"""
NeuroAccess Auth Module
- SQLite user database
- bcrypt password hashing
- JWT token authentication
"""
import os
import sqlite3
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from passlib.context import CryptContext
from jose import JWTError, jwt

BASE_DIR = os.path.dirname(__file__)
DB_PATH = os.path.join(BASE_DIR, "neuroaccess.db")

# JWT settings
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "neuroaccess-jwt-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_db() -> sqlite3.Connection:
    """Get SQLite connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize users table"""
    conn = get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    conn.close()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: Dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return dict(payload)
    except JWTError:
        return None


def create_user(username: str, email: str, password: str) -> Dict[str, Any]:
    """Create a new user. Returns user dict or raises ValueError."""
    if len(username) < 3 or len(username) > 30:
        raise ValueError("Username must be 3-30 characters")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters")
    if "@" not in email or "." not in email:
        raise ValueError("Invalid email address")

    conn = get_db()
    try:
        cursor = conn.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            (username, email, hash_password(password)),
        )
        conn.commit()
        user_id = cursor.lastrowid
        return {
            "id": user_id,
            "username": username,
            "email": email,
            "created_at": datetime.utcnow().isoformat(),
        }
    except sqlite3.IntegrityError as e:
        if "username" in str(e).lower():
            raise ValueError("Username already exists")
        raise ValueError("Email already exists")
    finally:
        conn.close()


def authenticate_user(username_or_email: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate user by username or email. Returns user dict or None."""
    conn = get_db()
    try:
        # Try username first
        row = conn.execute(
            "SELECT id, username, email, password_hash, created_at FROM users WHERE username = ?",
            (username_or_email,),
        ).fetchone()

        # If not found, try email
        if row is None:
            row = conn.execute(
                "SELECT id, username, email, password_hash, created_at FROM users WHERE email = ?",
                (username_or_email,),
            ).fetchone()

        if row is None:
            return None

        if not verify_password(password, row["password_hash"]):
            return None

        return {
            "id": row["id"],
            "username": row["username"],
            "email": row["email"],
            "created_at": row["created_at"],
        }
    finally:
        conn.close()


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Get user by ID"""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT id, username, email, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if row:
            return dict(row)
        return None
    finally:
        conn.close()


# Initialize DB on module load
init_db()
