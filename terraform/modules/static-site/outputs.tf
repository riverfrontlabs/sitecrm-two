output "bucket_name" {
  description = "S3 bucket to sync the built site into (`aws s3 sync ./dist s3://<bucket_name>`)."
  value       = aws_s3_bucket.site.bucket
}

output "bucket_arn" {
  description = "ARN of the S3 bucket (useful for cross-account access policies)."
  value       = aws_s3_bucket.site.arn
}

output "distribution_id" {
  description = "CloudFront distribution ID — needed for cache invalidation after each deploy."
  value       = aws_cloudfront_distribution.site.id
}

output "distribution_domain_name" {
  description = "CloudFront domain (*.cloudfront.net). Use as a CNAME target if custom_domain is set."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "site_url" {
  description = "Public URL for the site (custom domain if set, otherwise CloudFront domain)."
  value       = var.custom_domain != "" ? "https://${var.custom_domain}" : "https://${aws_cloudfront_distribution.site.domain_name}"
}
