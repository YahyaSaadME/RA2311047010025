# Campus Notification System — Overview

## What It Does

Students need to see placement drives, exam results, and campus events the moment they log in.
No refreshing, no digging around — just real-time updates right there on the screen.

---

## The API (Stage 1)

All routes sit under `/api` and need a JWT token to work. The core endpoints are:

- **GET /notifications** — fetch a student's notifications, paginated, with optional filters
- **GET /notifications/unread-count** — just the number, for the bell badge
- **PUT /notifications/:id/read** — mark one as read
- **PUT /notifications/read-all** — mark everything as read at once
- **DELETE /notifications/:id** — remove a notification
- **POST /notifications** — admin-only, sends notifications to one or more students

For real-time delivery, the server uses **SSE (Server-Sent Events)** — the frontend opens a
persistent connection and the server pushes updates as they happen. WebSockets were skipped
because notifications only flow one way, and SSE is simpler to manage.

---

## The Database (Stage 2)

PostgreSQL is the choice here. The `notifications` table is partitioned by month so queries
stay fast even as data piles up. Two indexes cover the main access patterns — unread
notifications per student, and notifications by type and date. Old partitions get dropped
on a schedule to keep the table size in check.

---

## Query Issues (Stage 3)

The original query used camelCase column names (`studentID`, `isRead`) which PostgreSQL
doesn't recognize — it quietly lowercases everything, so the query just errors out. `SELECT *`
was also a problem since it pulls full rows and blocks faster index-only scans. The fix is
snake_case column names, named columns only, and a `LIMIT`. Without a proper index on
`(student_id, created_at)` filtered to unread rows, the DB scans all 5 million rows every
time — which takes seconds. With the index, it's under 5ms.

---

## Scaling (Stage 4)

With 50,000 concurrent users, the DB gets hammered fast. Three things help:

- **Always paginate** — never fetch everything at once
- **Cache the unread count in Redis** — read from cache, not the DB, with a 60s TTL
- **Read replica** — route all SELECT queries away from the primary

If real-time isn't critical, polling the unread-count endpoint every 30 seconds cuts
request volume by about 30x with barely any noticeable delay.

---

## The Broadcast Problem (Stage 5)

The original `notify_all` function looped through 50,000 students one at a time — sending
email, then writing to DB, then pushing to app, sequentially. One failure at student 200
crashes the whole thing and no one after that gets notified. Also, email fired before the
DB write, so a failed insert left students with an email pointing to a notification
that didn't exist yet.

The fix: bulk insert all records first, then hand each one to a job queue. Workers process
deliveries in parallel with automatic retries on failure. The in-app notification shows up
immediately; email follows async.

---

## Priority Inbox (Stage 6)

Notifications are ranked by type first (Placement > Result > Event), then by recency within
the same type. A fixed-size min-heap keeps the top N notifications updated efficiently as new
ones come in — each new arrival costs O(log n), no matter how many total notifications exist.