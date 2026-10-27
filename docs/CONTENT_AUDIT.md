# Imported-content audit

Checked **27 October 2026** against the imported snapshot. **Automated/source cross-check only. No independent licensed-instructor sign-off or human learner pilot has taken place.** The app is not ready to claim public-course validation.

## Scope and method

The census includes all **120 imported content notes** (17 Course-Resources, 2 Reference, 9 Modules, 92 Topics), containing 340,437 characters of body text. Every body was included in corpus-wide scans for numerical/formula claims, licence powers, supervision, international operation, encryption, exposure, safety, propagation and absolute statements. The source topics, resource summaries, glossary and module hubs were triaged; specific suspect claims were then compared with primary publications. This is targeted checking, **not an exhaustive independent verification of every sentence**.

The resulting structured register in [content-notes.js](../src/content-notes.js) contains **55 annotations across 30 notes**: 36 corrections and 19 context qualifications. Each has an exact source excerpt, a specific correction, a primary source and a check date. Multiple findings may belong to one note. A note with zero findings is not certified correct.

Imported Markdown, raw copies and section order remain unchanged. The legacy contentNotes string API is preserved; sourceAudit supplies the claim/correction/source records for the app. Tests check that excerpts still occur in the imported body, source links use approved primary domains and existing callers retain their annotations. They do not prove that a correction is scientifically or legally complete.

## Principal findings

| Area | Concrete issue | Required interpretation |
|---|---|---|
| Licence powers and bands | Blanket 25 W/all-band statements; headline Full power treated as universal; 160 m labelled HF | Read the actual licence schedule, definitions, geographical and airborne notes. 1.8 MHz is MF. |
| Qualification and supervision | Old Intermediate/Full question, time and pass figures; Foundation marked unable to supervise | Use current RSGB examination figures and Ofcom’s direct physical supervision provision. |
| Operation away from home | UK boundary treated as absolute for ships/aircraft; Full described as the only possible overseas route | Distinguish specified registered ships/aircraft in international areas from foreign territorial permission and destination authorisation. |
| Messages and encryption | Multi-person contacts confused with general reception; User Services described as the sole encryption exception | Distinguish identified nets, initial calls and the specific satellite-control/User Service provisions. |
| EMF | Wrong introduction date, overbroad public/record wording and an unsupported “likely safe” example | Use Ofcom’s actual scope, exemptions, installation information and appropriate assessment record. |
| Antenna physics | 21 MHz length error; 1:1 SWR treated as radiation efficiency; forward/reflected power ratio called SWR; patterns not tied to a plane | Keep arithmetic, matching, loss, radiation efficiency and pattern orientation separate. |
| Safety | Fuse chosen solely by rounding I=P/V; instantaneous fuse cutoff; RCBO trip diagnosed as RF; independent-earth analogy | Follow specified protection and competent electrical advice; an observation alone does not diagnose the fault. |
| Exam resources and glossary | 19/26 called 70%; M0 called Foundation; spelling/report/system-name mistakes; post-exam question challenge advice | Use the current official booklet and definitions; report suspected wrong items before submission as instructed. |

All detailed excerpts and corrections live in the structured register. These short summaries do not replace its source links.

## Primary publications checked

- [RSGB syllabus v1.6b, March 2026](https://rsgb.services/public/exams/specifications/260305_Syllabus_2024_v1.6b.pdf), including Part 1 examination structure and Foundation items 1A–1H, 2E7, 3A, 4C–4F, 5A–5C, 7A and 8A–8F.
- [RSGB EX307, January 2026](https://rsgb.services/public/exams/exam-forms/260122_EX307_Foundation_v1.pdf), especially Schedule 1 powers/notes and the specimen band plans.
- [Ofcom OFW611 licence conditions](https://www.ofcom.org.uk/siteassets/resources/documents/spectrum/emf/emf-amateur-licence-terms-and-conditions.pdf?v=386197), conditions 4, 6, 9 and licence schedules; [licensee guidance](https://www.ofcom.org.uk/siteassets/resources/documents/manage-your-licence/amateur/amateur_radio_licence_guidance_for_licensees.pdf?v=405585), supervised use and call-sign formats.
- [Ofcom EMF guidance, 9 February 2026](https://www.ofcom.org.uk/siteassets/resources/documents/spectrum/emf/guidance-emf-compliance-enforcement.pdf?v=411682), sections 2, 4, 6 and 12; [EMF FAQ](https://www.ofcom.org.uk/spectrum/electromagnetic-fields/faqs), records and licence variation.
- [TI AN058](https://www.ti.com/lit/an/swra161b/swra161b.pdf), wavelength, pattern and matching relationships; [ARRL’s end-fed half-wave design](https://www.arrl.org/end-fed-half-wave-antenna-kit), a concrete multiband counterexample; [HSE HSG150](https://www.hse.gov.uk/pubns/priced/hsg150.pdf), electrical safety; [Eaton fuse technology](https://www.eaton.com/us/en-us/products/electronic-components/topics/fuse-technology.html), time/current behaviour; [NOAA HF propagation](https://www.spaceweather.gov/impacts/hf-radio-communications); [NATO alphabet](https://www.nato.int/en/news-and-events/articles/news/2017/12/21/nato-phonetic-alphabet-codes-and-signals); [Yaesu System Fusion](https://systemfusion.yaesu.com/what-is-system-fusion/).

## What remains pending

A competent instructor must independently check the complete syllabus mapping, source annotations, teaching prose, diagrams, boundary states and all answer keys. Electrical/RF safety claims requiring specialist judgement need the appropriate specialist. Administrative costs, external service availability, hardware compatibility and current live band plans need rechecking near use; this audit does not validate every external link, video, missing image or provider marketing statement. Imported resource text sometimes refers to a different provider’s course, release schedule, donations or mock tests: those statements are not Radio Lab services.

Public distribution also needs source-by-source rights/privacy clearance. The import contains third-party course text and user-added material; preserving it privately does not establish redistribution permission. Original claims quoted in the audit need the same review. No assessment of copyright permission has been completed.

Use [PILOT_PROTOCOL.md](PILOT_PROTOCOL.md) after resolving content errors. Record instructor sign-off and actual pilot outcomes separately from automated test results. Do not claim that a small feasibility sample validates efficacy, exam prediction or a diagnosis-specific learning method.

## Private snapshot inventory

The local importer writes filenames, hashes and section counts to ignored `data/coverage.json`. That private inventory is excluded from this repository. Source annotations apply only to the corresponding personal import; the public authored course does not contain those imported claims.
