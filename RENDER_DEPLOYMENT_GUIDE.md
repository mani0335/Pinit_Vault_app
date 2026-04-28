# Render Deployment Guide for BioVault Backend

## Quick Steps to Deploy Backend to Render

### 1. Go to Render Dashboard
- Visit: https://dashboard.render.com/
- Sign in to your account

### 2. Create New Web Service
- Click **"New +"** button
- Select **"Web Service"**
- Connect to your GitHub repository: `mani0335/Biovault_App`
- Select the **backend** folder as the root directory

### 3. Configure Service Settings

#### Basic Settings:
- **Name**: `biovault-backend`
- **Environment**: `Python 3`
- **Region**: Choose nearest region
- **Branch**: `main`

#### Build Settings:
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

#### Environment Variables (Add these):
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
JWT_SECRET_KEY=your_jwt_secret_key
```

### 4. Deploy
- Click **"Create Web Service"**
- Wait for deployment to complete (2-3 minutes)
- Note your new Render URL: `https://biovault-backend-xxxx.onrender.com`

### 5. Update Frontend URL
Once deployed, update the backend URL in your frontend:

1. **Update authService.ts**:
   ```typescript
   function apiBase(): string {
     return "https://your-new-render-url.onrender.com";
   }
   ```

2. **Update capacitor.config.ts**:
   ```typescript
   server: {
     androidScheme: 'https',
     url: 'https://your-new-render-url.onrender.com',
     cleartext: true
   }
   ```

3. **Rebuild and install APK**:
   ```bash
   npm run build
   npx cap sync android
   ./gradlew installDebug
   ```

### 6. Test the Complete Flow
1. Install the updated APK
2. Test fingerprint registration
3. Verify data is stored in Supabase database

## Alternative: Use Existing Render Service

If you already have a Render service running:

1. **Check your Render dashboard** for existing services
2. **Update the service** to point to the latest code
3. **Get the correct URL** from your Render dashboard
4. **Update the frontend** with the correct URL

## Troubleshooting

### Backend Not Starting:
- Check Render logs for errors
- Verify environment variables are set correctly
- Ensure Supabase credentials are valid

### Frontend Connection Issues:
- Verify the backend URL is correct
- Check CORS settings in main.py
- Ensure the backend is deployed and running

### Database Issues:
- Verify Supabase connection
- Check if tables exist in Supabase
- Run SQL migration scripts if needed

## Environment Variables Needed

Get these from your services:

### Supabase:
1. Go to Supabase Dashboard
2. Project Settings > API
3. Copy: Project URL and service_role key

### Cloudinary:
1. Go to Cloudinary Dashboard
2. Copy: Cloud name, API Key, API Secret

### JWT Secret:
Generate a random string:
```bash
openssl rand -base64 32
```

## Verification

Once deployed, test these endpoints:
- `GET https://your-url.onrender.com/` - Should return "PINIT API"
- `POST https://your-url.onrender.com/auth/biometric-register` - Should register users
- `POST https://your-url.onrender.com/auth/verify-face` - Should verify faces

## Success Indicators

- Backend health check passes
- Fingerprint registration stores data in Supabase
- Face verification works correctly
- Mobile app connects successfully
