# DEBUGGING REPORT – SmartBudget Tracker (Claude AI Version)

**Project:** SmartBudget Tracker  
**AI Tool:** Claude AI (Anthropic)  
**File Debugged:** scripts/scripts.js  
**Date:** 20.02.2026  

---

## Debugging Prompt Used

> *"Debug this JavaScript code in the Claude AI folder and explain each issue found. Make sure you explain them in the code itself as inline comments."*

---

## Summary of Issues Found

Claude AI identified **5 issues** during the debugging process. All were explained with inline comments directly in the source code.

---

## Bug Report

### Bug 1 – Missing Positive Amount Validation
**Location:** `addTransaction()` function  
**Type:** Input Validation Error  
**Severity:** Medium  

**Description:**  
The original code only checked `isNaN(amount)` but did not check if the amount was greater than zero. This allowed users to enter `0` or negative numbers as transaction amounts, corrupting the balance calculation.

**Original Code:**
```javascript
if (isNaN(amount)) { alert("Enter a valid amount."); return; }
```

**Fixed Code:**
```javascript
// FIX: Check both NaN and non-positive values to prevent zero/negative entries
if (isNaN(amount) || amount <= 0) { alert("Please enter a valid positive amount."); return; }
```

---

### Bug 2 – XSS Vulnerability in Transaction Description
**Location:** `renderTransactions()` function  
**Type:** Security Vulnerability (Cross-Site Scripting)  
**Severity:** High  

**Description:**  
User-supplied description text was inserted directly into `innerHTML` without any sanitization. An attacker could input `<script>alert('hacked')</script>` as a description, which would execute in the browser.

**Original Code:**
```javascript
DOM.txList.innerHTML += `<div class="tx-desc">${t.desc}</div>`;
```

**Fixed Code:**
```javascript
// FIX: Use escapeHtml() to sanitize user input before inserting into the DOM
// This prevents Cross-Site Scripting (XSS) attacks via the description field
DOM.txList.innerHTML += `<div class="tx-desc">${escapeHtml(t.desc)}</div>`;
```

**Helper function added:**
```javascript
// SECURITY: This function converts special HTML characters to safe entities
// Prevents script injection through user input fields
function escapeHtml(str) {
  const d = document.createElement("div");
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}
```

---

### Bug 3 – AI Feedback Crash on Empty Transactions
**Location:** `generateAIFeedback()` function  
**Type:** Runtime Error (TypeError)  
**Severity:** Medium  

**Description:**  
When `generateAIFeedback()` was called with no transactions in the array, `Object.entries(catTotals).sort()[0]` returned `undefined`. Trying to access `topCategory[0]` on `undefined` threw a TypeError and crashed the function.

**Original Code:**
```javascript
const topCategory = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
// topCategory could be undefined – accessing [0] causes crash
suggestions.push(`Your highest spending category is ${topCategory[0]}`);
```

**Fixed Code:**
```javascript
// FIX: Guard clause – exit early if no transactions exist to prevent crash
if (state.transactions.length === 0) {
  DOM.aiBox.innerHTML = `<p class="muted">No transactions to analyze yet.</p>`;
  return;
}

// FIX: Only access topCategory properties if it is defined
if (topCategory) {
  suggestions.push(`Your highest spending category is <strong>${topCategory[0]}</strong>...`);
}
```

---

### Bug 4 – Event Listener Stacking on Re-render
**Location:** `renderTransactions()` function  
**Type:** Memory Leak / Logic Bug  
**Severity:** Low-Medium  

**Description:**  
Delete buttons were created inside the render loop, and each re-render added a new `addEventListener` to each button. Over time, a single click could trigger the delete action multiple times due to stacked duplicate listeners.

**Original Code:**
```javascript
// Called every render – stacks multiple listeners on each button
DOM.txList.querySelectorAll(".tx-delete").forEach(btn => {
  btn.addEventListener("click", () => deleteTransaction(btn.dataset.id));
});
```

**Fixed Code:**
```javascript
// FIX: innerHTML is fully replaced on each render, so new buttons are fresh DOM elements.
// Listeners are only added once per render cycle – no stacking occurs.
// The querySelectorAll runs AFTER innerHTML is set, so listeners are always clean.
DOM.txList.innerHTML = sorted.map(t => `...`).join("");

// Bind delete buttons AFTER setting innerHTML (fresh elements, no duplicates)
DOM.txList.querySelectorAll(".tx-delete").forEach(btn => {
  btn.addEventListener("click", () => deleteTransaction(btn.dataset.id));
});
```

---

### Bug 5 – Chart Rendering Error on Zero Total
**Location:** `renderChart()` function  
**Type:** Visual / Division-by-Zero Edge Case  
**Severity:** Low  

**Description:**  
When no expense transactions existed, `total` was `0`. The pie chart slice calculation `(values[i] / total) * Math.PI * 2` resulted in `NaN` or `Infinity`, causing the Canvas rendering to silently fail and display a blank chart area with no feedback to the user.

**Original Code:**
```javascript
const slice = (values[i] / total) * Math.PI * 2;
// If total = 0, this produces NaN – canvas draws nothing with no error
```

**Fixed Code:**
```javascript
// FIX: Return early with a placeholder when there are no expense values
// Prevents NaN in canvas arc calculations and gives user meaningful feedback
if (total === 0) {
  const ctx = DOM.chart.getContext("2d");
  ctx.clearRect(0, 0, DOM.chart.width, DOM.chart.height);
  ctx.fillStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.arc(150, 150, 100, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText("No expenses", 150, 155);
  return; // Stop here – no further rendering needed
}
```

---

## Manual Improvements Applied

Beyond the bugs identified by Claude AI, the following manual improvements were made:

| Improvement | Description |
|---|---|
| Maximum amount cap | Added check `if (amount > 10000000)` to prevent unrealistically large entries |
| Enter key shortcut | Added `keydown` listener on amount field so pressing Enter submits the form |
| Visibility API hook | Added `visibilitychange` listener to refresh UI when user returns to the tab |
| Savings rate color coding | Balance and savings rate now change color based on value (green = good, orange = low) |
| Confirm before delete | Added `confirm()` dialog before deleting a transaction to prevent accidental removal |

---

## Testing After Debugging

| Test | Before Fix | After Fix |
|---|---|---|
| Enter `0` as amount | Accepted (bug) | Rejected with alert |
| XSS script in description | Executed (bug) | Safely escaped |
| AI feedback with no data | Crashed (bug) | Shows helpful message |
| Delete button multi-click | Triggered multiple times (bug) | Triggers once correctly |
| Chart with no expenses | Blank canvas (bug) | Shows placeholder graphic |