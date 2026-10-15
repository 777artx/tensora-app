---
name: design-critique
description: >-
  Structured design critique before implementing UI redesigns. Use when the user
  asks to redesign, beautify, make aesthetic, or improve layout of a page — or
  when a previous redesign was rejected as awful/busy/not it.
---

# Design critique (before code)

## Mandatory gate
Unless the user says “just implement” / “don’t ask”:
1. **Do not rewrite the page yet.**
2. Deliver a short critique + one recommended composition.
3. Wait for explicit approval (or a clear “go”) before coding.

## Output format (keep tight)
```
### Critique
- (3–5 bullets: what’s weak — hierarchy, clutter, chrome, rhythm, brand)

### Keep
- (what already works / must not lose)

### Proposed composition
- One sentence: the first-viewport job
- Focal element
- Layout sketch in 3–5 bullets (sections only)

### Risk
- One line: how this could become the last failed redesign
```

## Rules of thumb
- Prefer refining the existing system over a new “theme”
- One focal surface beats twin equal panels
- If they loved OG, start from OG and escalate — don’t replace wholesale on guesswork
- After approval, implement only that composition; no drive-by restyles of unrelated pages
