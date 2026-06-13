# Terraform — AWS environment

Stands up a complete cloud environment for SiteCRM:

```
                        ┌──────────────────────────────────────────────┐
 Browser ──► CloudFront │  default        → S3 (built web app, OAC)    │
                        │  /api/*, /docs* → API Gateway (HTTP API)     │
                        └───────────────────────┬──────────────────────┘
                                                │ VPC link + Cloud Map
                                       ┌────────▼─────────┐
                                       │ ECS Fargate: API │  ← image from ECR
                                       └────────┬─────────┘
                                                │ 5432 (SG-to-SG)
                                       ┌────────▼─────────┐
                                       │ RDS PostgreSQL   │  ← private subnets
                                       └──────────────────┘
```

Because CloudFront forwards `/api/*` to API Gateway, the deployed frontend
uses the **same relative URLs** as in development — no build-time API
endpoint configuration, no CORS.

| File                          | What it defines                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `network.tf`                  | VPC, public/private subnets, the SG chain (VPC link → API → DB).                   |
| `database.tf`                 | RDS PostgreSQL + `DATABASE_URL` and `JWT_SECRET` secrets in Secrets Manager.       |
| `backend-service.tf`          | ECR repos (api + intelligence), ECS Fargate cluster/service, Cloud Map, IAM, logs. |
| `api-gateway.tf`              | HTTP API, VPC link, catch-all proxy route.                                          |
| `static-site.tf`              | Private S3 bucket, CloudFront (two origins), SPA rewrite function.                 |
| `variables.tf` / `outputs.tf` | Inputs (all defaulted) and deploy-workflow outputs.                                |
| `modules/static-site/`        | Reusable S3 + CloudFront module for generated client static sites.                  |
| `modules/server-app/`         | Reusable ECS + optional RDS module for generated client server apps.               |

## Prerequisites

- Terraform ≥ 1.9, AWS CLI v2, Docker
- AWS credentials with admin-ish rights in the target account
  (`aws sts get-caller-identity` should work)

## First deployment

```bash
cd terraform
terraform init
terraform apply                  # ~10–15 min; CloudFront is the slow part
```

The ECS service starts **before any image exists in ECR**, so tasks fail to
launch until you push one — that's expected. Build and push (from the repo
root; same Dockerfiles docker compose uses):

```bash
AWS_REGION=$(terraform -chdir=terraform output -raw api_gateway_url | cut -d. -f3)
ECR_API=$(terraform -chdir=terraform output -raw ecr_repository_url)
ECR_INT=$(terraform -chdir=terraform output -raw ecr_intelligence_repository_url)

aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "${ECR_API%%/*}"

# API (Node/Fastify)
docker build -f apps/server/Dockerfile -t "$ECR_API:latest" .
docker push "$ECR_API:latest"

# Intelligence API (Playwright base image — larger, build separately)
docker build -f apps/intelligence/Dockerfile -t "$ECR_INT:latest" .
docker push "$ECR_INT:latest"
```

> Building on Apple Silicon or another ARM machine? The task definition
> expects `X86_64` — build with `docker buildx build --platform linux/amd64`.

Set the JWT secret before or after the first apply:

```bash
export TF_VAR_jwt_secret=$(openssl rand -hex 32)
terraform -chdir=terraform apply   # updates the Secrets Manager entry only
```

ECS picks the image up on its next launch attempt (or force it):

```bash
aws ecs update-service --cluster "$(terraform -chdir=terraform output -raw ecs_cluster_name)" \
  --service api --force-new-deployment --region "$AWS_REGION"
```

Then build and upload the web app:

```bash
npm run build -w @sitecrm/web
aws s3 sync apps/web/dist "s3://$(terraform -chdir=terraform output -raw web_bucket)" --delete
```

Open the site: `terraform -chdir=terraform output -raw web_url`

## Redeploying changes

| What changed   | What to run                                                                                                                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API code       | rebuild + push the image, then the `update-service` command above                                                                                                                                                 |
| Web app        | `npm run build -w @sitecrm/web`, the `s3 sync` command, then invalidate: `aws cloudfront create-invalidation --distribution-id $(terraform -chdir=terraform output -raw cloudfront_distribution_id) --paths "/*"` |
| Infrastructure | edit `.tf` files, `terraform apply`                                                                                                                                                                               |

## Tearing down

```bash
terraform destroy
```

Everything is destroyable in one shot by design (dev-grade settings:
`skip_final_snapshot`, `force_delete`/`force_destroy`, secret recovery
window 0). **Those same settings mean destroy deletes the database without
a snapshot** — flip the settings flagged `prod:` in the `.tf` files before
trusting this configuration with data you care about.

## Design decisions & costs

- **No NAT gateway, no load balancer.** ECS tasks live in public subnets
  (locked down by security group — only the API Gateway VPC link can reach
  port 3000) and API Gateway discovers them via Cloud Map. This trades two
  always-on costs (~$50/mo combined) for a setup that suits a single small
  service. Add an ALB + private subnets + NAT when the service count or
  traffic justifies it.
- **Secrets**: the database password and JWT signing key never appear in
  task definitions or the console — ECS injects `DATABASE_URL` and
  `JWT_SECRET` from Secrets Manager at start. Both _do_ live in the
  Terraform state file; use a remote backend with encryption for anything
  shared or production-grade.
- **Schema management**: Drizzle migrations (`db:migrate`) run inside the
  ECS task on startup, so no separate migration step is needed in the
  deploy flow. Add a pre-deploy migration job if zero-downtime migrations
  become a concern.
- Rough steady-state cost with defaults, us-east-1: RDS db.t4g.micro
  ~$13/mo, Fargate 0.25 vCPU ~$9/mo, everything else cents at dev traffic
  — **~$25/mo**.
