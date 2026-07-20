# Tennessee Leaders Action Platform — Site

Static site (HTML/CSS/JS) with three sections:

- **Action Plans** — PDF/PPT presentations for Zones 2–8.
- **Media & Press Release** — press release and article (Word).
- **Chat** — user signup (name, email, password) and group chat + private messages, using Firebase (Auth + Firestore).

The whole site sits behind a login gate ([login.html](login.html)): visitors must create an account or log in before they can view any page.

## 1. Create the Firebase project (free)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project.
2. Under **Build → Authentication → Sign-in method**, enable the **Email/Password** provider.
3. Under **Build → Firestore Database**, create a database (production mode).
4. Under **Firestore → Rules**, paste the contents of [`firestore.rules`](firestore.rules) from this repo and publish.
5. Under **Project settings (gear icon) → Your apps**, add a **Web** app (`</>`) and copy the `firebaseConfig` object.
6. Paste those values into [`js/firebase-config.js`](js/firebase-config.js), replacing the `REPLACE_...` placeholders.

These `firebaseConfig` keys are **not secret** — they're meant to live in the frontend; real security comes from the Firestore/Auth rules in step 4.

## 2. Push the site to GitHub

```bash
cd tlap-site
git init
git add .
git commit -m "TLAP site: action plans, press release, and chat"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## 3. Enable GitHub Pages

1. In your GitHub repo, go to **Settings → Pages**.
2. Under "Build and deployment", choose **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Save. Within a few minutes the site will be live at `https://<your-username>.github.io/<your-repo>/`.

## Notes

- The **Zone 6 Presentation.pptx** file (136 MB) exceeds GitHub's 100 MB limit, so `action-plans.html` links directly to Google Drive instead of hosting it in the repo.
- The Word viewer on "Media & Press Release" (Office Online) only works once the site is published publicly (not on `localhost`).
- Anyone with the link can create a chat account; if you later want to restrict access (e.g. only your organization's emails), extra validation can be added to the Firestore rules or the signup form.
