# Deployment Guide

## Local
Requires Node.js 18+.

```sh
npm install
npm test
npm start
```

Open `http://localhost:3000`. AI features remain disabled until `AI_API_KEY` is configured in the server environment.

## Docker

```sh
docker build -t design-studio .
docker run --rm -p 3000:3000 \
  -e AI_BASE_URL="https://api.openai.com/v1" \
  -e AI_API_KEY="$AI_API_KEY" \
  -e AI_MODEL="gpt-4o-mini" \
  design-studio
```

Do not hard-code secrets into the Dockerfile or image. Use your deployment platform's secret manager in production.

## Production checklist
- Add authentication and authorization.
- Add rate limits and request quotas for AI and export endpoints.
- Configure HTTPS and a restrictive origin/CSRF policy.
- Store secrets in a deployment secret manager.
- Decide whether generated decks may contain confidential data and configure logging/retention accordingly.
- Add persistent storage only with a documented privacy and retention policy.
- Run `npm test` and verify PPTX files in PowerPoint or LibreOffice.
- Validate mobile and desktop rendering in supported browsers.
