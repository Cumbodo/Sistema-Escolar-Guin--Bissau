---
name: OpenAPI codegen compatibility
description: Non-obvious constraints encountered when generating the shared API client and Zod schemas.
---

The generated React client uses `Headers.entries()`, so its TypeScript project must include `dom.iterable` in addition to `dom`.

**Why:** The shared base TypeScript configuration only includes ES libraries, and the generated client can otherwise fail typechecking even when Orval succeeds.

**How to apply:** Keep `dom.iterable` in the API client library tsconfig whenever generated fetch helpers are regenerated.

OpenAPI operations that combine path parameters and query parameters can produce a duplicate `Get<Operation>Params` export between generated Zod schemas and generated type files. Prefer separate path-based operations for query-like selectors when that collision appears.

**Why:** Orval's naming for combined parameter locations is not stable enough for the barrel's `export *` layout.

**How to apply:** If codegen reports a duplicate params export, split the operation into a path-only default endpoint and a separate path-only selector endpoint rather than hand-editing generated output.