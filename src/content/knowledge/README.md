# Visitor-facing knowledge sources for the portfolio chatbot.
# Technical notes and the private resume are not part of this corpus.

- bio.md — professional background and approach
- facts.md — canonical identity and broad experience facts
- experience.md — role summaries and responsibilities
- skills.md — professional practice, project work, and active learning
- work.md — public-safe case studies
- experiments.md — independent project descriptions and status
- contact.md — current contact details
- off-the-clock.md — optional personal interests

Each source file is discovered at build time. Content edits need a deploy and a
new authenticated ingestion run before visitors receive the updated passages.
