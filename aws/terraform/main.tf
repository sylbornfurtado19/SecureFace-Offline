terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project_name
      Terraform   = "true"
    }
  }
}

variable "aws_region" {
  description = "AWS region"
  default     = "us-east-1"
  type        = string
}

variable "environment" {
  description = "Environment name"
  default     = "production"
  type        = string
}

variable "project_name" {
  description = "Project name"
  default     = "secureface-face-auth"
  type        = string
}

variable "api_name" {
  description = "API Gateway name"
  default     = "face-auth-api"
  type        = string
}

# API Gateway
resource "aws_apigatewayv2_api" "main" {
  name          = var.api_name
  protocol_type = "HTTP"
  cors_configuration {
    allow_credentials = false
    allow_headers     = ["Content-Type", "Authorization"]
    allow_methods     = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_origins     = ["*"]
    max_age           = 300
  }
}

resource "aws_apigatewayv2_stage" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = var.environment
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/face-auth"
  retention_in_days = 30
}

# DynamoDB Tables
resource "aws_dynamodb_table" "attendance" {
  name           = "attendance"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"
  range_key      = "timestamp"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  stream_specification {
    stream_view_type = "NEW_AND_OLD_IMAGES"
  }
}

resource "aws_dynamodb_table" "embeddings" {
  name           = "embeddings"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"
  range_key      = "id"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "id"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_dynamodb_table" "audit_logs" {
  name           = "audit_logs"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"
  range_key      = "timestamp"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }
}

resource "aws_dynamodb_table" "devices" {
  name           = "devices"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "deviceId"

  attribute {
    name = "deviceId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }
}

# Outputs
output "api_gateway_url" {
  description = "API Gateway URL"
  value       = "${aws_apigatewayv2_api.main.api_endpoint}/${aws_apigatewayv2_stage.main.name}"
}

output "attendance_table" {
  description = "Attendance table name"
  value       = aws_dynamodb_table.attendance.name
}

output "embeddings_table" {
  description = "Embeddings table name"
  value       = aws_dynamodb_table.embeddings.name
}

output "audit_logs_table" {
  description = "Audit logs table name"
  value       = aws_dynamodb_table.audit_logs.name
}

output "devices_table" {
  description = "Devices table name"
  value       = aws_dynamodb_table.devices.name
}
