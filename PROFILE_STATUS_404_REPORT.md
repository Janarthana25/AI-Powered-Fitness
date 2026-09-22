# Profile Status 404 Error - Investigation Report

**Date:** 2026-09-23  
**Issue:** GET `/profile/me/status` → 404 on deployed app, causing blank page and React crash  
**Environment:** Production (Render backend + Vercel frontend)

---

## 1. Does the Route Exist?

### ✅ YES - Route exists in backend

**File:** `backend/app/routes/profile.py`  
**Lines:** 133-165

```python
@router.get(
    "/me/status",
    response_model=schemas.ProfileStatusResponse,
    summary="Check whether the current user has a complete profile",
)
def get_profile_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lightweight endpoint called right after login to decide whether to
    redirect the user to /complete-profile or straight to /dashboard.
    """
    profile = (
        db.query(UserProfile)
        .filter(UserProfile.user_id == current_user.id)
        .first()
    )
    
    if not profile:
        return schemas.ProfileStatusResponse(
            has_profile=False,
            is_complete=False,
            profile=None,
        )
    
    profile_response = schemas.ProfileResponse.from_orm_with_completion(profile)
    return schemas.ProfileStatusResponse(
        has_profile=True,
        is_complete=profile_response.is_complete,
        profile=profile_response,
    )
```

**Router Mount:** `main.py` line 61
```python
app.include_router(profile_router)
```

**Router Prefix:** `profile.py` line 17
```python
router = APIRouter(prefix="/profile", tags=["Profile"])
```

**Full Path:** `/profile/me/status` (GET)

**Expected Response:**
```json
{
  "has_profile": boolean,
  "is_complete": boolean,
  "profile": ProfileResponse | null
}
```

---

## 2. Database Query - PostgreSQL Migration Risk

### ⚠️ CRITICAL FINDING: Code still uses SQLite, but deployment may use PostgreSQL

**Current Configuration:** `backend/app/database.py` line 11
```python
DATABASE_URL = "sqlite:///./payirchi_thozhan.db"
```

**No environment variable override detected** - The code is hardcoded to SQLite.

### Database Query Analysis:

**File:** `profile.py` line 145-149
```python
profile = (
    db.query(UserProfile)
    .filter(UserProfile.user_id == current_user.id)
    .first()
)
```

**ORM Model:** `models.py` line 35-62
```python
class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=False, unique=True, index=True)
    
    age                = Column(Integer,      nullable=True)
    gender             = Column(String(30),   nullable=True)
    height_cm          = Column(Float,        nullable=True)
    weight_kg          = Column(Float,        nullable=True)
    fitness_goal       = Column(String(60),   nullable=True)
    experience_level   = Column(String(30),   nullable=True)
    medical_conditions = Column(String(500),  nullable=True)
    preferred_language = Column(String(30),   nullable=True)
```

### Potential PostgreSQL Issues:

#### Issue A: Database Not Initialized
If Render is using PostgreSQL (Neon) but `database.py` still points to SQLite:
- The code creates SQLite file locally: `./payirchi_thozhan.db`
- Render environment would need `DATABASE_URL` environment variable
- If not set, app would try to use SQLite in a read-only filesystem
- **Tables may not exist in PostgreSQL**

#### Issue B: Table Creation
**Current:** `main.py` line 22
```python
Base.metadata.create_all(bind=engine)
```

This creates tables on startup **only if they don't exist**.

**If switching to PostgreSQL:**
- Tables must be created manually or via migration
- Missing tables would cause SQLAlchemy to raise errors
- BUT: This would be 500 error, not 404

#### Issue C: SQLite-Specific Features
**`database.py` line 16:**
```python
connect_args={"check_same_thread": False}  # Required for SQLite + FastAPI
```

This is **SQLite-specific**. PostgreSQL doesn't use this.

**If DATABASE_URL starts with `postgresql://`:**
- This connect_arg would be ignored (harmless)
- But indicates code was never tested with PostgreSQL

#### Issue D: DateTime Columns
**`models.py` line 99:**
```python
created_at = Column(DateTime(timezone=False), server_default=func.now())
```

**`models.py` lines 27, 59-60:**
```python
created_at  = Column(DateTime(timezone=True), server_default=func.now())
updated_at  = Column(DateTime(timezone=True), server_default=func.now(),
                     onupdate=func.now())
```

**Inconsistency:**
- `Progress` table uses `DateTime(timezone=False)`
- `User` and `UserProfile` use `DateTime(timezone=True)`

**PostgreSQL behavior:**
- `timezone=True` → `TIMESTAMP WITH TIME ZONE`
- `timezone=False` → `TIMESTAMP WITHOUT TIME ZONE`
- `func.now()` behavior differs between SQLite and PostgreSQL

**Potential Issue:**
If PostgreSQL is deployed, `func.now()` may not work as expected without proper timezone configuration.

---

## 3. Frontend API Call

### URL Construction

**File:** `frontend/src/api/authAPI.js` line 12-15
```javascript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})
```

**Profile Status Call:** line 121-124
```javascript
const getProfileStatus = async () => {
  const { data } = await api.get('/profile/me/status')
  return data
}
```

**Called From:** `frontend/src/context/AuthContext.jsx` line 87-93
```javascript
profileAPI
  .getProfileStatus()
  .then(({ profile: p }) => {
    if (!cancelled) setProfileState(p ?? null)
  })
  .catch(() => {
    // Non-fatal — profile just stays null; route guard will redirect
    if (!cancelled) setProfileState(null)
  })
  .finally(() => {
    if (!cancelled) setProfileLoading(false)
  })
```

### ✅ URL Construction is Correct

**Development:** 
- `VITE_API_BASE_URL` not set → baseURL = `''` (empty string)
- Request: `GET /profile/me/status`
- Vite proxy forwards to `http://127.0.0.1:8000`

**Production:**
- `VITE_API_BASE_URL` should be: `https://ai-fitness-backend-zxxl.onrender.com`
- Request: `GET https://ai-fitness-backend-zxxl.onrender.com/profile/me/status`

**The URL is constructed correctly with leading slash.**

---

## 4. Frontend Error Handling

### ⚠️ CRITICAL FINDING: Error is caught but causes silent failure

**AuthContext.jsx** line 87-96:
```javascript
profileAPI
  .getProfileStatus()
  .then(({ profile: p }) => {
    if (!cancelled) setProfileState(p ?? null)
  })
  .catch(() => {
    // Non-fatal — profile just stays null; route guard will redirect
    if (!cancelled) setProfileState(null)  // ← Sets profile to null
  })
  .finally(() => {
    if (!cancelled) setProfileLoading(false)  // ← Sets loading to false
  })
```

**Flow when 404 occurs:**
1. `getProfileStatus()` throws (404)
2. `.catch()` sets `profile = null`
3. `.finally()` sets `profileLoading = false`
4. AuthContext state: `{ profile: null, profileLoading: false, isProfileComplete: false }`

**App.jsx ProfileEditRoute guard** (line 100-112):
```javascript
const ProfileEditRoute = ({ children }) => {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const notReady = useGuardReady()  // ← Checks loading || profileLoading

  if (notReady) return <Loader overlay size="full" />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return children  // ← Renders CompleteProfile
}
```

**useGuardReady()** (line 42-46):
```javascript
const useGuardReady = () => {
  const { loading, profileLoading } = useAuth()
  return loading || profileLoading  // ← Returns false when done
}
```

**Result:**
- User is authenticated (token exists)
- Profile loading completes (even though it failed)
- Route guard passes
- CompleteProfile page renders

### CompleteProfile Error Handling

**File:** `frontend/src/pages/CompleteProfile.jsx`

**No try-catch around profile fetch on mount.**

The component receives `profile` from AuthContext via `useAuth()`:
```javascript
const { user, profile, setProfile } = useAuth()
```

If `profile === null` due to 404:
- Component renders normally
- Form fields would be empty (no prefill)
- Saving would create new profile (PUT /profile/me)

**This should NOT cause a blank page or React crash.**

### ⚠️ React "removeChild" Crash

**User reported:** "React 'removeChild' crash"

This error typically occurs when:
1. A component tries to render `undefined` or `null` where a node is expected
2. A component unmounts during an async operation
3. A state update happens on an unmounted component

**Potential causes:**

#### Cause A: Profile Response Structure Mismatch
**AuthContext expects:**
```javascript
.then(({ profile: p }) => {
  if (!cancelled) setProfileState(p ?? null)
})
```

**If backend returns different structure** (e.g., nested differently), `profile: p` would be undefined.

#### Cause B: Uncaught Error in Render
If `CompleteProfile` tries to access `profile.someField` without null-checking:
```javascript
const age = profile.age  // ← TypeError if profile is null
```

#### Cause C: Axios Interceptor Issue
**authAPI.js** line 32-42:
```javascript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pt_token')
      localStorage.removeItem('pt_user')
      window.dispatchEvent(new Event('pt:session-expired'))
    }
    return Promise.reject(error)
  }
)
```

**If 404 is mishandled as 401:**
- Token gets cleared
- Session-expired event fires
- AuthContext logs out user
- Route guards trigger navigation
- **React crash if navigation happens mid-render**

---

## 5. Render Deployment Logs - What to Look For

### Critical Log Indicators:

#### A. Startup Logs
```
✓ Workout prediction model loaded successfully
✓ Injury risk model loaded successfully
INFO:     Application startup complete.
```

**If missing:** ML models failed to load (would affect other endpoints too)

#### B. Database Connection
```
INFO:     Connected to database
```

**If SQLite:**
```
INFO:     Using SQLite database at ./payirchi_thozhan.db
```

**If PostgreSQL:**
```
INFO:     Using PostgreSQL database
```

**Look for:**
- `sqlalchemy.exc.OperationalError` (database connection failure)
- `psycopg2.OperationalError` (PostgreSQL driver issue)
- `could not connect to server` (Neon database unreachable)

#### C. Route Registration
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Check Swagger docs:** `https://ai-fitness-backend-zxxl.onrender.com/docs`
- If accessible, routes are registered correctly
- Look for `/profile/me/status` in endpoint list

#### D. 404 Request Logs
```
INFO:     XXX.XXX.XXX.XXX:XXXXX - "GET /profile/me/status HTTP/1.1" 404 Not Found
```

**vs. successful requests:**
```
INFO:     XXX.XXX.XXX.XXX:XXXXX - "GET /profile/me/status HTTP/1.1" 200 OK
```

**Look for:**
- Exact path being requested (typos, double slashes, etc.)
- Authorization header presence
- Response time (slow = database issue)

#### E. 500 Errors Masked as 404
FastAPI can return 404 if:
- Route exists but `HTTPException(404)` is raised
- Dependency fails (e.g., `get_current_user` raises 404)

**Check for:**
```
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  ...
  sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) no such table: user_profiles
```

**This would manifest as 404 if caught by exception handler.**

#### F. JWT Token Issues
**`get_current_user` dependency** (profile.py line 29-57) can raise:
- 401 if token invalid/expired
- 404 if user_id not found in database

**Look for:**
```
INFO:     XXX.XXX.XXX.XXX:XXXXX - "GET /profile/me/status HTTP/1.1" 401 Unauthorized
```

**If 401:** Token is invalid, but frontend shows 404 (wrong error passed through)

---

## Root Cause Analysis

### Most Likely Cause: PostgreSQL Migration Not Completed

#### Evidence:
1. **Code still points to SQLite** (`database.py` line 11)
2. **No environment variable usage** for `DATABASE_URL`
3. **Render deployment likely uses PostgreSQL** (Neon) via env var
4. **Tables may not exist** in PostgreSQL if migration not run

#### What Happens:
1. Render starts app
2. Environment variable `DATABASE_URL=postgresql://...` overrides SQLite config (if using `os.getenv()`)
3. **BUT CODE DOESN'T READ ENV VAR** - it's hardcoded to SQLite
4. Two scenarios:

**Scenario A: Render forces DATABASE_URL override**
- Some hosting platforms auto-inject DATABASE_URL
- SQLAlchemy might pick it up via `create_engine()` default behavior
- Tables don't exist in PostgreSQL
- Query fails → 404 or 500

**Scenario B: App uses SQLite on Render**
- Render filesystem is ephemeral
- SQLite file gets created but wiped on restart
- Every deploy = new empty database
- User table exists (created on startup) but empty
- Token references non-existent user_id
- `get_current_user` raises 404: "User account not found"

### Second Likely Cause: CORS + Path Mismatch

#### Evidence:
**main.py** line 54-62:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://ai-powered-fitness-nine.vercel.app",  # ← Frontend URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**If frontend URL is different:**
- CORS preflight might fail
- Request might not include credentials
- JWT token not sent
- `get_current_user` fails: "Token payload missing user_id"
- Returns 401 but frontend sees 404

### Third Likely Cause: Token Expired on Deployed Backend

**JWT tokens have expiry** (`auth.py` would define this).

**If backend clock is different from local:**
- Token issued locally might be expired on server
- `decode_access_token()` returns None
- `get_current_user` raises 401
- Frontend Axios interceptor catches 401
- **BUT:** Frontend reports it as 404 in console (bug in error reporting)

---

## Summary of Findings

### 1. Route Exists ✅
- `/profile/me/status` is defined in `profile.py`
- Mounted correctly in `main.py`
- Path construction is correct

### 2. Database Migration Risk ⚠️
- **Code uses SQLite** (hardcoded)
- **Render likely uses PostgreSQL** (Neon)
- **No environment variable override** in code
- **Tables may not exist** in PostgreSQL
- **Ephemeral filesystem** may wipe SQLite file on restart

### 3. Frontend URL Construction ✅
- Base URL correctly set via `VITE_API_BASE_URL`
- Path has leading slash
- Request format is correct

### 4. Frontend Error Handling ⚠️
- **404 is caught but profile set to null**
- **No visible error to user** (silent failure)
- **React crash likely from downstream effect** (null profile accessed without check)
- **No error boundary** to catch render errors

### 5. Render Logs - What to Check 🔍
- Database connection type (SQLite vs PostgreSQL)
- Table creation logs
- 404 vs 401 vs 500 response codes
- JWT validation errors
- CORS errors
- Exact request path being logged

---

## Recommended Investigation Steps

### Step 1: Check Render Environment Variables
```bash
# Render Dashboard → Environment tab
# Look for:
DATABASE_URL=postgresql://...  # If using Neon
```

**If present:** Backend is using PostgreSQL, but code doesn't read it.

### Step 2: Check Render Logs for Database Type
```
# On Render log stream, look for:
INFO: Using [SQLite|PostgreSQL] database
```

### Step 3: Access Swagger Docs
```
https://ai-fitness-backend-zxxl.onrender.com/docs
```

**Check:**
- Is `/profile/me/status` listed under "Profile" endpoints?
- Can you test it from Swagger UI?
- Does it return 404 or different error?

### Step 4: Check Actual HTTP Response
```bash
# Use browser DevTools Network tab
# Look at response for /profile/me/status

# Status: 404
# Headers: Check for CORS errors
# Response body: Check for error message
```

**Possible responses:**
```json
// Genuine 404 (route not found)
{"detail": "Not Found"}

// FastAPI 404 (from code)
{"detail": "User account not found."}

// 401 misreported as 404
{"detail": "Invalid or expired token."}
```

### Step 5: Check User Table
If you have database access:
```sql
-- Check if users table exists
SELECT * FROM users LIMIT 1;

-- Check if profiles table exists  
SELECT * FROM user_profiles LIMIT 1;

-- Check if logged-in user exists
SELECT * FROM users WHERE email = 'user@example.com';
```

**If tables don't exist:** Migration never ran on PostgreSQL.

### Step 6: Check CORS Logs
Look for Render logs:
```
WARNING: CORS origin not allowed: https://some-other-frontend.vercel.app
```

**If present:** Frontend URL not in whitelist.

---

## Conclusion

**Root Cause:** Most likely **database migration not completed** when switching from SQLite to PostgreSQL (Neon).

**Evidence:**
- Code hardcodes SQLite path
- No environment variable usage for DATABASE_URL
- Render deployment likely uses PostgreSQL
- Tables may not exist in new database

**Immediate Check Required:**
1. Verify what database Render is actually using (logs/env vars)
2. Check if `user_profiles` table exists in that database
3. Check if Swagger docs are accessible
4. Check actual HTTP response body and status code

**The 404 could actually be:**
- 500 masked by exception handler (missing table)
- 401 misreported (expired/invalid token)
- Genuine 404 (user_id not found because tables are empty)

**Frontend crash is a secondary issue** caused by the failed API call, not the primary problem.
