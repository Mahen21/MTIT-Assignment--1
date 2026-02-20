# Technical Document – SmartBudget Tracker (Claude AI Version)

**Project:** SmartBudget Tracker  
**Module:** Option A – Software Engineering  
**AI Tool:** Claude AI (Anthropic)  
**Assignment:** IT4020 – Modern Topics in IT, Assignment 1  
**Date:** 20.02.2026  

---

## 1. Project Overview

SmartBudget Tracker is a client-side web application built with HTML5, CSS3, and vanilla JavaScript. It enables users to record and monitor their personal income and expenses, receive spending alerts based on predefined category budget limits, visualize their expense distribution through a dynamically rendered donut chart, and receive AI-generated personalized financial advice based on their session data.

The application requires no backend server or build tools. All data is stored locally in the browser using the `localStorage` API.

---

## 2. Architecture Overview

The application follows a **single-page application (SPA)** pattern with a clear separation of concerns:

```
index.html       →  Structure & layout (no logic)
css/styles.css   →  Presentation layer (CSS variables, responsive)
scripts/scripts.js →  Application logic (state, rendering, events)
```

The JavaScript module is organized into distinct layers:

| Layer | Responsibility |
|---|---|
| **State** | Single source of truth – `state` object holds all transactions and budget limits |
| **Calculations** | Pure functions that derive values from state (`calcTotals`, `calcCategoryTotals`) |
| **Render** | DOM update functions that read from state and update the UI (`renderSummary`, `renderTransactions`, `renderChart`, `renderAlerts`) |
| **Operations** | Functions that mutate state and trigger re-renders (`addTransaction`, `deleteTransaction`) |
| **Events** | Event listener bindings at the bottom of the file (clean separation from logic) |
| **Init** | Self-invoking `init()` function that bootstraps the application |

---

## 3. Module Descriptions

### 3.1 State Management
```javascript
const state = {
  transactions: [],      // Array of transaction objects
  budgetLimits: { ... }  // Object mapping category names to LKR limits
};
```
All application data flows from this single `state` object. No global variables are used outside of this object, preventing accidental state mutation.

### 3.2 Transaction Object Schema
Each transaction stored in the array follows this structure:
```javascript
{
  id: "lf3k2m8x9j",     // Unique ID (timestamp + random base36)
  desc: "Grocery run",  // User-provided description (HTML-escaped on render)
  amount: 2500,         // Positive float (LKR)
  category: "Food",     // One of predefined categories
  type: "expense",      // "expense" or "income"
  timestamp: 1708388400000  // Unix timestamp (Date.now())
}
```

### 3.3 `calcTotals()` – Summary Calculations
**Returns:** `{ income, expense, balance, savingsRate }`  
Iterates over the transactions array and sums income and expense values. Savings rate is calculated as:
```
savingsRate = ((income - expense) / income) * 100
```
Returns `0` if income is zero to avoid division-by-zero errors.

### 3.4 `calcCategoryTotals()` – Category Aggregation
**Returns:** Object with category names as keys and total spent as values  
Filters for expense-type transactions only and aggregates amounts per category. Used by both the chart renderer and the alerts renderer.

### 3.5 `renderChart()` – Canvas Donut Chart
Uses the HTML5 `<canvas>` element to draw a custom donut/pie chart without external libraries.

**Algorithm:**
1. Calculate total expense value and individual category percentages
2. Convert percentages to arc angles: `slice = (value / total) * 2π`
3. Draw each arc segment starting from `-π/2` (12 o'clock position)
4. Add white stroke between segments for visual separation
5. Draw center circle (white overlay) to create donut effect
6. Render center label showing total expense amount
7. If total = 0, render a placeholder circle with "No expenses" text

**Known Limitation:** Labels are only drawn for slices with arc > 0.25 radians to prevent label overflow on very small slices.

### 3.6 `renderAlerts()` – Spending Alert System
Compares each category's total spending against its predefined limit in `state.budgetLimits`.

**Alert Threshold:** 80% of limit  
**Critical Threshold:** 100% of limit (displays "OVER BUDGET!" warning)

Categories without a defined limit (e.g., Salary) are skipped.

### 3.7 `generateAIFeedback()` – AI Advisor
Simulates AI-generated financial advice using rule-based logic derived from real session data.

**Input Variables Used:**
- `income`, `expense`, `balance`, `savingsRate` from `calcTotals()`
- `topCategory` from `calcCategoryTotals()` (highest spending category)
- `overBudget` – categories that have exceeded their limit

**Output Structure:**
1. Performance Summary (1 statement based on savings rate tier)
2. Suggestion 1 (references actual top category and amount)
3. Suggestion 2 (references over-budget categories or savings target formula)

**Savings Rate Tiers:**
| Rate | Classification | Summary Tone |
|---|---|---|
| ≥ 30% | Excellent | Positive reinforcement |
| 10–29% | Moderate | Constructive guidance |
| 1–9% | Low | Caution with specific target |
| < 0% | Over budget | Urgent action required |

### 3.8 `escapeHtml()` – XSS Prevention
All user-supplied text rendered into the DOM passes through this function before insertion.

```javascript
function escapeHtml(str) {
  const d = document.createElement("div");
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}
```
This uses the browser's native text node encoding to convert `<`, `>`, `&`, and `"` to their HTML entity equivalents, neutralizing any injected scripts.

### 3.9 `generateId()` – Unique ID Generation
```javascript
const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
```
Combines a base-36 encoded timestamp with a random base-36 suffix. This virtually eliminates the risk of duplicate IDs even under rapid successive entries.

---

## 4. CSS Architecture

### 4.1 Design Tokens (CSS Variables)
All color, spacing, and visual values are defined as CSS custom properties on `:root`:
```css
:root {
  --primary: #2563eb;
  --income: #16a34a;
  --expense: #dc2626;
  --warning: #d97706;
  --bg: #f1f5f9;
  --card-bg: #ffffff;
  --radius: 12px;
  --shadow: 0 2px 12px rgba(0,0,0,0.07);
}
```
This ensures visual consistency and makes theming changes trivial (single-point updates).

### 4.2 Layout System
| Component | Layout Method |
|---|---|
| Summary cards | CSS Grid (4 columns → 2 on mobile) |
| Charts + Alerts row | CSS Grid (2 columns → 1 on mobile) |
| Add transaction form | Flexbox with `flex-wrap` |
| Transaction list items | Flexbox (space-between) |

### 4.3 Responsive Breakpoint
A single breakpoint at `768px` handles mobile layout:
```css
@media (max-width: 768px) {
  .summary-cards { grid-template-columns: repeat(2, 1fr); }
  .section-charts { grid-template-columns: 1fr; }
  .form-row { flex-direction: column; }
}
```

---

## 5. Data Flow Diagram

```
User Action (Add/Delete)
        │
        ▼
  Mutate state.transactions
        │
        ▼
  saveState() → localStorage
        │
        ▼
  renderAll()
   ├── renderSummary()    → Updates 4 summary cards
   ├── renderTransactions() → Rebuilds transaction list + rebinds delete events
   ├── renderAlerts()     → Checks limits, shows/hides warnings
   └── renderChart()      → Redraws canvas donut chart
```

---

## 6. Edge Cases Handled

| Scenario | Handling |
|---|---|
| Empty transaction list | All render functions show placeholder messages |
| Income = 0 (savings rate) | Returns 0% instead of NaN/Infinity |
| No expenses (chart) | Renders placeholder circle with label |
| XSS in description field | Escaped via `escapeHtml()` before DOM insertion |
| Negative / zero amount | Rejected with validation alert |
| Excessively large amount (> 10M) | Rejected with alert |
| Rapid ID generation | Random suffix prevents duplicate IDs |
| Tab switch / background | `visibilitychange` listener refreshes UI on return |
| Confirm before delete | `confirm()` prevents accidental data loss |

---

## 7. localStorage Schema

**Key:** `sb_transactions`  
**Value:** JSON-serialized array of transaction objects  
**Format:**
```json
[
  {
    "id": "lf3k2m8x9j",
    "desc": "Grocery shopping",
    "amount": 3200,
    "category": "Food",
    "type": "expense",
    "timestamp": 1708388400000
  }
]
```

**Note:** Budget limits are hardcoded in the `state.budgetLimits` object and are not persisted to localStorage. Future enhancement could allow user-defined limits to be saved.

---

## 8. Known Limitations & Future Improvements

| Limitation | Suggested Fix |
|---|---|
| Budget limits are hardcoded | Add a settings panel to allow user-defined limits per category |
| No date filtering | Add month/year selector to filter transactions by period |
| No export functionality | Implement CSV or PDF export of transaction history |
| Chart labels hidden for small slices | Add an external legend below the chart |
| No multi-currency support | Add currency selector with conversion API |
| No authentication | Add optional PIN/password lock using Web Crypto API |

---

## 9. AI Tool Contribution Summary

| Task | Claude AI Contribution | Manual Contribution |
|---|---|---|
| HTML structure | Generated complete semantic structure | Minor attribute additions |
| CSS styling | Generated full stylesheet with variables | Adjusted transition timings |
| JS architecture | Proposed modular state-based pattern | Confirmed and adopted |
| Chart rendering | Generated Canvas arc algorithm | Fixed label overflow edge case |
| Alert system | Generated threshold logic | Added percentage display |
| AI feedback | Generated rule-based advisor logic | Tuned savings rate tiers |
| XSS prevention | Generated `escapeHtml()` function | Verified coverage |
| Input validation | Generated basic validation | Added max-amount cap |
| Documentation | Generated inline comments | Wrote this document |