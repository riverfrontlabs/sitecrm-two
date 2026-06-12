# API Gateway (HTTP API) — the public front door for the backend.
#
#   Internet → API Gateway → VPC link → Cloud Map (api.<ns>.local) → ECS task
#
# An HTTP API (v2) proxies everything to the service discovered via Cloud
# Map. CloudFront forwards /api/* and /docs* here (static-site.tf), so end
# users normally arrive through the CloudFront domain; the API Gateway URL
# also works directly and is exported as an output for debugging.

resource "aws_apigatewayv2_api" "main" {
  name          = local.name
  protocol_type = "HTTP"
  description   = "Proxy to the ${local.name} Fastify API on ECS"
}

resource "aws_apigatewayv2_vpc_link" "main" {
  name               = local.name
  subnet_ids         = aws_subnet.public[*].id
  security_group_ids = [aws_security_group.vpc_link.id]
}

resource "aws_apigatewayv2_integration" "api" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "HTTP_PROXY"
  integration_method = "ANY"
  connection_type    = "VPC_LINK"
  connection_id      = aws_apigatewayv2_vpc_link.main.id
  # Cloud Map service ARN: API Gateway resolves registered tasks itself.
  integration_uri = aws_service_discovery_service.api.arn

  payload_format_version = "1.0"
}

# Single catch-all: the Fastify app owns its own routing (/api/*, /docs).
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.api.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    # Basic abuse protection; raise as real traffic grows.
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }
}
