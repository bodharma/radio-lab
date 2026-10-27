# Radio Lab

Learn the complete UK Foundation course in its original module/topic order through visual cause and effect, short written interaction and later recall. Preserve every source note, including supplemental topics, glossary, module hubs and course resources.

## Product invariants

- No audio or voice. No forced animation, learning deadlines, streak penalties or diagnosis collection. A timed mock requires an explicit start and has an untimed alternative.
- Every course topic has its complete source information in sequential sections, a relevant visual workbench, a written reflection and a clear next topic. References remain available without requiring course order.
- Exploration and self-reported review are not proof of mastery. Display completion as reviewed, not qualified or exam-ready.
- Topic/module checks and mocks mark actual answers, preserve first checked responses and distinguish practice performance from validated exam readiness. The full mock follows the sourced RSGB blueprint; correctness is withheld until submission.
- Sessions follow course order and preserve their current step. Suggested time budgets never advance a learning step automatically. Independent tasks hide answer-bearing coaching and record lesson use as support.
- Spaced-recall evidence, conversation and pilot observations use separate validated storage. Immediate repeats do not advance spaced successes. Free-text coaching is explicitly limited and never certifies understanding.
- Quantitative physics must use checked equations. Qualitative station, propagation and hazard scenes must say that they are illustrative.
- Imported material stays private by default. The import is ignored by Git; local production builds include it and must not be published without a content/rights review.

## Design

An instrument workbench, with a fixed course rail, large central diagram and adjacent short text prompt. Cool paper #f1f5f9, ink #24354a, cobalt #3159c7, teal #087b75, amber #97631a. Avenir Next/system sans for reading; tabular numerals for measurements. Left alignment, generous space, no decorative movement. Diagram state changes respond directly to the learner's actions; before/after values remain visible.

## Content

`scripts/import-course.mjs` reads all Markdown except instruction files. Module links define the canonical topic order. A missing module/topic or a content-splitting discrepancy fails the import. `data/coverage.json` records source hashes and section counts; `public/course.json` contains the private complete source.

`src/scenarios.js` supplies a specific everyday situation, visual focus, action, practical consequence and transfer question for every one of the 86 course topics. Topic context selects an appropriate model, highlights a relevant part and sets suitable initial controls. Batteries, symbols, power, AC/DC, series/parallel lamps, sampling, receiver tuning, sidebands, feed points, baluns, polarisation, repeaters and other distinct concepts have separate scenes. Related concepts reuse suitable models; source sections retain the complete detail.

Each of the 86 scenarios explicitly assigns `kind` and `focusTarget`; module or title guessing is only a fallback for supplemental references. The SVG must contain the named part, which receives the visible `topic-focus` style. A missing part fails rendering and the coverage test. This applies across every module, including operating procedures and rules, rather than only to battery and electrical topics.

`src/teaching.js` adds 42 foundational guides and 15 topic extensions: plain definitions, causal steps, examples, misconceptions and authoritative sources. The authoring instruction is [RADIO_TEACHER_PROMPT.md](RADIO_TEACHER_PROMPT.md). It sets a senior-instructor standard without inventing personal credentials. The signal chain explicitly distinguishes losing the message input from removing an RF-path stage and shows carrier, post-modulation and output traces.

Assessment scope, verified official sources and state invariants are in [ASSESSMENT.md](ASSESSMENT.md). The 177 original questions cover all 86 topics, while the exam blueprint uses the official eight sections rather than the course's nine teaching modules. Question diagrams contain givens without worked answers or lesson highlighting. Invalid assessment storage is preserved and recorded separately from lesson progress.

`src/learning.js` schedules recall and builds resumable 5/15/60-minute sessions. `src/challenges.js` provides model-based transfer tasks for every ordered topic, with worked/guided/independent support. `src/coach.js` offers prepared written explanations and limited misconception checks. `src/learning-ui.js` connects these features and prepares local instructor/pilot downloads. `src/study-tools.js` and its UI add focus panels, contextual obstacle reports and EX307 practice; `src/reference-trainer.js` holds the six sourced exercises. `src/backup.js` validates and transfers all four saved records, with private writing optional, explicit replacement confirmation and rollback. [LEARNING.md](LEARNING.md) describes their limits.

Numerical experiments distinguish ideal checked relationships from qualitative pictures. Wave windows use explicit metre scales and antenna-size comparisons label the reference object and ideal quarter-wave assumption. Feeder loss is drawn as dissipation in the cable; returned power is reserved for matching. Safety, propagation and licensing illustrations do not certify an installation or grant permission. [CONTENT_AUDIT.md](CONTENT_AUDIT.md) records specific source cross-checks. Human instructor review and validated assessments remain outstanding before wider release; [PILOT_PROTOCOL.md](PILOT_PROTOCOL.md) defines the next evidence collection.

`scripts/import-reference.mjs` downloads and checksum-verifies January 2026 EX307, parses fixed reviewed geometry into complete page/section/table data and extracts the original chart. `src/reference-reader.js` provides local four-page navigation, search, responsive rows, source metadata and links to original PDF pages. The generated PDF/JSON/PNG stay in ignored `public/reference/`, outside the Docker build; Nginx serves only their exact mounted paths. Original PDF access in the trainer and mock is local. No external connection is required after import for the document itself.
