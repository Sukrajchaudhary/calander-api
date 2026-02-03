# Calendar API Documentation
 
> **Base URL:** `http://localhost:3000/api/v1`  

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [API Flow Diagrams](#api-flow-diagrams)
4. [Data Models](#data-models)
5. [Time Slot System](#time-slot-system)
6. [Recurrence Patterns](#recurrence-patterns)
7. [Race Condition Handling](#race-condition-handling)
8. [API Endpoints](#api-endpoints)
9. [Error Handling](#error-handling)
10. [Best Practices](#best-practices)

---

## Overview

The Calendar API is a comprehensive scheduling system designed to manage classes and events with support for:

- **One-time events** - Single scheduled occurrences
- **Recurring events** - Daily, Weekly, Monthly, Yearly, and Custom patterns
- **Instance management** - Individual control over each occurrence
- **Calendar views** - Aggregated views for date ranges

### Key Features

| Feature | Description |
|---------|-------------|
| **Flexible Scheduling** | Support for multiple recurrence patterns |
| **Day-wise Time Slots** | Different time slots for different days |
| **Instance Independence** | Each recurring instance can be modified individually |
| **Status Management** | Track active, cancelled, and completed states |
| **Search & Filter** | Full-text search with multiple filter options |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT                                     │
│                    (Postman / Frontend App)                          │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         EXPRESS SERVER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   Helmet    │  │    CORS     │  │   Morgan    │  Security &     │
│  │  Security   │  │  Handling   │  │   Logger    │  Middleware     │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API ROUTES (v1)                              │
│                     /api/v1/calander/*                               │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         VALIDATORS                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  express-validator: Body, Query, Param validation           │   │
│  │  - Time format validation (HH:mm)                           │   │
│  │  - Recurrence configuration validation                      │   │
│  │  - MongoDB ObjectId validation                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CONTROLLER                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  CalanderController                                          │   │
│  │  - Request/Response handling                                 │   │
│  │  - Response formatting                                       │   │
│  │  - Error response generation                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SERVICE                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  CalanderService                                             │   │
│  │  - Business logic                                            │   │
│  │  - Instance generation                                       │   │
│  │  - Recurrence handling                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         MODELS                                       │
│  ┌──────────────────────┐     ┌──────────────────────┐             │
│  │       Class          │     │    ClassInstance     │             │
│  │  - title             │     │  - classId (ref)     │             │
│  │  - recurrence        │────▶│  - scheduledDate     │             │
│  │  - status            │     │  - startTime/endTime │             │
│  └──────────────────────┘     │  - status            │             │
│                                └──────────────────────┘             │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         MONGODB                                      │
│                    (Database Storage)                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API Flow Diagrams

### 1. Create Class Flow

```
┌──────────────┐
│   START      │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  POST /api/v1/       │
│     calander         │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Validate Request    │────▶│  Return 400 Error    │
│  (Title, Times, etc) │ NO  │  with field errors   │
└──────┬───────────────┘     └──────────────────────┘
       │ YES
       ▼
┌──────────────────────┐
│  Save Class to DB    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Is Recurring?       │
└──────┬───────────────┘
       │
       ├── NO ────────────────────────────┐
       │                                   │
       ▼ YES                               ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Generate Instances  │     │  Return Class Only   │
│  based on recurrence │     │  (201 Created)       │
│  configuration       │     └──────────────────────┘
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Bulk Insert         │
│  Instances to DB     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Return Class +      │
│  Instance Count      │
│  (201 Created)       │
└──────────────────────┘
```

### 2. Update Instance Flow

```
┌──────────────┐
│   START      │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  PUT /instances/     │
│     :instanceId      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Validate instanceId │────▶│  Return 400 Error    │
│  (MongoDB ObjectId)  │ NO  │  "Invalid ID"        │
└──────┬───────────────┘     └──────────────────────┘
       │ YES
       ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Find Instance in DB │────▶│  Return 404 Error    │
│                      │ NO  │  "Not Found"         │
└──────┬───────────────┘     └──────────────────────┘
       │ FOUND
       ▼
┌──────────────────────┐
│  Update Instance     │
│  - Updates updatedAt │
│  - Marks as modified │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Return Updated      │
│  Instance with       │
│  Class details       │
│  (200 OK)            │
└──────────────────────┘
```

### 3. Regenerate Instances Flow

```
┌──────────────┐
│   START      │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  POST /:id/          │
│     regenerate       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Find Class          │────▶│  Return 404 Error    │
│                      │ NO  │  "Class not found"   │
└──────┬───────────────┘     └──────────────────────┘
       │ FOUND
       ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Is Class Recurring? │────▶│  Return 400 Error    │
│                      │ NO  │  "Cannot regenerate" │
└──────┬───────────────┘     └──────────────────────┘
       │ YES
       ▼
┌──────────────────────┐
│  Delete ONLY:        │
│  - Future instances  │
│  - Status=scheduled  │
│  - NOT modified      │
│    (createdAt ==     │
│     updatedAt)       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Keep existing:      │
│  - Modified instances│
│  - Cancelled/        │
│    Completed         │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Generate new        │
│  instances (in       │
│  memory, not saved)  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Filter out          │
│  conflicts with      │
│  preserved instances │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Insert valid new    │
│  instances           │
│  (200 OK)            │
└──────────────────────┘
```

### 4. Calendar View Flow

```
┌──────────────┐
│   START      │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  GET /calendar       │
│  ?startDate&endDate  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│              PARALLEL QUERIES                 │
├──────────────────────┬───────────────────────┤
│                      │                        │
▼                      ▼                        │
┌──────────────┐  ┌──────────────┐             │
│ Get One-Time │  │ Get Instance │             │
│ Classes in   │  │ records with │             │
│ date range   │  │ Class info   │             │
└──────┬───────┘  └──────┬───────┘             │
       │                  │                     │
       └────────┬─────────┘                     │
                │                               │
                ▼                               │
┌──────────────────────┐                       │
│  Format & Normalize  │                       │
│  - Add type field    │                       │
│  - Flatten class     │                       │
│    details           │                       │
└──────┬───────────────┘                       │
       │                                        │
       ▼                                        │
┌──────────────────────┐                       │
│  Merge & Sort by     │                       │
│  date, then time     │                       │
└──────┬───────────────┘                       │
       │                                        │
       ▼                                        │
┌──────────────────────┐                       │
│  Return combined     │                       │
│  events (200 OK)     │                       │
└──────────────────────┘                       │
```

---

## Data Models

### Class Model

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique identifier |
| `title` | String | Required, max 200 chars |
| `description` | String | Optional, max 2000 chars |
| `instructor` | String | Optional, max 100 chars |
| `location` | String | Optional, max 200 chars |
| `capacity` | Number | Optional, 1-1000 |
| `availability` | Boolean | Default: true |
| `isRecurring` | Boolean | Required |
| `scheduledDate` | Date | Required if !isRecurring |
| `startTime` | String | HH:mm format |
| `endTime` | String | HH:mm format |
| `recurrence` | Object | Required if isRecurring |
| `status` | String | 'active', 'cancelled', 'completed' |
| `createdAt` | Date | Auto-managed |
| `updatedAt` | Date | Auto-managed |

### Class Instance Model

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Unique identifier |
| `classId` | ObjectId | Reference to parent Class |
| `scheduledDate` | Date | When this instance occurs |
| `startTime` | String | HH:mm format |
| `endTime` | String | HH:mm format |
| `status` | String | 'scheduled', 'cancelled', 'completed' |
| `createdAt` | Date | Auto-managed |
| `updatedAt` | Date | Auto-managed |

---

## Time Slot System

### Time Slot Structure

| Field | Type | Description |
|-------|------|-------------|
| `startTime` | String | Format: "HH:mm" (e.g., "09:00") |
| `endTime` | String | Format: "HH:mm" (e.g., "10:30") |
| `status` | String | Optional: 'scheduled', 'cancelled', 'completed' |

### Time Validation Rules

```
┌─────────────────────────────────────────────────────────────────────┐
│                      TIME VALIDATION                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. FORMAT VALIDATION                                                │
│     ✓ Must match pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/      │
│     ✓ Valid: "09:00", "9:00", "23:59", "00:00"                     │
│     ✗ Invalid: "25:00", "9:60", "9am", "09:00:00"                  │
│                                                                      │
│  2. LOGICAL VALIDATION                                               │
│     ✓ endTime must be AFTER startTime                               │
│     ✓ Comparison: (startHour * 60 + startMin) < (endHour * 60 +    │
│                    endMin)                                           │
│                                                                      │
│  3. SLOT INDEPENDENCE                                                │
│     ✓ Multiple slots on same day are allowed                        │
│     ✓ Slots can overlap (if intended)                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Day-Wise Time Slots

Each day can have multiple time slots with different schedules. Example structure:

| Day | Time Slots |
|-----|------------|
| Monday | 06:00-07:00 (Morning), 12:00-13:00 (Lunch), 18:00-19:00 (Evening) |
| Wednesday | 06:00-07:00 (Morning only) |
| Friday | 06:00-07:00 (Morning), 18:00-19:00 (Evening) |

### Time Slot Flow for Instance Generation

```
┌──────────────────────┐
│  Recurrence Config   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  FOR EACH date in range (startDate → endDate/maxOccurrences)    │
└──────┬───────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────┐
│  Get day of week     │
│  (e.g., "monday")    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Find matching day   │────▶│  Skip this date      │
│  in dayWiseTimeSlots │ NO  │  (no slots defined)  │
└──────┬───────────────┘     └──────────────────────┘
       │ FOUND
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  FOR EACH timeSlot in day's timeSlots                           │
└──────┬───────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────┐
│  Create Instance:    │
│  - scheduledDate     │
│  - startTime         │
│  - endTime           │
│  - status: scheduled │
└──────────────────────┘
```

---

## Recurrence Patterns

### Pattern Types

| Type | Description | Required Configuration |
|------|-------------|------------------------|
| `daily` | Every day | `dailyTimeSlots[]` |
| `weekly` | Specific days each week | `dayWiseTimeSlots[]` |
| `monthly` | Specific days each month | `monthlyDayWiseSlots[]` |
| `yearly` | Specific date each year | `yearlyMonth`, `yearlyDay`, `yearlyTimeSlots[]` |
| `custom` | Every N weeks on specific days | `customInterval`, `dayWiseTimeSlots[]` |

### Weekly Recurrence Example

```
Week 1: MON ─── TUE ─── WED ─── THU ─── FRI ─── SAT ─── SUN
         │             │             │
         ▼             ▼             ▼
       06:00        06:00        06:00
       18:00                     18:00

Week 2: MON ─── TUE ─── WED ─── THU ─── FRI ─── SAT ─── SUN
         │             │             │
         ▼             ▼             ▼
       06:00        06:00        06:00
       18:00                     18:00
       
       ... repeats until endDate or maxOccurrences ...
```

### Monthly Recurrence Example

```
FEBRUARY 2026
┌─────────────────────────────────────────────────────┐
│ SUN   MON   TUE   WED   THU   FRI   SAT             │
├─────────────────────────────────────────────────────┤
│  1●    2     3     4     5     6     7              │
│       10:00-12:00                                   │
│                                                      │
│  8     9    10    11    12    13    14              │
│                                                      │
│ 15●   16    17    18    19    20    21              │
│ 14:00-16:00                                         │
│                                                      │
│ 22    23    24    25    26    27    28              │
└─────────────────────────────────────────────────────┘

● = Instance generated on day 1 and day 15
```

---

## Race Condition Handling

### Understanding Race Conditions

Race conditions can occur when multiple requests try to modify the same data simultaneously. Our API handles these scenarios:

### 1. Instance Regeneration Protection

**Problem:** When regenerating instances, we don't want to lose user modifications.

**Solution:** Smart deletion with modification tracking.

```
┌─────────────────────────────────────────────────────────────────────┐
│                 REGENERATION PROTECTION LOGIC                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  DELETE only instances where:                                        │
│    ✓ scheduledDate >= today          (future instances)             │
│    ✓ status === 'scheduled'          (not cancelled/completed)      │
│    ✓ createdAt === updatedAt         (never modified)               │
│                                                                      │
│  KEEP instances where:                                               │
│    ✓ status is 'cancelled' or 'completed'                           │
│    ✓ updatedAt > createdAt           (user made changes)            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Conflict Detection During Regeneration

**Problem:** New instances might conflict with preserved instances.

**Solution:** Filter out conflicts before insertion.

```
  PRESERVED                    NEW INSTANCES
  INSTANCES                    (from recurrence)
      │                             │
      │ ┌────────────────┐          │
      │ │  Feb 10, 09:00 │◀─────────┤ Feb 10, 09:00 (CONFLICT!)
      │ │  (cancelled)   │          │
      │ └────────────────┘          │
      │                             │
      │                        Feb 12, 09:00 (OK to insert)
      │                             │
      │ ┌────────────────┐          │
      │ │  Feb 15, 09:00 │◀─────────┤ Feb 15, 09:00 (CONFLICT!)
      │ │  (modified)    │          │
      │ └────────────────┘          │
      │                             │
      ▼                             ▼
                                   
┌─────────────────────────────────────────────────────────────────────┐
│  CONFLICT CHECK: Same date + Same startTime = Don't insert         │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. MongoDB Atomic Operations

**Problem:** Concurrent updates to same document.

**Solution:** Use MongoDB's atomic operations via Mongoose - `findByIdAndUpdate` prevents race conditions by performing atomic read-modify-write operations.

### 4. Class Status Cascade

**Problem:** When class status changes, related instances should update.

**Solution:** Cascade updates within same transaction context.

```
┌──────────────────────┐
│  Class Status →      │
│  CANCELLED           │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  UPDATE all future instances WHERE:                              │
│    - classId matches                                             │
│    - scheduledDate >= today                                      │
│    - status = 'scheduled'                                        │
│                                                                   │
│  SET status → 'cancelled'                                        │
└──────────────────────────────────────────────────────────────────┘
```

### 5. Date Handling Consistency

**Problem:** Date/time zone mismatches can cause duplicate or missing instances.

**Solution:** Normalize all dates to start of day (midnight local time).

### Race Condition Summary Table

| Scenario | Problem | Solution |
|----------|---------|----------|
| Regenerate instances | Lose user modifications | Track `updatedAt !== createdAt` |
| Concurrent updates | Data inconsistency | MongoDB atomic operations |
| Status cascade | Orphaned instances | Same-transaction cascade updates |
| Date queries | Timezone mismatch | Normalize to day boundaries |
| Duplicate instances | Multiple same-time slots | Conflict detection before insert |

---

## API Endpoints

### Classes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/calander` | Create a new class |
| `GET` | `/calander` | Get all classes (with filters) |
| `GET` | `/calander/:id` | Get class by ID |
| `PUT` | `/calander/:id` | Update class |
| `DELETE` | `/calander/:id` | Delete class and instances |
| `PATCH` | `/calander/:id/status` | Update class status |
| `POST` | `/calander/:id/regenerate` | Regenerate recurring instances |

### Instances

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/calander/instances` | Get instances in date range |
| `GET` | `/calander/:id/instances` | Get instances for a class |
| `PATCH` | `/calander/instances/:instanceId` | Update instance status |
| `PUT` | `/calander/instances/:instanceId` | Update instance details |
| `PUT` | `/calander/:id/instances/specific` | Update instance by date |
| `PUT` | `/calander/:id/instances/all` | Update all instances |

### Calendar

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/calander/calendar` | Get calendar view |

---

## Error Handling

### Standard Error Response Format

| Field | Type | Description |
|-------|------|-------------|
| `title` | String | Error type (e.g., "Validation Error") |
| `message` | String | Human-readable error message |
| `errors` | Array | List of field-specific errors |
| `errors[].field` | String | Field name that caused the error |
| `errors[].message` | String | Specific error message for the field |

### HTTP Status Codes

| Code | Description | When Used |
|------|-------------|-----------|
| `200` | Success | Successful GET, PUT, PATCH, DELETE |
| `201` | Created | Successful POST (new resource) |
| `400` | Bad Request | Validation errors, invalid input |
| `404` | Not Found | Resource doesn't exist |
| `500` | Server Error | Unexpected errors |

---

## Best Practices

### 1. Creating Classes

| ✓ DO | ✗ DON'T |
|------|---------|
| Provide complete recurrence configuration | Create unlimited recurring classes |
| Always set an end date for recurring classes | Leave endDate empty (generates 365 instances!) |
| Use appropriate recurrence type for your use case | Mix one-time and recurring fields |

### 2. Updating Instances

| Action | Endpoint | Use Case |
|--------|----------|----------|
| Update specific instance | `PUT /instances/:instanceId` | One-off changes to single occurrence |
| Update by date | `PUT /:classId/instances/specific?scheduledDate=...&startTime=...` | When you don't have instanceId |
| Update all instances | `PUT /:classId/instances/all` | ⚠️ Caution: Affects every instance! |

### 3. Querying Data

| ✓ DO | Example |
|------|---------|
| Use date ranges to limit results | `?startDate=2026-02-01&endDate=2026-02-28` |
| Use pagination for large datasets | `?page=1&limit=20` |
| Combine filters efficiently | `?status=active&isRecurring=true&availability=true` |

### 4. Regeneration

| Step | Action |
|------|--------|
| 1 | Update class recurrence config via `PUT /calander/:id` |
| 2 | Call `POST /calander/:id/regenerate` to refresh instances |
| 3 | Check response for preserved modifications count |

---

## Quick Reference

### Time Slot Patterns

| Type | Configuration |
|------|---------------|
| DAILY | `dailyTimeSlots: [{ startTime, endTime }]` |
| WEEKLY | `dayWiseTimeSlots: [{ day, timeSlots: [] }]` |
| MONTHLY | `monthlyDayWiseSlots: [{ day: 1-31, timeSlots: [] }]` |
| YEARLY | `yearlyMonth: 0-11, yearlyDay: 1-31, yearlyTimeSlots: []` |
| CUSTOM | `customInterval: 1-52, dayWiseTimeSlots: []` |

### Status Transitions

| Model | Status Values |
|-------|---------------|
| CLASS | active ←→ cancelled ←→ completed |
| INSTANCE | scheduled ←→ cancelled ←→ completed |

### Query Parameters

| Endpoint | Available Parameters |
|----------|---------------------|
| Classes | `?status`, `?isRecurring`, `?availability`, `?search`, `?startDate`, `?endDate`, `?page`, `?limit` |
| Instances | `?startDate`, `?endDate` (required), `?status` |
| Calendar | `?startDate`, `?endDate` (required) |

---

*Documentation generated for Calendar API v1.0.0*
