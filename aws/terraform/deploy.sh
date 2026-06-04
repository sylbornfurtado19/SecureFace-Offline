#!/bin/bash

set -e

echo "Deploying AWS Infrastructure..."

cd "$(dirname "$0")"

# Initialize Terraform
echo "Initializing Terraform..."
terraform init

# Validate configuration
echo "Validating Terraform configuration..."
terraform validate

# Plan deployment
echo "Planning deployment..."
terraform plan -out=tfplan

# Apply configuration
echo "Applying configuration..."
terraform apply tfplan

echo "Deployment complete!"
echo "API Gateway URL:"
terraform output api_gateway_url
