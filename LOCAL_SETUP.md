# Local administrator sign-in

If a copied local database contains an administrator password created with the older PBKDF2 setting, add the following to `.dev.vars`:

```text
LOCAL_DEV_LOGIN=enabled
LOCAL_DEV_ADMIN_EMAIL=your-admin-email@example.com
LOCAL_DEV_ADMIN_PASSWORD=Choose-A-Strong-Password1
LOCAL_DEV_ADMIN_NAME=Local Administrator
```

Restart `npm run dev`, then sign in once using exactly those credentials. The app repairs or creates that administrator in the local D1 database using the Cloudflare-compatible password format.

After the first successful login, set `LOCAL_DEV_LOGIN=disabled` or remove the four `LOCAL_DEV_*` lines and restart the server. This facility runs only for `localhost`, `127.0.0.1`, or `::1`; it is ignored in production.
