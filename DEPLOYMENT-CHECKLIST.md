# Project Deployment Checklist

## Pre-Deployment Verification

### Code Quality
- [ ] All TypeScript files compile without errors
- [ ] ESLint passes all checks
- [ ] No console errors or warnings
- [ ] Code coverage >80%
- [ ] All tests passing

### Security
- [ ] No hardcoded secrets or keys
- [ ] AES-256 encryption verified
- [ ] Keystore integration tested
- [ ] HTTPS configured for backend
- [ ] JWT secrets configured
- [ ] CORS properly set
- [ ] Rate limiting enabled
- [ ] Input validation complete

### Performance
- [ ] Recognition latency <1 second
- [ ] Liveness detection <30 seconds
- [ ] Model size <20 MB
- [ ] Memory usage <500 MB
- [ ] Battery impact acceptable
- [ ] Database queries optimized
- [ ] Sync operations <1 minute

### Database
- [ ] SQLite schema verified
- [ ] DynamoDB tables created
- [ ] TTL policies set
- [ ] Backup strategy defined
- [ ] Migration scripts tested
- [ ] Data encryption verified

### Infrastructure
- [ ] API Gateway configured
- [ ] Lambda functions deployed
- [ ] CloudWatch logging enabled
- [ ] Alarms configured
- [ ] Auto-scaling enabled
- [ ] DNS configured
- [ ] SSL certificates installed

### Android Build
- [ ] APK signs successfully
- [ ] Minimum API 26
- [ ] Target API 34
- [ ] All permissions declared
- [ ] ProGuard rules applied
- [ ] Native libraries included

### Testing Complete
- [ ] Unit tests: 6/6 suites passing
- [ ] Integration tests: Complete
- [ ] E2E tests: All workflows verified
- [ ] Performance tests: Benchmarks met
- [ ] Security tests: Passed
- [ ] Load tests: Completed

## Development Environment

```bash
# Verify environment
node --version          # Should be 16+
npm --version           # Should be 7+
java -version          # Should be 11+
adb --version          # Should be available
gradle --version       # Should be 7.0+
aws --version          # Should be 2.0+
terraform --version    # Should be 1.0+
```

## Mobile App Deployment

### Staging Release
```bash
# 1. Build APK
cd mobile-app
npm install
npm run build:android

# 2. Test on device
adb install -r android/app/build/outputs/apk/release/app-release.apk

# 3. Verify functionality
# - Registration works
# - Recognition works
# - Sync works
# - No crashes

# 4. Create signed APK
./android/gradlew assembleRelease

# 5. Generate release notes
# - Features added
# - Bugs fixed
# - Performance improvements
```

### Production Release
```bash
# 1. Update version
# - mobile-app/package.json: version++
# - mobile-app/android/app/build.gradle: versionCode++, versionName update
# - CHANGELOG.md: Add entry

# 2. Create signed APK
./android/gradlew bundleRelease

# 3. Upload to Play Store
# - Create release in Google Play Console
# - Upload AAB/APK
# - Add release notes
# - Set rollout percentage (5%, 25%, 100%)

# 4. Monitor metrics
# - Crash rate
# - ANR rate
# - User reviews
```

## Backend Deployment

### Staging Deployment
```bash
# 1. Build Docker image
docker build -f backend/Dockerfile -t secureface-api:staging ./backend

# 2. Push to registry
docker push ghcr.io/secureface/api:staging

# 3. Deploy to staging
aws ecs update-service \
  --cluster staging \
  --service secureface-api \
  --force-new-deployment

# 4. Run smoke tests
curl -H "Authorization: Bearer $STAGING_TOKEN" \
  https://staging-api.secureface.com/health

# 5. Monitor logs
aws logs tail /ecs/secureface-api-staging --follow
```

### Production Deployment
```bash
# 1. Build and push
docker build -f backend/Dockerfile -t secureface-api:v1.0.0 ./backend
docker push ghcr.io/secureface/api:v1.0.0

# 2. Update infrastructure
cd aws/terraform
terraform plan
terraform apply

# 3. Blue-green deployment
# - Deploy to blue environment
# - Run tests
# - Switch traffic to blue
# - Monitor green

# 4. Verify deployment
# - Check API health
# - Verify DynamoDB
# - Check CloudWatch logs
# - Monitor error rates

# 5. Gradual rollout
# - Monitor for 1 hour
# - Check error rates
# - Check performance metrics
# - Full rollout if stable
```

## Infrastructure Deployment

### AWS Setup
```bash
# 1. Prerequisites
aws configure  # Set credentials
export AWS_REGION=us-east-1

# 2. Validate Terraform
cd aws/terraform
terraform init
terraform validate
terraform plan

# 3. Deploy infrastructure
terraform apply -auto-approve

# 4. Verify resources
aws dynamodb list-tables
aws apigateway get-apis
aws lambda list-functions

# 5. Configure monitoring
# - Create CloudWatch dashboards
# - Set up alarms
# - Configure SNS notifications
```

## Post-Deployment Verification

### Health Checks
```bash
# API endpoint
curl https://api.secureface.com/health

# Database connectivity
aws dynamodb describe-table --table-name attendance

# Lambda functions
aws lambda list-functions

# CloudWatch logs
aws logs describe-log-groups
```

### Performance Monitoring
```bash
# Check metrics
aws cloudwatch get-metric-statistics \
  --namespace SecureFaceAPI \
  --metric-name RecognitionLatency \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 300 \
  --statistics Average,Maximum

# Set up dashboards
# - API response times
# - Error rates
# - DynamoDB throughput
# - Lambda duration
```

### User Communication
- [ ] Release notes published
- [ ] Changelog updated
- [ ] Documentation updated
- [ ] Email sent to users
- [ ] In-app notification shown
- [ ] Support team briefed

## Rollback Procedure

If issues detected:

### Quick Rollback
```bash
# Mobile app
# - Revert to previous Play Store version
# - Disable new version

# Backend
# - Switch to previous Docker image
aws ecs update-service \
  --cluster production \
  --service secureface-api \
  --force-new-deployment \
  --image "secureface-api:v0.9.0"

# Infrastructure
# - Revert Terraform state
cd aws/terraform
terraform plan -destroy
terraform apply -destroy -auto-approve
```

### Investigation
```bash
# Check logs
aws logs tail /ecs/secureface-api --follow

# Check metrics
# - Error rates
# - Performance degradation
# - Database issues

# Identify root cause
# - Review recent changes
# - Check third-party integrations
# - Review security alerts
```

## Post-Deployment Support

### Monitoring (24/7)
- [ ] CloudWatch dashboards active
- [ ] Alerts configured
- [ ] On-call rotation active
- [ ] Escalation procedures defined

### Documentation
- [ ] Runbook created
- [ ] Troubleshooting guide updated
- [ ] API docs current
- [ ] Architecture docs updated

### Communication
- [ ] Status page updated
- [ ] User documentation updated
- [ ] Support team trained
- [ ] FAQ updated

## Sign-Off

- [ ] QA Lead: Verification complete
- [ ] Security Lead: Security review passed
- [ ] DevOps Lead: Infrastructure verified
- [ ] Product Lead: Release approved
- [ ] Engineering Lead: Code review passed

---

**Deployment Date**: ________________
**Deployed By**: ________________
**Verified By**: ________________
**Rollback Required**: [ ] Yes [ ] No
