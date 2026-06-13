# Legacyskool Roadmap

The five **core pillars** (shipped, prioritised in this order):

1. **CBT & exam simulation** — internal exams + JAMB/NECO/WAEC mocks via the ALOC question bank.
2. **Attendance & student organisation** — daily attendance, classes, enrolments.
3. **Digital CA, tests & results** — continuous assessment, term reports, QR-verifiable result slips.
4. **Online payments** — invoicing, Paystack checkout, offline payment recording with proof.
5. **AI for teachers, students & operations** — lesson-note generator, AI tutor, AI grading assists.

---

## Full Attendance System (future releases)

The current daily class-roll attendance is phase 1. Below is the planned roadmap to a complete attendance ecosystem.

### Phase 2 — Excuse & justification workflow
- Parents submit absence excuses with notes / attachments via the parent portal.
- Admin or class teacher approves / rejects; status flips from `absent` → `excused`.
- Excuse history stored per student for term-end reporting.

### Phase 3 — Per-period attendance
- Secondary schools can mark attendance per subject period instead of once per day.
- Configurable at school level: `daily` vs `period` mode.
- Timetable integration auto-populates the period list for each class.

### Phase 4 — Biometric / QR / RFID check-in
- Classroom kiosk or tablet with QR-code scan (student ID card / app).
- Optional fingerprint capture for high-stakes exam halls.
- Offline queue that syncs when connectivity returns.

### Phase 5 — Automated parent alerts
- AI-digested low-attendance triggers (e.g. 3 consecutive absents or rate < 70%).
- Push in-app notification + SMS / WhatsApp via the messaging gateway.
- Configurable thresholds per school in AI Settings.

### Phase 6 — Analytics & truancy insights
- Truancy heat-maps: days of week, subjects, and time-of-day patterns.
- Cohort comparisons across classes and arms.
- Attendance summary auto-printed on term result slips.

---

## Coming later (deferred, not yet scoped)

- **Biometric attendance** — fingerprint / face capture integration with classroom devices.
- **Native mobile apps** — iOS + Android shells over the existing PWA.
- **Advanced analytics** — cohort tracking, predictive performance models, principal dashboards.
- **Public APIs & webhooks** — for state ministries, exam bodies and third-party EdTech tools.
- **Multi-currency & multi-language** — beyond NGN and English.

These are intentionally out of scope until the five pillars are rock-solid at scale.