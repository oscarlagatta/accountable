// Shared sample data and small SVG chart helpers for the three mockups.
// Static mockups only: the real app gets this from the API.

window.MOCK = (() => {
  const months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
  const wonRevenue = [62000, 48000, 91000, 74000, 118000, 86000, 132000, 97000, 141000, 126000, 168000, 72000];
  const wonCount = [2, 2, 3, 3, 4, 3, 4, 3, 5, 4, 5, 2];
  const lostCount = [1, 2, 1, 2, 1, 3, 2, 1, 2, 2, 1, 1];

  const stages = [
    { key: "new", name: "New", prob: 5 },
    { key: "qualified", name: "Qualified", prob: 20 },
    { key: "proposal", name: "Proposal", prob: 40 },
    { key: "negotiation", name: "Negotiation", prob: 70 },
    { key: "won", name: "Won", prob: 100 },
    { key: "lost", name: "Lost", prob: 0 },
  ];

  const deals = [
    ["new", "Fleet tracking pilot", "Harbor Freight Lines", "Maya Okafor", 24000, "Jan 30, 2027"],
    ["new", "Patient intake portal", "Cedar Valley Clinics", "Daniel Reyes", 58000, "Feb 14, 2027"],
    ["new", "Inventory sync add-on", "Brightline Retail", "Priya Nair", 9500, "Jan 12, 2027"],
    ["new", "Staff training package", "Northgate Hotels", "Tom Becker", 12000, "Feb 28, 2027"],
    ["new", "Data warehouse scoping", "Ostrow Manufacturing", "Lena Fischer", 35000, "Mar 6, 2027"],
    ["qualified", "Claims workflow rebuild", "Summit Mutual", "Grace Liu", 96000, "Jan 20, 2027"],
    ["qualified", "Campus booking system", "Westbrook College", "Sam Adeyemi", 41000, "Dec 18, 2026"],
    ["qualified", "Route optimization", "Harbor Freight Lines", "Maya Okafor", 67000, "Feb 3, 2027"],
    ["qualified", "Loyalty app refresh", "Brightline Retail", "Owen Clarke", 28000, "Nov 2, 2026", true],
    ["proposal", "ERP integration", "Ostrow Manufacturing", "Lena Fischer", 124000, "Dec 22, 2026"],
    ["proposal", "Telehealth module", "Cedar Valley Clinics", "Ana Petrov", 72000, "Jan 9, 2027"],
    ["proposal", "Guest Wi-Fi analytics", "Northgate Hotels", "Tom Becker", 18500, "Oct 28, 2026", true],
    ["proposal", "Student records migration", "Westbrook College", "Sam Adeyemi", 54000, "Dec 30, 2026"],
    ["negotiation", "Managed support renewal", "Summit Mutual", "Grace Liu", 88000, "Nov 28, 2026"],
    ["negotiation", "Warehouse scanners rollout", "Brightline Retail", "Priya Nair", 46000, "Dec 5, 2026"],
    ["negotiation", "Quality dashboard", "Ostrow Manufacturing", "Marco Silva", 33000, "Nov 10, 2026", true],
    ["won", "Booking engine upgrade", "Northgate Hotels", "Tom Becker", 52000, "Nov 6, 2026"],
    ["won", "Billing automation", "Cedar Valley Clinics", "Daniel Reyes", 20000, "Nov 3, 2026"],
    ["won", "Security audit", "Summit Mutual", "Grace Liu", 38000, "Oct 24, 2026"],
    ["lost", "Mobile ordering app", "Brightline Retail", "Owen Clarke", 64000, "Nov 4, 2026"],
    ["lost", "Fleet telematics", "Harbor Freight Lines", "Maya Okafor", 27000, "Oct 15, 2026"],
  ].map(([stage, name, org, contact, value, close, late]) => ({ stage, name, org, contact, value, close, late: !!late }));

  const byStage = Object.fromEntries(stages.map((s) => {
    const ds = deals.filter((d) => d.stage === s.key);
    const total = ds.reduce((a, d) => a + d.value, 0);
    return [s.key, { ...s, deals: ds, count: ds.length, total, expected: Math.round(total * s.prob / 100) }];
  }));
  const open = ["new", "qualified", "proposal", "negotiation"].map((k) => byStage[k]);
  const openTotal = open.reduce((a, s) => a + s.total, 0);
  const openExpected = open.reduce((a, s) => a + s.expected, 0);

  // Value of deals that reached each stage over the last 12 months.
  const funnel = [
    { name: "New", value: 2840000 },
    { name: "Qualified", value: 2010000 },
    { name: "Proposal", value: 1480000 },
    { name: "Negotiation", value: 1310000 },
    { name: "Won", value: wonRevenue.reduce((a, b) => a + b, 0) },
  ];

  const followups = [
    { when: "Nov 11", status: "overdue", text: "Send revised SOW", on: "ERP integration", kind: "email" },
    { when: "Nov 13", status: "overdue", text: "Call about budget sign-off", on: "Quality dashboard", kind: "call" },
    { when: "Nov 14", status: "overdue", text: "Chase signed renewal", on: "Guest Wi-Fi analytics", kind: "email" },
    { when: "Today", status: "today", text: "Prep negotiation call", on: "Managed support renewal", kind: "note" },
    { when: "Nov 17", status: "upcoming", text: "Demo for clinical leads", on: "Ana Petrov", kind: "call" },
    { when: "Nov 19", status: "upcoming", text: "Send case studies", on: "Campus booking system", kind: "email" },
    { when: "Nov 21", status: "upcoming", text: "Check in after pilot", on: "Maya Okafor", kind: "call" },
  ];

  const recent = [
    { when: "Today, 9:42", kind: "stage", text: "Moved from Proposal to Negotiation", on: "Warehouse scanners rollout", to: "negotiation" },
    { when: "Today, 9:10", kind: "call", text: "Agreed scope for phase one", on: "Lena Fischer" },
    { when: "Yesterday", kind: "stage", text: "Moved from Negotiation to Won", on: "Booking engine upgrade", to: "won" },
    { when: "Yesterday", kind: "email", text: "Sent pricing for 3-year term", on: "Managed support renewal" },
    { when: "Nov 13", kind: "note", text: "Board meets on the 20th, decision after", on: "Summit Mutual" },
    { when: "Nov 12", kind: "stage", text: "Moved from Negotiation to Lost", on: "Mobile ordering app", to: "lost" },
  ];

  const wonThisMonth = wonRevenue[11];
  const won12 = wonCount.reduce((a, b) => a + b, 0);
  const lost12 = lostCount.reduce((a, b) => a + b, 0);
  const winRate = Math.round((won12 / (won12 + lost12)) * 100);

  return { months, wonRevenue, wonCount, lostCount, stages, deals, byStage, open, openTotal, openExpected, funnel, followups, recent, wonThisMonth, winRate };
})();

window.FMT = {
  money: (n) => "$" + Math.round(n).toLocaleString("en-US"),
  short: (n) => n >= 1e6 ? "$" + (n / 1e6).toFixed(n >= 1e7 ? 0 : 2).replace(/\.?0+$/, "") + "M" : n >= 1e3 ? "$" + Math.round(n / 1e3) + "K" : "$" + n,
};

// Minimal SVG charts. Colors come from CSS variables so each mockup can theme them.
window.CHART = {
  line(el, { values, labels, color = "var(--series-1)", w = 640, h = 220, fill = true }) {
    const pad = { l: 48, r: 16, t: 16, b: 28 };
    const max = Math.ceil(Math.max(...values) / 50000) * 50000;
    const x = (i) => pad.l + (i * (w - pad.l - pad.r)) / (values.length - 1);
    const y = (v) => pad.t + (1 - v / max) * (h - pad.t - pad.b);
    const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
    const ticks = [0, max / 2, max];
    const last = values.length - 1;
    el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Revenue won by month">
      ${ticks.map((t) => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(t)}" y2="${y(t)}" stroke="var(--grid)" />
        <text x="${pad.l - 8}" y="${y(t) + 4}" text-anchor="end" class="ax">${FMT.short(t)}</text>`).join("")}
      ${fill ? `<polygon points="${x(0)},${y(0)} ${pts} ${x(last)},${y(0)}" fill="${color}" opacity="0.12" />` : ""}
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      ${values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="${i === last - 1 ? 4.5 : 0}" fill="${color}" stroke="var(--panel)" stroke-width="2"><title>${labels[i]}: ${FMT.money(v)}</title></circle>`).join("")}
      <text x="${x(last - 1)}" y="${y(values[last - 1]) - 12}" text-anchor="middle" class="lbl">${FMT.short(values[last - 1])}</text>
      ${labels.map((m, i) => `<text x="${x(i)}" y="${h - 8}" text-anchor="middle" class="ax">${m}</text>`).join("")}
    </svg>`;
  },

  bars(el, { a, b, labels, ca = "var(--series-1)", cb = "var(--series-lost)", w = 640, h = 220 }) {
    const pad = { l: 28, r: 12, t: 16, b: 28 };
    const max = Math.max(...a, ...b) + 1;
    const gw = (w - pad.l - pad.r) / labels.length;
    const bw = Math.min(14, gw / 3);
    const y = (v) => pad.t + (1 - v / max) * (h - pad.t - pad.b);
    const base = y(0);
    const bar = (cx, v, c, name, m) => {
      const top = y(v), r = 4;
      return `<path d="M${cx - bw / 2},${base} V${top + r} q0,-${r} ${r},-${r} h${bw - 2 * r} q${r},0 ${r},${r} V${base} Z" fill="${c}"><title>${m}: ${v} ${name}</title></path>`;
    };
    el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Deals won and lost by month">
      ${[0, Math.round(max / 2), max].map((t) => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(t)}" y2="${y(t)}" stroke="var(--grid)" />
        <text x="${pad.l - 8}" y="${y(t) + 4}" text-anchor="end" class="ax">${t}</text>`).join("")}
      ${labels.map((m, i) => {
        const cx = pad.l + gw * i + gw / 2;
        return bar(cx - bw / 2 - 1, a[i], ca, "won", m) + bar(cx + bw / 2 + 1, b[i], cb, "lost", m) +
          `<text x="${cx}" y="${h - 8}" text-anchor="middle" class="ax">${m}</text>`;
      }).join("")}
    </svg>`;
  },
};
