# Fellowship Toolbox — Design Spec

**Date:** 2026-06-14  
**Status:** Approved for implementation

## Overview

MLH Fellowship Toolbox is an operations app for Pod Leaders to manage fellowship cohort activities and for Fellows to self-report progress. It supports multiple program cohorts per year, multiple pod leaders per cohort, and four activity modules: peer/leader 1:1s, mentor meetings, demo days, and lightning talks.

## Stack

- **Frontend:** Next.js App Router, shadcn/ui preset `b7l99ROBsm`
- **Auth:** Clerk (identity only)
- **Backend:** Convex (cohorts, membership, activity data)
- **Membership:** App-owned invites in Convex; Clerk handles sign-in

## Roles

| Role | Capabilities |
|------|-------------|
| Pod Leader | Create cohorts, invite fellows/leaders, configure activities, generate assignments, override any status |
| Fellow | View cohort context, self-report own activity status, enroll in lightning talks |

## Data Model

### Core

- `users` — Clerk-linked profile (tokenIdentifier, email, name)
- `cohorts` — program version (name, startDate, endDate, status)
- `cohortMemberships` — userId, cohortId, role (`podLeader` | `fellow`)
- `fellows` — cohort-scoped fellow record (name, email, calendlyUrl, userId optional until invite accepted)
- `invites` — email, cohortId, role, token, status

### 1:1 Tracker

- `oneOnOneInstances` — leader-defined rounds (e.g. "Start of Program", "End of Program")
- `peerOneOnOnes` — fellowAId, fellowBId, cohortId, status
- `leaderOneOnOnes` — fellowId, instanceId, status

Status enum: `notStarted` | `scheduled` | `completed`

### Mentor Meetings

- `mentors` — name, calendlyUrl, cohortId, active
- `mentorMeetingRounds` — cohortId, roundNumber, targetWeekLabel, targetWeekStart
- `mentorMeetingAssignments` — fellowId, mentorId, roundId, scheduled, completed

### Demo Days

- `demoDays` — fellowId, cohortId, demoDate, completed

### Lightning Talks

- `lightningTalkSlots` — cohortId, slotDate, maxEnrollments
- `lightningTalks` — fellowId, slotId, topic, completed

## Permissions

All access enforced server-side in Convex via custom function wrappers:

- Fellows: read cohort data; write only records where `fellow.userId === currentUser._id`
- Pod Leaders: full CRUD within their cohort memberships
- Non-members: no access

## Routes

| Route | Audience | Purpose |
|-------|----------|---------|
| `/` | All | Redirect by auth/cohort |
| `/dashboard` | All | Cohort health summary |
| `/cohorts` | Leaders | List/create cohorts |
| `/cohorts/[id]/settings` | Leaders | Roster, invites, mentors |
| `/cohorts/[id]/one-on-ones` | All | Peer matrix + leader rounds |
| `/cohorts/[id]/mentors` | All | Mentor assignments |
| `/cohorts/[id]/demo-days` | All | Demo schedule |
| `/cohorts/[id]/lightning-talks` | All | Talk slots & topics |
| `/me` | Fellows | Personal task view |

## UI Direction

Refined operations cockpit: calm density, warm cohort identity, status color chips, compact tables. No marketing hero sections. Utility copy throughout.

## Out of Scope (MVP)

- Email notifications
- Calendly API integration
- Cross-cohort analytics
- Mobile-native app
