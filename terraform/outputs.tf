# Outputs — everything the deploy workflow in README.md needs.

output "web_url" {
  description = "The application (CloudFront). Serves the SPA, /api/* and /docs."
  value       = "https://${aws_cloudfront_distribution.web.domain_name}"
}

output "api_gateway_url" {
  description = "Direct API Gateway endpoint (bypasses CloudFront; useful for debugging)."
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "ecr_repository_url" {
  description = "Push the API image here (see README.md for the build/push commands)."
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_intelligence_repository_url" {
  description = "Push the Intelligence API image here (Playwright-based Dockerfile)."
  value       = aws_ecr_repository.intelligence.repository_url
}

output "web_bucket" {
  description = "S3 bucket for the built web app (`aws s3 sync apps/web/dist s3://<this>`)."
  value       = aws_s3_bucket.web.bucket
}

output "cloudfront_distribution_id" {
  description = "For cache invalidation after deploying new web assets."
  value       = aws_cloudfront_distribution.web.id
}

output "db_endpoint" {
  description = "RDS endpoint (host:port). Reachable only from inside the VPC."
  value       = aws_db_instance.main.endpoint
}

output "ecs_cluster_name" {
  description = "For `aws ecs update-service --force-new-deployment` image rollouts."
  value       = aws_ecs_cluster.main.name
}
