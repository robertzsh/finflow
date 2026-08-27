// FinFlow — iOS home-screen widget (Scriptable). Medium size.
// Shows: spent this month · top savings goal · recent transactions.
//
// SETUP (once):
//   1. Install "Scriptable" from the App Store (free).
//   2. Scriptable → + (new script) → paste this whole file → name it "FinFlow".
//   3. Set PROJECT_REF and TOKEN below (see WIDGET_SETUP.md).
//   4. Home Screen → long-press → + → Scriptable → Medium → add.
//      Long-press the widget → Edit Widget → Script: FinFlow.
// ---------------------------------------------------------------------------

const PROJECT_REF = "xfxwvdywjcimmyaokbba";       // your Supabase project ref
const TOKEN       = "PASTE_YOUR_WIDGET_TOKEN";    // from the SQL mint step

const API = `https://${PROJECT_REF}.supabase.co/functions/v1/widget-summary?token=${TOKEN}`;

const BG      = new Color("#0b1020");
const CARD    = new Color("#0b1020");
const WHITE   = new Color("#ffffff");
const MUTED   = new Color("#8b93a7");
const EXPENSE = new Color("#ef4444");
const INCOME  = new Color("#10b981");
const ACCENT  = new Color("#a855f7");
const TRACK   = new Color("#ffffff", 0.12);

function fmt(n) {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString("de-DE"); // 1.234 grouping, matches RON style
}

async function loadData() {
  try {
    const req = new Request(API);
    req.timeoutInterval = 15;
    return await req.loadJSON();
  } catch (e) {
    return { error: String(e) };
  }
}

function progressImage(pct, w, h) {
  const ctx = new DrawContext();
  ctx.size = new Size(w, h);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const r = h / 2;
  const track = new Path();
  track.addRoundedRect(new Rect(0, 0, w, h), r, r);
  ctx.addPath(track);
  ctx.setFillColor(TRACK);
  ctx.fillPath();
  const fillW = Math.max(h, (w * Math.min(100, Math.max(0, pct))) / 100);
  const fill = new Path();
  fill.addRoundedRect(new Rect(0, 0, fillW, h), r, r);
  ctx.addPath(fill);
  ctx.setFillColor(ACCENT);
  ctx.fillPath();
  return ctx.getImage();
}

const data = await loadData();
const w = new ListWidget();
w.backgroundColor = BG;
const grad = new LinearGradient();
grad.colors = [new Color("#0e1430"), new Color("#0b1020")];
grad.locations = [0, 1];
w.backgroundGradient = grad;
w.setPadding(14, 15, 14, 15);
w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);

if (!data || data.error) {
  const t1 = w.addText("FinFlow");
  t1.textColor = WHITE; t1.font = Font.boldSystemFont(15);
  w.addSpacer(4);
  const t2 = w.addText("Couldn't load data. Check the token / connection.");
  t2.textColor = MUTED; t2.font = Font.systemFont(11);
} else {
  const cur = data.currency || "RON";
  const row = w.addStack();
  row.layoutHorizontally();
  row.spacing = 12;

  // ---- Left column: spent + goal ----
  const left = row.addStack();
  left.layoutVertically();
  left.size = new Size(150, 0);

  const lbl = left.addText("SPENT THIS MONTH");
  lbl.textColor = MUTED; lbl.font = Font.semiboldSystemFont(9);
  const spent = left.addText(`${fmt(data.spentThisMonth)} ${cur}`);
  spent.textColor = WHITE; spent.font = Font.boldSystemFont(21);
  spent.minimumScaleFactor = 0.6; spent.lineLimit = 1;

  left.addSpacer(10);

  if (data.goal) {
    const gname = left.addText(`🎀 ${data.goal.name}`);
    gname.textColor = WHITE; gname.font = Font.mediumSystemFont(11); gname.lineLimit = 1;
    left.addSpacer(4);
    const img = left.addImage(progressImage(data.goal.pct, 150, 7));
    img.imageSize = new Size(150, 7);
    left.addSpacer(3);
    const gsub = left.addText(`${fmt(data.goal.saved)} / ${fmt(data.goal.target)} ${data.goal.currency} · ${data.goal.pct}%`);
    gsub.textColor = MUTED; gsub.font = Font.systemFont(9); gsub.lineLimit = 1;
  }
  left.addSpacer();

  // ---- Right column: recent transactions ----
  const right = row.addStack();
  right.layoutVertically();

  const rlbl = right.addText("RECENT");
  rlbl.textColor = MUTED; rlbl.font = Font.semiboldSystemFont(9);
  right.addSpacer(5);

  const recent = (data.recent || []).slice(0, 3);
  if (recent.length === 0) {
    const none = right.addText("No transactions yet");
    none.textColor = MUTED; none.font = Font.systemFont(10);
  }
  for (const t of recent) {
    const line = right.addStack();
    line.layoutHorizontally();
    line.centerAlignContent();
    const nm = line.addText(`${t.emoji ? t.emoji + " " : ""}${t.label}`);
    nm.textColor = WHITE; nm.font = Font.systemFont(11); nm.lineLimit = 1;
    line.addSpacer();
    const am = line.addText(`${t.type === "income" ? "+" : "−"}${fmt(t.amount)}`);
    am.textColor = t.type === "income" ? INCOME : EXPENSE; am.font = Font.mediumSystemFont(11);
    right.addSpacer(6);
  }
  right.addSpacer();
}

if (config.runsInWidget) {
  Script.setWidget(w);
} else {
  await w.presentMedium();
}
Script.complete();
