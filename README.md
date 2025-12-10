# TripAlta Workflows

Centralized GitHub Actions reusable workflows and composite actions for all TripAlta repositories.

## Overview

This repository contains shared CI/CD workflows that are called by all TripAlta service repositories. This centralized approach ensures consistency and makes maintenance easier.

## Workflows

| Workflow | Purpose | Used By |
|----------|---------|---------|
| `java-service.yml` | Spring Boot services CI/CD | api-gateway, user-service, notification-service, trip-service, booking-service, social-service, billing-service |
| `python-service.yml` | FastAPI services CI/CD | ai-service |
| `react-frontend.yml` | React web app CI/CD | tripalta-ui |
| `react-native.yml` | Expo/React Native CI/CD | tripalta-mobile |
| `database.yml` | Database migrations CI/CD | user-db, notification-db, trip-db, ai-db, booking-db, social-db, billing-db |
| `terraform.yml` | Infrastructure as Code CI/CD | tripalta-infra |
| `e2e-tests.yml` | End-to-end testing | tripalta-e2e-tests |

## Actions

### test-summary

Generates a beautiful test summary with pass/fail threshold enforcement.

**Features:**
- Parses JUnit XML, Jest JSON, and pytest XML test results
- Calculates pass/fail/skip counts
- Generates visual progress bar
- Enforces 80% pass threshold (configurable)
- Displays summary in GitHub Actions UI

**Usage:**

```yaml
- name: Generate Test Summary
  uses: tripalta/tripalta-workflows/actions/test-summary@main
  with:
    test-results-path: target/surefire-reports
    coverage-path: target/site/jacoco/jacoco.xml
    pass-threshold: '80'
```

## How to Use

Each repository should have a minimal `ci.yml` that calls the appropriate reusable workflow:

### Java Service Example

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [develop, main, 'feature/**', 'bugfix/**', 'hotfix/**']
  pull_request:
    branches: [develop, main]

jobs:
  ci:
    uses: tripalta/tripalta-workflows/.github/workflows/java-service.yml@main
    secrets: inherit
    with:
      service-name: user-service
```

### React Frontend Example

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [develop, main, 'feature/**', 'bugfix/**', 'hotfix/**']
  pull_request:
    branches: [develop, main]

jobs:
  ci:
    uses: tripalta/tripalta-workflows/.github/workflows/react-frontend.yml@main
    secrets: inherit
    with:
      app-name: tripalta-ui
```

## Workflow Triggers

| Event | Branch | Action |
|-------|--------|--------|
| Push | feature/*, bugfix/*, hotfix/* | Tests + Code Quality |
| Push | develop | Tests + Code Quality + Deploy Staging |
| Push | main | Tests + Code Quality + Deploy Production |
| PR | develop, main | Tests + Code Quality |

## Required Secrets

Each repository should have these secrets configured:

| Secret | Description |
|--------|-------------|
| `AWS_ROLE_ARN_STAGING` | IAM role ARN for staging deployments |
| `AWS_ROLE_ARN_PROD` | IAM role ARN for production deployments |
| `EXPO_TOKEN` | Expo token (mobile only) |
| `CLOUDFRONT_STAGING_ID` | CloudFront distribution ID (frontend only) |
| `CLOUDFRONT_PROD_ID` | CloudFront distribution ID (frontend only) |

## Required Variables

| Variable | Description |
|----------|-------------|
| `AWS_REGION` | AWS region (default: us-east-1) |
| `STAGING_URL` | Staging environment URL |
| `PROD_URL` | Production environment URL |

## Test Summary Output

The test summary action generates a beautiful markdown summary:

```
# ✅ Test Summary - PASSED

## Test Results

| Metric | Count | Percentage |
|--------|-------|------------|
| ✅ Passed | 150 | 93.75% |
| ❌ Failed | 5 | 3.12% |
| ⏭️ Skipped | 5 | 3.12% |
| 📊 **Total** | **160** | **100%** |

### Pass Rate: 93.75%
`████████████████████████████░░` 93.75% / 80% required

## Threshold Check

| Requirement | Status |
|-------------|--------|
| Pass rate ≥ 80% | ✅ Met |
```

## Contributing

1. Create a feature branch
2. Make changes to workflows
3. Test changes in a test repository
4. Create a PR to main
5. After merge, all repositories using the workflows will automatically use the updated version

## License

Private - TripAlta Internal Use Only
