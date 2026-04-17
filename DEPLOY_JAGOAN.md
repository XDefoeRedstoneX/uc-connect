# UC-Connect Deployment Guide

This project can run on multiple platforms. Use the Vercel guide below for your current target, and keep the Jagoan Hosting guide for an alternative deployment.

## Vercel + GitHub (Recommended)

This setup assumes your repository URL is:
- `https://github.com/XDefoeRedstoneX/uc-connect.git`

### 1) Connect Local Folder to GitHub
If this folder is not yet a git repository, run:

```bash
git init
git branch -M main
git remote add origin https://github.com/XDefoeRedstoneX/uc-connect.git
git add .
git commit -m "chore: prepare UC-Connect for Vercel"
git push -u origin main
```

If it is already a git repository and `origin` is not set correctly:

```bash
git remote remove origin
git remote add origin https://github.com/XDefoeRedstoneX/uc-connect.git
git push -u origin main
```

### 2) Vercel Project Import
1. Open Vercel Dashboard > `Add New...` > `Project`.
2. Import `XDefoeRedstoneX/uc-connect`.
3. Framework preset: `Other`.
4. Root directory: project root (`stitch_uc_connect` if monorepo; otherwise repository root).
5. Leave build command empty.

### 3) Environment Variables in Vercel
Set these in Project Settings > Environment Variables:
- `NODE_ENV=production`
- `DB_HOST=<your-mysql-host>`
- `DB_PORT=3306`
- `DB_USER=<your-db-user>`
- `DB_PASSWORD=<your-db-password>`
- `DB_NAME=uc_connect`

Notes:
- Do not set `PORT` manually on Vercel.
- Use a cloud MySQL host reachable from the public internet (PlanetScale, Aiven, Railway, Neon+MySQL-compatible service, or your own hosted MySQL with IP allowlisting).

### 4) Database Initialization
Initialize your production database before testing:
1. Import `schema.sql`
2. Import `seed.sql`

### 5) Deploy
- Click `Deploy` in Vercel.
- Every push to `main` will auto-deploy after GitHub is connected.

### 6) Verify Production
Test these URLs on your Vercel domain:
- `/`
- `/api/health` -> should return `{ "ok": true, ... }`
- `/login`, `/register`, `/directory`, `/community`, `/profile`
- Legacy route redirect check: `/authentication_login_register/code.html` should redirect to `/login`

### 7) Files Added for Vercel Support
- `vercel.json` (routes every request to Node function)
- `api/index.js` (Vercel function entrypoint)
- `server.js` updated to export the Express app for serverless usage

## Jagoan Hosting (Alternative)

This guide is for deploying the same Node.js + MySQL app on Jagoan Hosting.

## 1) Use the Right Package
- Choose `Node.js Hosting` (recommended) or a VPS plan.
- Do not use plain static/shared-only hosting for this app backend.

## 2) Create Production Database in cPanel
- Open cPanel > MySQL Databases.
- Create database: `uc_connect`
- Create user (example): `uc_connect_user`
- Set a strong password.
- Assign user to database with all privileges.

## 3) Import Schema and Seed
- Open phpMyAdmin.
- Select database `uc_connect`.
- Import in order:
  1. `schema.sql`
  2. `seed.sql`

## 4) Upload Project Files
Upload this folder to your Node app directory:
- `server.js`
- `db.js`
- `package.json`
- all HTML page folders
- `index.html`
- `schema.sql`, `seed.sql` (optional after first import)

Do not upload `.env` to public web root if your panel exposes static root publicly.

## 5) Configure Environment Variables
In Node.js App Manager (or equivalent), set:
- `NODE_ENV=production`
- `PORT=3000` (or panel-provided port)
- `DB_HOST=127.0.0.1` (or DB host provided by Jagoan)
- `DB_PORT=3306`
- `DB_USER=uc_connect_user`
- `DB_PASSWORD=<your-db-password>`
- `DB_NAME=uc_connect`

## 6) Install Dependencies
From terminal in project directory:

```bash
npm install --omit=dev
```

## 7) Start Application
- Startup file: `server.js`
- Start command: `npm start`

If your panel asks for app URL/base path, use your domain root.

## 8) Verify Deployment
Test:
- `/` should load homepage.
- `/api/health` should return `{"ok":true,"databaseReady":true}`.
- Login/Register pages should submit without errors.

Clean route checks:
- `/login`, `/register`, `/directory`, `/community`, `/profile` should all return `200`.
- Legacy links like `/authentication_login_register/code.html` should redirect to `/login`.

## 9) Security Notes
- Never use `root` DB user in production.
- Never leave DB password empty in production.
- Keep `.env` private and outside public path where possible.

## 10) Route & Error Handling Notes
- Route constants are centralized in `routes.js`.
- Legacy `.../code.html` links are redirected to clean URLs (301) in `server.js`.
- Browser 404 requests render `404.html`, while API 404 uses JSON.

## 11) Optional Local Development
For local dev only, you can still use Docker + root without password via `docker-compose.yml`.
This is not recommended for production.
