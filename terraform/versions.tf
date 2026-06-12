# Provider and Terraform version constraints.
#
# State is local by default (terraform.tfstate in this directory, gitignored).
# For team use, move it to a remote backend — uncomment and customize:
#
#   terraform {
#     backend "s3" {
#       bucket       = "your-tf-state-bucket"
#       key          = "sitetwo-oh/terraform.tfstate"
#       region       = "us-east-1"
#       use_lockfile = true
#     }
#   }

terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}
