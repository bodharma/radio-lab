# Learning loop and evidence

## What is implemented

The lesson provides a visual model, complete original information, detailed English explanations, written coaching and marked questions. Practical tasks vary the givens or requested state. Worked examples expose a solution, guided tasks offer progressive hints, and independent tasks require a first checked answer before coaching becomes available. Opening the lesson records support. A checked task cannot be rewritten into a different first response; a fresh task is a new attempt.

The written tutor responds to explicit terminology and a limited set of common misconceptions. Other explanations receive a model comparison and a specific follow-up question. It does not perform unrestricted semantic grading. Its hints and explanations inherit the lesson's verified authoritative references. Learners can challenge a suspected misreading; the tutor does not label arbitrary prose correct.

All 86 topics resolve to a checked task. Related topics share models and finite task variants. This coverage is a completeness check for the software, not evidence that every examinable skill has been mastered. Some feeder/gain calculations are optional engineering extensions with their relationship supplied; they do not imply that the Foundation exam requires those formulas from memory.

## Recall schedule

Each topic records the latest marked result, confidence, source hash, next due time and count of spaced successes. Examination evidence is imported idempotently; an outstanding wrong answer in the topic is not erased by a different correct question. An exam check carries unknown confidence and returns the next day if correct. A source change invalidates the relevant recall evidence.

Misses return after 10 minutes. Correct guesses and partly confident answers return after one day. Confident independent successes at least 18 hours apart advance through 1, 3, 7 and 14 days. Same-day repetition cannot advance that count or postpone an already earlier due time. These exact intervals are an initial product heuristic; they are not established personalised optimums.

## Session and privacy

`#today` offers 5, 15 or 60 minutes. The 60-minute plan is recall/diagnostic10, learning20, break5, practical15, checking10. The 15-minute plan is 3/5/1/4/2. A 5-minute pass uses recall1, practical3 and checking1, prioritising a due topic and retaining the full topic material elsewhere. The learner decides when each step ends. Longer sessions follow original course order and source-version changes. An unfinished session resumes its saved duration and exact step. Older records without a duration retain the original 60-minute interpretation.

`radio-lab-learning-v1` is separate from legacy lesson and assessment keys. Malformed state is not overwritten. Failed saves are reported immediately. Conversations have bounded local history and all rendered learner text is escaped. No remote tutor, analytics, account or upload is introduced.

`radio-lab-tools-v1` stores focus preferences, contextual obstacles and EX307 practice. Focus mode displays one lesson panel while keeping original text and source corrections accessible. The EX307 trainer uses six verified page-specific exercises; independent lookup hides hints and answer-bearing row labels until checking. `#reference-book` presents all four parsed pages, including 72 table rows, 26 general/numbered notes, two other licence-note blocks and the source raster chart. Section links and the trainer open the unchanged local PDF. After import these resources work without external network access while the local server runs; only checking/downloading the publisher’s source needs internet. Embedding depends on browser PDF support; the readable HTML does not.

The importer verifies the fixed January 2026 source checksum before parsing, assigns every extracted word to one section and rejects unexpected row counts or geometry. The full text layer remains available for comparison. Publisher artwork labels were verified separately; the graph remains its original bitmap. Source wording, blank cells, units and footnote associations are retained. This is an examination snapshot, not a live operating permission check. A later source edition needs a reviewed parser update.

`#tools` exports validated saved progress across all four keys. Private writing and text-input exercises are optional, with numerical answers and result evidence retained. Restore requires a valid preview and explicit replacement confirmation, downloads a private raw safety copy and rolls back failed writes. A browser that blocks rollback can still leave partial state; the error names the affected records and directs recovery. This is file portability, not background synchronisation. Contextual obstacle exports preview the topic, prompt and visible controls; private notes and typed text controls are excluded by default.

`#pilot` records self-reported observations. Its previewable scores export contains UTC date/stage/score/total only, without exact timestamps. Instructor review packs contain authored teaching, questions/keys, task solutions and source corrections; private chat, reflection, pilot notes and complete imported note bodies are omitted. Downloading solution keys marks unfinished independent tasks as supported. An instructor review entry is not externally verified. Human participants and an actual qualified reviewer are required before claiming the pilot or instructor review has happened.

## Design evidence and limits

- [IES, Organizing Instruction and Study to Improve Student Learning](https://ies.ed.gov/ncee/wwc/PracticeGuide/1): distributed study, retrieval, worked examples with independent problems, and explanatory questions. Evidence strength differs by recommendation. This does not establish the app's effectiveness for autism or ADHD.
- [University of Colorado Boulder, PhET facilitation guidance](https://phet.colorado.edu/files/guides/TeacherGuide_StrategiesForFacilitation_en.pdf): connect experiments to everyday situations, elicit reasoning and adapt to learner ideas. Its classroom guidance informs this design; this application has not reproduced those studies.
- [W3C cognitive-accessibility guidance](https://www.w3.org/TR/coga-usable/): clear steps, manageable content, focus support and involving users in testing. User preferences guide this implementation rather than a universal diagnosis-based learning style.
- [RSGB official practice papers](https://rsgb.org/main/clubs-training/training-resources/mock-exams/): reserve unseen material for a separate exam-format check. Repeated app-bank scores cannot validate readiness by themselves.
