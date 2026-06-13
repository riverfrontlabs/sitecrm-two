# Input variables for the static-site module.
# All have sensible defaults; override per-site in the root module call.

variable "site_name" {
  description = "Unique slug for this client site (e.g. \"acme-corp\"). Used as a resource-name prefix."
  type        = string
}

variable "environment" {
  description = "Environment label (dev/staging/prod)."
  type        = string
  default     = "dev"
}

variable "custom_domain" {
  description = <<-EOT
    Fully-qualified custom domain for this site (e.g. \"www.acme-corp.com\").
    When set, an ACM certificate is created and attached to CloudFront.
    Leave empty to use the CloudFront *.cloudfront.net domain.
  EOT
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = <<-EOT
    ARN of an existing ACM certificate in us-east-1 (required by CloudFront).
    Provide this instead of custom_domain when the certificate already exists
    or is managed outside this module.
  EOT
  type        = string
  default     = ""
}

variable "price_class" {
  description = "CloudFront price class. PriceClass_100 covers US/EU/Canada (cheapest)."
  type        = string
  default     = "PriceClass_100"
}

variable "tags" {
  description = "Additional tags to merge onto every resource."
  type        = map(string)
  default     = {}
}
