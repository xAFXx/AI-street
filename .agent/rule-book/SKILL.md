---
name: Project Rules and Context Loading
description: Rules and standards for code implementation, including auto-loading context docs and resolving test contexts. MUST be read at the start of every conversation.
---

# Project Rules

Read the full rule book at `.agent/rule-book/RULES.md` before starting any work.

## Critical Rules Summary

### Context Loading (Rule 4)
When the user mentions a feature area (e.g. "I want to work on ai-management"), read `src/app/docs/INDEX.md` to find which doc files to load, then read them all before making changes.

### Doc Maintenance (Rule 5)
When you change routes, services, models, or configs, update the corresponding doc file in `src/app/docs/` before finishing.

### Test Contexts (Rule 6)
When the user says "the test context is [tenantName]", look up the tenant in `src/app/docs/DEVELOPER_GUIDE.md` (Test Contexts section) to get the deployed URL and credentials. Do NOT modify `proxy.conf.js`. Open the deployed URL directly in the browser.

## Full Rule Book
See [RULES.md](./RULES.md) for the complete rules with examples.
