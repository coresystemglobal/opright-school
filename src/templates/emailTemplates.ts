import fs from 'fs';
import path from 'path';

// ─── Template variable shapes ────────────────────────────────────────────────

export interface OnboardingTemplateVars {
  firstName: string;
  lastName: string;
  email: string;
  schoolName: string;
  schoolCode: string;
  role: string;
  tempPassword: string;
  loginUrl: string;
  year: number;
}

export interface StudentResultTemplateVars {
  parentName: string;
  parentEmail: string;
  studentName: string;
  studentCode: string;
  className: string;
  termName: string;
  academicYear: string;
  averageScore: number;
  position: number;
  totalStudents: number;
  overallGrade: string;
  gradeRemark: string;
  teacherRemark: string;
  reportUrl: string;
  subjects: SubjectResultItem[];
  year: number;
}

export interface SubjectResultItem {
  name: string;
  score: number;
  maxScore: number;
  grade: string;
  /** Lowercase grade letter, e.g. "a", "b" — used for CSS class `grade-{gradeLower}` */
  gradeLower: string;
}

export interface PaymentReceiptTemplateVars {
  payerName: string;
  studentName: string;
  className: string;
  receiptNumber: string;
  paymentDate: string;
  paymentMethod: string;
  termName: string;
  totalAmount: string;
  items: PaymentLineItem[];
  portalUrl: string;
  schoolName: string;
  schoolAddress: string;
  year: number;
}

export interface PaymentLineItem {
  description: string;
  amount: string;
}

export interface SchoolEventTemplateVars {
  recipientName: string;
  schoolName: string;
  schoolEmail: string;
  eventTitle: string;
  eventCategory: string;
  eventDate: string;
  eventDay: string;
  startTime: string;
  endTime: string;
  venue: string;
  venueDetail: string;
  audienceSummary: string;
  eventDescription: string;
  targetAudience: string[];
  eventUrl: string;
  year: number;
}

export interface AttendanceAlertTemplateVars {
  parentName: string;
  studentName: string;
  studentCode: string;
  className: string;
  attendanceDate: string;
  statusLabel: string;
  alertTitle: string;
  alertMessage: string;
  isLate: boolean;
  remarks?: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  // attendanceRate is derived automatically in buildEmail — do not pass it
  portalUrl: string;
  schoolName: string;
  schoolEmail: string;
  year: number;
}

interface AdmissionDecisionBaseVars {
  parentName: string;
  candidateName: string;
  schoolName: string;
  schoolEmail: string;
  academicYear: string;
  year: number;
}

export type AdmissionDecisionTemplateVars =
  | (AdmissionDecisionBaseVars & {
      isAdmitted: true;
      studentCode: string;
      className: string;
      resumptionDate: string;
      acceptanceFee: string;
      paymentDeadlineDays: number;
      portalUrl: string;
    })
  | (AdmissionDecisionBaseVars & { isAdmitted: false });

// ─── Discriminated union ─────────────────────────────────────────────────────

export type EmailTemplateType =
  | 'onboarding'
  | 'student-result'
  | 'payment-receipt'
  | 'school-event'
  | 'attendance-alert'
  | 'admission-decision';

export type EmailTemplateVars =
  | ({ type: 'onboarding' } & OnboardingTemplateVars)
  | ({ type: 'student-result' } & StudentResultTemplateVars)
  | ({ type: 'payment-receipt' } & PaymentReceiptTemplateVars)
  | ({ type: 'school-event' } & SchoolEventTemplateVars)
  | ({ type: 'attendance-alert' } & AttendanceAlertTemplateVars)
  | ({ type: 'admission-decision' } & AdmissionDecisionTemplateVars);

// ─── Template engine ─────────────────────────────────────────────────────────

const TEMPLATES_DIR = path.join(__dirname, 'emails');

/**
 * Renders an HTML email template by replacing {{variable}} placeholders.
 * Supports:
 *   - {{variable}}            → scalar value
 *   - {{#each array}}...{{/each}} → repeated block ({{this.field}})
 *   - {{#if flag}}...{{/if}} → conditional block
 *
 * Internal — callers outside this module should use `buildEmail` instead.
 */
function renderTemplate(templateName: EmailTemplateType, vars: Record<string, unknown>): string {
  const filePath = path.join(TEMPLATES_DIR, `${templateName}.html`);
  let html = fs.readFileSync(filePath, 'utf-8');
  html = renderEach(html, vars);
  html = renderIf(html, vars);
  html = renderScalars(html, vars);
  return html;
}

function renderScalars(html: string, vars: Record<string, unknown>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

function renderEach(html: string, vars: Record<string, unknown>): string {
  return html.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, key, block) => {
    const arr = vars[key];
    if (!Array.isArray(arr)) return '';
    return arr
      .map((item) =>
        block.replace(/\{\{this\.(\w+)\}\}/g, (_m: string, field: string) => {
          const v = (item as Record<string, unknown>)[field];
          return v !== undefined && v !== null ? String(v) : '';
        })
      )
      .join('');
  });
}

function renderIf(html: string, vars: Record<string, unknown>): string {
  return html.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, block) => {
    return vars[key] ? block : '';
  });
}

/**
 * Builds a ready-to-send email payload from typed template vars.
 * The discriminant `type` field is stripped before rendering.
 */
export function buildEmail(vars: EmailTemplateVars): { subject: string; html: string } {
  const { type, ...rest } = vars;
  const flatVars = rest as Record<string, unknown>;

  // Derive computed fields so callers don't supply them and risk drift
  if (vars.type === 'attendance-alert') {
    flatVars.statusLower = vars.isLate ? 'late' : 'absent';
    flatVars.attendanceRate = vars.totalDays > 0
      ? Math.round((vars.presentDays / vars.totalDays) * 100)
      : 0;
  }

  if (process.env.NODE_ENV !== 'production') {
    for (const [key, val] of Object.entries(flatVars)) {
      if (val === undefined || val === null) {
        console.warn(`[buildEmail] Missing value for template key "${key}" in "${type}" template`);
      }
    }
  }

  const html = renderTemplate(type, flatVars);
  const subject = getSubject(vars);
  return { subject, html };
}

function getSubject(vars: EmailTemplateVars): string {
  switch (vars.type) {
    case 'onboarding':
      return `Welcome to ${vars.schoolName} – Your account is ready`;
    case 'student-result':
      return `${vars.termName} Results – ${vars.studentName} (${vars.academicYear})`;
    case 'payment-receipt':
      return `Payment Receipt ${vars.receiptNumber} – ${vars.schoolName}`;
    case 'school-event':
      return `${vars.schoolName}: ${vars.eventTitle}`;
    case 'attendance-alert':
      return `Attendance Alert – ${vars.studentName} was ${vars.statusLabel} on ${vars.attendanceDate}`;
    case 'admission-decision':
      return vars.isAdmitted
        ? `Congratulations! ${vars.candidateName} has been admitted to ${vars.schoolName}`
        : `${vars.schoolName} – Admission Decision for ${vars.candidateName}`;
  }
}
