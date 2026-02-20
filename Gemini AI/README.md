# Technical Documentation: Gemini AI Implementation

## 1. Architectural Pattern
The Gemini AI folder utilizes a **State-Driven Class Architecture**. Unlike standard functional scripts, this approach encapsulates the budget logic within a `GeminiTracker` class, ensuring that the DOM and the data state are always synchronized via a single `render()` method.

## 2. Technical Specifications
* **State Management**: Real-time synchronization between the `transactions` array and `localStorage`.
* **Data Integrity**: Implements a `crypto.randomUUID()` fallback for unique transaction identification to prevent collision errors.
* **Visual Engine**: Integrated with `Chart.js` using a "Destroy-before-Create" pattern to prevent Canvas memory leaks during frequent updates.

## 3. Security Protocols
* **XSS Prevention**: Inputs are sanitized using a combination of `trim()` and `textContent` assignments to prevent the execution of malicious scripts injected into the transaction description.
* **Math Precision**: Calculations for the 80% spending alerts use floating-point tolerance to ensure accuracy despite JavaScript's binary representation of decimals.

## 4. Design Language
* **Theming**: Based on the Gemini Design System (GDS), utilizing CSS variables for `google-blue` and high-contrast accessibility standards.