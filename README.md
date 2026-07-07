# Construction Management Project Control Workbook

![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)
![Platform](https://img.shields.io/badge/Platform-Browser%20%2B%20Excel-success)
![Tool](https://img.shields.io/badge/Tool-Project%20Decision%20Support-orange)

**A lightweight Construction Management project control framework that turns budgets, progress billing, cash flow, change orders, and client payments into operational decisions—available free in both Browser and Excel formats, with no installation required.**

> ## **No signup. No installation. Free.**
>
> 🌐 **Open in Browser**  
> *(HTML live demo link)*
>
> 📥 **Download Excel Version**  
> *(GitHub Release / Gumroad link)*

---

# Screenshots

### Browser Version

<!-- screenshot: browser version -->

*Interactive browser dashboard showing project financial health, progress billing, budget variance, cash flow forecast, and management KPIs.*

---

### Excel Version

<!-- screenshot: excel version -->

*Excel workbook providing structured data entry, automated calculations, invoice generation, and executive reporting without manual formula maintenance.*

---

# What It Helps You Track

- Planned construction budget versus approved changes versus remaining available budget in one consolidated view.
- Actual project costs alongside progress billing, revealing whether completed work is generating cash as expected.
- Client invoices, payment status, overdue balances, and retained holdback without separate accounting schedules.
- Contractor payments, customer receipts, and monthly cash flow forecasts across the entire project lifecycle.
- Budget overruns, shrinking contingency, delayed collections, and upcoming cash shortages before they become operational problems.
- Executive KPIs generated from a single source of project data instead of disconnected spreadsheets.

---

# Quick Start Workflow

### 1. Configure the project once

Open the **Parameters** and **Project Setup** worksheets and enter the project's core information. Typical inputs include contract value, holdback percentage, tax rate, project start date, completion date, and other company-wide settings. These values become the single source of truth used throughout the workbook.

---

### 2. Import existing project records

Paste existing data directly into the designated input tables such as Budget, Actual Costs, Change Orders, Progress Billing, Contractor Payments, or Client Receipts.

Existing exports from accounting software, ERP systems, estimating tools, or even another spreadsheet can be copied directly into the Excel Tables without rebuilding formulas or redesigning reports.

---

### 3. Review results immediately

Switch to the Executive Dashboard, Cash Flow forecast, Budget analysis, or Invoice Template.

Every KPI, budget comparison, payment summary, progress valuation, and financial indicator updates automatically using the latest project information.

No manual calculations or report preparation are required.

---

### 4. Refresh throughout the project

As construction progresses, periodically update the project tables with new invoices, payments, change orders, completed work, and actual costs.

The workbook recalculates every dependent report automatically while preserving all analytical logic and reporting layouts.

There is no need to rebuild formulas, copy worksheets, or maintain separate reporting files.

> **Set a few key parameters. Drop in your existing data. Get the analysis. Refresh when you need to.**
# Why I Built This

Construction projects rarely fail because teams cannot build. They struggle because financial information becomes fragmented long before anyone realizes a problem exists.

Budget spreadsheets live in one file. Change orders are tracked somewhere else. Progress billing is maintained independently. Client invoices, contractor payments, holdback balances, and cash flow forecasts are often managed by different people using different assumptions. Individually, each spreadsheet appears reasonable. Collectively, they create conflicting versions of project reality.

The analytical failure is not missing data—it is disconnected decision-making.

For example, imagine a project manager approves a \$120,000 change order after receiving client authorization. The construction team begins work immediately, but the approved change never reaches the budget worksheet. Weeks later, actual costs exceed the original budget, triggering what appears to be a significant overrun. In reality, the project is still profitable. The reporting simply failed to incorporate the approved contract adjustment.

Another common example occurs during progress billing. A superintendent reports that the project is 65% complete, while finance prepares invoices manually using an outdated billing schedule. Holdback is calculated incorrectly, invoices are delayed, and projected cash inflows no longer match contractor payment obligations. The project appears cash constrained despite having sufficient contractual value.

I built this workbook to productize the reasoning that experienced construction controllers apply every day.

Instead of maintaining separate operational spreadsheets, this framework connects budgeting, approved changes, progress valuation, invoices, receipts, contractor payments, holdback accounting, and cash flow into one reusable analytical model.

The goal is not to replace existing accounting software. The goal is to make operational decisions using complete, internally consistent information before problems become expensive.

---

# Common Construction Management Problems This Solves

| Problem | Without This Tool | With This Tool |
|----------|-------------------|----------------|
| Budget overruns are discovered too late | Original budgets remain static while approved changes and actual costs evolve independently. | Revised budgets update automatically and remaining budget is continuously recalculated. |
| Approved change orders are overlooked | Project value increases but cost reporting still compares against outdated contract values. | Approved changes flow directly into revised budgets and project financial reporting. |
| Progress billing calculations vary between periods | Manual calculations introduce inconsistent billing amounts and holdback deductions. | Billing values follow standardized calculations using consistent project parameters. |
| Client collections become difficult to monitor | Invoice status, outstanding balances, and overdue accounts require multiple tracking files. | Invoice history, payment status, outstanding balances, and aging are monitored in one place. |
| Cash shortages arrive unexpectedly | Future receipts and contractor obligations are estimated manually with limited visibility. | Monthly cash inflows, outflows, and cumulative cash position are forecast automatically. |
| Executive reporting requires significant manual effort | Managers consolidate reports from multiple spreadsheets before every meeting. | Executive KPIs are generated directly from operational project data with minimal maintenance. |

---

# Who This Is For

This workbook is designed for professionals responsible for controlling construction project performance rather than simply recording transactions.

Typical users include:

- Construction Management (CM) firms managing multiple active projects.
- Project Managers responsible for budget performance and client billing.
- Project Controls Engineers monitoring cost and schedule performance.
- Commercial Managers overseeing contract value, variations, and payment applications.
- Financial Controllers supporting project-level profitability and cash flow.
- Small and medium construction companies seeking structured project controls without investing in enterprise software.

This workbook is **not** intended to replace ERP platforms, accounting systems, or enterprise project management software. Instead, it serves as a lightweight decision-support layer that organizes operational information into actionable project intelligence.

**No spreadsheet expertise is required. Open the Browser version or Excel workbook, configure the project once, and begin tracking immediately.**

---

# About

I build lightweight decision-support tools for operational environments where too many moving parts make reliable decision-making difficult.

Rather than creating large software platforms, I focus on reusable analytical frameworks that answer one practical question:

> **What information needs to be visible in one place to make the next decision with confidence?**

The **Construction Management Project Control Workbook** is one example of that philosophy. It combines budgeting, project controls, billing, cash flow, and financial oversight into a practical workbook that is simple to maintain, easy to reuse, and designed for everyday operational decisions rather than occasional reporting.
# Technical Details

<details>
<summary><strong>For technical reviewers, Excel practitioners, and collaborators</strong></summary>

---

## Workbook Architecture

The workbook follows a layered architecture that separates configuration, operational inputs, analytical calculations, and executive reporting. Each worksheet has a single responsibility, allowing project data to flow consistently from source records to management decisions.

| Layer | Worksheets | Purpose |
|---------|------------|---------|
| Configuration | Parameters, Project Setup | Define project-wide assumptions including contract value, tax rate, holdback percentage, project dates, and client information. |
| Cost Control | Budget, Actual Costs, Change Orders | Compare baseline budget, approved variations, actual expenditures, and remaining available budget. |
| Progress Management | Milestones, Progress Billing | Measure construction progress and calculate gross billing, net billing, and holdback automatically. |
| Financial Operations | Contractor Payments, Client Receipts, Holdback, Cash Flow | Track payments, receivables, retained amounts, and forecast monthly cash position. |
| Outputs | Invoice Template, Document Register, Executive Dashboard | Produce invoices, executive summaries, project KPIs, and management reporting. |

### Data Flow

```text
Parameters
      │
Project Setup
      │
      ▼
Budget ────── Actual Costs
      │             │
      │             ▼
      │      Budget Variance
      │
      ▼
Change Orders
      │
      ▼
Progress Billing
      │
      ▼
Client Receipts
      │
      ▼
Cash Flow
      │
      ▼
Executive Dashboard
```

All operational tables use Excel Structured Tables (`tbl_*`) to ensure automatic formula propagation whenever new rows are added.

---

# Three Traps That Catch Even Experienced Construction Managers

---

## Trap 1 — Believing the Original Budget Is Still the Budget

### Decision Made

The project appears 8% over budget.

### Hidden Problem

The report compares actual spending against the original contract instead of the revised contract value after approved change orders.

| Incorrect Analysis | Correct Analysis |
|--------------------|-----------------|
| Original Budget = \$1,000,000 | Original Budget = \$1,000,000 |
| Actual Cost = \$1,060,000 | Approved Changes = \$120,000 |
| Conclusion: Over Budget | Revised Budget = \$1,120,000 |
| | Remaining Budget = \$60,000 |

The apparent cost overrun disappears once approved contractual changes are incorporated.

The workbook automatically recalculates revised budgets whenever a change order status becomes **Approved**, preventing management from reacting to misleading budget variances.

<details>
<summary>Relevant Formula</summary>

```excel
=SUMIFS(
tbl_ChangeOrders[Amount],
tbl_ChangeOrders[CostCode],
[@CostCode],
tbl_ChangeOrders[Status],
"Approved")
```

```excel
=[@[Original Budget]]+[@[Approved Changes]]
```

</details>

---

## Trap 2 — Billing More (or Less) Than Project Progress

### Decision Made

Finance prepares an invoice based on estimated progress.

### Hidden Problem

Manual billing calculations ignore cumulative progress, previous billing periods, or contractual holdback percentages.

| Incorrect | Correct |
|------------|----------|
| Manual percentage estimate | Progress measured from cumulative completion |
| Holdback calculated manually | Holdback calculated automatically |
| Previous invoices ignored | Previous billings deducted automatically |

Instead of estimating invoice values independently each month, the workbook derives current billing directly from cumulative project completion.

This prevents duplicate billing, under-billing, and inconsistent holdback calculations.

<details>
<summary>Relevant Formula</summary>

```excel
Current Gross =
Cumulative Gross
-
Previous Gross
```

```excel
=[@[Current Gross]]*Parameters!$B$3
```

</details>

---

## Trap 3 — Assuming Profit Means Positive Cash Flow

### Decision Made

The project is profitable, therefore liquidity is healthy.

### Hidden Problem

Profitability and cash availability are different measurements.

Delayed client payments, retained holdback, and early contractor payments frequently create temporary cash shortages.

| Profit View | Cash Flow View |
|-------------|---------------|
| Budget still profitable | Cash balance becomes negative in Month 6 |
| Revenue recognized | Client has not yet paid |
| Costs recorded | Contractor already paid |

The workbook forecasts monthly inflows and outflows so financing requirements become visible weeks before cash shortages occur.

<details>
<summary>Relevant Formula</summary>

```excel
=MAP(
Months,
LAMBDA(
m,
SUMIFS(...)
))
```

```excel
=SCAN(
0,
NetCash#,
LAMBDA(prev,curr,prev+curr))
```

</details>

---

## Example Scenario

A commercial construction project begins with a contract value of **\$2,000,000**.

During execution:

- Approved Change Orders: **\$180,000**
- Actual Costs Incurred: **\$1,150,000**
- Construction Completion: **55%**
- Holdback Rate: **10%**
- Client Payments Received: **\$780,000**
- Contractor Payments Made: **\$960,000**

### Step 1 — Contract Value Updates

Original Contract

```
$2,000,000
```

Approved Changes

```
+$180,000
```

Revised Contract

```
$2,180,000
```

---

### Step 2 — Progress Billing

55% completion produces

```
Gross Billing

=
$2,180,000 × 55%

=
$1,199,000
```

Holdback

```
10%

=
$119,900
```

Net Amount Due

```
$1,079,100
```

---

### Step 3 — Cash Position

Receipts

```
$780,000
```

Payments

```
$960,000
```

Current Cash Position

```
-$180,000
```

Although the project remains profitable, working capital has become negative because customer collections lag contractor payments.

Management can now:

- accelerate invoice collection,
- postpone discretionary purchases,
- negotiate payment timing,
- arrange short-term financing before liquidity becomes critical.

This is exactly the operational distinction the workbook is designed to expose.

---

## Formula Reference

<details>
<summary>Budget Worksheet</summary>

| Purpose | Formula |
|----------|----------|
| Approved Changes | `SUMIFS()` |
| Actual Cost | `SUMIFS()` |
| Remaining Budget | `Revised Budget - Actual Cost` |
| Budget Status | `IFS()` |

</details>

<details>
<summary>Progress Billing</summary>

| Purpose | Formula |
|----------|----------|
| Previous Billing | `SUMIFS()` |
| Current Billing | Current − Previous |
| Holdback | `Current Gross × Holdback %` |

</details>

<details>
<summary>Client Receipts</summary>

| Purpose | Formula |
|----------|----------|
| Invoice Lookup | `XLOOKUP()` |
| Outstanding Balance | Invoice − Received |
| Aging | `MAX(TODAY()-DueDate,0)` |

</details>

<details>
<summary>Cash Flow</summary>

| Purpose | Formula |
|----------|----------|
| Monthly Receipts | `MAP()` |
| Monthly Payments | `SUMIFS()` |
| Net Cash Flow | Inflow − Outflow |
| Running Cash Balance | `SCAN()` |

</details>

<details>
<summary>Invoice Template</summary>

| Purpose | Formula |
|----------|----------|
| Invoice Header | `XLOOKUP()` |
| Billing Details | `FILTER()` |
| Selected Columns | `CHOOSECOLS()` |

</details>

---

## Validation Rules

| Field | Validation Rule | Error Behavior |
|--------|-----------------|----------------|
| Cost Code | Must exist in Budget table | `#N/A` if unmatched |
| Change Order Status | Pending / Approved / Rejected | Only Approved affects budget |
| Completion % | Between 0% and 100% | Prevents invalid billing |
| Billing Period | Unique sequential integer | Prevents duplicate invoices |
| Holdback % | Defined in Parameters | Used globally throughout workbook |
| Invoice Number | Unique | Prevents duplicate client invoices |
| Dynamic Array Outputs | Spill range must remain empty | Excel returns `#SPILL!` |
| Structured Tables | New records appended inside tables | Formulas expand automatically |

</details>

---

# Other Tools in This Series

- **Revenue Management Decision Engine** — Optimize pricing, occupancy, and revenue guardrails with automated forecasting.
- **Construction Estimating & Cost Tracking** — Estimate project costs, monitor actual spending, and identify variance early.
- **Lightweight CRM & Shopify Attribution Tracker** — Connect customer interactions with marketing performance and revenue attribution.
- **Amazon Reporting Automation Toolkit** — Consolidate Seller Central exports into reusable operational dashboards.
- More lightweight decision-support workbooks are available through the GitHub repository or Gumroad store.

---

# License

This project is licensed under the **Apache License 2.0**.

You are free to use, modify, and distribute this workbook under the terms of the Apache License 2.0. See the `LICENSE` file for the complete license text.
