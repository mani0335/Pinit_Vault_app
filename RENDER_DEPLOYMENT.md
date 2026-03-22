# Render Deployment Instructions

## Prerequisites
1. GitHub account with your repository pushed
2. Render.com account (free tier available)
3. MongoDB Atlas cluster (already configured)

## Step 1: Push Code to GitHub
```bash
git add .
git commit -m "Setup Render deployment with MongoDB"
git push origin main
```

## Step 2: Deploy on Render
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Fill in details:
   - **Name**: biovault-app
   - **Runtime**: Node
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && node index.js`
   - **Plan**: Free

5. Click "Create Web Service"
6. Wait for deployment (2-5 minutes)

## Step 3: Add Environment Variables in Render
1. Go to your biovault-app service settings
2. Click "Environment"
3. Add these variables:
   - **MONGODB_URI**: `mongodb+srv://manish:Manish%401614@cluster0.jwchpax.mongodb.net/biovault?appName=Cluster0&retryWrites=true&w=majority`
   - **MONGODB_DB**: `biovault`
   - **JWT_SECRET**: `biovault-secret-key-production`
   - **NODE_ENV**: `production`

4. Click "Save"
5. Render will auto-redeploy

## Step 4: Deploy Frontend
1. Same process, but:
   - **Name**: biovault-web
   - **Runtime**: Static Site
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - No environment variables needed

2. In the Static Site settings, add Route for API:
   - **Path**: `/api/*`
   - **Destination**: `https://biovault-app.onrender.com/api/:path`

## Step 5: Verify Deployment
- Backend: https://biovault-app.onrender.com/api/health
- Frontend: https://biovault-web.onrender.com

For more help: https://render.com/docs
