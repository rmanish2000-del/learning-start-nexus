# EduOS Foundation

Build EduOS Phase 1.

EduOS is a learning intelligence platform for tutoring centers.

Tech Stack:

- Lovable

- Supabase

- Role-based authentication

Users:

1. Admin

2. Educator

3. Student

Current scope:

ONLY build the platform foundation.

DO NOT build:

- AI Tutor

- Recommendation Engine

- Assessment Engine

- Mastery Calculations

- Intervention Logic

Build only:

1. Authentication

Admin:

- Email login

Educator:

- Email login

Student:

- Student Handle + PIN login

2. Role-Based Navigation

Admin Navigation:

- Dashboard

- Users

- Learners

- Settings

Educator Navigation:

- Dashboard

- Learners

- Assessments (placeholder)

- Interventions (placeholder)

- Settings

Student Navigation:

- Home

- Learning

- Progress

3. Educator Dashboard

Show cards:

- Active Learners

- Learners Needing Attention

- Active Interventions

- Average Mastery Lift

Use realistic seeded demo data.

4. Learners Screen

Features:

- Search learners

- Filter by Grade

- Filter by Status

Columns:

- Student Name

- Grade

- Subject

- Status

5. Learner Profile

Tabs:

- Overview

- Mastery

- Assessments

- Learning Plan

- Evidence

Use seeded data for:

Aarav Sharma

Grade 6

Mathematics

6. Admin Area

Users:

- Add User

- View Users

- Assign Role

Learners:

- Add Learner

- Assign Educator

Settings:

- Organization Profile

7. Student Home

Display:

- Welcome Message

- Continue Learning

- Today's Tasks

- Progress Summary

Design Style:

Modern SaaS

Reference products:

Linear

Notion

Stripe Dashboard

Requirements:

- Responsive

- Dark mode

- Light mode

- Clean typography

- Professional educator-focused UI

Generate complete Phase 1 application.

Use realistic seeded demo data.

Focus on navigation, experience and usability.

Do not build Phase 2 functionality.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://learning-start-nexus.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1496f16b-f139-43ea-9ede-624a808d4f01).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

This repository uses Bun 1.4.2, pinned in `package.json`, with `bun.lock` as the source of truth.

```sh
git clone <this-repository-url>
cd <repository-name>
bun install --frozen-lockfile
bun run dev
```

Run the same quality gates used by CI:

```sh
bun run lint
bun run test
bun run build
```
