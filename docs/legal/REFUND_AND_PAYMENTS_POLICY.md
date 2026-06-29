# SchoolOS — Refund & Payments Policy

**Last updated: 14 June 2026**

> ⚠️ **Template — requires legal review before use.** Replace every `[PLACEHOLDER]`.
> This Policy describes how online fee collection works on SchoolOS and the rules for
> refunds and chargebacks. It forms part of the [Terms of Service](./TERMS_OF_SERVICE.md).

---

## 1. Who is who

| Party | Role |
|---|---|
| **Parent / Payer** | The person paying a Fee for a student. |
| **School** | The institution charging the Fee. **The School is the merchant of record** for Fees and the party providing the underlying educational service. |
| **SchoolOS** | The technology provider that facilitates collection. **SchoolOS is not the merchant of record for School Fees.** |
| **Payment Processor** | **Paystack**, the licensed processor that handles the actual money movement. |

**Key point:** because the School is the merchant of record, **refund decisions for
Fees are made by the School**, not by SchoolOS. SchoolOS provides the tools to process
approved refunds.

---

## 2. How online payments work

1. The School configures **fee templates** and assigns Fees to students.
2. The Parent opens a Fee and chooses to pay. SchoolOS, via the Payment Processor,
   generates a **bank-transfer virtual account** (or other supported channel) for that
   specific payment.
3. The Parent transfers the amount. The Payment Processor confirms the payment to
   SchoolOS via a secure webhook.
4. SchoolOS records the payment, updates the Fee status (e.g. **partial** or **paid**),
   and writes a **ledger** entry with three components:
   - **Gross** — the amount paid;
   - **Commission** — SchoolOS's service charge (a percentage configured for the School);
   - **Net remittance** — the remainder routed to the School's Payment-Processor sub-account.
5. Funds settle to the School's sub-account according to the Payment Processor's
   settlement schedule.

### Installments
Where a School enables installments on a Fee, a Parent may pay in parts, subject to any
**minimum installment percentage** the School sets. The Fee is marked **paid** once the
total is covered.

### Currency
All Fees are processed in **Nigerian Naira (₦)** unless the School configures otherwise.

---

## 3. Commission

3.1. SchoolOS retains a **Commission** on each successfully collected Fee, at the rate
agreed with the School (a percentage of the gross amount).

3.2. Commission is shown transparently in the School's ledger for every transaction.

3.3. Commission is **earned at the point of successful collection.** See §6 for how
Commission is treated when a Fee is refunded.

---

## 4. Settlement bank account & security

4.1. A School provides its settlement bank details during onboarding; we verify them
through the Payment Processor and create a dedicated sub-account.

4.2. **Bank details cannot be changed unilaterally by a School administrator.** A change
must be submitted as a **bank-account change request**, which is **reviewed and
approved by the SchoolOS platform operator** before taking effect. All of the School's
administrators are notified when a change is requested. This protects Schools against
fraudulent diversion of funds.

---

## 5. Refunds (Fees collected for Schools)

5.1. **Refund authority.** The School decides whether a Fee payment is refundable,
based on the School's own refund rules and applicable law. A Parent seeking a refund
should contact the **School** in the first instance.

5.2. **School refund policy.** Each School should publish its own refund terms (e.g.
deadlines, non-refundable deposits, pro-rata rules). SchoolOS does not set these.

5.3. **Processing an approved refund.** Once a School authorises a refund, it is
processed back to the original payment method via the Payment Processor, subject to the
Processor's rules and timelines (typically `[5–10] business days`).

5.4. **Processor fees.** Payment-processing fees charged by the Payment Processor may
be non-refundable, depending on the Processor's terms.

---

## 6. Commission on refunded Fees

6.1. Where a Fee is fully refunded, SchoolOS will `[reverse / retain]` the associated
Commission as set out in the School's agreement. **Default:** Commission on a **fully
refunded** Fee is reversed; Commission on a **partial** refund is reduced
proportionally.

6.2. Any Commission already remitted may be reconciled against future settlements.

---

## 7. Failed, duplicate & disputed payments

7.1. **Failed/abandoned payments** create no charge; the Fee remains outstanding.

7.2. **Duplicate payments** — if a Parent is charged twice for the same Fee, contact
the School; the School can authorise a refund of the duplicate.

7.3. **Chargebacks/disputes** — if a Parent disputes a charge with their bank, the
Payment Processor's dispute process applies. The School is responsible for responding
with evidence. SchoolOS will provide the relevant transaction and ledger records.

---

## 8. Service access & overdue Fees

8.1. A School may designate certain Fees as **mandatory**. Where enabled by the School,
students with **overdue mandatory Fees** (past the due date plus any grace period) may
have **non-academic services restricted** — for example hostel assignment, meal plans,
transport assignment, library borrowing, and new course enrolment — until the Fee is
paid.

8.2. **Restoration.** When an overdue mandatory Fee is paid in full, the restriction is
lifted automatically (typically on the next processing cycle, or immediately on payment
confirmation).

8.3. These controls are configured and applied at the **School's** discretion. SchoolOS
provides the mechanism and notifies affected parents/students; it does not decide a
School's Fee or enforcement policy.

---

## 9. SchoolOS Subscription charges (School ↔ SchoolOS)

9.1. Charges a School pays **to SchoolOS** for using the Platform (subscription/plan
fees) are governed by the School's plan and the [Terms of Service](./TERMS_OF_SERVICE.md).

9.2. Unless required by law or stated otherwise in writing, Subscription charges are
**non-refundable**. If you believe you were billed in error, contact `[BILLING EMAIL]`
within `[14] days`.

---

## 10. Contact

- **Fee/refund questions about a specific student:** contact your **School**.
- **Platform/billing questions:** `[BILLING EMAIL]` · `[SUPPORT EMAIL]`

`[COMPANY LEGAL NAME]` · `[REGISTERED ADDRESS]`

_Related: [Terms of Service](./TERMS_OF_SERVICE.md) · [Privacy Policy](./PRIVACY_POLICY.md)_
