# SchoolOS — Data Processing Addendum (DPA)

**Last updated: 14 June 2026**

> ⚠️ **Template — requires legal review before use.** Replace every `[PLACEHOLDER]`.
> This DPA is designed for the **Nigeria Data Protection Act 2023 (NDPA)**; if you
> process EU/UK personal data, add the GDPR/UK-GDPR terms and Standard Contractual
> Clauses as advised by counsel.

This Data Processing Addendum ("**DPA**") forms part of the
[Terms of Service](./TERMS_OF_SERVICE.md) between `[COMPANY LEGAL NAME]`
("**SchoolOS**", "**Processor**") and the **School** ("**Controller**") that uses the
SchoolOS platform (the "**Platform**"). It governs SchoolOS's processing of personal
data on the School's behalf.

If there is a conflict between this DPA and the Terms on data-protection matters, this
DPA prevails.

---

## 1. Roles

1.1. The **School is the data controller** and **SchoolOS is the data processor** for
personal data the School and its Users submit to the Platform ("**School Personal
Data**").

1.2. For data SchoolOS processes for its own business purposes (e.g. School account
administration, billing, security), SchoolOS is an independent controller under the
[Privacy Policy](./PRIVACY_POLICY.md).

---

## 2. Subject-matter, duration, nature & purpose

| Item | Detail |
|---|---|
| **Subject-matter** | Provision of the Platform's school-management and fee-collection services. |
| **Duration** | For the term of the School's Subscription, plus deletion/return periods in §9. |
| **Nature & purpose** | Hosting, storing, organising, displaying, transmitting, and otherwise processing School Personal Data to provide the Platform on the School's instructions. |

---

## 3. Categories of data subjects & data

**Data subjects:** students (minors), parents/guardians, teachers, principals, staff,
and administrators.

**Categories of personal data may include:** names, contact details, login
credentials (hashed passwords, student codes), dates of birth, class/enrolment,
attendance, grades and examination results, e-learning activity, library/transport/
hostel/inventory/event/sports records, disciplinary records, **health records**
(sensitive), fee assignments, invoices, payment status, and ledger data. **Full card
data is processed by the Payment Processor, not stored by SchoolOS.**

**Special-category / sensitive data:** health and disciplinary records, and children's
data, where the School chooses to store them.

---

## 4. Processor obligations

SchoolOS will:

4.1. **Process on instructions.** Process School Personal Data only on the School's
documented instructions (including via the Platform's configuration), unless required
by law (in which case we will inform the School where lawfully permitted).

4.2. **Confidentiality.** Ensure persons authorised to process the data are bound by
confidentiality.

4.3. **Security.** Implement appropriate technical and organisational measures (see
§5).

4.4. **Sub-processors.** Use sub-processors only under §6.

4.5. **Assist the controller.** Taking into account the nature of processing,
reasonably assist the School with: responding to data-subject rights requests; security;
breach notification; and data-protection impact assessments.

4.6. **Breach notification.** Notify the School **without undue delay** (and in any
event within `[72 hours]`) after becoming aware of a personal-data breach affecting
School Personal Data, with available details.

4.7. **Deletion/return.** At the end of services, delete or return School Personal Data
per §9.

4.8. **Demonstrate compliance.** Make available information reasonably necessary to
demonstrate compliance, and allow for audits per §8.

---

## 5. Security measures

SchoolOS maintains measures including, as applicable:

- **Multi-tenant isolation** with row-level security so one School cannot access
  another's data.
- **Encryption** of passwords (hashing), data in transit, and designated sensitive
  fields; a managed application encryption key.
- **Role-based access control** and least-privilege internal access.
- **Audit logging** of significant actions.
- **Payment-data safeguards**, including an out-of-band approval workflow for
  settlement bank-detail changes and non-exposure of Payment-Processor sub-account
  codes to School administrators.
- **Backups**, monitoring, and rate limiting.

The School is responsible for security within its own control — e.g. managing its
Users' roles and access, and keeping credentials secure.

---

## 6. Sub-processors

6.1. The School authorises SchoolOS to engage sub-processors to provide the Platform.
Current categories include:

| Sub-processor category | Purpose |
|---|---|
| Cloud hosting & database | Running the Platform and storing data |
| Payment Processor (**Paystack**) | Processing payments and remitting funds |
| Email / notification provider | Transactional emails and notifications |
| Object storage / CDN | File uploads and downloads |
| `[OTHER, e.g. live-class provider]` | `[purpose]` |

6.2. A current list of named sub-processors is available on request at `[PRIVACY EMAIL]`.

6.3. SchoolOS imposes data-protection obligations on sub-processors no less protective
than this DPA, and remains responsible for their performance.

6.4. SchoolOS will give the School `[reasonable]` notice of any new sub-processor; the
School may object on reasonable data-protection grounds, and the parties will work in
good faith to address the concern.

---

## 7. International transfers

Where School Personal Data is transferred outside `[COUNTRY — default: Nigeria]`,
SchoolOS will ensure a lawful transfer mechanism and adequate safeguards consistent
with the NDPA (and, where applicable, GDPR/UK-GDPR).

---

## 8. Audits

SchoolOS will, on reasonable prior written notice and no more than `[once per year]`
(or following a breach), make available compliance information and, where reasonably
required, allow an audit by the School or its mandated auditor, subject to
confidentiality and minimising disruption. Third-party certifications/reports may be
provided to satisfy audit requests where available.

---

## 9. Return & deletion

9.1. On termination or expiry, SchoolOS will, at the School's choice, **return** or
**delete** School Personal Data, and delete existing copies, except where retention is
required by law (e.g. financial/ledger records).

9.2. SchoolOS will make data available for **export for `[30] days`** after
termination, then delete or anonymise it, subject to §9.1.

---

## 10. Data-subject requests

If SchoolOS receives a request from a data subject relating to School Personal Data, it
will refer the request to the School and assist the School in responding, rather than
responding directly (unless legally required).

---

## 11. Liability & order of precedence

11.1. Liability under this DPA is subject to the limitations in the
[Terms of Service](./TERMS_OF_SERVICE.md).

11.2. This DPA is incorporated into and governed by the Terms, including their
governing-law and dispute provisions.

---

## 12. Signatures / acceptance

This DPA is accepted when the School accepts the Terms of Service, or on separate
signature where required.

**Processor:** `[COMPANY LEGAL NAME]` — `[DPO NAME & CONTACT]`
**Controller (School):** accepted via Platform onboarding / `[authorised signatory]`

_Related: [Privacy Policy](./PRIVACY_POLICY.md) · [Terms of Service](./TERMS_OF_SERVICE.md)_
