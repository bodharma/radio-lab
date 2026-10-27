# Foundation assessment

The March 2026 RSGB v1.6b syllabus specifies 26 questions, 60 minutes and a pass benchmark of 19/26. Its section allocation is licensing 6, technical 3, transmitters/receivers 3, feeders/antennas 3, propagation 2, EMC 3, operating 3 and safety 3. Assessment is in English. The exam reference booklet is EX307, January 2026; the exam band plans are specimen plans, so exam lookup exercises must use that booklet rather than a live band plan.

Sources are recorded in `src/exam-spec.js`. Official April 2026 mock papers remain linked to the RSGB site. The app's original questions are independent practice material, with syllabus item tags and explanations; they are not the confidential examination bank or an RSGB endorsement.

## Scope

- Every ordered course topic gets at least two marked multiple-choice questions, including application or interpretation rather than only fact recall. Diagrams must give only the information in the question, without the workbench's answer highlights or computed result.
- Topic and module practice provide feedback after checking an answer. A checked answer cannot be edited to erase the first response. Missed questions can be practised again.
- A mock paper follows the exact section allocation, shuffles questions/options and offers a deliberate 60-minute timed start or an untimed rehearsal. Answers can be changed and flagged before submission. No correctness, explanations or lesson hints appear until submission or timeout.
- Timed deadlines survive reloads. Submission is idempotent; unanswered exam items score zero. Results include section scores, explanations and links back to lessons. A practice pass is not an exam-readiness guarantee.
- Assessment state uses a separate browser-storage key. Existing source/lesson progress is preserved. Invalid or incompatible assessment storage is not silently overwritten. A new paper does not discard an unfinished one.

## Verification

Check bank/topic parity, four unique options, diagram validity, exact paper allocation, shuffled answer marking, threshold boundaries, answer locking, deadline/reload behaviour, corrupt storage, no premature feedback and keyboard/mobile use. Keep a record of the verified format date and revisit it when RSGB changes the syllabus or reference booklet.
