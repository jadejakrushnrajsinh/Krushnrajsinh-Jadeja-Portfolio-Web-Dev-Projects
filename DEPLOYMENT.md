# Portfolio Deployment Guide - Railway

## Prerequisites

- Railway account (https://railway.app)
- Git repository (GitHub/GitLab)
- MongoDB database (Railway provides or use MongoDB Atlas)

## Step 1: Prepare Your Code

Your project is already configured for Railway with `railway.json`. Make sure you have:

- ✅ `railway.json` configuration file
- ✅ `package.json` with dependencies
- ✅ All source code committed to Git

## Step 2: Set Up Railway Project

1. Go to https://railway.app and sign up/login
2. Click "New Project"
3. Choose "Deploy from GitHub" or "Deploy from GitLab"
4. Connect your repository
5. Railway will automatically detect your Node.js app

## Step 3: Set Up Database

### Option A: Use Railway's MongoDB (Recommended)

1. In your Railway project, click "Add Plugin"
2. Search for "MongoDB" and add it
3. Railway will automatically set the `MONGODB_URI` environment variable

### Option B: Use MongoDB Atlas

1. Create account at https://cloud.mongodb.com
2. Create a free cluster
3. Get your connection string
4. Add it as `MONGODB_URI` in Railway environment variables

## Step 4: Configure Environment Variables

In your Railway project dashboard, go to "Variables" and add:

### Required Variables:

```
MONGODB_URI=mongodb://... (auto-set by Railway MongoDB or your Atlas URI)
JWT_SECRET=your-super-secure-jwt-secret-here
NODE_ENV=production
```

### Optional Variables (for email functionality):

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_TO=your-email@gmail.com
```

### Admin Setup:

```
ADMIN_EMAIL=jadejakrushnrajsinh99@gmail.com
ADMIN_PASSWORD=jadeja.kirtiba.12
```

## Step 5: Deploy

1. Push your code to your Git repository
2. Railway will automatically deploy when you push
3. Monitor the deployment logs in Railway dashboard
4. Once deployed, you'll get a URL like: `https://your-project-name.up.railway.app`

## Step 6: Test Your Deployment

1. Visit your Railway URL
2. Test the contact form (should work without rate limiting)
3. Test admin login at `/admin` with your credentials
4. Check all pages load properly

## Step 7: Custom Domain (Optional)

1. In Railway dashboard, go to "Settings" > "Domains"
2. Add your custom domain
3. Update DNS records as instructed
4. Update CORS origins in server.js for production

## Troubleshooting

- Check Railway deployment logs for errors
- Verify all environment variables are set
- Make sure MongoDB connection is working
- Test locally first: `npm start`

## Production Optimizations

- Update CORS origins in server.js to your domain
- Set up proper error monitoring
- Configure backup for MongoDB
- Set up SSL (Railway provides automatically)

## Cost Estimate

- Railway Hobby plan: ~$5/month
- MongoDB Atlas free tier: $0/month
- Total: ~$5/month for basic setup
