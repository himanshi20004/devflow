# DevFlow

A small MERN app for tracking projects and their build status, with a complete CI/CD pipeline around it.

- **Frontend:** React (Vite), served by nginx in Docker
- **Backend:** Node.js + Express, JWT auth, Mongoose
- **Database:** MongoDB
- **CI/CD:** GitHub Actions, images stored in GitHub Container Registry
- **Hosting (all free tiers):** MongoDB Atlas M0, Render (backend + static frontend)

## Project layout

```
devflow/
├── backend/            Express API + Jest tests + Dockerfile
├── frontend/           React app + Vitest tests + Dockerfile
├── scripts/
│   ├── wait-for-health.sh   polls /health (optionally for a specific version)
│   └── rollback.sh          redeploys the last "stable" image
├── .github/workflows/
│   ├── ci-cd.yml            test -> build image -> deploy -> rollback on failure
│   └── monitor.yml          checks /health every 10 min, rolls back if down
└── docker-compose.yml       run the whole stack locally
```

## API

| Method | Route                | Auth | What it does                  |
|--------|----------------------|------|-------------------------------|
| GET    | /health              | no   | status, app version, uptime   |
| POST   | /api/auth/register   | no   | create account, returns JWT   |
| POST   | /api/auth/login      | no   | log in, returns JWT           |
| GET    | /api/auth/me         | yes  | current user                  |
| GET    | /api/projects        | yes  | list your projects            |
| POST   | /api/projects        | yes  | create a project              |
| PUT    | /api/projects/:id    | yes  | update name, repo or status   |
| DELETE | /api/projects/:id    | yes  | delete a project              |

`/health` returns 503 when MongoDB is not connected, which is what the pipeline and monitor rely on.

---

## 1. Run locally

### Option A: Docker (easiest)

```bash
docker compose up --build
```

Open http://localhost:3000. API is at http://localhost:5000.

### Option B: without Docker

You need Node 20+ and a MongoDB running on localhost:27017
(`docker run -d -p 27017:27017 mongo:7` is the quickest way).

```bash
# terminal 1
cd backend
cp .env.example .env
npm install
npm run dev

# terminal 2
cd frontend
cp .env.example .env
npm install
npm run dev
```

## 2. Run the tests

Backend tests use a real MongoDB (database `devflow_test`), so start one first:

```bash
docker run -d -p 27017:27017 mongo:7      # skip if Mongo is already running

cd backend && npm install && npm test     # 19 tests
cd ../frontend && npm install && npm test # 6 tests
```

To point the backend tests somewhere else, set `MONGO_URI_TEST`.

---

## 3. Put it on GitHub

```bash
git init
git add .
git commit -m "DevFlow first commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Keep the repository **public**. GitHub Actions minutes are unlimited for public repos,
and the 10-minute monitor would use up the private-repo free quota.

The first push runs the tests and builds and pushes the backend image. The deploy jobs are
skipped until you finish step 4 (they only run once the `BACKEND_URL` variable exists).

## 4. Deploy for free

### 4.1 Database: MongoDB Atlas

1. Create a free account at mongodb.com/atlas and make a free **M0** cluster.
2. Database Access: add a user with a password.
3. Network Access: add `0.0.0.0/0` (Render's free tier has no fixed IP).
4. Connect > Drivers: copy the connection string and put the database name in it, e.g.
   `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/devflow`

### 4.2 Make the backend image public

After the first pipeline run, go to your GitHub profile > **Packages** > `<repo>/backend`
> Package settings > Change visibility > **Public**. (Render pulls it without credentials.)

### 4.3 Backend on Render

1. render.com > New > **Web Service** > *Existing image*.
2. Image URL: `ghcr.io/<your-github-username-lowercase>/<repo-lowercase>/backend:latest`
3. Instance type: **Free**.
4. Environment variables:
   - `MONGO_URI` = your Atlas string
   - `JWT_SECRET` = a long random string (`openssl rand -hex 32`)
   - `CLIENT_URL` = your frontend URL (fill this in after 4.4, then redeploy)
5. Advanced > Health Check Path: `/health`
6. Create the service. Then Settings > copy the **Deploy Hook** URL.
7. Note the service URL, e.g. `https://devflow-api.onrender.com`

### 4.4 Frontend on Render

1. New > **Static Site**, connect your GitHub repo.
2. Root directory: `frontend`, build command: `npm ci && npm run build`, publish directory: `dist`
3. Environment variable: `VITE_API_URL` = your backend URL from 4.3 (no trailing slash)
4. Add a rewrite rule: source `/*`, destination `/index.html`, action *Rewrite*
5. Settings > Build & Deploy > set **Auto-Deploy** to *No* (the pipeline triggers it instead).
6. Copy this site's **Deploy Hook** URL.
7. Go back to the backend service and set `CLIENT_URL` to this site's URL.

### 4.5 Connect GitHub to Render

In your GitHub repo: Settings > Secrets and variables > Actions.

Secrets:
- `RENDER_BACKEND_DEPLOY_HOOK`: backend deploy hook URL
- `RENDER_FRONTEND_DEPLOY_HOOK`: frontend deploy hook URL

Variables:
- `BACKEND_URL`: e.g. `https://devflow-api.onrender.com`

Also check Settings > Actions > General > Workflow permissions is set to
**Read and write permissions** (needed to push images).

Push any commit to `main` and watch the Actions tab.

---

## How the pipeline works

**On every pull request and push to main**
1. Backend tests run against a MongoDB service container.
2. Frontend tests run, then the production build.
3. The backend Docker image is built (so a broken Dockerfile fails early).

**Only on push to main**
4. The image is pushed to GHCR tagged with the commit SHA and `latest`.
   The SHA is baked into the image, so `/health` reports which commit is running.
5. Render is told to deploy exactly that SHA.
6. The pipeline polls `/health` until it returns 200 **and** reports the new SHA
   (up to ~10 minutes, to allow for free-tier cold starts).
7. If healthy, that image is re-tagged `stable` and the frontend deploy is triggered.

## Monitoring and rollback

- **During deploys:** if step 6 times out, the `rollback-backend` job redeploys the
  `stable` image (the last one that passed a health check).
- **After deploys:** `monitor.yml` calls `/health` every 10 minutes. If it fails after retries,
  it rolls back to `stable` and marks the run as failed, so GitHub emails you.
  The regular pings also keep Render's free instance from sleeping most of the time.
- **Docker:** the backend image has a `HEALTHCHECK`, and docker-compose waits for Mongo to be healthy.
- **Logs:** request logs (morgan) show up in the Render dashboard.
- **Frontend:** Render keeps the old static site live if a new build fails.
  To roll back manually, use the Deploys tab > Rollback.
- **Manual backend rollback:** Actions tab > run any earlier successful workflow, or in Render
  redeploy an earlier image tag (every commit SHA is kept in GHCR).

## Trying out a rollback

Break `/health` on purpose in a branch (for example make it always return 503), merge to main,
and watch `deploy-backend` fail and `rollback-backend` bring back the previous version.

## Free-tier notes

- Render free web services sleep after 15 minutes without traffic and take ~1 minute to wake.
- Render's free static sites and Atlas M0 have no time limit; check their current limits before relying on them.
