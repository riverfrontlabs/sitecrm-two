# Static hosting for the web app: private S3 bucket behind CloudFront.
#
# CloudFront serves two origins:
#   default        → S3 (the built SPA; bucket locked to CloudFront via OAC)
#   /api/*, /docs* → API Gateway
#
# Routing the API through CloudFront keeps the frontend's relative URLs
# (fetch('/api/projects')) working unchanged in production — the same trick
# the Vite dev proxy plays locally — and gives browsers a single origin, so
# CORS never enters the picture.
#
# SPA deep links (/design) are handled by a CloudFront Function that rewrites
# extension-less paths to /index.html. A function beats the common
# custom_error_response approach because error rewrites apply to the WHOLE
# distribution — they would corrupt legitimate API 404s into HTML responses.

# ------------------------------------------------------------------- S3 ----

resource "random_id" "bucket_suffix" {
  byte_length = 4 # bucket names are globally unique; suffix avoids collisions
}

resource "aws_s3_bucket" "web" {
  bucket = "${local.name}-web-${random_id.bucket_suffix.hex}"
  # Dev convenience: allow `terraform destroy` with objects still inside.
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "web" {
  bucket = aws_s3_bucket.web.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Only this CloudFront distribution may read objects.
resource "aws_s3_bucket_policy" "web" {
  bucket = aws_s3_bucket.web.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontOAC"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.web.arn}/*"
      Condition = {
        StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.web.arn }
      }
    }]
  })
}

# ----------------------------------------------------------- CloudFront ----

resource "aws_cloudfront_origin_access_control" "web" {
  name                              = local.name
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Rewrite SPA routes (no file extension, e.g. /design) to /index.html.
# Attached only to the default (S3) behavior; /api/* and /docs* never hit it.
resource "aws_cloudfront_function" "spa_rewrite" {
  name    = "${local.name}-spa-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Serve index.html for client-side routes"
  publish = true

  code = <<-EOT
    function handler(event) {
      var request = event.request;
      // A path with no "." is a client-side route, not a static asset.
      if (!request.uri.includes('.')) {
        request.uri = '/index.html';
      }
      return request;
    }
  EOT
}

locals {
  # "abc123.execute-api.us-east-1.amazonaws.com" from the full endpoint URL.
  api_gateway_domain = replace(aws_apigatewayv2_api.main.api_endpoint, "https://", "")

  # AWS-managed policy IDs (stable, documented constants — cheaper than
  # data lookups and identical in every account).
  cache_policy_caching_optimized = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized
  cache_policy_caching_disabled  = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
  origin_request_all_viewer_xh   = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader
}

resource "aws_cloudfront_distribution" "web" {
  enabled             = true
  comment             = local.name
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # NA + EU edges; cheapest tier
  http_version        = "http2and3"

  origin {
    origin_id                = "s3-web"
    domain_name              = aws_s3_bucket.web.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.web.id
  }

  origin {
    origin_id   = "api-gateway"
    domain_name = local.api_gateway_domain

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Static assets: long-lived caching, SPA rewrite for client-side routes.
  default_cache_behavior {
    target_origin_id       = "s3-web"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = local.cache_policy_caching_optimized

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_rewrite.arn
    }
  }

  # REST API: no caching, all methods, forward everything except Host
  # (API Gateway requires its own hostname to route the request).
  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = "api-gateway"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    compress                 = true
    cache_policy_id          = local.cache_policy_caching_disabled
    origin_request_policy_id = local.origin_request_all_viewer_xh
  }

  # Interactive API docs (Swagger UI) ride along on the same origin.
  ordered_cache_behavior {
    path_pattern             = "/docs*"
    target_origin_id         = "api-gateway"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD"]
    cached_methods           = ["GET", "HEAD"]
    compress                 = true
    cache_policy_id          = local.cache_policy_caching_disabled
    origin_request_policy_id = local.origin_request_all_viewer_xh
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Default *.cloudfront.net certificate. For a custom domain: add aliases,
  # an ACM certificate in us-east-1, and a viewer_certificate block here.
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
