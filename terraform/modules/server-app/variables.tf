# Input variables for the server-app module.

variable "site_name" {
  description = "Unique slug for this client app (e.g. \"acme-portal\"). Used as resource-name prefix."
  type        = string
}

variable "environment" {
  description = "Environment label (dev/staging/prod)."
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "us-east-1"
}

# -------------------------------------------------------------- network ----

variable "vpc_id" {
  description = "VPC in which to run the ECS task and (optionally) RDS instance."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block of the VPC — used to scope the app security group ingress to in-VPC traffic only."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for the ECS Fargate task."
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for RDS (used only when create_database = true)."
  type        = list(string)
  default     = []
}

# ----------------------------------------------------------------- ECS ----

variable "image_uri" {
  description = "Full ECR image URI including tag (e.g. \"123456.dkr.ecr.us-east-1.amazonaws.com/acme-portal:v1.2\")."
  type        = string
}

variable "container_port" {
  description = "Port the container listens on."
  type        = number
  default     = 3000
}

variable "cpu" {
  description = "Fargate CPU units (256 = 0.25 vCPU)."
  type        = number
  default     = 256
}

variable "memory" {
  description = "Fargate memory in MiB."
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Number of running ECS tasks."
  type        = number
  default     = 1
}

variable "ecs_cluster_id" {
  description = "ID of the ECS cluster to deploy into. Pass the shared cluster from the root module."
  type        = string
}

variable "environment_variables" {
  description = "Plain-text environment variables injected into the container."
  type        = map(string)
  default     = {}
}

variable "secret_arns" {
  description = <<-EOT
    Map of env-var name → Secrets Manager ARN for secrets injected at task
    start (e.g. { DATABASE_URL = "arn:aws:secretsmanager:..." }).
  EOT
  type        = map(string)
  default     = {}
}

# ------------------------------------------------------------ database ----

variable "create_database" {
  description = "When true, provisions an RDS PostgreSQL instance for this app."
  type        = bool
  default     = false
}

variable "db_instance_class" {
  description = "RDS instance class (used only when create_database = true)."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS storage in GiB (used only when create_database = true)."
  type        = number
  default     = 20
}

variable "db_name" {
  description = "PostgreSQL database name (used only when create_database = true)."
  type        = string
  default     = "app"
}

variable "db_username" {
  description = "PostgreSQL master username (used only when create_database = true)."
  type        = string
  default     = "app"
}

variable "tags" {
  description = "Additional tags to merge onto every resource."
  type        = map(string)
  default     = {}
}
