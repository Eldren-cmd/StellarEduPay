# Database migrations

Schema/data migrations live in [`backend/migrations/`](../backend/migrations).
Each file exports a `version` string plus `up()` (and optionally `down()`)
functions. They are executed in filename order by
[`backend/src/services/migrationRunner.js`](../backend/src/services/migrationRunner.js).

## How migrations run

There is a single entrypoint used everywhere:

```bash
# from the backend/ directory (or inside the container, where WORKDIR=/app)
npm run migrate            # apply all pending migrations
npm run migrate:rollback   # roll back the last applied migration
```

`runMigrations()` claims each migration atomically using the unique index on
`Migration.version` as a distributed lock, so it is **safe to run concurrently
from multiple instances** — only one applies a given migration and the rest
skip it. If a migration throws, its lock document is removed and the process
exits non-zero so the failure is loud and the deploy is blocked.

If the `migrations/` directory is missing entirely, `runMigrations()` throws
rather than silently returning — a missing directory means a broken image or
checkout, not "nothing to do".

## Where it runs automatically in the deployment pipeline

Migrations are wired into every deployment topology this repo describes, so a
new release's migrations are always applied **before traffic reaches the new
version**:

| Topology | Mechanism |
| --- | --- |
| Kubernetes (`deploy/k8s/backend-deployment.yaml`) | An `initContainer` runs `npm run migrate` to completion before the app container starts. A failed migration leaves the pod un-Ready and blocks the rollout. |
| Docker Compose (`docker-compose.yml`) | The `backend` service command is `sh -c "npm run migrate && npm start"`, so the server only starts after migrations succeed. |
| Local development | Run `npm run migrate` from `backend/` after pulling changes that add migration files. |

## Image contents

The production image **must** contain the migration files and the migration
CLI. [`backend/Dockerfile`](../backend/Dockerfile) copies both:

```dockerfile
COPY migrations/ ./migrations/
COPY scripts/ ./scripts/
```

Without these, `npm run migrate` cannot run and `runMigrations()` fails loudly
by design.
