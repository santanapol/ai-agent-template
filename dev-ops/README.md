# Dev ops — server runbooks

SSH deploy only (no GitHub Actions auto-deploy).

| Path | Host | Deploy script |
|------|------|---------------|
| [staging/RUNBOOK.md](staging/RUNBOOK.md) | `zero-staging.168bits.com` | `scripts/staging/deploy-staging.sh` |
| [prod/RUNBOOK.md](prod/RUNBOOK.md) | `zero.168bits.com` | `scripts/prod/deploy-prod.sh` |

Credentials: `dev-ops/**/credential.md` (gitignored).
