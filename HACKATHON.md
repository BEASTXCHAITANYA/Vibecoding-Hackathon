# Hackathon Notes

## What we did NOT reimplement / fully wire, and why

- **Breeth conviction-memory graph edges**: conviction memories (the persona's charter convictions) are dispatched to Breeth successfully at the HTTP layer but do not currently produce queryable graph edges — Breeth's extractor appears to require a clean subject-predicate-object structure that abstract belief statements don't provide. Persona consistency does not depend on this: the charter is stored directly in Postgres and injected into every prompt.
