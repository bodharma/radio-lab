# Radio Lab

[![Docker build](https://github.com/bodharma/radio-lab/actions/workflows/docker.yml/badge.svg)](https://github.com/bodharma/radio-lab/actions/workflows/docker.yml)

A visual UK Foundation amateur-radio study workbench: 86 ordered topics, detailed explanations, cause-and-effect experiments, written coaching, practical tasks and exam-format practice. No audio, voice or autoplay. Timed mocks start only when selected; untimed rehearsal is available.

The public edition contains original Radio Lab teaching and an authored glossary. Personal Obsidian notes, learner records and downloaded third-party reference files are excluded from the repository and image.

## Run the published Docker image

Supports Linux AMD64 and ARM64, including Apple Silicon through Docker Desktop/OrbStack:

```sh
docker run -d --name radio-lab --restart unless-stopped --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges:true -p 127.0.0.1:5180:8080 ghcr.io/bodharma/radio-lab:latest
```

Open **http://127.0.0.1:5180/#today**. No source checkout, private files, Node.js or extra volume is needed. Progress stays in browser storage; use **Backup & feedback** to export it. Keep the same browser, host and port to retain access to existing progress. Removing the container does not erase browser storage.

The public package page is [ghcr.io/bodharma/radio-lab](https://github.com/bodharma/radio-lab/pkgs/container/radio-lab). If a newly created package is still private, its owner must change package visibility to Public once in GitHub package settings; GitHub does not inherit public repository visibility automatically. Alternatively, build from the public source below.

## Build and run from source

```sh
git clone https://github.com/bodharma/radio-lab.git
cd radio-lab
docker compose up -d --build --wait
```

Open **http://127.0.0.1:5180**. To use another port: `RADIO_LAB_PORT=5181 docker compose up -d --build --wait`. Stop with `docker compose down`.

The multi-stage image builds with Node24 and serves static files as a non-root Nginx user. The default Compose service has a read-only filesystem, temporary /tmp, no Linux capabilities and a localhost-only port. It contains the original authored public course. No authentication or public web hosting is configured.

## Develop and test

Requires Node.js24+ and npm. Browser tests use installed Chrome; `npx playwright install --with-deps chrome` installs it for CI/Linux. Poppler's `pdftotext` and `pdfimages` are needed for the optional reference importer and its tests (`brew install poppler` on macOS, `sudo apt-get install poppler-utils` on Debian/Ubuntu).

```sh
npm ci
npm run course:public
npm run import:reference
npm test
npm run test:e2e
```

Then `npm run dev` starts Vite at **http://127.0.0.1:5180**; stop Docker first if it occupies that port. `npm run build` creates a local production build. `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5180 npm run test:e2e` checks an existing matching server instead of launching Vite. The public-course generator refuses to overwrite an imported or invalid course.

## Optional personal notes and offline EX307

To use a compatible private nine-module Obsidian course:

```sh
npm run import:course -- /absolute/path/to/Ham-Radio
npm run import:reference
docker compose -f compose.yaml -f compose.private.yaml up -d --build --wait
```

The private override mounts `./public` read-only over the shipped public course. Importing preserves source notes without editing them and writes a private coverage report. Keep this override when restarting your personal setup. Re-imports update mounted files without rebuilding; reload the browser afterwards.

For offline EX307 with the public course, run `npm run course:public` and `npm run import:reference`, then use the same private override (it simply mounts your local course/reference assets). The importer downloads the official January2026 PDF, verifies its reviewed SHA-256, and generates readable JSON plus the original chart. `npm run import:reference -- --from-local` re-parses a saved copy without internet. A changed edition/layout is rejected pending review. Only the exact reviewed file routes are served; other mounted files are not exposed.

The published image excludes downloaded EX307 files. Its PDF links open the official RSGB source online until local assets are mounted; the parsed HTML reader requires the optional import. Once imported, its reader, PDF and chart work without external internet while the server runs.

## Automatic image builds

[GitHub Actions](.github/workflows/docker.yml) verifies public-course unit/browser tests, imports and checks the pinned reference, and smoke-tests the image without mounts. After passing checks, trusted pushes to `main` publish `ghcr.io/bodharma/radio-lab:latest` and a commit tag; `v*` version tags publish versioned images. Pull requests test without registry write access. Official actions are pinned to commit SHAs; publishing uses the repository's scoped `GITHUB_TOKEN`, with no personal registry secret.

Images support `linux/amd64` and `linux/arm64`. To update a running container, pull the new image and recreate it with the same command/settings. Keep browser progress backups separately.

## Study flow

The app starts at Module 1’s first topic, or your last saved topic. Each of the 86 topics has an everyday situation, a named visual focus, a concrete action, a practical consequence and a different transfer question. Change a control and compare the diagram and before/after readings. Work through every information section, record what changed, then mark the topic reviewed and move to the next one. You can revisit or jump to another topic at any time.

The guided explanation beside the diagram defines the terminology, follows the mechanism step by step, gives a worked example and corrects a common misunderstanding. It uses 42 shared foundational guides and 15 topic-specific extensions across all 86 topics, with primary-source links. Open each step at your own pace; changing a control keeps opened guidance intact. The full authored lesson remains below the explanation; a private import shows its complete original Obsidian note instead.

For example, the battery topic shows individual cells and their terminals. Adding series cells changes voltage; disconnecting the load stops current while retaining voltage. Frequency examples compare garden HF, an FM receiver, a handheld and Wi-Fi, with ideal quarter-wave element lengths drawn beside a labelled reference object. Other scenes cover symbols, AC/DC, lamp wiring, tuning, spectrum, antenna orientation, repeaters and operating decisions. Amber outlines or marks identify the part being explored.

Every course topic explicitly names its model and the SVG part to highlight. Related topics can share a useful scene while highlighting different parts: the resistor versus the calculation, the tuning dial versus the recovered programme, or the ionosphere versus terrain. AM/FM topics always open modulation models. The licence schedule has its own EX307 reading checklist; EMC topics distinguish the coupling path, affected device, suppression and observation record. Coverage checks reject a topic whose specified visual part is absent.

## Guided sessions, conversation and recall

Open **My study session** (`#today`) and choose **5, 15 or 60 minutes**. The hour keeps the original 10/20/5/15/10-minute plan. The 15-minute version uses 3/5/1/4/2 minutes. The 5-minute version is a 1-minute recall/diagnostic, 3-minute practical and 1-minute check pass, prioritising a due topic; it does not claim a whole topic is learned. Longer sessions select the next unreviewed topic in original course order, including source-version checks. Every step advances deliberately; the selected duration and exact step survive reload. An unfinished session is resumed before another can be started.

**Talk through the experiment** gives written feedback on the learner's explanation or question. It uses prepared teaching material, term matching and checks for a limited set of common misconceptions, including confusing a missing carrier with missing modulation. It is an offline guided dialogue, not unrestricted language understanding. It never marks arbitrary prose as correct. Conversation text stays on this device.

**Try a new practical task** (`#practice/Topics/Batteries`, for example) provides numerical or model-control tasks for all 86 topics / 42 models. Choose worked example, guided or independent practice. Numerical givens vary; action tasks check the requested state or outcome. Checked answers are locked and a fresh version is a separate attempt. Independent tasks withhold coaching until submission; opening the lesson makes that attempt supported. Examples and guided tasks do not count as independent recall. Related topics share finite model tasks, so this does not establish full syllabus mastery.

Marked examination answers and independent tasks feed the separate recall schedule. Missed ideas return after 10 minutes; guesses and partly confident correct answers return after one day. Confident successes spaced by at least 18 hours can advance through 1/3/7/14-day intervals. Immediate repeats do not advance the spaced-success count. These are initial scheduling rules, not a validated personalised forgetting model. Due-review actions open independent mode with a fresh task when necessary.

The new learning data uses `radio-lab-learning-v1`, separate from lesson and assessment storage. Corrupt records are preserved without being overwritten. A failed save is shown immediately. No learning state is uploaded. See [LEARNING.md](docs/LEARNING.md) for the evidence boundaries and sources.

## Focus, reference practice and portable progress

The **Focus mode** button appears above every screen. In a lesson it hides the course rail and presents one chosen panel: Experiment, Explanation, Check or Discussion. The original material remains reachable in Explanation; source-correction and explain-basics actions reveal it before moving keyboard focus. Reference-only notes show their text directly. Focus settings are saved locally and can be turned off at any time.

**EX307 reference** (`#reference-book`) presents the locally saved four-page booklet as searchable HTML tables, notes and sections. It retains all 72 table rows, 26 general/numbered notes, two additional licence-note blocks and the original conversion chart. Desktop tables become labelled row cards on a phone. Every section links to its original local PDF page; the unchanged PDF can also be downloaded. The edition, download date and source SHA-256 are visible. Page text is retained separately for verification; the original PDF preserves all artwork and layout. Search accepts normal decimal points where the original prints middle dots.

**EX307 trainer** (`#reference`) has six authored reading exercises covering frequency rows, power numbers and references, a geographic exclusion, calling-channel notes, bandwidth and allocation use. Guided mode highlights the relevant column of a small paraphrased row aid and walks through lookup steps. Independent mode hides row aids, hints and answer-bearing source titles until checking. Reader links open the selected page; PDF links and inline viewing use the same local original. Once imported, the reader, chart, PDF and trainer need no external connection while the local server is running. The publisher link and downloading/updating the source still require internet. Written reasoning stays private and ungraded. Repeated exercises are not evidence of unseen exam readiness.

**Backup & feedback** (`#tools`) downloads saved progress from all four storage records: lessons, assessment, learning and study tools. It includes current sessions, checked answers, schedules, preferences and reference results, but no imported lesson bodies. Private conversations, reflections, pilot notes, report notes and typed text controls are excluded unless selected; numeric answers are kept. Omitting a text-control exercise answer resets that exercise rather than preserving a false solved state.

To restore, choose a JSON backup up to 5 MB, review the counts and source-change warnings, then explicitly confirm replacement. Files with incompatible schemas/bank versions, unknown topics or invalid controls are rejected before restore writes. The current raw records download as a private safety copy before replacement. Write failures trigger rollback of all four records; if browser storage prevents rollback, the affected keys and recovery requirement are reported. A raw recovery file preserves malformed records for diagnosis and is deliberately not accepted as an unchecked normal import. Private exports should stay under your control. Existing corruption is not silently skipped by export.

**This is unclear** records the resolved topic, visible control settings, prompt and the selected kind of obstacle at the moment it is reported. An optional note stays local. Feedback downloads are previewable and omit notes and typed text controls by default; including private text is an explicit choice. No report is sent automatically. These tools use `radio-lab-tools-v1`, with bounded records and corruption-preserving validation.

## Review before sharing

Open **Review before sharing** (`#pilot`) for specific source-claim corrections, a self-contained instructor review download, and local pre/post/delayed/official-paper observations. The review pack contains authored explanations, original question keys and sample task solutions; it omits private conversations and imported note bodies. The pilot scores download omits all private text. Neither download is sent automatically.

The [content audit](docs/CONTENT_AUDIT.md) cross-checks imported claims against authoritative sources while preserving the original material. It is not a completed human instructor sign-off. [PILOT_PROTOCOL.md](docs/PILOT_PROTOCOL.md) supplies the procedure for actual participants; human review and empirical learner validation remain pending. A previously unseen official RSGB paper is separate from app-bank familiarity.

## Check understanding and rehearse the exam

Open **Knowledge checks & mock exam** in the course rail, or **Start topic check** after a lesson. The original bank has 177 four-option questions, at least two for every ordered topic, with diagrams, calculations, application questions and EX307 lookups. Topic and module practice show the key and explanation after checking an answer. A checked response is locked for that attempt; missed questions can be attempted again separately.

The full mock follows the verified RSGB Foundation format: 26 English questions, 60 minutes and a 19/26 pass benchmark. Section allocation is licensing 6, technical 3, transmitters/receivers 3, feeders/antennas 3, propagation 2, EMC 3, operating 3 and safety 3. Questions and answer positions are shuffled. Flags, answer changes, a question overview, a submission review and the permitted EX307 reference link are available. Marking, explanations and lesson links appear after submission. Untimed rehearsal uses the same allocation.

Timed deadlines and answers survive reloads; unanswered questions score zero. An unfinished paper is retained when another check is requested. Results show section scores and lead back to the relevant lessons. Assessment data uses a separate browser-storage key and preserves earlier lesson progress. Corrupt or incompatible saved assessment data is not silently overwritten; a failed write is reported immediately.

Format and references were checked on 26 October 2026 against [RSGB v1.6b, March 2026](https://rsgb.services/public/exams/specifications/260305_Syllabus_2024_v1.6b.pdf), [EX307, January 2026](https://rsgb.services/public/exams/exam-forms/260122_EX307_Foundation_v1.pdf) and the [official April 2026 mock papers](https://rsgb.org/main/clubs-training/training-resources/mock-exams/). Official papers remain linked to RSGB. The in-app questions are original independent practice material, not an official or confidential question bank. Difficulty and real-exam predictive validity have not been empirically validated; repeat-bank familiarity can inflate scores.

The course contains 86 ordered topics. The public edition includes86original lessons and an authored glossary. A compatible personal import additionally preserves complete resources, supplemental notes, module hubs and other source documents. Instruction files are excluded. `data/coverage.json` records every imported filename, source hash and section count. A missing module link or a content-splitting discrepancy fails the import.

Re-run the import after changing the source notes. A changed source hash requires a fresh review while keeping the learner’s written reflection. Replacing an experiment keeps section progress and written reflections but requires trying the new controls. Progress is stored only in this browser on this device; clearing browser storage removes it. A corrupt saved record is not overwritten automatically.

## Project layout

| Path | Responsibility |
|---|---|
| `scripts/import-course.mjs` | Preserve source information, build module order, report coverage |
| `src/app.js`, `src/styles.css` | Topic navigation, source sections, reflection and accessible controls |
| `src/activities.js`, `src/physics.js` | Visual workbenches, model boundaries and checked calculations |
| `src/scenarios.js` | All 86 everyday situations, visual focuses, actions and transfer prompts |
| `src/teaching.js`, `docs/RADIO_TEACHER_PROMPT.md` | Detailed guided explanations, control-state causes and teaching standard |
| `src/question-bank.js`, `src/question-diagrams.js`, `src/exam-spec.js` | Original questions, neutral assessment diagrams and sourced exam format |
| `src/assessment.js`, `src/assessment-ui.js` | Marking, mock allocation, timers, assessment storage and practice UI |
| `src/progress.js` | Resume, source-version changes and self-reported review |
| `src/learning.js`, `src/learning-ui.js`, `src/coach.js` | Resumable sessions, recall schedule, local dialogue and review/pilot tools |
| `src/challenges.js`, `src/content-notes.js` | Checked transfer tasks and sourced corrections to specific imported claims |
| `src/backup.js`, `src/study-tools.js`, `src/study-tools-ui.js` | Validated progress backup/restore, focus preferences and contextual feedback |
| `src/reference-trainer.js` | Sourced EX307 reading exercises and explicit-answer marking |
| `scripts/import-reference.mjs`, `src/reference-reader.js` | Pinned-source PDF extraction, complete reference data and local readable viewer |
| `test/`, `docs/PROJECT.md` | Automated checks and product scope |

## Limits and sharing

Related topics reuse appropriate models with specific context, initial settings and visual focus. Each experiment illustrates a selected concept; full source sections remain necessary for the complete topic. Questions are marked automatically, while written reflections are not. Reviewed, a correct practice answer and a practice pass are distinct records; none is a validated guarantee of exam readiness.

Imported notes are preserved rather than silently corrected. Some contain dated licence guidance, incomplete image/video references or mistakes. Use current RSGB/Ofcom sources for current conditions. The authored circuit/waveform models state their assumptions; qualitative scenes are not radio-coverage, safety or compliance predictions.

`public/course.json` and `public/reference/` are private local assets ignored by Git. **A local Vite production build copies them into `dist/`.** The Docker build deliberately excludes them and ships only authored public lessons. Optional mounts can serve your local imported files. Keep personal imports, downloaded third-party material and browser exports out of public commits/images. The app sends no learning records to a server and uses no remote tutor API.
