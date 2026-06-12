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
            user_id INTEGER,
            email TEXT,
            code TEXT NOT NULL,
            purpose TEXT NOT NULL DEFAULT 'password_change',
            expires_at TIMESTAMP NOT NULL,
            used INTEGER NOT NULL DEFAULT 0,
            attempts INTEGER NOT NULL DEFAULT 0,
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
    # Add terms_accepted column if not exists
    try:
        conn.execute("ALTER TABLE users ADD COLUMN terms_accepted INTEGER DEFAULT 0")
    except Exception:
        pass  # column already exists
    # Add phone column if not exists (for phone login)
    try:
        conn.execute("ALTER TABLE users ADD COLUMN phone TEXT UNIQUE DEFAULT ''")
    except Exception:
        pass  # column already exists
    # Add phone_verified column if not exists
    try:
        conn.execute("ALTER TABLE users ADD COLUMN phone_verified INTEGER DEFAULT 0")
    except Exception:
        pass  # column already exists
    # Add phone column to verification_codes if not exists
    try:
        conn.execute("ALTER TABLE verification_codes ADD COLUMN phone TEXT")
    except Exception:
        pass  # column already exists
    # Add email column if not exists (for registration codes)
    try:
        conn.execute("ALTER TABLE verification_codes ADD COLUMN email TEXT")
    except Exception:
        pass  # column already exists
    # Add attempts column if not exists
    try:
        conn.execute("ALTER TABLE verification_codes ADD COLUMN attempts INTEGER DEFAULT 0")
    except Exception:
        pass  # column already exists
    # Create index for faster lookup
    try:
        conn.execute("CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email, purpose, used)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_verification_codes_user ON verification_codes(user_id, purpose, used)")
    except Exception:
        pass
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


def _has_special_symbol(s: str) -> bool:
    """检查字符串是否包含特殊符号
    允许：字母/数字/空格/中日韩/emoji/下划线/连字符
    禁止：.@#$%^&*()+=[]{}|\;:'"`<>/?`~!,。
    """
    import re as _re
    return bool(_re.search(r"[!@#$%^&*()+\=\[\]{}|\\;:'\"`/<>?~.,。]", s))


def _visual_length(s: str) -> int:
    """计算字符串的视觉长度（CJK/emoji 算 1，组合字符不算）。
    用 unicodedata.east_asian_width 判断，W/F（全角）= 2, 其他 = 1
    但我们这里想要"几个字"的简单感觉，所以简化：code point 数
    """
    import unicodedata
    count = 0
    i = 0
    while i < len(s):
        ch = s[i]
        cat = unicodedata.category(ch)
        # Skip combining marks (Mn, Mc, Me) for purposes of length counting
        if cat in ("Mn", "Mc", "Me"):
            i += 1
            continue
        # 简化：每个字符（包括 emoji）算 1 个字符长度
        count += 1
        i += 1
    return count


def _is_unicode_letter_start(s: str) -> bool:
    """判断字符串首字符是否为 Unicode 字母（支持 CJK/拉丁/希腊/西里尔/阿拉伯/泰/天城文等所有语言的字母）
    Python re 模块不支持 \p{L}，所以用 unicodedata.category 判断
    """
    if not s:
        return False
    ch = s[0]
    import unicodedata
    cat = unicodedata.category(ch)
    # Lu = 大写字母, Ll = 小写字母, Lt = 标题字母, Lm = 修饰字母, Lo = 其他字母（含 CJK/希腊/西里尔/泰/天城文/阿拉伯等）
    return cat.startswith("L")


def create_user(username: str, email: str, password: str) -> Dict[str, Any]:
    """Create a new user. Returns user dict or raises ValueError."""
    if not username or not username.strip():
        raise ValueError("请填写用户名")
    username = username.strip()
    vlen = _visual_length(username)
    if vlen < 1 or vlen > 20:
        raise ValueError("Username must be 1-20 characters")
    # 名字必须以文字开头（Unicode 字母：CJK/拉丁/希腊/西里尔/阿拉伯/泰/天城文等）
    if not _is_unicode_letter_start(username):
        raise ValueError("名字开头必须是文字（不能是数字、空格、符号）")
    # 禁止特殊符号（数字/字母/空格/CJK/emoji/下划线/连字符/点/逗号 都允许）
    if _has_special_symbol(username):
        raise ValueError("名字不能包含特殊符号（@#$%^&*()+=[]{}|\\;:'\"`<>/?`~!）")
    import re as _re
    if _re.search(r"\s{2,}", username):
        raise ValueError("名字中不能有连续空格")
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
            "avatar_url": "",
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
            "SELECT id, username, email, avatar_url, password_hash, created_at, terms_accepted FROM users WHERE username = ?",
            (username_or_email,),
        ).fetchone()

        # If not found, try email
        if row is None:
            row = conn.execute(
                "SELECT id, username, email, avatar_url, password_hash, created_at, terms_accepted FROM users WHERE email = ?",
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
            "avatar_url": row["avatar_url"] or "",
            "created_at": row["created_at"],
            "terms_accepted": row["terms_accepted"],
        }
    finally:
        conn.close()


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Get user by ID"""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT id, username, email, avatar_url, created_at, terms_accepted FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if row:
            return dict(row)
        return None
    finally:
        conn.close()


def generate_verification_code(user_id: Optional[int] = None, email: Optional[str] = None, purpose: str = "password_change") -> str:
    """Generate a 6-digit verification code. Returns the code.
    For registration codes, pass email instead of user_id.
    """
    code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    conn = get_db()
    try:
        # Invalidate any existing unused codes for this user/email + purpose
        if user_id:
            conn.execute(
                "UPDATE verification_codes SET used = 1 WHERE user_id = ? AND purpose = ? AND used = 0",
                (user_id, purpose),
            )
        elif email:
            conn.execute(
                "UPDATE verification_codes SET used = 1 WHERE email = ? AND purpose = ? AND used = 0",
                (email, purpose),
            )
        conn.execute(
            "INSERT INTO verification_codes (user_id, email, code, purpose, expires_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, email, code, purpose, expires_at.isoformat()),
        )
        conn.commit()
        return code
    finally:
        conn.close()


def verify_verification_code(user_id: Optional[int] = None, email: Optional[str] = None, code: str = "", purpose: str = "password_change") -> bool:
    """Verify a 6-digit code. Marks it as used if valid. Max 3 attempts.
    For registration codes, pass email instead of user_id.
    """
    conn = get_db()
    try:
        # 兼容 expires_at 同时为 'YYYY-MM-DDTHH:MM:SS' (naive ISO) 和 'YYYY-MM-DD HH:MM:SS' (SQLite CURRENT_TIMESTAMP) 两种格式
        def _parse_expires(s: str) -> datetime:
            try:
                return datetime.fromisoformat(s)
            except ValueError:
                return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")

        def _all_active_codes() -> list:
            """返回该 user/email + purpose 下所有未过期的有效验证码（按 created_at 倒序）"""
            if user_id:
                rows = conn.execute(
                    "SELECT id, code, expires_at, attempts FROM verification_codes WHERE user_id = ? AND purpose = ? AND used = 0 ORDER BY created_at DESC",
                    (user_id, purpose),
                ).fetchall()
            elif email:
                rows = conn.execute(
                    "SELECT id, code, expires_at, attempts FROM verification_codes WHERE email = ? AND purpose = ? AND used = 0 ORDER BY created_at DESC",
                    (email, purpose),
                ).fetchall()
            else:
                return []
            return [r for r in rows if _parse_expires(r["expires_at"]) > datetime.utcnow()]

        # 1) 检查整个 purpose 下未过期且未使用次数超限的验证码，是否因为 attempts 已经被超限标记
        active = _all_active_codes()
        if not active:
            return False  # 全部过期或无验证码

        # 2) 找到匹配的 code
        matched = next((r for r in active if r["code"] == code), None)
        if not matched:
            # Code not found - increment attempts for all active codes
            if user_id:
                conn.execute(
                    "UPDATE verification_codes SET attempts = attempts + 1 WHERE user_id = ? AND purpose = ? AND used = 0",
                    (user_id, purpose),
                )
            elif email:
                conn.execute(
                    "UPDATE verification_codes SET attempts = attempts + 1 WHERE email = ? AND purpose = ? AND used = 0",
                    (email, purpose),
                )
            conn.commit()
            return False

        # 3) 如果匹配的 code 已经超限
        if matched["attempts"] >= 3:
            conn.execute("UPDATE verification_codes SET used = 1 WHERE id = ?", (matched["id"],))
            conn.commit()
            return False

        # 4) 标记使用
        conn.execute("UPDATE verification_codes SET used = 1 WHERE id = ?", (matched["id"],))
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


def update_email(user_id: int, new_email: str) -> bool:
    """Update user email. Returns True on success."""
    conn = get_db()
    try:
        # Check if new_email is already taken
        existing = conn.execute("SELECT id FROM users WHERE email = ? AND id != ?", (new_email, user_id)).fetchone()
        if existing:
            return False
        cursor = conn.execute(
            "UPDATE users SET email = ? WHERE id = ?",
            (new_email, user_id),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def delete_user(user_id: int) -> bool:
    """Delete user and all related data. Returns True on success."""
    conn = get_db()
    try:
        # Delete related data first (reports, verification_codes, etc.)
        conn.execute("DELETE FROM reports WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM verification_codes WHERE user_id = ?", (user_id,))
        # Delete user
        cursor = conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def accept_terms(user_id: int) -> bool:
    """Mark user as having accepted terms. Returns True on success."""
    conn = get_db()
    try:
        cursor = conn.execute(
            "UPDATE users SET terms_accepted = 1 WHERE id = ?",
            (user_id,),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def check_username_setup(user_id: int) -> bool:
    """Check if user needs to set up username (default 'User' or empty). Returns True if setup needed."""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT username FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if not row:
            return False
        username = row["username"]
        return username == "User" or username.strip() == ""
    finally:
        conn.close()


# ── Phone Number Authentication ──────────────────────────────────────

def _is_valid_phone(phone: str) -> bool:
    """Validate phone number format (simple: digits, 8-15 chars)."""
    import re
    phone = phone.strip()
    return bool(re.match(r"^\+?[0-9]{8,15}$", phone))


def get_user_by_phone(phone: str) -> Optional[Dict[str, Any]]:
    """Get user by phone number. Returns user dict or None."""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT id, username, email, phone, avatar_url, created_at, terms_accepted FROM users WHERE phone = ?",
            (phone.strip(),),
        ).fetchone()
        if row:
            return dict(row)
        return None
    finally:
        conn.close()


def create_user_with_phone(username: str, phone: str, password: str) -> Dict[str, Any]:
    """Create a new user with phone as primary credential. Returns user dict or raises ValueError."""
    if not _is_valid_phone(phone):
        raise ValueError("Invalid phone number format")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters")

    conn = get_db()
    try:
        # Use phone as default email placeholder
        email = f"phone_{phone.replace('+','')}@neuroaccess.local"
        cursor = conn.execute(
            "INSERT INTO users (username, email, phone, password_hash, phone_verified) VALUES (?, ?, ?, ?, 1)",
            (username, email, phone.strip(), hash_password(password)),
        )
        conn.commit()
        user_id = cursor.lastrowid
        return {
            "id": user_id,
            "username": username,
            "email": "",
            "phone": phone.strip(),
            "avatar_url": "",
            "created_at": datetime.utcnow().isoformat(),
        }
    except sqlite3.IntegrityError:
        raise ValueError("Phone number already exists")
    finally:
        conn.close()


def authenticate_by_phone(phone: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate user by phone + password. Returns user dict or None."""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT id, username, email, phone, avatar_url, password_hash, created_at, terms_accepted FROM users WHERE phone = ?",
            (phone.strip(),),
        ).fetchone()
        if row is None:
            return None
        if not verify_password(password, row["password_hash"]):
            return None
        return {
            "id": row["id"],
            "username": row["username"],
            "email": row["email"],
            "phone": row["phone"],
            "avatar_url": row["avatar_url"] or "",
            "created_at": row["created_at"],
            "terms_accepted": row["terms_accepted"],
        }
    finally:
        conn.close()


def update_phone(user_id: int, new_phone: str) -> bool:
    """Update user phone number. Returns True on success."""
    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM users WHERE phone = ? AND id != ?", (new_phone.strip(), user_id)).fetchone()
        if existing:
            return False
        cursor = conn.execute(
            "UPDATE users SET phone = ?, phone_verified = 1 WHERE id = ?",
            (new_phone.strip(), user_id),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


# Initialize DB on module load
init_db()
