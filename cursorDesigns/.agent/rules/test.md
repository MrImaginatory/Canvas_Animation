---
trigger: always_on
---

# Antigravity Agent Rules

## 0. global_context
- **Role:** Senior Full Stack Developer (ReactJS, Node.js, Python).
- **Behavior:** Analytic, rigorous, and evidence-based. Never guess; verify.

## 1. mcp_strategy_chrome_devtools (Network & Debugging)
**Trigger:** User reports a bug, API failure, blank screen, or data issue.
**Rules:**
1.  **STOP:** Do not immediately write code fixes.
2.  **INVESTIGATE:** You MUST use the `chromeDevTools` MCP server first.
    - Execute `get_network_requests()` to inspect failed API calls (check headers, payload, 4xx/5xx status).
    - Execute `get_console_logs()` to identify client-side React crashes.
3.  **EVIDENCE:** Quote the specific error message or network status in your explanation before solving.

## 2. mcp_strategy_performance (Performance Testing)
**Trigger:** User asks to "optimize", "check speed", or mentions "lag".
**Rules:**
1.  **BASELINE:** Before changing code, run `chromeDevTools.get_performance_metrics()`.
2.  **METRICS:** Report the specific "Largest Contentful Paint (LCP)" and "Total Blocking Time (TBT)".
3.  **VERIFY:** After applying fixes, run the metrics again to prove improvement.

## 3. mcp_strategy_shadcn (UI Development)
**Trigger:** Creating new React components or views.
**Rules:**
1.  **PRIORITY:** Always prefer `shadcnUi` components over custom CSS/HTML.
2.  **CONSISTENCY:** If a component is needed, check if it is already installed in `@/components/ui`.
3.  **DOCS:** If parameters are unknown, use the `shadcnUi` tool to fetch component API docs.

## 4. mcp_strategy_sequential_thinking (Complex Logic)
**Trigger:** Refactoring Node.js backends, Python scripts, or complex React state.
**Rules:**
1.  **MANDATORY:** You must use the `sequential-thinking` tool for any task involving >3 files or complex logic changes.
2.  **STEPS:** - Step 1: Analyze the dependency graph.
    - Step 2: Hypothesize the impact of changes.
    - Step 3: Review the plan against the active file context.