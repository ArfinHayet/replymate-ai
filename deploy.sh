#!/usr/bin/env bash
# ─── deploy.sh ─────────────────────────────────────────────────────────────
# Comp-bot — AWS Lambda deployment helper
#
# Usage:
#   ./deploy.sh                   Full deploy (build + CDK deploy)
#   ./deploy.sh --diff            Show what CDK would change (no deploy)
#   ./deploy.sh --destroy         Tear down all AWS resources
#   ./deploy.sh --package-only    Build + stage only (no CDK deploy)
#   ./deploy.sh --env staging     Deploy to a different environment
#
# Prerequisites:
#   - AWS CLI configured  (aws configure  OR  AWS_PROFILE set)
#   - CDK bootstrapped    (run once per account/region: cd infra && npx cdk bootstrap)
#   - .env.lambda exists  (copy backend/.env.lambda.example → backend/.env.lambda)
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

log()  { echo -e "${CYAN}[deploy]${RESET} $*"; }
ok()   { echo -e "${GREEN}[deploy]${RESET} ✅ $*"; }
warn() { echo -e "${YELLOW}[deploy]${RESET} ⚠️  $*"; }
err()  { echo -e "${RED}[deploy]${RESET} ❌ $*"; exit 1; }

# ── Defaults ─────────────────────────────────────────────────────────────────
DEPLOY_ENV="${DEPLOY_ENV:-prod}"
ACTION="deploy"

# ── Parse args ───────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --diff)          ACTION="diff" ;;
    --destroy)       ACTION="destroy" ;;
    --package-only)  ACTION="package" ;;
    --env)           DEPLOY_ENV="$2"; shift ;;
    *) err "Unknown argument: $1" ;;
  esac
  shift
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
INFRA_DIR="$ROOT_DIR/infra"
STAGING_DIR="$BACKEND_DIR/.lambda-build"

# ── Checks ───────────────────────────────────────────────────────────────────
log "Checking prerequisites..."

command -v node  >/dev/null 2>&1 || err "Node.js is not installed."
command -v npm   >/dev/null 2>&1 || err "npm is not installed."
command -v aws   >/dev/null 2>&1 || err "AWS CLI is not installed. Run: brew install awscli"

if [[ "$ACTION" != "package" ]]; then
  aws sts get-caller-identity --output text >/dev/null 2>&1 || \
    err "AWS credentials not configured. Run: aws configure"
fi

if [[ ! -f "$BACKEND_DIR/.env.lambda" ]]; then
  warn ".env.lambda not found. Lambda will run with no env vars!"
  warn "Run: cp backend/.env.lambda.example backend/.env.lambda"
fi

# ── Step 1: Build the NestJS backend ─────────────────────────────────────────
log "Building NestJS backend (nest build)..."
NEST_BIN="$BACKEND_DIR/node_modules/.bin/nest"
[[ -f "$NEST_BIN" ]] || err "nest CLI not found at $NEST_BIN — run: cd backend && npm install"
(cd "$BACKEND_DIR" && "$NEST_BIN" build && echo "✅ Lambda build complete — output in dist/")
ok "Backend compiled → dist/"

# ── Step 2: Stage production bundle ──────────────────────────────────────────
# Create a clean directory with only what Lambda needs:
#   .lambda-build/dist/          ← compiled JS output
#   .lambda-build/node_modules/  ← production deps only (no dev deps)
#   .lambda-build/package.json

log "Staging production bundle → .lambda-build/ ..."
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

# Copy compiled output
cp -r "$BACKEND_DIR/dist"         "$STAGING_DIR/dist"
cp    "$BACKEND_DIR/package.json" "$STAGING_DIR/package.json"
cp    "$BACKEND_DIR/package-lock.json" "$STAGING_DIR/package-lock.json"

# Install only production dependencies into the staging directory.
# --ignore-scripts prevents the "patch-package" postinstall from running
# (patch-package is a dev dep not available with --omit=dev).
log "Installing production dependencies into staging dir..."
(
  cd "$STAGING_DIR"
  npm ci --omit=dev --ignore-scripts --legacy-peer-deps
)

ok "Staging bundle ready at .lambda-build/ ($(du -sh "$STAGING_DIR" | cut -f1))"

if [[ "$ACTION" == "package" ]]; then
  ok "Package-only mode — skipping CDK deploy."
  exit 0
fi

# ── Step 3: Install CDK dependencies ─────────────────────────────────────────
log "Ensuring CDK dependencies are installed..."
(cd "$INFRA_DIR" && npm install --prefer-offline 2>/dev/null || npm install)
ok "CDK ready."

# ── Step 4: CDK action ────────────────────────────────────────────────────────
export DEPLOY_ENV
export CDK_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"

case "$ACTION" in
  diff)
    log "Showing CDK diff (env: $DEPLOY_ENV, region: $CDK_DEFAULT_REGION)..."
    (cd "$INFRA_DIR" && npx cdk diff "CompBotStack-$DEPLOY_ENV" -c env="$DEPLOY_ENV")
    ;;
  destroy)
    warn "This will DESTROY all AWS resources for env: $DEPLOY_ENV"
    read -rp "Type 'yes' to confirm: " confirm
    [[ "$confirm" == "yes" ]] || err "Aborted."
    (cd "$INFRA_DIR" && npx cdk destroy "CompBotStack-$DEPLOY_ENV" -c env="$DEPLOY_ENV" --force)
    ok "Stack destroyed."
    ;;
  deploy)
    log "Deploying to AWS (env: $DEPLOY_ENV, region: $CDK_DEFAULT_REGION)..."
    (cd "$INFRA_DIR" && npx cdk deploy "CompBotStack-$DEPLOY_ENV" \
      -c env="$DEPLOY_ENV" \
      --require-approval never \
      --outputs-file "$ROOT_DIR/cdk-outputs.json")

    ok "Deployment complete!"
    echo ""

    if [[ -f "$ROOT_DIR/cdk-outputs.json" ]]; then
      log "Stack outputs:"
      cat "$ROOT_DIR/cdk-outputs.json"
      echo ""

      API_URL=$(node -e "
        const o = require('./cdk-outputs.json');
        const stack = Object.keys(o)[0];
        console.log(o[stack]?.ApiUrl ?? '');
      " 2>/dev/null || true)

      if [[ -n "$API_URL" ]]; then
        echo ""
        ok "API URL: $API_URL"
        echo ""
        echo -e "${YELLOW}→ Set in your frontend .env: VITE_API_URL=$API_URL${RESET}"
      fi
    fi
    ;;
esac
