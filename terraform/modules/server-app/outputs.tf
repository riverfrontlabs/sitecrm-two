output "service_name" {
  description = "ECS service name (for `aws ecs update-service --force-new-deployment`)."
  value       = aws_ecs_service.app.name
}

output "task_definition_arn" {
  description = "Latest task definition ARN."
  value       = aws_ecs_task_definition.app.arn
}

output "security_group_id" {
  description = "ID of the ECS task security group — add ingress rules here to allow traffic from a load balancer or VPC link."
  value       = aws_security_group.app.id
}

output "database_url_secret_arn" {
  description = "ARN of the DATABASE_URL secret in Secrets Manager (only set when create_database = true)."
  value       = var.create_database ? aws_secretsmanager_secret.database_url[0].arn : null
}

output "db_endpoint" {
  description = "RDS endpoint (host:port), reachable from within the VPC (only set when create_database = true)."
  value       = var.create_database ? aws_db_instance.app[0].endpoint : null
}
