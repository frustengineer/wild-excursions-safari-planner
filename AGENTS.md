# AGENTS.md — Codex Working Guidelines

These instructions apply to Codex and other coding agents working in this repository. Follow more specific instructions in any nested `AGENTS.md` file when working within that directory.

## Response Style

- Be concise, direct, and professional.
- Do not repeat the request or explain obvious code unless asked.
- Prefer the smallest sufficient answer; avoid tutorials and long summaries unless requested.
- State assumptions only when they affect the result.
- Ask a clarifying question only when missing information would materially change the implementation or create risk.

## Context and File Reading

- Read only the files needed for the current task.
- Start with targeted searches and likely entry points; do not scan the entire repository by default.
- Prefer fast, focused searches such as `rg` and `rg --files` when available.
- Do not repeatedly read unchanged files or print large files in full.
- Ignore generated or dependency directories unless the task specifically involves them, including `node_modules`, `dist`, `build`, `.next`, `coverage`, `vendor`, caches, and generated assets.
- Inspect relevant configuration, types, tests, and nearby usage before changing behavior.
- Preserve useful context about architecture, conventions, constraints, decisions, and unresolved issues throughout the task.

## Coding and Change Scope

- Make the smallest complete change that satisfies the request.
- Do not refactor, rename, reformat, or rewrite unrelated code.
- Reuse existing patterns, components, utilities, design tokens, and project conventions.
- Prefer editing existing files over creating new ones when practical.
- Do not add dependencies, configuration, abstractions, or files unless they provide clear value for the requested change.
- Preserve existing behavior, public APIs, accessibility, responsive behavior, and browser compatibility unless the task requires a change.
- Keep secrets, credentials, personal data, and environment-specific values out of source files and responses.
- Do not overwrite or discard user changes. Treat unrelated working-tree changes as intentional.

## Web-Development Guidance

- Check the project's package manager and existing scripts before running install, build, lint, type-check, or test commands.
- Follow the existing framework, routing, state-management, styling, and component conventions.
- Prefer semantic HTML and accessible interactions, including keyboard support, labels, focus states, and suitable ARIA only where needed.
- Maintain responsive layouts and avoid introducing unnecessary client-side code, network requests, or bundle weight.
- Validate user-controlled data at appropriate trust boundaries and avoid unsafe HTML, injection risks, exposed secrets, or weakened authorization.
- Update tests when behavior changes, using the project's existing test style.

## Debugging

- Reproduce or clearly identify the failure before changing code when practical.
- Investigate the most likely cause first and use evidence from code, logs, tests, and runtime behavior.
- Check existing implementations before creating a replacement.
- Apply one focused fix at a time, then verify it before making additional changes.
- If an approach fails, reassess the cause rather than repeatedly modifying the same area without evidence.
- Do not hide errors or weaken checks merely to make tests pass.

## Commands and Output

- Use focused, non-interactive commands with the narrowest useful scope.
- Avoid commands that dump thousands of lines, traverse unrelated directories, or repeat unchanged work.
- Filter logs to the relevant section and summarize lengthy output instead of reproducing it.
- Run the smallest relevant validation first; broaden validation when risk, shared code, or project conventions justify it.
- Do not run destructive commands or make irreversible changes without explicit authorization and verified targets.

## Validation and Accuracy

- Verify changes in proportion to their risk with relevant tests, type checks, linting, builds, or focused manual checks.
- Do not claim that a command passed unless it was actually run successfully.
- Clearly distinguish verified facts from assumptions or unverified conclusions.
- If validation cannot be completed, state what was not run and why.
- Safety, correctness, security, and preservation of user work take priority over speed, brevity, and token savings.

## Context Management and Handoffs

- Use `/compact` when the conversation is becoming long, before context limits become disruptive, and after preserving the essential working state.
- Before compacting or handing off, retain a concise record of:
  - the user's goal and acceptance criteria;
  - relevant files and important code locations;
  - changes already made;
  - commands run and their results;
  - key decisions and constraints;
  - unresolved issues and the exact next step.
- Do not rely on chat history alone for durable project knowledge; place lasting project-specific guidance in documentation or the appropriate `AGENTS.md` when authorized.
- A handoff should let another agent continue without rescanning the repository or repeating completed work.
- After compaction, confirm the current repository state before continuing if there is any uncertainty.

## Task Completion

When the task is complete, provide a short final summary containing only:

1. What changed
2. Files changed
3. Validation or test result
4. Important remaining issue, if any

Do not include a long walkthrough unless requested.

## Project-Root Usage

- Save this file as `AGENTS.md` in the repository root so it applies to the whole project.
- Commit it if the team should share these rules; otherwise keep it local according to the repository's practices.
- Add nested `AGENTS.md` files only when a subdirectory needs more specific instructions. Nested instructions should refine or override the root guidance for that subtree.
- Keep instructions concrete and repository-relevant. Add project-specific commands, architecture notes, and constraints when known.
- Review this file periodically and remove outdated, duplicated, or conflicting guidance.
