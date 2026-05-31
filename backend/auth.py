"""
NeuroAccess Auth Module
- SQLite user database
- bcrypt password hashing
- JWT token authentication
"""
import os
import random
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
    """Initialize users and verification_codes tables"""
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
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS verification_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            purpose TEXT NOT NULL DEFAULT 'password_change',
            expires_at TIMESTAMP NOT NULL,
            used INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )
    # Add avatar_url column if not exists
    try:
        conn.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''")
    except Exception:
        pass  # column already exists
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


def generate_verification_code(user_id: int, purpose: str = "password_change") -> str:
    """Generate a 6-digit verification code for the user. Returns the code."""
    code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    conn = get_db()
    try:
        # Invalidate any existing unused codes for this user + purpose
        conn.execute(
            "UPDATE verification_codes SET used = 1 WHERE user_id = ? AND purpose = ? AND used = 0",
            (user_id, purpose),
        )
        conn.execute(
            "INSERT INTO verification_codes (user_id, code, purpose, expires_at) VALUES (?, ?, ?, ?)",
            (user_id, code, purpose, expires_at.isoformat()),
        )
        conn.commit()
        return code
    finally:
        conn.close()


def verify_verification_code(user_id: int, code: str, purpose: str = "password_change") -> bool:
    """Verify a 6-digit code for the user. Marks it as used if valid."""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT id, expires_at FROM verification_codes WHERE user_id = ? AND code = ? AND purpose = ? AND used = 0",
            (user_id, code, purpose),
        ).fetchone()
        if not row:
            return False
        # Check expiry
        expires = datetime.fromisoformat(row["expires_at"])
        if datetime.utcnow() > expires:
            return False
        # Mark as used
        conn.execute("UPDATE verification_codes SET used = 1 WHERE id = ?", (row["id"],))
        conn.commit()
        return True
    finally:
        conn.close()


def update_password(user_id: int, new_password: str) -> bool:
    """Update user password. Returns True on success."""
    if len(new_password) < 6:
        raise ValueError("Password must be at least 6 characters")
    conn = get_db()
    try:
        cursor = conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(new_password), user_id),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


# Initialize DB on module load
init_db()
