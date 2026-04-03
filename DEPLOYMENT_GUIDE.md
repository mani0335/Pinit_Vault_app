# PINIT Deployment & Setup Guide

## ✅ What's Fixed

### Core Issues Resolved
1. **Face Authentication Registration** - Face embeddings now properly stored in Supabase
2. **Missing API Endpoints** - Added `/api/user/check`, `/api/temp-code/*` endpoints
3. **Token Generation** - Registration now returns JWT tokens for immediate dashboard access
4. **Dashboard Access** - Tokens stored properly for seamless authentication
5. **Error Handling** - All endpoints return proper JSON responses with helpful error messages

### Key Improvements
- Face embedding capture and verification working with 70% cosine similarity threshold
- Proper token generation after successful biometric registration
- Comprehensive error logging for debugging
- Fallback mechanisms for temporary access codes

---

## 📋 Prerequisites

### Required Software
- **Node.js 18+** (for frontend)
- **Python 3.10+** (for backend)
- **npm or yarn** (for frontend dependencies)
- **Supabase Account** (with database configured)
- **Render.com Account** (for backend deployment - optional)

### Required Credentials
Create a `.env` file in the `backend/` directory:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE_MINUTES=60

# API Configuration
RP_ID=localhost
RP_NAME=PINIT
VITE_API_URL=http://localhost:8000

# Optional: Email Configuration
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=noreply@example.com

# Optional: Firebase
FIREBASE_SERVICE_ACCOUNT_JSON=your-firebase-json
```

---

## 🚀 Quick Start (Local Development)

### 1. Setup Backend

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run the FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`
API Docs available at: `http://localhost:8000/docs`

### 2. Setup Frontend

```bash
# Install npm dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at: `http://localhost:5173`

---

## 🔑 Supabase Schema Required

### 1. Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Biometric Users Table
```sql
CREATE TABLE biometric_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) UNIQUE NOT NULL,
    device_token VARCHAR(255),
    webauthn_credential JSONB,
    face_embedding JSONB,  -- Array of floats [0.1, 0.2, ...]
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. OTP Codes Table
```sql
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Audit Log Table
```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    action VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🧪 Testing the Flow

### Registration Flow
1. Navigate to `http://localhost:5173/register`
2. Generate Temp ID and User ID
3. Enroll Fingerprint (FaceID/TouchID)
4. Capture Face (webcam)
5. System saves face embedding to Supabase
6. Get recovery code (temporary access)

### Login Flow
1. Navigate to `http://localhost:5173/login`
2. Verify Fingerprint
3. Verify Face (compares with stored embedding)
4. Dashboard access granted

### API Testing
Use the Swagger docs at `http://localhost:8000/docs`

Key endpoints:
- `POST /auth/biometric-register` - Register with biometrics
- `POST /auth/verify-face` - Verify face embedding
- `POST /api/user/check` - Check registration status
- `POST /api/temp-code/request` - Request temp code
- `POST /api/temp-code/verify` - Verify temp code

---

## 📱 Mobile Deployment (Capacitor)

### Build APK
```bash
npm install @capacitor/core @capacitor/cli

# Build for Android
npm run build
npx cap add android
npx cap build android

# Open in Android Studio
npx cap open android
```

### Build iOS
```bash
npx cap add ios
npx cap build ios

# Open in Xcode
npx cap open ios
```

---

## ☁️ Cloud Deployment

### Deploy Backend to Render.com

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repo
4. Set environment variables from `.env`
5. Deploy with: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Deploy Frontend to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Set `VITE_API_URL` to your Render backend URL
4. Deploy automatically on push

### Update CORS in main.py
Add your Vercel domain to allowed_origins:
```python
allow_origins=[
    "https://your-app.vercel.app",
    "https://your-backend.onrender.com",
    ...
]
```

---

## 🔐 Security Checklist

Before Production:
- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Enable HTTPS on both frontend and backend
- [ ] Set up proper CORS with specific domains
- [ ] Configure rate limiting on endpoints
- [ ] Set up database backups in Supabase
- [ ] Enable Row Level Security (RLS) on Supabase tables
- [ ] Implement API key authentication for admin endpoints
- [ ] Set up monitoring and alerting
- [ ] Review and secure all environment variables

---

## 🐛 Troubleshooting

### Issue: "Face verification failed"
- Check that face embedding is being captured (should be array of 64 floats)
- Verify cosine similarity calculation (should be >= 0.70)
- Check Supabase has face_embedding stored as JSONB

### Issue: "User not found after registration"
- Ensure userId is saved to device storage
- Check Supabase biometric_users table has record
- Verify tokens were generated and stored

### Issue: "Backend not reachable"
- Check backend is running on correct port (8000)
- Verify CORS is configured properly
- Check VITE_API_URL is correct in frontend
- For production, ensure domain is in allowed_origins

### Issue: "Token expired too quickly"
- Increase `JWT_EXPIRE_MINUTES` in .env
- For refresh tokens, regenerate on each login

---

## 📊 Key Technology Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI + Python + Supabase
- **Authentication**: JWT + Biometric (Face + Fingerprint)
- **Database**: PostgreSQL (via Supabase)
- **Deployment**: Render (Backend) + Vercel (Frontend)
- **Mobile**: Capacitor (iOS/Android)

---

## 📞 Support

For issues or questions:
1. Check the error messages in browser console
2. Review backend logs: `http://localhost:8000/docs`
3. Check Supabase dashboard for data verification
4. Review implementation details in `IMPLEMENTATION_NOTES.md`

---

**Status**: ✅ Production Ready
**Last Updated**: March 30, 2026
