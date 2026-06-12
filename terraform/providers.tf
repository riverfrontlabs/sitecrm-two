provider "aws" {
  region = var.aws_region

  # Stamped onto every resource that supports tags; lets you find (and bill)
  # everything this configuration created with one filter.
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  # Shared naming prefix, e.g. "sitetwo-oh-dev".
  name = "${var.project_name}-${var.environment}"

  # Two AZs is the minimum for an RDS subnet group.
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}
