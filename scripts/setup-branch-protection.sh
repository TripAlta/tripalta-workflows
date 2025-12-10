#!/bin/bash

# Setup branch protection for all TripAlta repositories
# This script configures protection rules for develop and main branches

set -e

# List of all repositories
REPOS=(
  "TripAlta/api-gateway"
  "TripAlta/user-service"
  "TripAlta/notification-service"
  "TripAlta/trip-service"
  "TripAlta/booking-service"
  "TripAlta/social-service"
  "TripAlta/billing-service"
  "TripAlta/ai-service"
  "TripAlta/tripalta-ui"
  "TripAlta/tripalta-mobile"
  "TripAlta/user-db"
  "TripAlta/notification-db"
  "TripAlta/trip-db"
  "TripAlta/ai-db"
  "TripAlta/booking-db"
  "TripAlta/social-db"
  "TripAlta/billing-db"
  "TripAlta/tripalta-infra"
  "TripAlta/tripalta-e2e-tests"
  "TripAlta/tripalta-workflows"
)

BRANCHES=("develop" "main")

echo "🔒 Setting up branch protection for TripAlta repositories..."
echo ""

for REPO in "${REPOS[@]}"; do
  for BRANCH in "${BRANCHES[@]}"; do
    echo "Setting up branch protection for $REPO/$BRANCH..."

    # Check if branch exists first
    if ! gh api "/repos/$REPO/branches/$BRANCH" --silent 2>/dev/null; then
      echo "  ⚠️  Branch $BRANCH does not exist in $REPO - skipping"
      continue
    fi

    # Apply branch protection rules
    gh api \
      --method PUT \
      -H "Accept: application/vnd.github+json" \
      "/repos/$REPO/branches/$BRANCH/protection" \
      --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

    if [ $? -eq 0 ]; then
      echo "  ✅ Protected $REPO/$BRANCH"
    else
      echo "  ❌ Failed to protect $REPO/$BRANCH"
    fi
  done
done

echo ""
echo "🎉 Branch protection configuration complete!"
