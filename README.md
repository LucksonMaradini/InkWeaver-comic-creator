<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1fQ8krTyl0PICKskuZ1-pQikhgjZ6K_RV

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set up the API key:
   - Create a `.env.local` file in the project root
   - Add your Gemini API key: `API_KEY=your_api_key_here`
   - The `.env.local` file is already gitignored for security
3. Run the app:
   `npm run dev`

## Deploy to Netlify

When deploying to Netlify, you'll need to configure the `API_KEY` environment variable:

1. Go to your Netlify site dashboard
2. Navigate to **Site configuration > Environment variables**
3. Add a new environment variable:
   - **Key**: `API_KEY`
   - **Value**: Your Gemini API key (e.g., `AIzaSyD7dJh0U7c1TLZiWk9ySD2v3WURrqbZWjE`)
   - **Scopes**: All deploy contexts (production, deploy previews, branch deploys)

The `netlify.toml` configuration file is already set up to use this environment variable during builds.

