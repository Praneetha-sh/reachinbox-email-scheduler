# ReachInbox Email Scheduler

A full-stack email scheduling application built for the ReachInbox engineering assignment.

The application allows users to authenticate with Google, compose and schedule emails, upload recipient lists, configure sending delays and hourly sending limits, monitor scheduled and sent emails, and receive Slack notifications when the configured rate limit is reached.

---

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router

### Backend
- Node.js
- Express
- TypeScript
- Prisma ORM

### Infrastructure
- MySQL
- Redis
- BullMQ
- Elasticsearch
- Docker Compose

### Integrations
- Google OAuth 2.0
- Slack OAuth
- Slack Incoming Webhooks
- Ethereal SMTP

### Queue Monitoring
- Bull Board

---

# 1. Features Implemented

## Backend

### Email Scheduler

- Email scheduling using BullMQ delayed jobs.
- Each recipient is represented as an email job.
- Future emails are stored as delayed jobs in Redis.
- No cron-based scheduler is used.
- Configurable delay between individual emails.
- Configurable start time.
- Support for multiple sender accounts.

### Persistence

- MySQL is used as the persistent database.
- Prisma is used for database access.
- Email, campaign, sender, user, and email event information is stored in MySQL.
- BullMQ delayed jobs are persisted in Redis.
- Scheduled jobs survive backend restarts.
- Startup recovery handles emails that were interrupted during processing.

### Rate Limiting

- Configurable emails-per-hour limit.
- Redis-backed rate limiting.
- Redis atomic operations are used instead of in-memory counters.
- Rate limits are shared across workers.
- When the hourly limit is reached, affected emails are rescheduled for the next available sending window.
- Slack notification is generated when the configured rate limit is reached.

### Worker Concurrency

- BullMQ workers process email jobs asynchronously.
- Worker concurrency is configurable through environment variables.
- Multiple email jobs can be processed in parallel.

Example:

```env
WORKER_CONCURRENCY=5
```

### Email Delivery

- Ethereal SMTP is used for development and demonstration.
- Sender-specific SMTP configuration is supported.
- Successful emails are marked as `SENT`.
- Failed emails are marked as `FAILED`.
- Email processing events are stored in MySQL.

### Idempotency

- Email scheduling requests require an `Idempotency-Key`.
- This prevents accidental duplicate scheduling when a request is retried.

### Elasticsearch

- Email records are indexed in Elasticsearch.
- Search functionality is provided through the backend search API.
- Searchable information includes recipient, subject, body, status, and timestamps.

### Slack Integration

- Slack OAuth authentication.
- Slack workspace connection can be established from the dashboard.
- Slack webhook information is stored by the backend.
- Slack notifications are sent when the configured email rate limit is reached.

### Queue Monitoring

Bull Board provides monitoring for:

- Waiting jobs
- Delayed jobs
- Active jobs
- Completed jobs
- Failed jobs

---

# 2. Frontend Features

## Login

- Google OAuth login.
- Authenticated user session.
- Logout functionality.
- Redirect to dashboard after successful authentication.

## Dashboard

The dashboard provides:

- Logged-in user information.
- Scheduled emails.
- Sent emails.
- Failed email status.
- Navigation to Compose.
- Slack connection.
- Logout.

## Compose

The Compose page supports:

- Sender selection.
- Multiple sender accounts.
- Manual recipient entry.
- CSV recipient upload.
- TXT recipient upload.
- Recipient validation.
- Duplicate recipient removal.
- Subject input.
- Email body.
- Start date/time.
- Delay between emails.
- Hourly sending limit.
- Schedule / Send Later action.

## Scheduled Emails

The Scheduled section displays:

- Recipient email.
- Subject.
- Scheduled time.
- Email status.

## Sent Emails

The Sent section displays:

- Recipient email.
- Subject.
- Sent time.
- Sent/Failed status.

## Email Search

Email records can be searched using the Elasticsearch-backed search API.

## Slack

The dashboard provides a **Connect Slack** option that starts the Slack OAuth flow.

---

# 3. Architecture Overview

```mermaid
flowchart TB
    U[User] --> F[React Frontend]

    F -->|REST API| B[Express Backend]

    B --> DB[(MySQL<br/>Prisma)]
    B --> R[(Redis)]
    B --> ES[(Elasticsearch)]
    B --> G[Google OAuth]
    B --> S[Slack OAuth]

    R --> Q[BullMQ]
    Q --> W[Email Worker]

    W --> RL[Redis Rate Limiter]
    W --> SMTP[Ethereal SMTP]

    RL -->|Rate Limit Reached| S

    W --> DB
    W --> ES

    B --> BB[Bull Board]
    BB --> Q
```

---

# 4. How Email Scheduling Works

The scheduling flow is:

```text
User
  │
  ▼
React Compose Page
  │
  ▼
Express API
  │
  ├── Validate authenticated user
  ├── Validate sender
  ├── Validate recipients
  ├── Create campaign/email records
  └── Create delayed BullMQ jobs
              │
              ▼
            Redis
              │
              ▼
        BullMQ Email Worker
              │
              ├── Check rate limit
              │
              ▼
         Ethereal SMTP
              │
              ▼
        Update email status
              │
              ▼
          MySQL / Elasticsearch
```

When an email campaign is scheduled:

1. The frontend sends the scheduling request to the Express backend.
2. The backend validates the request and sender ownership.
3. Email records are created in MySQL.
4. A BullMQ delayed job is created for each recipient.
5. Redis stores the queue and delayed-job information.
6. When the scheduled time arrives, the BullMQ worker processes the job.
7. The worker checks the sending rate limit.
8. The email is sent through the configured SMTP sender.
9. The email status is updated in MySQL.
10. The email is indexed in Elasticsearch.

The delay between emails is used when calculating the scheduled time for each recipient.

For example:

```text
Email 1 → Start Time
Email 2 → Start Time + Delay
Email 3 → Start Time + 2 × Delay
Email 4 → Start Time + 3 × Delay
```

---

# 5. Persistence on Restart

The application does not depend on in-memory timers or cron jobs.

Future scheduled emails are stored as persistent BullMQ delayed jobs in Redis.

Therefore, restarting the Express server does not remove future scheduled jobs.

The flow is:

```text
Schedule Email
      │
      ▼
Redis + BullMQ
      │
      │
      │ Backend Restart
      │
      ▼
Redis + BullMQ
      │
      ▼
Worker Starts
      │
      ▼
Future Job Executes
```

The backend also performs startup recovery for emails that were left in an interrupted processing state.

This allows scheduled jobs to continue after a backend restart.

---

# 6. Rate Limiting

The application supports a configurable hourly email limit.

Example:

```env
DEFAULT_HOURLY_LIMIT=100
```

Redis is used for rate limiting instead of an in-memory counter.

This allows the rate limit to be shared across multiple workers or backend instances.

Example:

```text
Hourly Limit = 2

Email 1 → Allowed
Email 2 → Allowed
Email 3 → Rescheduled
Email 4 → Rescheduled
```

When the hourly limit is reached:

1. The email is not discarded.
2. The job is rescheduled for the next available sending window.
3. Slack is notified about the rate-limit event.
4. Ordering is preserved as much as practical.

---

# 7. Worker Concurrency

BullMQ workers process scheduled emails asynchronously.

Worker concurrency is configurable through:

```env
WORKER_CONCURRENCY=5
```

With a concurrency of `5`, up to five eligible jobs can be processed by the worker at the same time.

Conceptually:

```text
                    Redis
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       Worker 1    Worker 2    Worker 3
          │           │           │
          ▼           ▼           ▼
       Email 1     Email 2     Email 3
```

The concurrency value is configurable through the environment rather than being hardcoded.

---

# 8. Ethereal Email Setup

Ethereal SMTP is used for development and demonstration.

It allows the application to send test emails without delivering them to real recipients.

## Create an Ethereal Account

Create an Ethereal test SMTP account and obtain the SMTP username and password.

The credentials are then configured in the backend environment.

## Configure Ethereal

Create:

```text
backend/.env
```

Add:

```env
ETHEREAL_SMTP_USER="your-ethereal-username"
ETHEREAL_SMTP_PASSWORD="your-ethereal-password"
```

The selected sender account uses the configured SMTP credentials when the worker sends emails.

Ethereal provides a web preview where the test emails can be inspected.

---

# 9. Environment Variables

Create:

```text
backend/.env
```

Use:

```text
backend/.env.example
```

as the configuration reference.

Example:

```env
DATABASE_URL="mysql://reachinbox:reachinboxpassword@localhost:3307/reachinbox"

REDIS_URL="redis://localhost:6380"

WORKER_CONCURRENCY=5

DEFAULT_DELAY_MS=1000

DEFAULT_HOURLY_LIMIT=100

STALE_PROCESSING_TIMEOUT_MS=900000

ELASTICSEARCH_URL="http://localhost:9200"

JWT_SECRET="your-jwt-secret"

GOOGLE_CLIENT_ID="your-google-client-id"

GOOGLE_CLIENT_SECRET="your-google-client-secret"

GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"

SLACK_CLIENT_ID="your-slack-client-id"

SLACK_CLIENT_SECRET="your-slack-client-secret"

SLACK_REDIRECT_URI="http://localhost:3000/api/auth/slack/callback"

ETHEREAL_SMTP_USER="your-ethereal-username"

ETHEREAL_SMTP_PASSWORD="your-ethereal-password"
```

**Never commit the real `.env` file to GitHub.**

---

# 10. Running the Application

## Prerequisites

Install:

- Node.js 20+
- npm
- Docker Desktop
- Git

The project was developed and tested using Node.js 24.

---

## Step 1: Start MySQL, Redis and Elasticsearch

From the project root:

```bash
docker compose up -d
```

Check the containers:

```bash
docker compose ps
```

The application uses:

| Service | Port |
|---|---:|
| MySQL | `3307` |
| Redis | `6380` |
| Elasticsearch | `9200` |

---

# 11. Running the Backend

Open a terminal and run:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Generate the Prisma client:

```bash
npx prisma generate
```

Apply the database schema:

```bash
npx prisma db push
```

Create/configure:

```text
backend/.env
```

Start the backend:

```bash
npm run dev
```

The backend runs at:

```text
http://localhost:3000
```

The BullMQ email worker starts with the backend process.

---

# 12. Running the Frontend

Open a second terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

Open:

```text
http://localhost:5173
```

in the browser.

---

# 13. Google OAuth Setup

The application uses Google OAuth for login.

Configure the following redirect URI in Google Cloud:

```text
http://localhost:3000/api/auth/google/callback
```

The frontend login button starts the Google authentication flow.

After successful authentication, the user is redirected to the dashboard.

---

# 14. Slack OAuth Setup

Slack is used for rate-limit notifications.

Configure the Slack OAuth redirect URI:

```text
http://localhost:3000/api/auth/slack/callback
```

The dashboard contains:

```text
Connect Slack
```

Clicking this starts the Slack OAuth authorization flow.

After authorization, the backend stores the Slack connection information for the authenticated user.

---

# 15. Bull Board

Bull Board provides a live interface for monitoring BullMQ.

Open:

```text
http://localhost:3000/admin/queues
```

The dashboard can be used to inspect:

- Waiting jobs
- Delayed jobs
- Active jobs
- Completed jobs
- Failed jobs

---

# 16. Elasticsearch

Elasticsearch runs locally through Docker Compose.

URL:

```text
http://localhost:9200
```

Email records are indexed after processing.

The backend provides an email search endpoint:

```text
GET /api/search/emails
```

---

# 17. API Overview

## Authentication

```text
GET  /api/auth/google
GET  /api/auth/google/callback
GET  /api/auth/me
POST /api/auth/logout
```

## Slack

```text
GET /api/auth/slack
GET /api/auth/slack/callback
```

## Senders

```text
GET /api/senders
```

## Email Scheduling

```text
POST /api/emails/schedule
GET  /api/emails?status=scheduled
GET  /api/emails?status=sent
```

## Search

```text
GET /api/search/emails
```

---

# 18. Build Verification

## Backend

```bash
cd backend
npm run build
```

## Frontend

```bash
cd frontend
npm run build
```

Both builds should complete successfully without TypeScript or build errors.

---

# 19. Design Decisions

### BullMQ instead of Cron

BullMQ provides persistent delayed jobs and asynchronous worker processing.

Using cron or in-memory timers would not provide the same persistence and distributed worker behavior.

### Redis for Rate Limiting

Redis provides shared atomic state for rate limiting.

This prevents each worker from maintaining an independent in-memory counter.

### MySQL + Prisma

MySQL stores the application's persistent transactional data, while Prisma provides type-safe database access.

### Elasticsearch

Elasticsearch provides a dedicated search layer for email records.

### Ethereal

Ethereal provides a safe SMTP environment for testing and demonstration without sending emails to real recipients.

---

# 20. Assumptions and Trade-offs

### SMTP Exactly-Once Delivery

Exactly-once delivery cannot be completely guaranteed across an external SMTP provider and a database transaction.

The worker uses database state transitions to avoid knowingly processing the same email multiple times.

There is still an unavoidable failure boundary between an external SMTP operation and the final database state update.

### Rate-Limit Ordering

When the hourly limit is reached, affected emails are moved to the next available sending window.

This can change their exact execution time, although the implementation preserves ordering as much as practical.

### Ethereal SMTP

Ethereal is used for demonstration purposes.

A production deployment should use a production-grade SMTP provider with appropriate delivery, bounce, reputation, and provider-level rate-limit handling.

### Production Hardening

For production deployment, additional hardening would include:

- HTTPS
- Secure OAuth state/CSRF protection
- Managed database
- Managed Redis
- Secured Elasticsearch
- Production SMTP provider
- Secret management
- Production monitoring and logging

---

# 21. Scalability Test

A 1000-job BullMQ workload was tested to verify that a large number of delayed jobs could be created in the queue.

The test focused on queue/job creation rather than sending 1000 real emails through Ethereal because external SMTP providers have their own sending limits.

---

# 22. Demo Flow

A short demonstration can show:

1. Google login.
2. Dashboard.
3. Compose a scheduled email.
4. Configure sender, recipient, start time, delay, and hourly limit.
5. Show the email under Scheduled.
6. Show the BullMQ job in Bull Board.
7. Allow the scheduled time to arrive.
8. Show the email under Sent.
9. Demonstrate a backend restart with a future scheduled email.
10. Show that the future job continues after restart.
11. Connect Slack using OAuth.
12. Demonstrate rate limiting/delay if required.

---

# 23. Project Status

The following assignment functionality has been implemented and tested:

### Backend

- [x] Express backend
- [x] MySQL database
- [x] Prisma ORM
- [x] Redis
- [x] BullMQ scheduler
- [x] BullMQ worker
- [x] Configurable worker concurrency
- [x] Delayed jobs
- [x] Restart persistence
- [x] Startup recovery
- [x] Redis-backed rate limiting
- [x] Rate-limit rescheduling
- [x] Slack rate-limit notification
- [x] Multiple senders
- [x] Ethereal SMTP
- [x] Idempotency
- [x] Elasticsearch indexing
- [x] Elasticsearch search API
- [x] Bull Board

### Frontend

- [x] Google login
- [x] Dashboard
- [x] User information
- [x] Logout
- [x] Compose page
- [x] Sender selection
- [x] Manual recipient entry
- [x] CSV/TXT recipient upload
- [x] Recipient validation
- [x] Scheduled email table
- [x] Sent email table
- [x] Email status display
- [x] Slack connection
- [x] Scheduling controls
- [x] Error handling
- [x] Responsive UI

---
