# PostgreSQL on RDS.
#
# Drizzle migrations (`db:migrate`) run inside the ECS task on startup, so the
# database only needs to exist. The full connection URL is stored in Secrets
# Manager and injected as DATABASE_URL. JWT_SECRET gets its own secret entry so
# both can be rotated independently.
#
# Dev-grade settings flagged inline; revisit each before calling this "prod".

resource "random_password" "db" {
  length = 32
  # Alphanumeric only: the password is embedded in a postgres:// URL, and
  # URL-significant characters (@ : / #) would need escaping everywhere.
  special = false
}

resource "aws_db_subnet_group" "main" {
  name       = local.name
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${local.name}-db-subnets" }
}

resource "aws_db_instance" "main" {
  identifier = "${local.name}-db"

  engine = "postgres"
  # Pin the full minor version and disable auto upgrades. With `apply_immediately`
  # set, letting AWS float the minor version means a routine re-apply after a new
  # minor is published would restart the DB outside any maintenance window.
  engine_version             = "17.4"
  auto_minor_version_upgrade = false
  instance_class             = var.db_instance_class

  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false

  # --- dev-grade lifecycle settings; tighten for production: ---
  multi_az                = false # prod: true for failover
  backup_retention_period = 1     # prod: 7+
  skip_final_snapshot     = true  # prod: false (snapshot on destroy)
  deletion_protection     = false # prod: true

  apply_immediately = true

  tags = { Name = "${local.name}-db" }
}

# The complete connection URL, consumed by the ECS task definition.
resource "aws_secretsmanager_secret" "database_url" {
  name = "${local.name}/database-url"
  # Allow re-creating the environment without waiting out the default
  # 7-to-30-day recovery window. Dev convenience; remove for production.
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id
  secret_string = format(
    "postgres://%s:%s@%s/%s",
    aws_db_instance.main.username,
    random_password.db.result,
    aws_db_instance.main.endpoint, # host:port
    var.db_name,
  )
}

# JWT signing secret — kept separate from DATABASE_URL so it can be rotated
# independently. Set via TF_VAR_jwt_secret; see variables.tf for details.
#
# If no secret is supplied we generate a strong random one rather than storing
# an empty string (which would make the API crash-loop now that it fails closed
# in production). Supply your own via TF_VAR_jwt_secret to keep it stable across
# `terraform apply`s — a generated value changes only if this resource is replaced.
resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${local.name}/jwt-secret"
  recovery_window_in_days = 0 # dev convenience; remove for production
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret != "" ? var.jwt_secret : random_password.jwt_secret.result
}

# OpenAI API key for the Intelligence service. Set via TF_VAR_openai_api_key.
resource "aws_secretsmanager_secret" "openai_api_key" {
  name                    = "${local.name}/openai-api-key"
  recovery_window_in_days = 0 # dev convenience; remove for production
}

resource "aws_secretsmanager_secret_version" "openai_api_key" {
  secret_id     = aws_secretsmanager_secret.openai_api_key.id
  secret_string = var.openai_api_key
}
