# GitHub setup (one-time)

Git and GitHub CLI were not available in the automated build environment. Run these steps **in your own terminal** (Cursor terminal or PowerShell) where `git` and `gh` work.

## 1. Install tools (if needed)

- [Git for Windows](https://git-scm.com/download/win)
- [GitHub CLI](https://cli.github.com/) — then run `gh auth login`

## 2. Create repo and push

```powershell
cd "c:\Users\Mohsin\Downloads\Parental Control Web App - Copy"
git init
git add -A
git commit -m "Initial commit: KidsGuard parental control (web + backend + child app)"
gh repo create parental-control-kidsguard --public --source=. --remote=origin --push
```

Use a different repo name if you prefer: `gh repo create YOUR-NAME --public --source=. --remote=origin --push`

## 3. Keep GitHub updated after changes

**Manual (recommended):**

```powershell
npm run github:sync
```

**Automatic (watches files, debounced push every ~45s):**

```powershell
npm run github:watch
```

Leave that window open while you work. Do not commit `.env` (it is in `.gitignore`).

## 4. Child APK

After building the child app, install the APK from:

`ChildApp\app\build\outputs\apk\debug\app-debug.apk`

(or the copy at project root `app-debug.apk`).

Build command:

```powershell
$env:JAVA_HOME = ".\ChildApp\jdk\jdk-17.0.19+10"
cd ChildApp
.\gradlew.bat assembleDebug
```
