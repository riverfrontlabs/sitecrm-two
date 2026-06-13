# The backend: the Fastify API and Intelligence API as ECS Fargate services.
#
# Image flow: `docker build` from the repo root → push to ECR → ECS pulls it.
# Service discovery: tasks register in a Cloud Map private DNS namespace;
# API Gateway's VPC link resolves them directly (see api-gateway.tf), which
# avoids paying for a load balancer in this single-service setup. With more
# services or production traffic, put an ALB here instead.

# ----------------------------------------------------------------- ECR ----

resource "aws_ecr_repository" "api" {
  name         = "${local.name}-api"
  force_delete = true # dev convenience: allow destroy with images present

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Intelligence API runs the Playwright Dockerfile (mcr.microsoft.com/playwright base).
resource "aws_ecr_repository" "intelligence" {
  name         = "${local.name}-intelligence"
  force_delete = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Keep both repositories from accumulating every image ever pushed.
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep only the 10 most recent images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "intelligence" {
  repository = aws_ecr_repository.intelligence.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep only the 10 most recent images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

# ------------------------------------------------------------- Cloud Map ----

resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "${local.name}.local"
  description = "Service discovery for ${local.name}"
  vpc         = aws_vpc.main.id
}

resource "aws_service_discovery_service" "api" {
  name = "api"

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    routing_policy = "MULTIVALUE"

    dns_records {
      type = "SRV" # API Gateway VPC-link integrations require SRV records
      ttl  = 10
    }
  }

  # ECS reports task health into Cloud Map (no Route 53 health checks).
  health_check_custom_config {}
}

# ------------------------------------------------------------------ IAM ----

# Execution role: what the ECS *agent* needs before the container starts —
# pull from ECR, write logs, and read DATABASE_URL + JWT_SECRET from Secrets Manager.
resource "aws_iam_role" "task_execution" {
  name = "${local.name}-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "read_secrets" {
  name = "read-secrets"
  role = aws_iam_role.task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "secretsmanager:GetSecretValue"
      Resource = [
        aws_secretsmanager_secret.database_url.arn,
        aws_secretsmanager_secret.jwt_secret.arn,
      ]
    }]
  })
}

# Task role: what the *application* can do once running. The API calls no
# AWS services, so this role is intentionally empty — extend it when it does.
resource "aws_iam_role" "task" {
  name = "${local.name}-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# ------------------------------------------------------------------ ECS ----

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${local.name}-api"
  retention_in_days = 14
}

resource "aws_ecs_cluster" "main" {
  name = local.name

  setting {
    name  = "containerInsights"
    value = "disabled" # enable for production observability (extra cost)
  }
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${local.name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64" # match your `docker build` host or use buildx --platform
  }

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = "${aws_ecr_repository.api.repository_url}:${var.api_image_tag}"
      essential = true

      portMappings = [{ containerPort = 3000, protocol = "tcp" }]

      # HOST/PORT defaults are baked into the image (0.0.0.0:3000).
      # DATABASE_URL and JWT_SECRET arrive from Secrets Manager at task start,
      # mirroring the local .env setup under docker compose.
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.database_url.arn
        },
        {
          name      = "JWT_SECRET"
          valueFrom = aws_secretsmanager_secret.jwt_secret.arn
        },
      ]

      environment = [
        {
          name  = "INTELLIGENCE_API_URL"
          value = "http://intelligence.${local.name}.local:3001"
        },
      ]

      healthCheck = {
        # busybox wget ships in the alpine base image.
        command     = ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 15 # extra window for db:migrate to complete on first start
      }

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "api" {
  name            = "api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.api_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.public[*].id
    security_groups = [aws_security_group.api.id]
    # Public IP for image pulls / AWS API access without a NAT gateway; the
    # security group still blocks all inbound except the VPC link.
    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.api.arn
    port         = 3000
  }

  # Roll tasks when the task definition changes; wait for steady state so a
  # broken image fails the apply instead of flapping silently afterwards.
  force_new_deployment  = true
  wait_for_steady_state = false # first apply happens before any image is pushed

  depends_on = [aws_db_instance.main]
}
