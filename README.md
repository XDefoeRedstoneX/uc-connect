# UC Connect Website (Vercel Ready)

This project has been reorganized into a cleaner, deployment-ready structure for Vercel.

## Folder Structure

- `index.html`: main entry page with links to all screens
- `pages/`: all website page templates
  - `pages/auth/`: login and register pages
  - `pages/customer/`: customer profile pages
  - `pages/community/`: forum pages
  - `pages/directory/`: homepage, explore, vendor detail pages
  - `pages/vendor/`: vendor dashboard
  - `pages/admin/`: super admin page
- `docs/`: design documentation
- `database/`: SQL files
- `archive/legacy-folders/`: old folder names preserved (if any remained)
- `vercel.json`: route mapping for clean URLs on Vercel

## Local Run

Because this is a static site, you can run with any static server.

Example:

```bash
npx serve .
```

Then open the shown local URL.

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Keep default framework preset as `Other` (static project).
4. Deploy.

### Routes Available

- `/`
- `/auth/login`
- `/auth/register`
- `/customer/profile`
- `/customer/edit-profile`
- `/community/forum`
- `/community/thread-detail`
- `/directory/home`
- `/directory/explore`
- `/directory/vendor-detail`
- `/vendor/dashboard`
- `/admin/super-admin`
