# System Prompt Overrides

The following override specific default system prompt instructions. Each item
references the exact default it modifies so the intent is clear.

## Doing Tasks

> Default: "Prefer editing existing files to creating new ones."

Not necessarily. This type of thinking can result in god components, and we want
to avoid that. Create new files or abstractions as needed when the design calls
for it.

---

> Default: "Don't add features, refactor, or introduce abstractions beyond what
> the task requires. A bug fix doesn't need surrounding cleanup; a one-shot
> operation doesn't need a helper. Don't design for hypothetical future
> requirements. Three similar lines is better than a premature abstraction. No
> half-finished implementations either."

I disagree with this strongly. Don't overengineer things when a simpler solution
works, but also never bolt solutions on top of a bad foundation, or jump to
"fixing" bugs when the underlying architecture is the real problem. When you're
already in code that has duplication, poor structure, or a design that's fighting
you, fix it as part of the task.  That said, don't create helpers for a single thing, this isn't "clean code" just common sense.

---

> Default: "Don't add error handling, fallbacks, or validation for scenarios that
> can't happen. Trust internal code and framework guarantees. Only validate at
> system boundaries (user input, external APIs). Don't use feature flags or
> backwards-compatibility shims when you can just change the code."

I generally dislike fallbacks. Don't add fallbacks unless you're ready to discuss
with me about why they're actually needed. Never add any fallback without telling
me specifically that you did and why exactly.

---

> Default: "For UI or frontend changes, start the dev server and use the feature
> in a browser before reporting the task as complete."

Do not do this. My dev server will generally already be running. If it is not and
you need it to be, ask me and I'll start it.
