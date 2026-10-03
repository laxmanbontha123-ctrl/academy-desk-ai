# AcademyDesk AI — Hackathon Project Instructions

These instructions are permanent project guidance for the 9-hour hackathon.

## Project

- **Project name:** AcademyDesk AI
- **Product:** AI-Powered Student Support, Academy Management & Complaint Resolution System
- **Development window:** 10:00 AM to 7:00 PM (9 hours)
- **Goal:** Deliver a working deployed prototype.

## Technology Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Firebase Authentication
- Firebase Firestore
- Next.js API routes for AI
- GitHub
- Vercel
- AI provider through a server-side API key

## Core Product Loop

Student describes a problem → AI understands it → AI classifies it → AI detects priority → AI selects department → AI generates a suggested reply → ticket is created → admin reviews and updates it → student sees live status → admin analytics reflect the activity.

## Roles

- `student`
- `admin`

## Mandatory Working Features

1. Student registration/login
2. Student dashboard
3. Course and enrollment management
4. Student support / complaint submission
5. AI issue classification
6. Priority detection
7. Department routing
8. Support status tracking
9. Academy/admin dashboard
10. AI-powered student assistance

## Student Dashboard

- Profile
- Enrolled courses
- Course details
- Progress
- Attendance
- Class schedule
- Learning resources
- Enrollment information
- Payment information
- Certificates
- Internship opportunities
- Announcements
- Support requests
- Complaint history
- AI assistant

## Admin Dashboard

- Total students
- Active students
- Course enrollments
- New enrollments
- Payment overview
- Pending complaints
- Resolved complaints
- High-priority complaints
- Average resolution time
- Common issues
- Course statistics
- Support analytics
- AI-generated insights

## AI Jobs

1. Complaint triage
2. Student assistant
3. Admin reply drafting
4. Management insights

## AI Triage Output

The validated triage result must include:

- `category`
- `priority`
- `priorityReason`
- `department`
- `sentiment`
- `summary`
- `suggestedReply`
- `internalNote`
- `escalation`
- `confidence`
- `language`
- `possibleDuplicate`

### Categories

- Payment & Billing
- Technical Access
- Course Content
- Class Schedule
- Attendance
- Certificate
- Internship/Placement
- Instructor/Conduct
- Enrollment
- General

### Departments

- Finance
- Technical Support
- Academics
- Admissions
- Placement & Careers
- Student Affairs

### Priorities

- `low`
- `medium`
- `high`
- `critical`

### Priority Guidance

- **Critical:** money lost, safety/harassment, or locked out before an exam/deadline
- **High:** student is blocked from learning
- **Medium:** issue exists but does not block important activity
- **Low:** general information request

## Core Firestore Collections

- `users`
- `courses`
- `classes`
- `enrollments`
- `payments`
- `announcements`
- `internships`
- `tickets`
- `insights`

## Ticket Statuses

- `Open`
- `In Progress`
- `Escalated`
- `Resolved`

## Important Implementation Principles

- Prefer simple and reliable solutions.
- Do not over-engineer.
- Never sacrifice the core ticket workflow for optional features.
- Firestore is the main database.
- Use real-time Firestore listeners where appropriate.
- AI API keys must remain server-side.
- Never expose AI API keys through `NEXT_PUBLIC_` variables.
- Never commit `.env.local`.
- Validate all AI output before using it.
- If AI fails, the ticket must still be created using deterministic fallback rules.
- Treat complaint text as untrusted user input.
- Keep sensitive priority rules deterministic where necessary.
- Do not promise refunds through AI responses.
- Payments are records only; there is no real payment gateway.
- Do not add file uploads or Firebase Storage unless explicitly approved later.
- Do not add a RAG/vector database.
- Do not add unnecessary state-management libraries.
- Do not use Redux.
- Do not use React Query unless a later requirement explicitly justifies it.
- Do not use server actions; AI functionality uses API routes.
- Build one feature at a time.
- Test each completed feature before starting the next.
- Do not modify unrelated working functionality.
- Before major architectural changes, explain the change first.

## Demo-Critical Workflow

Student logs in → sees populated dashboard → submits a realistic complaint → AI analyzes it → AI result is visibly shown → ticket is created → admin sees the ticket → admin drafts/sends a response → admin resolves the ticket → student sees the updated ticket status live → admin dashboard analytics reflect the ticket.

## Development Priority

- **P0:** authentication, student dashboard, complaint/ticket loop, AI triage, admin ticket management, admin dashboard, deployment
- **P1:** student assistant, AI draft reply, AI insights, sentiment, auto-escalation
- **P2:** voice input, duplicate detection, satisfaction rating, personalized recommendations

Never sacrifice P0 features for P1/P2 features.

## Before Implementing Any Feature

- Inspect the existing project.
- Understand the existing structure.
- Make the smallest reliable change.
- Report files changed.
- Report how to test the change.
- Do not silently redesign the architecture.

