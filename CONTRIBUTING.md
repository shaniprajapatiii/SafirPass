# Contributing to SafirPass

Thanks for your interest in contributing to SafirPass.

This project is an AI-powered smart tourist digital identity and safety platform built with Next.js, Supabase, and Google OAuth. We welcome contributions from developers, designers, testers, and community members.

---

## Table of Contents

- [Project setup](#project-setup)
- [Fork and clone](#fork-and-clone)
- [Create a branch](#create-a-branch)
- [Install dependencies](#install-dependencies)
- [Environment configuration](#environment-configuration)
- [Run locally](#run-locally)
- [Development workflow](#development-workflow)
- [Commit guidelines](#commit-guidelines)
- [Pull request checklist](#pull-request-checklist)
- [Code standards](#code-standards)
- [Security notice](#security-notice)

---

## Project setup

### Prerequisites

Before contributing, make sure you have:

- Node.js 20+
- npm 10+
- Git
- A Supabase project
- A Google Cloud project with OAuth credentials

---

## Fork and clone

1. Fork the repository on GitHub.
2. Clone your fork locally:

```bash
git clone https://github.com/<your-username>/SafirPass.git
cd SafirPass
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/shaniprajapatiii/SafirPass.git
```

4. Verify remotes:

```bash
git remote -v
```

---

## Create a branch

Create a feature branch before making changes:

```bash
git checkout -b feature/my-improvement
```

Use clear branch names such as:

```bash
feature/sos-dashboard
fix/google-login
docs/readme-update
chore/package-updates
```

---

## Install dependencies

```bash
npm install
```

---

## Environment configuration

Create your local environment file:

```bash
copy .env.example .env.local
```

Then fill in the required values:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
JWT_SECRET="your-long-random-secret"
```

### Supabase setup

Run the SQL from:

```bash
supabase/schema.sql
```

This creates the required tables for:
- profiles
- kyc_applications
- consent_requests
- sos_alerts
- geofences

### Google OAuth setup

In the Google Cloud Console:

1. Create or select a project.
2. Configure OAuth credentials.
3. Add the authorized redirect URL:

```text
http://localhost:3000/api/auth/callback/google
```

4. Add the client ID and secret to your local `.env.local` file.

---

## Run locally

### Development mode

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

### Production build

```bash
npm run build
npm run start
```

### Linting

```bash
npm run lint
```

---

## Development workflow

1. Pull the latest changes from upstream:

```bash
git fetch upstream
git checkout main
git pull upstream main
```

2. Create a feature branch.
3. Make focused changes.
4. Validate locally with lint and build.
5. Commit your work.
6. Push to your fork.
7. Open a pull request.

---

## Commit guidelines

Use clear and conventional commit messages like:

```bash
git commit -m "feat: add tourist verification flow"
git commit -m "fix: resolve auth redirect issue"
git commit -m "docs: improve contributor setup guide"
git commit -m "chore: update dependencies"
```

Good commit messages should:
- describe the change clearly
- be written in the present tense
- stay brief and specific

---

## Pull request checklist

Before opening a PR, make sure:

- the change is scoped and focused
- code is readable and maintainable
- lint passes
- production build passes
- sensitive values have not been committed
- documentation was updated if needed

PRs should include:
- summary of the change
- reason for the change
- any relevant screenshots
- validation performed

---

## Code standards

Please follow these guidelines:

- Keep code simple and readable.
- Follow the existing project style.
- Avoid unnecessary refactors in the same PR.
- Use meaningful names for variables and components.
- Update documentation when behavior changes.
- Keep privacy and security in mind at all times.

---

## Security notice

Never commit secrets or sensitive environment values.

Do not add:

- `.env.local` files
- API keys
- OAuth client secrets
- service-role credentials
- production tokens

Use local environment variables only for development.

---

## Need help?

If you are unsure where to start, open an issue or ask in the repository discussions. We are happy to help new contributors get started.

Thank you for contributing to SafirPass.
