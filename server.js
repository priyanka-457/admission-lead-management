const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "leads.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const SOURCE_OPTIONS = [
  "Website", "Walk-in", "Phone Call", "WhatsApp", "Education Fair",
  "Campaign", "Referral", "Social Media", "Other"
];

const STATUS_OPTIONS = ["New", "Contacted", "Qualified", "Follow-up", "Converted", "Lost"];

const COUNSELLORS = [
  { id: "C001", name: "Ananya Sharma" },
  { id: "C002", name: "Rahul Kumar" },
  { id: "C003", name: "Sneha Rao" },
  { id: "C004", name: "Vikram Singh" }
];

const COURSES = [
  "B.Tech Computer Science",
  "B.Tech AI & ML",
  "BCA",
  "MCA",
  "MBA",
  "Data Science",
  "Cyber Security",
  "Cloud Computing"
];

function ensureData() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const today = new Date();
    const iso = d => new Date(d).toISOString();
    const seed = [
      {
        id: crypto.randomUUID(), name: "Aarav Mehta", email: "aarav@example.com",
        phone: "9876543210", source: "Website", course: "B.Tech Computer Science",
        assignedTo: "C001", status: "New", createdAt: iso(today),
        lastContactedAt: null, nextFollowUp: null, notes: "Interested in software development."
      },
      {
        id: crypto.randomUUID(), name: "Diya Nair", email: "diya@example.com",
        phone: "9876543211", source: "Education Fair", course: "B.Tech AI & ML",
        assignedTo: "C002", status: "Follow-up",
        createdAt: iso(new Date(Date.now() - 5*86400000)),
        lastContactedAt: iso(new Date(Date.now() - 2*86400000)),
        nextFollowUp: iso(new Date(Date.now() + 86400000)),
        notes: "Parent requested fee details."
      },
      {
        id: crypto.randomUUID(), name: "Kabir Shah", email: "kabir@example.com",
        phone: "9876543212", source: "WhatsApp", course: "MCA",
        assignedTo: "C003", status: "Qualified",
        createdAt: iso(new Date(Date.now() - 9*86400000)),
        lastContactedAt: iso(new Date(Date.now() - 1*86400000)),
        nextFollowUp: iso(new Date(Date.now() + 2*86400000)),
        notes: "Completed counselling call."
      },
      {
        id: crypto.randomUUID(), name: "Meera Joshi", email: "meera@example.com",
        phone: "9876543213", source: "Campaign", course: "Data Science",
        assignedTo: "C004", status: "Converted",
        createdAt: iso(new Date(Date.now() - 20*86400000)),
        lastContactedAt: iso(new Date(Date.now() - 12*86400000)),
        nextFollowUp: null, notes: "Admission completed."
      },
      {
        id: crypto.randomUUID(), name: "Rohan Das", email: "rohan@example.com",
        phone: "9876543214", source: "Phone Call", course: "MBA",
        assignedTo: "C001", status: "Lost",
        createdAt: iso(new Date(Date.now() - 25*86400000)),
        lastContactedAt: iso(new Date(Date.now() - 18*86400000)),
        nextFollowUp: null, notes: "Chose another institution."
      }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
  }
}

function readLeads() {
  ensureData();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeLeads(leads) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2));
}

function validateLead(body) {
  const errors = [];
  if (!body.name || !String(body.name).trim()) errors.push("Name is required.");
  if (!body.phone || !String(body.phone).trim()) errors.push("Phone is required.");
  if (!body.source || !SOURCE_OPTIONS.includes(body.source)) errors.push("Valid lead source is required.");
  if (!body.course || !COURSES.includes(body.course)) errors.push("Valid course preference is required.");
  if (body.assignedTo && !COUNSELLORS.some(c => c.id === body.assignedTo)) errors.push("Invalid counsellor.");
  if (body.status && !STATUS_OPTIONS.includes(body.status)) errors.push("Invalid status.");
  return errors;
}

function enrich(lead) {
  const created = new Date(lead.createdAt);
  const age = Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000));
  const counsellor = COUNSELLORS.find(c => c.id === lead.assignedTo);
  const overdue = lead.nextFollowUp &&
    new Date(lead.nextFollowUp).getTime() < Date.now() &&
    !["Converted", "Lost"].includes(lead.status);
  return {
    ...lead,
    counsellorName: counsellor ? counsellor.name : "Unassigned",
    ageingDays: age,
    ageingBucket: age <= 2 ? "0-2 days" : age <= 7 ? "3-7 days" : age <= 14 ? "8-14 days" : "15+ days",
    overdueFollowUp: !!overdue
  };
}

app.get("/api/meta", (req, res) => {
  res.json({ sources: SOURCE_OPTIONS, statuses: STATUS_OPTIONS, counsellors: COUNSELLORS, courses: COURSES });
});

app.get("/api/leads", (req, res) => {
  let leads = readLeads().map(enrich);
  const { search, status, source, counsellor, course, ageing, overdue } = req.query;

  if (search) {
    const q = search.toLowerCase();
    leads = leads.filter(l =>
      [l.name, l.email, l.phone, l.course, l.counsellorName].some(v => String(v || "").toLowerCase().includes(q))
    );
  }
  if (status) leads = leads.filter(l => l.status === status);
  if (source) leads = leads.filter(l => l.source === source);
  if (counsellor) leads = leads.filter(l => l.assignedTo === counsellor);
  if (course) leads = leads.filter(l => l.course === course);
  if (ageing === "0-2") leads = leads.filter(l => l.ageingDays <= 2);
  if (ageing === "3-7") leads = leads.filter(l => l.ageingDays >= 3 && l.ageingDays <= 7);
  if (ageing === "8-14") leads = leads.filter(l => l.ageingDays >= 8 && l.ageingDays <= 14);
  if (ageing === "15+") leads = leads.filter(l => l.ageingDays >= 15);
  if (overdue === "true") leads = leads.filter(l => l.overdueFollowUp);

  leads.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(leads);
});

app.post("/api/leads", (req, res) => {
  const errors = validateLead(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const lead = {
    id: crypto.randomUUID(),
    name: String(req.body.name).trim(),
    email: String(req.body.email || "").trim(),
    phone: String(req.body.phone).trim(),
    source: req.body.source,
    course: req.body.course,
    assignedTo: req.body.assignedTo || "",
    status: req.body.status || "New",
    createdAt: new Date().toISOString(),
    lastContactedAt: req.body.lastContactedAt || null,
    nextFollowUp: req.body.nextFollowUp || null,
    notes: String(req.body.notes || "").trim()
  };

  const leads = readLeads();
  leads.push(lead);
  writeLeads(leads);
  res.status(201).json(enrich(lead));
});

app.put("/api/leads/:id", (req, res) => {
  const leads = readLeads();
  const index = leads.findIndex(l => l.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Lead not found." });

  const current = leads[index];
  const merged = { ...current, ...req.body };
  const errors = validateLead(merged);
  if (errors.length) return res.status(400).json({ errors });

  if (merged.status === "Converted" && current.status !== "Converted") {
    merged.nextFollowUp = null;
  }
  leads[index] = merged;
  writeLeads(leads);
  res.json(enrich(merged));
});

app.delete("/api/leads/:id", (req, res) => {
  const leads = readLeads();
  const filtered = leads.filter(l => l.id !== req.params.id);
  if (filtered.length === leads.length) return res.status(404).json({ error: "Lead not found." });
  writeLeads(filtered);
  res.status(204).end();
});

app.post("/api/leads/:id/followups", (req, res) => {
  const leads = readLeads();
  const index = leads.findIndex(l => l.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Lead not found." });

  const { action, date, outcome, notes } = req.body;
  if (!action || !date) return res.status(400).json({ error: "Follow-up action and date are required." });

  const lead = leads[index];
  lead.lastContactedAt = new Date().toISOString();
  lead.nextFollowUp = new Date(date).toISOString();
  if (outcome === "Converted") lead.status = "Converted";
  else if (outcome === "Lost") lead.status = "Lost";
  else if (lead.status === "New" || lead.status === "Contacted") lead.status = "Follow-up";
  lead.notes = [lead.notes, `Follow-up: ${action} | Outcome: ${outcome || "Pending"} | ${notes || ""}`]
    .filter(Boolean).join("\n");
  writeLeads(leads);
  res.status(201).json(enrich(lead));
});

app.get("/api/reports", (req, res) => {
  const leads = readLeads().map(enrich);
  const count = arr => arr.length;
  const converted = leads.filter(l => l.status === "Converted").length;

  const by = key => {
    const map = {};
    leads.forEach(l => {
      const k = l[key] || "Unassigned";
      if (!map[k]) map[k] = { total: 0, converted: 0, open: 0 };
      map[k].total++;
      if (l.status === "Converted") map[k].converted++;
      if (!["Converted", "Lost"].includes(l.status)) map[k].open++;
    });
    return Object.entries(map).map(([name, v]) => ({
      name, ...v, conversionRate: v.total ? +(v.converted / v.total * 100).toFixed(1) : 0
    })).sort((a,b) => b.total - a.total);
  };

  const overdue = leads.filter(l => l.overdueFollowUp);
  const open = leads.filter(l => !["Converted", "Lost"].includes(l.status));
  const avgAge = open.length ? +(open.reduce((s,l) => s + l.ageingDays, 0) / open.length).toFixed(1) : 0;

  res.json({
    kpis: {
      total: count(leads),
      open: count(open),
      converted,
      lost: leads.filter(l => l.status === "Lost").length,
      overdueFollowUps: overdue.length,
      conversionRate: leads.length ? +(converted / leads.length * 100).toFixed(1) : 0,
      averageOpenAgeDays: avgAge
    },
    byStatus: by("status"),
    bySource: by("source"),
    byCourse: by("course"),
    byCounsellor: by("counsellorName"),
    ageing: {
      "0-2 days": leads.filter(l => l.ageingDays <= 2).length,
      "3-7 days": leads.filter(l => l.ageingDays >= 3 && l.ageingDays <= 7).length,
      "8-14 days": leads.filter(l => l.ageingDays >= 8 && l.ageingDays <= 14).length,
      "15+ days": leads.filter(l => l.ageingDays >= 15).length
    },
    overdue: overdue.slice(0, 10)
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

ensureData();
app.listen(PORT, () => console.log(`Admission Lead Management running at http://localhost:${PORT}`));
