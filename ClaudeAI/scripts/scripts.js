// ============================================================
// SmartBudget – Claude AI Version
// Modular JavaScript with clean architecture
// Features: transaction CRUD, category tracking, spending alerts,
// chart rendering, AI feedback, overspend detection
// ============================================================

"use strict";

// ─── State ───────────────────────────────────────────────────
// ISSUE #1: localStorage can throw errors in private browsing mode or when storage is full
// FIX: Wrap in try-catch to prevent app crash
const state = {
  transactions: (() => {
    try {
      return JSON.parse(localStorage.getItem("sb_transactions") || "[]");
    } catch (error) {
      // DEBUG: If localStorage fails, log error and return empty array
      console.warn("localStorage read failed:", error);
      return [];
    }
  })(),
  budgetLimits: {
    Food: 15000,
    Transport: 8000,
    Entertainment: 5000,
    Shopping: 10000,
    Utilities: 6000,
    Health: 7000,
    Other: 5000
    // NOTE: Not all categories have limits defined (e.g., 'Salary' is missing)
    // This is intentional as Salary is income, not expense
  }
};

// ─── DOM References ──────────────────────────────────────────
const DOM = {
  totalIncome: document.getElementById("total-income"),
  totalExpense: document.getElementById("total-expense"),
  balance: document.getElementById("balance"),
  savingsRate: document.getElementById("savings-rate"),
  txDesc: document.getElementById("tx-desc"),
  txAmount: document.getElementById("tx-amount"),
  txCategory: document.getElementById("tx-category"),
  txType: document.getElementById("tx-type"),
  addBtn: document.getElementById("add-tx-btn"),
  txList: document.getElementById("tx-list"),
  alertsList: document.getElementById("alerts-list"),
  aiBox: document.getElementById("ai-feedback"),
  adviceBtn: document.getElementById("get-advice-btn"),
  resetBtn: document.getElementById("reset-btn"),
  currentMonth: document.getElementById("current-month"),
  chart: document.getElementById("category-chart")
};

// ─── Constants ───────────────────────────────────────────────
const CATEGORY_ICONS = {
  Food: "🍔", Transport: "🚌", Utilities: "💡",
  Entertainment: "🎬", Health: "🏥", Shopping: "🛍️",
  Salary: "💼", Other: "📦"
};

const CHART_COLORS = [
  "#2563eb", "#16a34a", "#dc2626", "#d97706",
  "#7c3aed", "#0891b2", "#be185d", "#64748b"
];

// ─── Utilities ───────────────────────────────────────────────
// Format currency with proper locale
const fmt = (n) => `LKR ${parseFloat(n).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;

// ISSUE #2: saveState can fail if localStorage is full or disabled
// FIX: Add try-catch to handle storage errors gracefully
const saveState = () => {
  try {
    localStorage.setItem("sb_transactions", JSON.stringify(state.transactions));
  } catch (error) {
    // DEBUG: If saving fails, alert user so they know data isn't persisted
    console.error("Failed to save to localStorage:", error);
    alert("⚠️ Unable to save data. Your browser storage may be full or disabled.");
  }
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

// ─── Calculations ────────────────────────────────────────────
function calcTotals() {
  const income = state.transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = state.transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expense;
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  return { income, expense, balance, savingsRate };
}

function calcCategoryTotals() {
  const totals = {};
  state.transactions
    .filter(t => t.type === "expense")
    .forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
  return totals;
}

// ─── Render UI ───────────────────────────────────────────────
function renderSummary() {
  const { income, expense, balance, savingsRate } = calcTotals();
  DOM.totalIncome.textContent = fmt(income);
  DOM.totalExpense.textContent = fmt(expense);
  DOM.balance.textContent = fmt(balance);
  DOM.savingsRate.textContent = `${savingsRate}%`;

  // Color feedback for balance
  DOM.balance.style.color = balance >= 0 ? "var(--income)" : "var(--expense)";
  DOM.savingsRate.style.color = savingsRate >= 20 ? "var(--income)" : "var(--warning)";
}

function renderTransactions() {
  if (state.transactions.length === 0) {
    DOM.txList.innerHTML = `<p class="muted">No transactions yet. Add one above!</p>`;
    return;
  }

  // Sort transactions by most recent first
  const sorted = [...state.transactions].sort((a, b) => b.timestamp - a.timestamp);
  
  // GOOD PRACTICE: escapeHtml() is used here to prevent XSS attacks via description field
  // This ensures user input like "<script>alert('hacked')</script>" displays as text, not code
  DOM.txList.innerHTML = sorted.map(t => `
    <div class="tx-item" data-id="${t.id}">
      <div class="tx-left">
        <div class="tx-icon tx-icon-${t.type}">${CATEGORY_ICONS[t.category] || "📦"}</div>
        <div>
          <div class="tx-desc">${escapeHtml(t.desc)}</div>
          <div class="tx-cat">${t.category} · ${new Date(t.timestamp).toLocaleDateString("en-GB")}</div>
        </div>
      </div>
      <div class="tx-right">
        <span class="tx-amount-${t.type}">${t.type === "expense" ? "−" : "+"}${fmt(t.amount)}</span>
        <button class="tx-delete" data-id="${t.id}" title="Delete">🗑️</button>
      </div>
    </div>
  `).join("");

  // PERFORMANCE NOTE: Event listeners are re-bound on every render
  // OPTIMIZATION: Could use event delegation on parent instead
  // Current approach works but creates/destroys listeners frequently
  DOM.txList.querySelectorAll(".tx-delete").forEach(btn => {
    btn.addEventListener("click", () => deleteTransaction(btn.dataset.id));
  });
}

function renderAlerts() {
  const catTotals = calcCategoryTotals();
  const alerts = [];

  // Check each expense category against budget limits
  for (const [cat, spent] of Object.entries(catTotals)) {
    const limit = state.budgetLimits[cat];
    // LOGIC: Skip if no budget limit defined for this category
    // This is expected for categories like 'Salary' (income, not expense)
    if (!limit) continue;
    const pct = Math.round((spent / limit) * 100);
    // Alert users when they've used 80% or more of their budget
    if (pct >= 80) {
      alerts.push({ cat, spent, limit, pct });
    }
  }

  if (alerts.length === 0) {
    DOM.alertsList.innerHTML = `<p class="muted">No alerts. Stay on track!</p>`;
    return;
  }

  DOM.alertsList.innerHTML = alerts.map(a => `
    <div class="alert-item">
      ${CATEGORY_ICONS[a.cat]} <strong>${a.cat}</strong>:
      ${fmt(a.spent)} spent of ${fmt(a.limit)} limit
      <span style="color:${a.pct >= 100 ? "var(--expense)" : "var(--warning)"}">
        (${a.pct}% used${a.pct >= 100 ? " – OVER BUDGET!" : ""})
      </span>
    </div>
  `).join("");
}

function renderChart() {
  const catTotals = calcCategoryTotals();
  const labels = Object.keys(catTotals);
  const values = Object.values(catTotals);
  const total = values.reduce((s, v) => s + v, 0);

  // ISSUE #3: Canvas element doesn't have explicit width/height attributes set in HTML
  // This can cause blurry rendering on high-DPI displays
  // FIX: Set canvas dimensions programmatically for crisp rendering
  const dpr = window.devicePixelRatio || 1;
  const displaySize = 300;
  DOM.chart.width = displaySize * dpr;
  DOM.chart.height = displaySize * dpr;
  DOM.chart.style.width = displaySize + 'px';
  DOM.chart.style.height = displaySize + 'px';
  
  const ctx = DOM.chart.getContext("2d");
  // Scale context to account for high-DPI screens (Retina displays)
  ctx.scale(dpr, dpr);

  // Handle empty state: show placeholder when no expense data exists
  if (total === 0 || labels.length === 0) {
    ctx.clearRect(0, 0, displaySize, displaySize);
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.arc(150, 150, 100, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText("No expenses", 150, 155);
    return;
  }

  // Draw pie chart with proper proportions
  // Note: ctx is already obtained and scaled above, no need to get it again
  ctx.clearRect(0, 0, displaySize, displaySize);
  let startAngle = -Math.PI / 2; // Start at top (12 o'clock position)
  const cx = 150, cy = 150, r = 100;

  labels.forEach((lbl, i) => {
    const slice = (values[i] / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label on slice (only show if slice is large enough)
    const midAngle = startAngle + slice / 2;
    const lx = cx + (r * 0.65) * Math.cos(midAngle);
    const ly = cy + (r * 0.65) * Math.sin(midAngle);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px Segoe UI";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // LOGIC: Only show label if slice takes more than ~14% of chart (0.25 radians)
    // This prevents text overlap on tiny slices
    if (slice > 0.25) ctx.fillText(lbl.substring(0, 4), lx, ly);

    startAngle += slice;
  });

  // Center donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.fillStyle = "#475569";
  ctx.font = "bold 12px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Expenses", cx, cy - 8);
  ctx.fillText(fmt(total).replace("LKR ", ""), cx, cy + 12);
}

// ─── Core Operations ─────────────────────────────────────────
function addTransaction() {
  const desc = DOM.txDesc.value.trim();
  const amount = parseFloat(DOM.txAmount.value);
  const category = DOM.txCategory.value;
  const type = DOM.txType.value;

  // VALIDATION: Thoroughly check user inputs before saving
  // SECURITY: trim() removes leading/trailing whitespace to prevent empty descriptions
  if (!desc) { alert("Please enter a description."); return; }
  // Check for valid positive number (parseFloat returns NaN for invalid input)
  if (isNaN(amount) || amount <= 0) { alert("Please enter a valid positive amount."); return; }
  // Sanity check: reject unreasonably large amounts (potential typo or data entry error)
  if (amount > 10000000) { alert("Amount seems too large. Please check."); return; }

  // Create transaction object with unique ID and timestamp
  const tx = { id: generateId(), desc, amount, category, type, timestamp: Date.now() };
  state.transactions.push(tx);
  // PERSISTENCE: Save to localStorage (wrapped in try-catch in saveState function)
  saveState();

  // UX: Clear form inputs after successful submission
  DOM.txDesc.value = "";
  DOM.txAmount.value = "";
  // Note: Category and type retain their values for easier repeat entries

  // Re-render all UI components to reflect the new transaction
  renderAll();
}

function deleteTransaction(id) {
  if (!confirm("Delete this transaction?")) return;
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveState();
  renderAll();
}

function renderAll() {
  renderSummary();
  renderTransactions();
  renderAlerts();
  renderChart();
}

// ─── AI Feedback ─────────────────────────────────────────────
// FEATURE: Generate personalized financial advice based on spending patterns
// This simulates AI analysis using rule-based logic
function generateAIFeedback() {
  const { income, expense, balance, savingsRate } = calcTotals();
  const catTotals = calcCategoryTotals();

  // Handle empty state gracefully
  if (state.transactions.length === 0) {
    DOM.aiBox.innerHTML = `<p class="muted">No transactions to analyze yet. Add some transactions first.</p>`;
    return;
  }

  // Find the category with highest spending
  const topCategory = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  // Identify categories that exceeded their budget limits
  // LOGIC: Uses Infinity as fallback for categories without limits (they never go over budget)
  const overBudget = Object.entries(catTotals).filter(([cat]) => catTotals[cat] > (state.budgetLimits[cat] || Infinity));

  // AI SIMULATION: In a real app, this would call an API (OpenAI, Gemini, Claude)
  // Current implementation uses rule-based logic to provide intelligent feedback
  // Prompt used for design: "Act as a financial advisor. Analyze income, expenses, savings rate. 
  // Give 1 summary + 2 suggestions under 80 words."
  let summary, suggestions = [];

  // ANALYSIS RULES: Provide context-aware feedback based on savings rate thresholds
  if (savingsRate >= 30) {
    // Excellent: Saving 30% or more
    summary = `✅ Excellent financial discipline! With a ${savingsRate}% savings rate, you're managing your budget very effectively.`;
  } else if (savingsRate >= 10) {
    // Moderate: Saving 10-29%
    summary = `📊 Moderate savings rate of ${savingsRate}%. You have ${fmt(balance)} remaining this month.`;
  } else if (savingsRate < 0) {
    // Critical: Spending more than earning (negative savings)
    summary = `🚨 You are currently spending more than you earn. Balance is ${fmt(balance)}. Immediate budget review needed.`;
  } else {
    // Low: Saving less than 10%
    summary = `⚠️ Low savings rate of ${savingsRate}%. Consider reducing non-essential spending.`;
  }

  // SUGGESTION 1: Highlight highest spending category for review
  if (topCategory) {
    // POTENTIAL XSS RISK: Category names are inserted directly into HTML
    // MITIGATION: Category values come from a controlled dropdown, not user input
    // If categories ever become user-editable, apply escapeHtml() here
    suggestions.push(`Your highest spending category is <strong>${topCategory[0]}</strong> at ${fmt(topCategory[1])}. Review this category for potential savings.`);
  }

  // SUGGESTION 2: Alert about budget overruns or promote better savings habits
  if (overBudget.length > 0) {
    suggestions.push(`You have exceeded budget limits in: <strong>${overBudget.map(([c]) => c).join(", ")}</strong>. Set stricter limits or reduce spending here.`);
  } else if (savingsRate < 20 && income > 0) {
    // Encourage 20-30% savings target (financial best practice)
    suggestions.push(`Aim for a 20–30% savings rate. Try allocating ${fmt(income * 0.2)} as savings before spending.`);
  }

  if (suggestions.length < 2) {
    suggestions.push(`Maintain an emergency fund of at least 3 months' expenses (${fmt(expense * 3)}).`);
  }

  DOM.aiBox.innerHTML = `
    <div class="ai-insight"><strong>📋 Performance Summary</strong><br>${summary}</div>
    <div class="ai-insight"><strong>💡 Suggestion 1:</strong><br>${suggestions[0] || "Keep tracking your expenses consistently."}</div>
    <div class="ai-insight"><strong>💡 Suggestion 2:</strong><br>${suggestions[1] || "Review your budget limits monthly."}</div>
    <div style="font-size:0.78rem;color:#94a3b8;margin-top:12px;">Analysis based on ${state.transactions.length} transaction(s) · ${new Date().toLocaleDateString("en-GB")}</div>
  `;
}

// ─── Security Helper ─────────────────────────────────────────
// XSS PROTECTION: Escape user-generated content before inserting into HTML
// WHY NEEDED: Without this, malicious input like "<img src=x onerror=alert('XSS')>" 
// would execute JavaScript when displayed
// HOW IT WORKS: createTextNode treats everything as text, not HTML
// Example: "<script>" becomes "&lt;script&gt;" which displays safely as text
function escapeHtml(str) {
  const d = document.createElement("div");
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

// ─── Event Listeners ─────────────────────────────────────────
DOM.addBtn.addEventListener("click", addTransaction);
DOM.adviceBtn.addEventListener("click", generateAIFeedback);

DOM.resetBtn.addEventListener("click", () => {
  if (confirm("Reset all transactions? This cannot be undone.")) {
    state.transactions = [];
    saveState();
    DOM.aiBox.innerHTML = `<p class="muted">Click "Analyze My Spending" to get personalized AI insights.</p>`;
    renderAll();
  }
});

// UX ENHANCEMENT: Allow Enter key to submit transaction (convenience feature)
DOM.txAmount.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTransaction();
});

// BUG FIX: Re-render when tab becomes visible again
// WHY: Some browsers pause JavaScript/canvas when tab is hidden
// This ensures chart and UI are fresh when user returns to the tab
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) renderAll();
});

// ─── Init ────────────────────────────────────────────────────
// IIFE (Immediately Invoked Function Expression) runs on page load
// This sets up the initial state of the application
(function init() {
  const now = new Date();
  // Display current month in header (e.g., "February 2026")
  DOM.currentMonth.textContent = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  // Render all UI components with saved data from localStorage
  renderAll();
})();

// ============================================================
// DEBUGGING SUMMARY:
// ============================================================
// ✅ FIXED: Added try-catch for localStorage operations (prevents crashes)
// ✅ FIXED: Canvas now scales properly for high-DPI displays (crisp charts)
// ✅ DOCUMENTED: XSS protection via escapeHtml() explained
// ✅ DOCUMENTED: Event listener patterns and potential optimizations noted
// ✅ DOCUMENTED: All validation logic and edge cases explained
// ✅ DOCUMENTED: AI feedback rules and category budget handling clarified
// ============================================================