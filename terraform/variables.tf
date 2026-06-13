# Input variables. Everything has a development-grade default so a bare
# `terraform apply` works; see terraform.tfvars.example for overrides.

variable "project_name" {
  description = "Name prefix for every resource (lowercase, hyphenated)."
  type        = string
  default     = "sitecrm"
}

variable "environment" {
  description = "Environment label (dev/staging/prod); part of resource names and tags."
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "us-east-1"
}

# ----------------------------------------------------------- intelligence ----

variable "intelligence_image_tag" {
  description = "Tag of the Intelligence API image in its ECR repository."
  type        = string
  default     = "latest"
}

variable "intelligence_desired_count" {
  description = "Number of Intelligence tasks. 1 is fine for dev."
  type        = number
  default     = 1
}

variable "intelligence_cpu" {
  description = "Fargate CPU units for the Intelligence task (Playwright is heavier; 512 = 0.5 vCPU)."
  type        = number
  default     = 512
}

variable "intelligence_memory" {
  description = "Fargate memory (MiB) for the Intelligence task (headless Chromium needs headroom)."
  type        = number
  default     = 1024
}

# ----------------------------------------------------------------- API ----

variable "api_image_tag" {
  description = <<-EOT
    Tag of the API image in the ECR repository this configuration creates.
    Build and push with the commands in terraform/README.md, then re-apply
    (or force a new ECS deployment) to roll it out.
  EOT
  type        = string
  default     = "latest"
}

variable "api_desired_count" {
  description = "Number of API tasks. 1 is fine for dev; 2+ for availability."
  type        = number
  default     = 1
}

variable "api_cpu" {
  description = "Fargate CPU units for the API task (256 = 0.25 vCPU)."
  type        = number
  default     = 256
}

variable "api_memory" {
  description = "Fargate memory (MiB) for the API task."
  type        = number
  default     = 512
}

# ------------------------------------------------------------ database ----

variable "db_instance_class" {
  description = "RDS instance class. db.t4g.micro is the cheapest current-gen option."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS storage in GiB."
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Name of the PostgreSQL database."
  type        = string
  default     = "sitecrm"
}

variable "db_username" {
  description = "Master username for PostgreSQL."
  type        = string
  default     = "sitecrm"
}

# ------------------------------------------------------------- secrets ----

variable "jwt_secret" {
  description = <<-EOT
    JWT signing secret for the SiteCRM API. Never put a real value here or in
    terraform.tfvars — pass it via the environment instead:
      export TF_VAR_jwt_secret=$(openssl rand -hex 32)
    If left empty, a strong random secret is generated and stored in Secrets
    Manager (see database.tf). Supply your own to keep it stable across applies.
  EOT
  type        = string
  sensitive   = true
  default     = ""
}

variable "openai_api_key" {
  description = <<-EOT
    OpenAI API key for the Intelligence service (scoring/enrichment). Pass via
    the environment, never in tfvars:
      export TF_VAR_openai_api_key=sk-...
  EOT
  type        = string
  sensitive   = true
  default     = ""
}
