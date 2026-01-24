# Deployment Guide

## Deploy to Netlify

This app is configured for easy deployment to Netlify.

### Prerequisites

1. A [Netlify account](https://app.netlify.com/signup)
2. Your Supabase credentials ready

### Deployment Steps

#### Option 1: Deploy via Netlify UI (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Go to [Netlify](https://app.netlify.com) and click "Add new site" → "Import an existing project"

3. Connect your Git provider and select your repository

4. Netlify will auto-detect the build settings from `netlify.toml`, but verify:
   - **Build command:** `npm run build:web`
   - **Publish directory:** `dist`

5. Add environment variables:
   - Click "Site configuration" → "Environment variables"
   - Add the following variables:
     - `EXPO_PUBLIC_SUPABASE_URL` = Your Supabase URL
     - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anon key
     - `EXPO_PUBLIC_APP_URL` = Your Netlify URL (you'll update this after first deploy)

6. Click "Deploy site"

7. Once deployed, copy your Netlify URL (e.g., `https://your-site.netlify.app`)

8. Update the `EXPO_PUBLIC_APP_URL` environment variable with your Netlify URL

9. Add a custom domain (optional):
   - Go to "Site configuration" → "Domain management"
   - Click "Add domain alias"
   - Follow the DNS configuration steps

#### Option 2: Deploy via Netlify CLI

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```bash
   netlify login
   ```

3. Initialize your site:
   ```bash
   netlify init
   ```

4. Set environment variables:
   ```bash
   netlify env:set EXPO_PUBLIC_SUPABASE_URL "your-supabase-url"
   netlify env:set EXPO_PUBLIC_SUPABASE_ANON_KEY "your-anon-key"
   netlify env:set EXPO_PUBLIC_APP_URL "your-netlify-url"
   ```

5. Deploy:
   ```bash
   netlify deploy --prod
   ```

### After Deployment

1. **Update Environment Variables:**
   - Update `EXPO_PUBLIC_APP_URL` in Netlify to match your deployed URL
   - This is CRITICAL for password reset emails to work
   - Go to: Site configuration → Environment variables
   - Change `EXPO_PUBLIC_APP_URL` from the Bolt URL to your Netlify URL
   - Example: `https://your-app-name.netlify.app`
   - Redeploy after updating

2. **Configure Supabase URL Redirects:**
   - Go to your [Supabase Dashboard](https://app.supabase.com)
   - Navigate to: Authentication → URL Configuration
   - Add your Netlify URL to "Redirect URLs":
     - `https://your-app-name.netlify.app/**`
   - This allows password reset and other auth flows to redirect properly

3. **Test Your App:**
   - Visit your Netlify URL
   - Test sign up and sign in
   - Test password reset flow (it should now work!)
   - Try creating a feedback request
   - Test the feedback submission flow on mobile

4. **Custom Domain (Optional):**
   - In Netlify dashboard: Site configuration → Domain management
   - Add your custom domain
   - Update `EXPO_PUBLIC_APP_URL` in environment variables to your custom domain
   - Update Supabase redirect URLs to include your custom domain
   - Update DNS records as instructed by Netlify

### Continuous Deployment

Once connected to your Git repository, Netlify will automatically deploy when you push changes to your main branch.

### Troubleshooting

- **404 errors:** The `netlify.toml` file includes redirects for client-side routing. If you still see 404s, check that the file is in your repository root.

- **Environment variables not working:** Make sure you've set all three required variables and redeployed after setting them.

- **Build failures:** Check the Netlify build logs for specific errors. Common issues:
  - Missing dependencies: Run `npm install` locally first
  - Node version: Netlify uses Node 18 by default, which should work fine

- **Password reset links not working ("site can't be reached"):**
  This happens when `EXPO_PUBLIC_APP_URL` is not set to your deployed URL. To fix:
  1. Deploy your app to Netlify first
  2. Copy your Netlify URL (e.g., `https://your-app.netlify.app`)
  3. Update `EXPO_PUBLIC_APP_URL` in Netlify environment variables
  4. Add the URL to Supabase redirect URLs (see "Configure Supabase URL Redirects" above)
  5. Redeploy your site
  6. Test password reset again - it should now work!

### Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | `eyJhbGc...` |
| `EXPO_PUBLIC_APP_URL` | Your deployed app URL | `https://yourapp.netlify.app` |

### Next Steps

After deployment, you can:
- Share feedback request links from your mobile app
- Recipients can open links on any device (mobile/desktop)
- All feedback is stored securely in Supabase
- View aggregated insights in the Growth tab
