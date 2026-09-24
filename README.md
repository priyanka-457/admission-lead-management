# Admission Lead Management — Junior Software Engineer Assignment

## 1. What this project solves

This application manages the complete admission-lead lifecycle from first contact to follow-up and conversion.

- Lead capture from website, walk-in, phone call, WhatsApp, education fairs, campaigns, referrals, social media and other sources
- Assignment to counsellors
- Course preferences
- Lead status/lifecycle
- Follow-up actions and outcomes
- Manager visibility
- Lead ageing
- Reports and actionable insights

## Screenshots
<img width="1457" height="715" alt="image" src="https://github.com/user-attachments/assets/16ed70cb-1e9d-4375-b9c9-5a932364307f" />
<img width="1502" height="722" alt="image" src="https://github.com/user-attachments/assets/7755f1fe-1ed2-4dc7-80fb-5ff347c69b43" />
<img width="1465" height="685" alt="image" src="https://github.com/user-attachments/assets/3d9c064f-93d5-4060-bd28-4fda526ada8e" /> 
<img width="1505" height="687" alt="image" src="https://github.com/user-attachments/assets/6093545f-0b4a-4a2d-9217-7b527e990c46" /> 
<img width="1492" height="707" alt="image" src="https://github.com/user-attachments/assets/85b23f9a-068b-44b5-a029-a1e496d83c72" />
<img width="1312" height="696" alt="image" src="https://github.com/user-attachments/assets/9df64192-bb8b-4ce8-91a3-ca48b98cb942" />

## 2. Main features

### Lead Management
Create, edit and delete leads with:
- Student name
- Phone and email
- Lead source
- Course preference
- Assigned counsellor
- Status
- Next follow-up date/time
- Notes

### Lifecycle
Supported statuses:
`New → Contacted → Qualified → Follow-up → Converted / Lost`

### Counsellor management
The application has four demo counsellors. Managers can see the full pipeline and filter leads by counsellor.

### Follow-up management
Counsellors can record:
- Phone Call
- WhatsApp
- Email
- Campus Visit
- Online Counselling

Each action can capture the next follow-up date, outcome and notes.

### Ageing
Every lead automatically displays its age in days and an ageing bucket:
- 0–2 days
- 3–7 days
- 8–14 days
- 15+ days

Open leads with a past follow-up date are marked overdue.

### Manager dashboard
The dashboard shows:
- Total leads
- Open pipeline
- Converted leads
- Conversion rate
- Overdue follow-ups
- Average age of open leads
- Pipeline by status
- Ageing overview
- Overdue lead list

### Reports & insights
Reports are available by:
- Lead source
- Course
- Counsellor
- Status
- Ageing

The app also generates simple actionable insights from the current data.

## 3. Tech stack

- Node.js
- Express.js
- HTML5
- CSS3
- Vanilla JavaScript
- JSON file persistence

JSON persistence is intentionally used to keep the project easy to run for a take-home assignment without requiring MySQL/PostgreSQL setup.

## 4. How to run

### Requirements
Install Node.js 18+.

### Commands

```bash
npm install
npm start
```

Then open:

`http://localhost:3000`

The first run automatically creates `data/leads.json` with sample admission leads.

## 5. Suggested demo flow

1. Open Dashboard.
2. Show manager KPIs and ageing.
3. Go to Lead Management.
4. Add a lead from WhatsApp or Education Fair.
5. Assign it to a counsellor.
6. Select a course preference and status.
7. Open the Follow-up section and record a counselling action.
8. Change outcome to Qualified or Converted.
9. Return to Dashboard and show updated KPIs.
10. Open Reports & Insights and demonstrate source/course/counsellor analysis.
11. Use filters to show manager visibility by counsellor, status, source and ageing.

## 6. API endpoints

- `GET /api/meta`
- `GET /api/leads`
- `POST /api/leads`
- `PUT /api/leads/:id`
- `DELETE /api/leads/:id`
- `POST /api/leads/:id/followups`
- `GET /api/reports`

## 7. Project structure

```text
admission-lead-management/
├── data/
│   └── leads.json              
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── package.json
├── server.js
└── README.md
```
