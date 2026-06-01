# Restaurant POS AI Development Workflow Prompts

# Purpose Of This File

This file contains optimized AI prompts for developing the Restaurant POS system feature-by-feature while minimizing token usage and maximizing output quality.

These prompts are intentionally modular.

Rules:

* Only work on ONE feature/module at a time.
* Avoid asking AI to generate the whole project at once.
* Keep prompts focused and specific.
* Reuse previous context only when required.
* Build incrementally.
* Always ask for production-ready code.
* Always ask for scalable folder structure.
* Avoid unnecessary explanations unless debugging.

This approach reduces:

* token usage
* hallucinations
* broken architecture
* weekly quota exhaustion

and improves:

* consistency
* maintainability
* AI output quality

---

# Global AI Instructions

Use these instructions in every major prompt if required.

## Global Project Stack

* Next.js App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* Supabase
* Supabase Realtime
* PostgreSQL
* Node.js Print Server
* node-thermal-printer

## Global Coding Rules

* Use clean architecture
* Use reusable components
* Use server actions where appropriate
* Use TypeScript properly
* Avoid unnecessary libraries
* Keep components modular
* Follow scalable folder structure
* Keep UI minimal and fast
* Optimize for restaurant workflows
* Prefer readability over abstraction
* Avoid overengineering

---

# DEVELOPMENT STRATEGY

DO NOT BUILD EVERYTHING TOGETHER.

Development order:

1. Project Setup
2. Authentication
3. Database Schema
4. Tables UI
5. Menu System
6. Cart & Orders
7. Realtime Order Flow
8. Print Server
9. KOT Printing
10. Billing
11. Printer Management
12. Analytics

Only move to the next step after the previous step is stable.

---

# STEP 1 — Project Initialization Prompt

## Prompt

Create a production-ready Next.js restaurant POS starter project using:

* Next.js App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* Supabase integration

Requirements:

* Proper scalable folder structure
* Authentication-ready architecture
* Reusable layout structure
* Mobile-first approach
* Admin dashboard layout
* Captain mobile layout
* Clean codebase organization

Do NOT build features yet.

Only setup:

* project structure
* layouts
* providers
* utility structure
* Supabase client setup
* environment variable structure

---

# STEP 2 — Authentication Prompt

## Prompt

Implement authentication using Supabase Auth.

Roles:

* captain
* manager
* admin

Requirements:

* Login page
* Session handling
* Protected routes
* Role-based route protection
* Middleware protection
* Reusable auth utilities

Captain:

* mobile-first access

Manager/Admin:

* dashboard access

Do NOT build dashboard pages yet.

Only implement:

* auth flow
* role checks
* protected layouts
* auth utilities

---

# STEP 3 — Database Schema Prompt

## Prompt

Design the initial Supabase PostgreSQL schema for the restaurant POS system.

Required tables:

* restaurants
* users
* tables
* menu_categories
* menu_items
* orders
* order_items
* printers
* payments
* print_jobs

Requirements:

* Use proper foreign keys
* Use UUIDs
* Include timestamps
* Include restaurant_id relationships
* Include enums where appropriate
* Prepare for role-based access

Also generate:

* recommended indexes
* Supabase RLS policies
* relationships explanation

Do NOT generate frontend code.

---

# STEP 4 — Tables UI Prompt

## Prompt

Build the restaurant tables management UI.

Requirements:

* Mobile-friendly
* Fast interactions
* Realtime table updates
* Table statuses:

  * available
  * occupied
  * billing

Features:

* table grid
* table cards
* open table action
* active order indication

Use:

* shadcn/ui
* reusable components
* responsive design

Do NOT implement ordering yet.

---

# STEP 5 — Menu Management Prompt

## Prompt

Build the menu management system.

Requirements:

* Menu categories
* Menu items
* CRUD operations
* Item availability toggle
* Printer type assignment

Printer types:

* KITCHEN
* BAR
* BILLING

Requirements:

* reusable forms
* validation
* optimistic UI
* clean TypeScript types

Manager/Admin only.

Do NOT implement ordering flow yet.

---

# STEP 6 — Captain Ordering Prompt

## Prompt

Build the captain ordering workflow.

Requirements:

Workflow:

* select table
* browse menu
* add items to cart
* modify quantity
* add notes
* place order

Requirements:

* mobile-first UI
* fast touch interactions
* minimal clicks
* persistent cart state
* realtime order creation

Database:

* create orders
* create order_items

Do NOT implement printing yet.

Only implement:

* frontend ordering flow
* Supabase order insertion

---

# STEP 7 — Realtime Orders Prompt

## Prompt

Implement realtime order updates using Supabase Realtime.

Requirements:

* Live order updates
* Live table status updates
* Running order synchronization
* Multiple device synchronization

Requirements:

* optimized subscriptions
* cleanup handling
* scalable realtime architecture
* avoid duplicate subscriptions

Do NOT implement printing yet.

---

# STEP 8 — Node Print Server Prompt

## Prompt

Create a local Node.js print server for the restaurant POS system.

Requirements:

* Node.js
* node-thermal-printer
* Supabase realtime listener
* LAN printer support
* ESC/POS printing

Responsibilities:

* listen for new print jobs
* connect to printers
* print silently
* separate printer logic

Folder structure:

* modular
* scalable
* production-ready

Do NOT build Electron/Tauri app.

Only local Node print server.

---

# STEP 9 — KOT Printing Prompt

## Prompt

Implement KOT printing workflow.

Requirements:

When order is placed:

* separate items by printer_type
* send food items to kitchen printer
* send drink items to bar printer

Requirements:

* realtime printing
* print formatting
* printer routing
* grouped KOT slips

Printer types:

* KITCHEN
* BAR

Do NOT implement billing printing yet.

---

# STEP 10 — Billing Prompt

## Prompt

Build the billing workflow.

Requirements:

* generate bill
* calculate totals
* taxes
* payment methods
* print bill

Payment methods:

* cash
* UPI
* card

Requirements:

* printable bill layout
* close table after payment
* reprint bill support

Keep billing simple.

Do NOT implement advanced accounting.

---

# STEP 11 — Printer Management Prompt

## Prompt

Build printer management UI and backend.

Requirements:

* add printer
* edit printer
* printer IP
* printer port
* enable/disable printer
* test print button

Printer types:

* KITCHEN
* BAR
* BILLING

Requirements:

* realtime printer updates
* clean forms
* printer validation

Manager/Admin only.

---

# STEP 12 — Analytics Dashboard Prompt

## Prompt

Build the restaurant analytics dashboard.

Requirements:

* total sales
* total orders
* payment summaries
* active tables
* top-selling items
* daily revenue

Requirements:

* responsive charts
* realtime updates
* optimized queries
* dashboard cards

Admin only.

Do NOT implement inventory analytics.

---

# IMPORTANT AI USAGE RULES

## Rule 1

Never ask AI to build:
"complete POS system"

Instead:
build feature-by-feature.

---

## Rule 2

After every major feature:

* test manually
* refactor
* stabilize

Then move forward.

---

## Rule 3

Avoid huge prompts.

Smaller focused prompts produce:

* better architecture
* cleaner code
* fewer bugs

---

## Rule 4

Keep AI context focused.

Only include:

* current feature
* required database tables
* required components

Avoid pasting the entire project context repeatedly.

---

# TOKEN OPTIMIZATION STRATEGY

To reduce token usage:

## DO

* ask focused prompts
* ask for only required files
* ask for only one feature
* ask for incremental improvements
* reuse generated utilities

## DO NOT

* regenerate entire files repeatedly
* ask for entire project code
* ask for full rewrites unnecessarily
* paste massive codebases repeatedly

---

# DEBUGGING STRATEGY

When debugging:

BAD Prompt:
"my app not working"

GOOD Prompt:
"Supabase realtime subscription duplicates after route change in Next.js App Router. Analyze the issue and suggest minimal fixes."

Focused prompts save massive tokens.

---

# UI STRATEGY

Prioritize:

* speed
* readability
* touch-friendly UI
* operational efficiency

NOT:

* flashy animations
* overdesigned dashboards

Restaurant software should feel:

* instant
* reliable
* simple

---

# MOST IMPORTANT ENGINEERING PRIORITY

Before advanced features:

Ensure this workflow is perfect:

Order
→ Realtime Event
→ Printer Routing
→ KOT Print

This is the heart of the application.

If this works reliably, the MVP is successful.

---

# Future Expansion Prompts (Later)

These are NOT MVP tasks.

Future:

* QR ordering
* Kitchen display system
* Inventory
* Multi-branch support
* Offline-first sync
* Tauri desktop app
* Customer management
* Loyalty system
* AI analytics

Do NOT work on these initially.

---

# Final Development Philosophy

Build:

* simple
* stable
* fast
* production-ready

Avoid:

* overengineering
* premature abstractions
* unnecessary complexity

The primary business value is:

Fast restaurant operations with reliable realtime printing.
