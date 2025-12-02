
# Markdown To Jira

This was created to deal with the fact that I cannot paste my markdown content as a comment in JIRA.
If I copy my markdown into this converter and then paste the comment I can.

[website](https://jadujoel.github.io/markdown-to-jira/)

## Prerequisites

- **Bun** (version 1.2.11 or later) - Required for installing dependencies and running development commands
- **Node.js** (version 18 or later) - For compatibility

### Installing Bun

If you don't have Bun installed, you can install it using one of these methods:

**macOS/Linux:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows:**
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Or visit the [official Bun installation guide](https://bun.sh/docs/installation) for more options.

## Development

Install dependencies:
```bash
bun install
```

Start local webpage:
```bash
bun serve.ts
```

## Deployment to GitHub Pages

This repository includes a GitHub Actions workflow that automatically builds and deploys the site to GitHub Pages.

### Setup Instructions

1. **Enable GitHub Pages in your repository:**
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Pages**
   - Under **Source**, select **GitHub Actions**

2. **Push the workflow file:**
   - The workflow file (`.github/workflows/deploy.yml`) is already included
   - Commit and push to your repository:
     ```bash
     git add .github/workflows/deploy.yml
     git commit -m "Add GitHub Pages deployment workflow"
     git push
     ```

3. **Automatic deployment:**
   - The site will automatically build and deploy when you push to the `main` branch
   - You can also manually trigger deployment from the **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**

4. **Access your site:**
   - After deployment completes, your site will be available at:
     `https://YOUR_USERNAME.github.io/markdown-to-jira/`
   - Replace `YOUR_USERNAME` with your GitHub username

### Manual Build

To build the project locally:
```bash
bun run build.ts
```

The built files will be in the `dist/` directory, which you can deploy to any static hosting service.
