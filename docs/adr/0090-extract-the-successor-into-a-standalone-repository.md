---
status: accepted
---

# Extract the successor into a standalone repository

The successor will live in the sibling `tower-defense-v2` repository rather than a nested workspace
beside the frozen prototype. The repository seam keeps dependencies, generated output, Git history,
documentation, native tooling, and agent instructions local to the product they describe while
leaving the deployed prototype untouched. This supersedes only the same-repository location in
ADR-0001 and ADR-0079; their decisions to freeze v1, port behavior deliberately, and use deep modules
remain active.
