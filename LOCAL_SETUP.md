# Al-Hidaya Madrasat - Local Setup

This package contains the public website, portal interface, Cloudflare D1 schema, migrations, API routes and visual assets.

## Requirements

- Node.js 22.13 or later
- npm 10 or later
- Git (recommended)

## Windows setup

Open PowerShell in the extracted project folder:

```powershell
npm ci
npm run db:local:migrate
npm run dev
```

Open the local address shown in the terminal, normally `http://localhost:5173`.

## Application and parent-announcement emails

The admissions API sends confirmation receipts through Resend. Announcements
for **Everyone** or **Parents only** are also emailed individually to the
guardians of actively enrolled pupils. Staff-only announcements remain in the
portal. Copy
`.dev.vars.example` to `.dev.vars`, then replace the placeholder with your
Resend API key:

```powershell
Copy-Item .dev.vars.example .dev.vars
```

Verify `alhidayaislamiccentre.org` in Resend before using
`admissions@alhidayaislamiccentre.org`. The `.dev.vars` file is ignored by Git
and must never be committed or included in a source package.

If email is not configured or delivery fails, the application remains saved in
D1 and the parent is told to retain the displayed application reference. An
announcement also remains published in the portal when email delivery fails;
the administrator sees the delivery outcome after publishing.

## macOS or Linux setup

```bash
npm ci
npm run db:local:migrate
npm run dev
```

## Main locations

- `app/page.tsx` - public Al-Hidaya website
- `app/portal/` - management portal
- `app/api/applications/route.ts` - public admissions endpoint
- `db/schema.ts` - D1/SQLite database model
- `drizzle/` - generated D1 migrations
- `public/` - logo, carousel and sharing images
- `.openai/hosting.json` - Cloudflare Sites binding declaration
- `wrangler.local.jsonc` - local D1 configuration

## Database workflow

After changing `db/schema.ts`, generate a new migration and apply it locally:

```powershell
npm run db:generate
npm run db:local:migrate
```

Do not edit an already deployed migration. Add a new migration for every later schema change.

## Production build

```powershell
npm run build
```

The secured portal reads admissions, students, guardians, classes, enrolments,
attendance, fees, payments, user accounts, announcements and safeguarding
records from D1. Dashboards and reports are scoped to the signed-in account's
role. The fees module currently records offline payments; it does not yet take
online card payments.

## One-time administrator setup

After applying the migrations, set a long random `ADMIN_SETUP_TOKEN` in `.dev.vars` and start the app. In a second PowerShell window run:

```powershell
$headers = @{ "Content-Type" = "application/json"; "x-setup-token" = "your-long-random-setup-token" }
$body = @{ email = "your@email.example"; fullName = "Your Name"; password = "ChooseA_StrongPassword1" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5173/api/auth/setup" -Method Post -Headers $headers -Body $body
```

Use your own details and the exact token from `.dev.vars`. Setup is automatically disabled after the first credential is created. Remove `ADMIN_SETUP_TOKEN`, restart the server, then sign in at `http://localhost:5173/portal`.

## Before a separate Cloudflare deployment

The included `.openai/hosting.json` identifies the current managed site. If you create an entirely separate Cloudflare project, replace its project identity through the chosen deployment workflow while retaining the logical D1 binding name `DB`. Never commit database credentials or secrets.

## Upgrading from an earlier version

To retain your existing local administrator and application data, copy these two local-only items from the old project folder into this version before starting it:

```powershell
Copy-Item "C:\path\to\your-previous-version\.dev.vars" ".\.dev.vars"
Copy-Item "C:\path\to\your-previous-version\.wrangler" ".\.wrangler" -Recurse
```

Then run:

```powershell
npm ci
npm run db:local:migrate
npm run dev
```

Version 10.5 adds migration `0003_operations_backend.sql`. It enables mandatory
password changes for newly created accounts and adds database constraints for
fee accounts and payment references. `npm run db:local:migrate` applies it while
retaining the administrator, applications, students and other data copied in
the `.wrangler` folder.

Version 10.6 adds immediate teacher-assignment count updates and parent email
delivery for announcements. It requires no additional D1 migration.

Version 10.7 adds the production GitHub/Cloudflare configuration. Follow
`CLOUDFLARE_DEPLOYMENT.md` for the new D1 database, automated Git deployment
and production secrets.

## Portal account workflow

Administrators create staff and parent accounts under **Staff & access**. Every
new account receives a temporary password and must choose a new password on its
first sign-in. A parent account can only be created for a guardian who is not
already linked to another account.

Teacher and finance access is deliberately narrower than administrator access:

- teachers see their assigned classes, pupils, attendance, announcements,
  reports and safeguarding work;
- finance users see students, fees, announcements and finance reports; and
- parents see only their linked children, attendance, fee accounts and parent
  announcements.
