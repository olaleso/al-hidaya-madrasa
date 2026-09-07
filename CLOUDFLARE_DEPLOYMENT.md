# GitHub and Cloudflare deployment

This project deploys as a Cloudflare Worker with a D1 database. The Worker name
must remain `al-hidaya-madrasa` so it matches the Cloudflare project created
from the GitHub repository.

## 1. Create the production D1 database

From PowerShell in the project folder, authenticate and create the database:

```powershell
npx wrangler login
npx wrangler d1 create al-hidaya-madrasat-db
```

Copy the `database_id` shown by Wrangler. It is an identifier, not a secret.

## 2. Validate and migrate production D1

Set the database ID only for the current PowerShell window:

```powershell
$env:CLOUDFLARE_D1_DATABASE_ID = "paste-database-id-here"
$env:CLOUDFLARE_D1_DATABASE_NAME = "al-hidaya-madrasat-db"
npm run build
npm run db:remote:migrate
```

Confirm all migrations before continuing. Do not use `--local` for the
production database.

## 3. Push the source to GitHub

The repository is `https://github.com/olaleso/al-hidaya-madrasa.git`.

```powershell
git init
git add .
git commit -m "Initial Al-Hidaya Madrasah production release"
git branch -M main
git remote add origin https://github.com/olaleso/al-hidaya-madrasa.git
git push -u origin main
```

If `origin` already exists, use `git remote set-url origin` instead of
`git remote add origin`.

## 4. Connect Cloudflare Workers Builds

In Cloudflare, create or connect a Worker from the GitHub repository using:

- Worker name: `al-hidaya-madrasa`
- Production branch: `main`
- Root directory: `/`
- Build command: `npm ci && npm run build`
- Deploy command: `npx wrangler deploy --config dist/server/wrangler.json`

Add these build variables before the first deployment:

- `CLOUDFLARE_D1_DATABASE_ID`: the production D1 database ID
- `CLOUDFLARE_D1_DATABASE_NAME`: `al-hidaya-madrasat-db`

Every later push to `main` will build and deploy automatically.

## 5. Add runtime secrets

In the deployed Worker's **Settings > Variables and Secrets**, add:

- `RESEND_API_KEY` as an encrypted secret
- `ADMIN_SETUP_TOKEN` as a temporary encrypted secret for the first admin only

`EMAIL_FROM` is optional because the application already defaults to
`Al-Hidaya Madrasah <admissions@alhidayaislamiccentre.org>`.

Create the production administrator through `/api/auth/setup`, then delete
`ADMIN_SETUP_TOKEN` and redeploy or restart the Worker. Never commit `.dev.vars`
or any API key to GitHub.
