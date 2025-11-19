# Deployment Guide

This flight simulator has two parts that need to be deployed separately:

1. **Frontend** (React/Vite) - Can be deployed to Vercel
2. **Backend** (Express + Socket.io) - Needs a persistent server (Railway, Render, Fly.io, etc.)

## Frontend Deployment (Vercel)

### Step 1: Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Configure the build:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/public`
   - **Install Command**: `npm install`

### Step 2: Set Environment Variables

In Vercel dashboard, go to your project → Settings → Environment Variables:

- `VITE_API_URL`: Your backend API URL (e.g., `https://your-backend.railway.app`)
- `VITE_SOCKET_URL`: Your Socket.io server URL (e.g., `https://your-backend.railway.app`)

**Important**: Both should point to your backend server URL.

### Step 3: Redeploy

After setting environment variables, redeploy your app.

## Backend Deployment Options

### Option 1: Railway (Recommended)

1. Go to [railway.app](https://railway.app)
2. Create a new project from GitHub
3. Add your repository
4. Railway will auto-detect Node.js
5. Set the start command: `npm run start`
6. Railway will assign a public URL automatically

**Note**: Make sure your `package.json` has the build script that creates the backend bundle.

### Option 2: Render

1. Go to [render.com](https://render.com)
2. Create a new "Web Service"
3. Connect your GitHub repo
4. Settings:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start`
   - **Environment**: Node
5. Render will provide a public URL

### Option 3: Fly.io

1. Install Fly CLI: `npm install -g @fly/cli`
2. Run `fly launch` in your project root
3. Follow the prompts
4. Deploy with `fly deploy`

## Environment Variables for Backend

The backend doesn't need special environment variables for basic operation, but you may want to set:

- `PORT`: Port number (defaults to 5000, but hosting services usually provide PORT env var)
- `NODE_ENV`: Set to `production`

## CORS Configuration

The backend already has CORS enabled for all origins (`origin: "*"`), so it should work with any frontend URL.

## Testing Multiplayer

Once both are deployed:

1. Frontend URL: `https://your-app.vercel.app`
2. Backend URL: `https://your-backend.railway.app`

Make sure:
- Frontend has `VITE_API_URL` and `VITE_SOCKET_URL` pointing to backend
- Backend is running and accessible
- Players can join lobbies and see each other

## Local Development

For local development, the defaults work automatically:
- API calls go to `/api/lobbies` (same origin)
- Socket.io connects to same origin
- No environment variables needed

## Troubleshooting

**Frontend can't connect to backend:**
- Check environment variables in Vercel
- Verify backend URL is correct and accessible
- Check browser console for connection errors

**Socket.io connection fails:**
- Ensure `VITE_SOCKET_URL` is set correctly
- Backend must support WebSocket connections
- Check backend logs for connection attempts

**CORS errors:**
- Backend already allows all origins, but verify the CORS config in `server/routes.ts`

