# Docker Compose Build Instructions

## Prerequisites

- Docker Desktop installed and running
- Docker Compose 1.29+
- At least 2GB free disk space

## Quick Start

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

## Services

### LocalStack (AWS Emulation)
- **Port**: 4566
- **Services**: DynamoDB, API Gateway, Lambda
- **Purpose**: Local AWS service emulation

### API Server
- **Port**: 3000
- **Environment**: Development
- **Database**: LocalStack DynamoDB

## Common Commands

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs api

# Stop services
docker-compose stop

# Remove containers
docker-compose down

# Remove volumes (delete data)
docker-compose down -v

# Run specific service
docker-compose up api

# Execute command in container
docker-compose exec api npm test

# View service status
docker-compose ps
```

## Environment Variables

Edit `.env` file in root directory and set a secure JWT secret (do NOT check secrets into source control):

```env
AWS_REGION=us-east-1
NODE_ENV=development
# Generate a secure secret, for example on macOS/Linux:
# export JWT_SECRET=$(openssl rand -base64 32)
JWT_SECRET=REPLACE_WITH_SECURE_JWT_SECRET
```

## Troubleshooting

### LocalStack not starting
```bash
docker-compose logs localstack
docker-compose down -v
docker-compose up -d
```

### API connection refused
```bash
# Check if API is running
docker-compose ps

# Check API logs
docker-compose logs api

# Restart API
docker-compose restart api
```

### Port already in use
```bash
# Change port in docker-compose.yml
# ports:
#   - "3001:3000"
```

## Testing

```bash
# Run tests
docker-compose exec api npm test

# Run with coverage
docker-compose exec api npm test -- --coverage
```

## Production Build

For production deployment:

```bash
# Build production image

docker build -f backend/Dockerfile -t secureface-api:latest ./backend

# Run production container
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e AWS_REGION=us-east-1 \
  -e JWT_SECRET=${JWT_SECRET} \
  secureface-api:latest
```

## Kubernetes Deployment

Deploy to Kubernetes:

```bash
# Create deployment
kubectl apply -f k8s/deployment.yaml

# Check status
kubectl get pods

# View logs
kubectl logs -f deployment/secureface-api
```

## Monitoring

Access service health:

```bash
# API health check
curl http://localhost:3000/health

# Expected response
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 3600000
  }
}
```

## Database Management

### Access LocalStack DynamoDB

```bash
# Using AWS CLI
aws dynamodb list-tables \
  --endpoint-url http://localhost:4566 \
  --region us-east-1

# Scan table
aws dynamodb scan \
  --table-name attendance \
  --endpoint-url http://localhost:4566 \
  --region us-east-1
```

### Backup Data

```bash
docker-compose run backup \
  aws dynamodb export-table-to-point-in-time \
    --table-name attendance \
    --s3-bucket backup-bucket \
    --endpoint-url http://localstack:4566 \
    --region us-east-1
```

## Volume Management

Data persists in Docker volumes:

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect <volume_name>

# Clean up unused volumes
docker volume prune
```
