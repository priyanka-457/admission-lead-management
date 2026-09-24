let META = null;
let currentFollowupFilter = "all";

const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = value => value ? new Date(value).toLocaleString([], {dateStyle:"medium", timeStyle:"short"}) : "—";

async function api(url, options={}) {
  const res = await fetch(url, {headers: {"Content-Type":"application/json"}, ...options});
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data.errors || [data.error]).join?.(" ") || "Request failed");
  }
  return res.status === 204 ? null : res.json();
}

async function init() {
  META = await api("/api/meta");
  fillSelects();
  await refreshAll();
  document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => showTab(btn.dataset.tab)));
  $("leadForm").addEventListener("submit", saveLead);
  $("followupForm").addEventListener("submit", saveFollowup);
}

function fillSelects() {
  const add = (id, items, placeholder) => {
    $(id).innerHTML = `<option value="">${placeholder}</option>` + items.map(x => {
      const value = typeof x === "object" ? x.id : x;
      const text = typeof x === "object" ? x.name : x;
      return `<option value="${esc(value)}">${esc(text)}</option>`;
    }).join("");
  };
  add("source", META.sources, "Select source");
  add("course", META.courses, "Select course");
  add("assignedTo", META.counsellors, "Unassigned");
  add("status", META.statuses, "Select status");

  add("filterStatus", META.statuses, "All Statuses");
  add("filterSource", META.sources, "All Sources");
  add("filterCounsellor", META.counsellors, "All Counsellors");
  add("filterCourse", META.courses, "All Courses");
}

async function refreshAll() {
  await Promise.all([loadDashboard(), loadLeads(), loadFollowups(), loadReports()]);
}

function showTab(tab) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
  $(tab).classList.add("active");
  document.querySelector(`[data-tab="${tab}"]`).classList.add("active");
  if (tab === "dashboard") loadDashboard();
  if (tab === "leads") loadLeads();
  if (tab === "followups") loadFollowups();
  if (tab === "reports") loadReports();
}
window.showTab = showTab;

function kpi(label, value) {
  return `<div class="kpi"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div></div>`;
}

async function loadDashboard() {
  const r = await api("/api/reports");
  $("kpis").innerHTML = [
    kpi("Total Leads", r.kpis.total), kpi("Open Pipeline", r.kpis.open),
    kpi("Converted", r.kpis.converted), kpi("Conversion Rate", r.kpis.conversionRate + "%"),
    kpi("Overdue Follow-ups", r.kpis.overdueFollowUps), kpi("Avg Open Age", r.kpis.averageOpenAgeDays + " days")
  ].join("");

  const maxStatus = Math.max(1, ...r.byStatus.map(x => x.total));
  $("pipeline").innerHTML = r.byStatus.map(x =>
    `<div class="bar-row"><span>${esc(x.name)}</span><div class="bar"><span style="width:${x.total/maxStatus*100}%"></span></div><b>${x.total}</b></div>`
  ).join("");

  const ages = Object.entries(r.ageing);
  const maxAge = Math.max(1, ...ages.map(x => x[1]));
  $("ageingChart").innerHTML = ages.map(([name, value]) =>
    `<div class="bar-row"><span>${esc(name)}</span><div class="bar"><span style="width:${value/maxAge*100}%"></span></div><b>${value}</b></div>`
  ).join("");

  $("overdueTable").innerHTML = simpleLeadTable(r.overdue, true);
}

function simpleLeadTable(leads, overdueOnly=false) {
  if (!leads.length) return `<div class="empty">No ${overdueOnly ? "overdue " : ""}follow-ups found.</div>`;
  return `<table class="data-table"><thead><tr><th>Lead</th><th>Counsellor</th><th>Status</th><th>Follow-up</th><th>Age</th><th>Action</th></tr></thead><tbody>` +
    leads.map(l => `<tr><td><b>${esc(l.name)}</b><br><span class="muted">${esc(l.phone)}</span></td>
    <td>${esc(l.counsellorName)}</td><td><span class="badge status-${esc(l.status)}">${esc(l.status)}</span></td>
    <td class="${l.overdueFollowUp ? "overdue":""}">${fmtDate(l.nextFollowUp)}</td><td>${l.ageingDays} days</td>
    <td><button class="action-btn" onclick="openFollowup('${l.id}')">Follow-up</button></td></tr>`).join("") +
    `</tbody></table>`;
}

async function loadLeads() {
  const params = new URLSearchParams();
  const mappings = {search:"search",filterStatus:"status",filterSource:"source",filterCounsellor:"counsellor",filterCourse:"course",filterAgeing:"ageing"};
  Object.entries(mappings).forEach(([id,key]) => { if ($(id).value) params.set(key, $(id).value); });
  if ($("filterOverdue").checked) params.set("overdue","true");
  const leads = await api("/api/leads?" + params.toString());

  $("leadTable").innerHTML = leads.length ? `<table class="data-table">
  <thead><tr><th>Lead</th><th>Source</th><th>Course</th><th>Counsellor</th><th>Status</th><th>Ageing</th><th>Next Follow-up</th><th>Actions</th></tr></thead>
  <tbody>${leads.map(l => `<tr>
    <td><b>${esc(l.name)}</b><br><span class="muted">${esc(l.phone)}${l.email ? " • "+esc(l.email):""}</span></td>
    <td>${esc(l.source)}</td><td>${esc(l.course)}</td><td>${esc(l.counsellorName)}</td>
    <td><span class="badge status-${esc(l.status)}">${esc(l.status)}</span></td>
    <td>${l.ageingDays} days<br><span class="muted">${esc(l.ageingBucket)}</span></td>
    <td class="${l.overdueFollowUp ? "overdue":""}">${fmtDate(l.nextFollowUp)}</td>
    <td><button class="action-btn" onclick="editLead('${l.id}')">Edit</button><button class="action-btn" onclick="openFollowup('${l.id}')">Follow-up</button><button class="action-btn delete-btn" onclick="deleteLead('${l.id}')">Delete</button></td>
  </tr>`).join("")}</tbody></table>` : `<div class="empty">No leads match your filters.</div>`;
}

async function openLeadModal(id) {
  $("leadForm").reset();
  $("leadId").value = "";
  $("modalTitle").textContent = "Add Lead";
  $("formError").textContent = "";
  $("status").value = "New";
  $("leadModal").classList.remove("hidden");
  if (id) await editLead(id);
}
window.openLeadModal = openLeadModal;

async function editLead(id) {
  const leads = await api("/api/leads");
  const l = leads.find(x => x.id === id);
  if (!l) return;
  $("leadId").value = l.id; $("name").value = l.name; $("phone").value = l.phone;
  $("email").value = l.email || ""; $("source").value = l.source; $("course").value = l.course;
  $("assignedTo").value = l.assignedTo || ""; $("status").value = l.status;
  $("nextFollowUp").value = l.nextFollowUp ? toLocalInput(l.nextFollowUp) : "";
  $("notes").value = l.notes || ""; $("modalTitle").textContent = "Edit Lead";
  $("formError").textContent = ""; $("leadModal").classList.remove("hidden");
}
window.editLead = editLead;

function toLocalInput(value) {
  const d = new Date(value), pad = n => String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function saveLead(e) {
  e.preventDefault();
  const id = $("leadId").value;
  const body = {
    name:$("name").value, phone:$("phone").value, email:$("email").value,
    source:$("source").value, course:$("course").value, assignedTo:$("assignedTo").value,
    status:$("status").value || "New", nextFollowUp:$("nextFollowUp").value ? new Date($("nextFollowUp").value).toISOString() : null,
    notes:$("notes").value
  };
  try {
    await api(id ? `/api/leads/${id}` : "/api/leads", {method:id ? "PUT":"POST", body:JSON.stringify(body)});
    closeModal(); await refreshAll();
  } catch (err) { $("formError").textContent = err.message; }
}

async function deleteLead(id) {
  if (!confirm("Delete this lead? This action cannot be undone.")) return;
  await api(`/api/leads/${id}`, {method:"DELETE"}); await refreshAll();
}
window.deleteLead = deleteLead;

function closeModal(){ $("leadModal").classList.add("hidden"); }
window.closeModal = closeModal;

function openFollowup(id) {
  $("followupLeadId").value = id;
  const d = new Date(Date.now() + 86400000); d.setHours(10,0,0,0);
  $("followupDate").value = toLocalInput(d.toISOString());
  $("followupAction").value = "Phone Call"; $("followupOutcome").value = ""; $("followupNotes").value = "";
  $("followupModal").classList.remove("hidden");
}
window.openFollowup = openFollowup;

function closeFollowupModal(){ $("followupModal").classList.add("hidden"); }
window.closeFollowupModal = closeFollowupModal;

async function saveFollowup(e) {
  e.preventDefault();
  const id = $("followupLeadId").value;
  await api(`/api/leads/${id}/followups`, {method:"POST", body:JSON.stringify({
    action:$("followupAction").value, date:new Date($("followupDate").value).toISOString(),
    outcome:$("followupOutcome").value, notes:$("followupNotes").value
  })});
  closeFollowupModal(); await refreshAll();
}

async function loadFollowups() {
  const leads = await api("/api/leads");
  let open = leads.filter(l => !["Converted","Lost"].includes(l.status) && l.nextFollowUp);
  const now = new Date(), start = new Date(); start.setHours(0,0,0,0), end = new Date(start); end.setDate(end.getDate()+1);
  if (currentFollowupFilter === "overdue") open = open.filter(l => new Date(l.nextFollowUp) < now);
  if (currentFollowupFilter === "today") open = open.filter(l => new Date(l.nextFollowUp) >= start && new Date(l.nextFollowUp) < end);
  if (currentFollowupFilter === "upcoming") open = open.filter(l => new Date(l.nextFollowUp) >= end);
  open.sort((a,b) => new Date(a.nextFollowUp) - new Date(b.nextFollowUp));
  $("followupTable").innerHTML = open.length ? `<table class="data-table"><thead><tr><th>Lead</th><th>Course</th><th>Counsellor</th><th>Status</th><th>Scheduled</th><th>Ageing</th><th>Action</th></tr></thead><tbody>` +
    open.map(l => `<tr><td><b>${esc(l.name)}</b><br>${esc(l.phone)}</td><td>${esc(l.course)}</td><td>${esc(l.counsellorName)}</td>
    <td><span class="badge status-${esc(l.status)}">${esc(l.status)}</span></td><td class="${l.overdueFollowUp ? "overdue":""}">${fmtDate(l.nextFollowUp)}</td><td>${l.ageingDays} days</td>
    <td><button class="action-btn" onclick="openFollowup('${l.id}')">Record action</button></td></tr>`).join("") + `</tbody></table>` : `<div class="empty">No follow-ups in this view.</div>`;
}
window.setFollowupFilter = function(filter, el) {
  currentFollowupFilter = filter;
  document.querySelectorAll(".chip").forEach(x => x.classList.remove("active")); el.classList.add("active");
  loadFollowups();
};

function reportTable(items) {
  if (!items.length) return `<div class="empty">No data available.</div>`;
  return `<div class="report-row report-head"><span>Name</span><span>Total</span><span>Open</span><span>Conversion</span></div>` +
    items.map(x => `<div class="report-row"><span>${esc(x.name)}</span><span>${x.total}</span><span>${x.open}</span><span>${x.conversionRate}%</span></div>`).join("");
}

async function loadReports() {
  const r = await api("/api/reports");
  $("reportKpis").innerHTML = [
    kpi("Total Leads", r.kpis.total), kpi("Converted", r.kpis.converted),
    kpi("Conversion Rate", r.kpis.conversionRate+"%"), kpi("Open Leads", r.kpis.open),
    kpi("Overdue", r.kpis.overdueFollowUps), kpi("Avg Age", r.kpis.averageOpenAgeDays+" days")
  ].join("");
  $("sourceReport").innerHTML = reportTable(r.bySource);
  $("courseReport").innerHTML = reportTable(r.byCourse);
  $("counsellorReport").innerHTML = reportTable(r.byCounsellor);

  const topSource = r.bySource[0];
  const topCourse = r.byCourse[0];
  const insights = [
    `${r.kpis.open} leads are currently open in the pipeline.`,
    `${r.kpis.overdueFollowUps} open leads have overdue follow-up actions.`,
    topSource ? `${topSource.name} is the largest lead source with ${topSource.total} lead(s).` : "No source data yet.",
    topCourse ? `${topCourse.name} is the most requested course with ${topCourse.total} lead(s).` : "No course data yet.",
    `Average age of open leads is ${r.kpis.averageOpenAgeDays} day(s); older leads should be reviewed by the manager.`
  ];
  $("insights").innerHTML = insights.map(x => `<li>${esc(x)}</li>`).join("");
}

init().catch(err => {
  console.error(err);
  document.body.insertAdjacentHTML("afterbegin", `<div style="padding:12px;background:#fee2e2;color:#991b1b">Application error: ${esc(err.message)}</div>`);
});
