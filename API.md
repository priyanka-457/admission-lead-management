# API Quick Reference

## GET /api/meta
Returns source, status, counsellor and course options.

## GET /api/leads
Supports query parameters:
- search
- status
- source
- counsellor
- course
- ageing (`0-2`, `3-7`, `8-14`, `15+`)
- overdue (`true`)

## POST /api/leads
Example:
```json
{
  "name": "Priya Rao",
  "phone": "9999999999",
  "email": "priya@example.com",
  "source": "WhatsApp",
  "course": "B.Tech AI & ML",
  "assignedTo": "C001",
  "status": "New",
  "nextFollowUp": null,
  "notes": "Interested in AI."
}
```

## PUT /api/leads/:id
Updates lead fields.

## POST /api/leads/:id/followups
Example:
```json
{
  "action": "Phone Call",
  "date": "2026-09-25T10:00:00.000Z",
  "outcome": "Qualified",
  "notes": "Student requested syllabus."
}
```

## GET /api/reports
Returns KPI, status, source, course, counsellor, ageing and overdue summaries.
