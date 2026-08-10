# Gráfica MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional responsive React/TypeScript MVP for SEMED copy-control named Gráfica/grafica.

**Architecture:** Use a frontend-only MVP with localStorage persistence behind a repository/service boundary. Keep copy calculations, code generation, metrics and authorization in pure TypeScript modules with tests so the UI can later call an ASP.NET Core API without rewriting business rules.

**Tech Stack:** React, TypeScript, Vite, Vitest, CSS modules/global CSS, localStorage.

---

### Task 1: Project Setup
- [ ] Initialize the web app in the project root.
- [ ] Add test tooling and scripts.
- [ ] Start the development preview.

### Task 2: Business Rules
- [ ] Write failing tests for copy calculations, unique code generation, dashboard metrics and role permissions.
- [ ] Implement pure rule modules until tests pass.

### Task 3: Data Layer
- [ ] Write tests for seeded data, request creation/update and status history.
- [ ] Implement local repository with a future API-shaped interface.

### Task 4: Application UI
- [ ] Implement login, responsive shell, dashboard, requests, units and reports.
- [ ] Wire filters, forms, status updates, ranking and monthly consolidation.

### Task 5: Documentation and Verification
- [ ] Write README with execution instructions and demo credentials.
- [ ] Run tests and production build.
