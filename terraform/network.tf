# Networking: a small dedicated VPC.
#
#   ┌─ VPC 10.20.0.0/16 ──────────────────────────────────────────────┐
#   │  public subnets (×2)              private subnets (×2)          │
#   │  ┌──────────────────────┐         ┌──────────────────────┐      │
#   │  │ ECS tasks (API)      │ ──5432→ │ RDS PostgreSQL       │      │
#   │  │ API Gateway VPC link │         │ (no internet route)  │      │
#   │  └──────────────────────┘         └──────────────────────┘      │
#   └──────────────────────────────────────────────────────────────────┘
#
# Cost-driven choice: ECS tasks run in PUBLIC subnets with public IPs so
# they can pull images and reach AWS APIs without a NAT gateway (~$33/mo
# each). They accept traffic only from the VPC-link security group, so
# nothing is reachable from the internet despite the public IP. For a
# hardened production setup, move tasks to private subnets and add NAT
# gateways or VPC endpoints.

resource "aws_vpc" "main" {
  cidr_block           = "10.20.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${local.name}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${local.name}-igw" }
}

# ------------------------------------------------------- public subnets ----

resource "aws_subnet" "public" {
  count = 2

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index) # 10.20.0/1.0/24
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = { Name = "${local.name}-public-${local.azs[count.index]}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${local.name}-public" }
}

resource "aws_route_table_association" "public" {
  count = 2

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# ------------------------------------------------------ private subnets ----
# No NAT and no internet route: the database neither needs nor gets egress.

resource "aws_subnet" "private" {
  count = 2

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, 10 + count.index) # 10.20.10/11.0/24
  availability_zone = local.azs[count.index]

  tags = { Name = "${local.name}-private-${local.azs[count.index]}" }
}

# ------------------------------------------------------ security groups ----
# Chain of trust: API Gateway VPC link → API tasks → database.
# Each hop only accepts traffic from the security group before it.

resource "aws_security_group" "vpc_link" {
  name        = "${local.name}-vpc-link"
  description = "API Gateway VPC link ENIs"
  vpc_id      = aws_vpc.main.id

  egress {
    description = "Forward requests to the API tasks"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  tags = { Name = "${local.name}-vpc-link" }
}

resource "aws_security_group" "api" {
  name        = "${local.name}-api"
  description = "API (ECS Fargate tasks)"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "HTTP from the API Gateway VPC link only"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.vpc_link.id]
  }

  egress {
    description = "Pull images, reach AWS APIs, talk to the database"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name}-api" }
}

resource "aws_security_group" "intelligence" {
  name        = "${local.name}-intelligence"
  description = "Intelligence API (ECS Fargate tasks)"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "HTTP from the API tasks only (internal service-to-service)"
    from_port       = 3001
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]
  }

  egress {
    description = "Pull images, reach AWS APIs, scrape public websites, call OpenAI"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name}-intelligence" }
}

resource "aws_security_group" "db" {
  name        = "${local.name}-db"
  description = "PostgreSQL (RDS)"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from the API tasks only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]
  }

  tags = { Name = "${local.name}-db" }
}
