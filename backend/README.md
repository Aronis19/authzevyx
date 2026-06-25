# Zevyx Auth Backend pro Render

Tenhle backend dela API pro web na GitHub Pages a zapisuje registrace do AuthMe MySQL databaze.

## Co zustava kde

- GitHub Pages: jen vzhled webu
- Render: API `/api/register`, `/api/login`, `/api/forgot-password`
- BlazeHost MySQL: AuthMe databaze
- Minecraft server: pouziva stejnou AuthMe tabulku

## Render nastaveni

1. Dej tuhle slozku do GitHub repozitare, idealne jako `backend`.
2. Na Renderu klikni `New` -> `Web Service`.
3. Vyber GitHub repo.
4. Nastav:

```text
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

5. V `Environment` nastav promenne:

```text
NODE_ENV=production
FRONTEND_ORIGIN=https://aronis19.github.io
MYSQL_HOST=mysql.blazehost.cz
MYSQL_PORT=3306
MYSQL_DATABASE=s867_authme
MYSQL_USER=u867_ElkYhyzLSA
MYSQL_PASSWORD=heslo_z_BlazeHost_panelu
AUTHME_TABLE=authme
HCAPTCHA_SECRET=secret_z_hCaptcha
```

Heslo k databazi a `HCAPTCHA_SECRET` nikdy nedavej do GitHub Pages ani do `index.html`.

## Test po nasazeni

Po deployi otevri:

```text
https://tvoje-render-url.onrender.com/health
```

Kdyz je databaze dostupna, vrati:

```json
{"ok":true}
```

## Endpointy

```text
POST /api/register
POST /api/login
POST /api/forgot-password
```

Registrace ceka JSON:

```json
{
  "username": "Hrac",
  "email": "hrac@email.cz",
  "password": "tajneheslo",
  "hcaptchaToken": "token_z_frontendu"
}
```

Login ceka JSON:

```json
{
  "identifier": "Hrac",
  "password": "tajneheslo",
  "hcaptchaToken": "token_z_frontendu"
}
```

AuthMe SHA256 hash je kompatibilni s nastavenim `passwordHash: SHA256`.
