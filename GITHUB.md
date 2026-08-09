# Host FinFlow on GitHub + auto-deploy on every push

This project ships with a GitHub Actions workflow (`.github/workflows/deploy.yml`)
that builds the app and publishes it to **GitHub Pages** automatically. After the
one-time setup below, your workflow is simply:

```bash
git add .
git commit -m "update"
git push
```

…and about a minute later the live site reflects your change.

---

## One-time setup

### 1. Create the repository on GitHub
Go to https://github.com/new, name it (e.g. `finflow`), leave it empty
(no README/gitignore — this project already has them), and click **Create**.

### 2. Push this project
From inside the `finflow` folder on your Mac:

```bash
git init
git add .
git commit -m "Initial commit: FinFlow"
git branch -M main
git remote add origin https://github.com/<your-username>/finflow.git
git push -u origin main
```

Replace `<your-username>` with your GitHub username.

### 3. Turn on GitHub Pages (source = Actions)
In the repo on GitHub: **Settings → Pages → Build and deployment →
Source: “GitHub Actions.”**

That's it. The first push triggers the workflow. Watch it under the **Actions**
tab. When it finishes green, your app is live at:

```
https://<your-username>.github.io/finflow/
```

---

## Making updates later

Edit code, then:

```bash
git add .
git commit -m "describe your change"
git push
```

The Action rebuilds and redeploys automatically — no manual build or upload.

---

## Notes

- **No build needed on your machine to deploy.** GitHub's servers run `npm ci` and
  `npm run build` for you. (You still run `npm run dev` locally to preview while editing.)
- **Routing & paths just work on the `/finflow/` subpath** because the app uses hash
  routing and relative asset paths.
- **Your financial data stays in your browser** (IndexedDB) — it is never committed to
  the repo or uploaded to GitHub. Only the app code is hosted.
- **Custom domain:** Settings → Pages → Custom domain, if you ever want one (free).
- **Private repo?** GitHub Pages works with private repos on free accounts too; the
  published *site* is public, but your source can stay private.
