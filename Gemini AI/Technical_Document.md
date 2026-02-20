# Technical Document – SmartBudget Tracker (Gemini AI Version)

**Project:** SmartBudget Tracker  
**Module:** Option B – Enterprise Software Patterns  
**AI Tool:** Gemini 3.0 Flash (Google)  
**Assignment:** IT4020 – Modern Topics in IT, Assignment 1  
**Date:** 20.02.2026  

---

## 1. Project Overview
SmartBudget Tracker (Gemini Version) is an enterprise-pattern web application. While maintaining the core functionality of tracking income/expenses, this version prioritizes **Class-based encapsulation**, **External Library Integration (Chart.js)** for superior data visualization, and **Robust UI state management**.

The application utilizes a modular JavaScript structure designed for scalability, ensuring that the visual representation (Canvas) and the underlying data (LocalStorage) remain perfectly synchronized.

---

## 2. Architecture Overview
The application follows an **Object-Oriented Programming (OOP)** pattern. All logic is encapsulated within a central Controller Class.



| Layer | Responsibility |
|---|---|
| **Class Engine** | `GeminiTracker` class manages the entire lifecycle of the app. |
| **State** | `this.transactions` serves as the reactive data source. |
| **Security** | `sanitize()` method handles XSS protection before any state mutation. |
| **Visualization** | `updateChart()` manages the lifecycle of the Chart.js instance (Init/Destroy). |
| **Persistence** | `sync()` method handles JSON serialization to `localStorage`. |

---

## 3. Module Descriptions

### 3.1 Encapsulated State Management
Unlike global objects, state is private to the class instance:
```javascript
class GeminiTracker {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('gemini_vault')) || [];
        this.limits = { Food: 500, Transport: 200, ... };
    }
}