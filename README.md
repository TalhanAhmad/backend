# Soket.io Chat Backend

## Environment

Create a `.env` file from `.env.example` and set these values before running or deploying the server:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-host>/<database-name>?retryWrites=true&w=majority
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=https://frontend-7lss0xhdr-talha-ahmad.vercel.app,http://localhost:5173
```

`MONGO_URI` must be set in your hosting provider's environment variables. The server does not commit real database credentials to GitHub.
Use a comma-separated `CLIENT_URL` list if you have both production and preview frontend domains.

## Run

```bash
npm install
npm run dev
```
