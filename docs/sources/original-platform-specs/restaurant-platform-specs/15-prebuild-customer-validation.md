# Pre-Build Customer Validation & First Restaurant Pilot

## 1. Objective

Secure the first design partner/customer **before building the whole platform**. Validate the problem, UI, data access and willingness to pay with realistic workflows. Use a concierge/manual backend where it is safe and clearly communicated.

## 2. Recruitment plan

Partner recruits 3–5 restaurants spanning relevant workflows. Prefer restaurants where partner already has trust and direct access to the owner/manager. Record POS used (version/plan), branches, current ordering channel, event/catering volume, loyalty process, payment provider and staff responsibilities.

Do not interview only friends who praise the idea. Ask for concrete recent examples and artifacts with permission: anonymized order reports, current menu, quote template, campaign process and how long tasks take.

## 3. Interview guide

Ask, don't pitch first:
1. Tell me about the last time online/pickup orders or event quotations created an operational problem.
2. What happens today, step by step? Who touches it and how long does each step take?
3. What errors/costs/revenue loss occurred in the last month?
4. What tools/POS/payment/messaging service do you already pay for?
5. What have you tried? Why did it fail or succeed?
6. Which part must be solved for you to pay? Which features are nice-to-have?
7. Who decides and what budget/source would pay?
8. What data/API access can you grant and what permissions/approval are needed?
9. If we delivered only this workflow in 2–4 weeks, what result would make it worth continuing?

Avoid asking “Do you like this idea?” as the main validation question.

## 4. Prototype screens to make before code

Create a clickable design prototype in Figma (or equivalent) for the selected wedge plus shared shell:
- Business setup and branch details.
- Module-selection page showing price/prerequisites.
- Module-specific customer journey (order or catering quote or loyalty enrolment).
- Owner dashboard with setup checklist, status and error recovery.
- Integration connection/setup page with capability state.
- Empty, success, failure, loading and disconnected states.
- Staff/kitchen flow if part of chosen workflow.

Prototype the “physical menu/no QR” case explicitly: pickup link, WhatsApp link, POS/CRM data acquisition and catering must still work.

## 5. Prototype feedback test

Give each owner/staff user tasks without explaining where to click. Observe completion, hesitation and mistaken assumptions. Ask what they'd remove, what is a blocker, what they'd pay for and what they'd expect to connect to their POS. Capture priority as:
- `MUST_BUY`: explicitly blocks purchase;
- `CORE_VALUE`: materially improves outcome;
- `LATER`: nice-to-have;
- `NOT_NEEDED`: user rejects/unneeded;
- `UNKNOWN`: insufficient evidence.

Do not treat a feature mentioned by one participant as a universal requirement.

## 6. Pilot agreement checklist

A lightweight written pilot agreement should define:
- chosen module/workflow and exclusions;
- success metric and baseline;
- restaurant owner and operational champion;
- start/end dates and whether paid/discounted;
- data access and provider authorizations;
- who handles support and staff training;
- manual work that founders will do during pilot;
- data retention/export and privacy notice;
- what happens if provider integration is blocked;
- permission for case study/testimonial, separate from service agreement.

## 7. Concierge pilot options

Depending on workflow, founders can manually:
- import menu CSV and check product mapping;
- enter catering package rules and inspect generated quote;
- reconcile POS export daily rather than integrate first;
- manually trigger customer win-back list after consent review;
- watch test orders and manually confirm external POS submission;
- use payment-at-pickup rather than online checkout if acceptable.

Do not manually fake payment status, bypass consent, store raw card data or claim a POS action occurred if it did not. Manual operations should produce a log of every intervention and time spent.

## 8. Pilot success and stop conditions

Success is an observable improvement, not “the UI looks good.” Example metrics: time to produce/send a quote, staff interventions per order, orders successfully fulfilled, fewer duplicate/manual entries, repeat purchase attributed to campaign. Agree exact metric with owner.

Stop/pivot if:
- no owner will commit time/data/access;
- nobody identifies meaningful willingness to pay;
- integration blocks the only desired value and no manual fallback is acceptable;
- custom setup/support per restaurant is too high to repeat;
- product increases operational risk in restaurant peak hours.

## 9. Conversion to paid production

At pilot end, present baseline vs result, costs/support effort, remaining gaps and specific paid tier proposal. Ask for a paid continuation/letter of intent before adding advanced automation. Use the owner's requested next module as a second-module validation test.
