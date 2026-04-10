import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  roleId: z.string().uuid()
});

export const studentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().transform(s => new Date(s)),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  classId: z.string().optional()
});

export const teacherSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  subjectIds: z.array(z.string()).optional()
});

export const gradeSchema = z.object({
  studentId: z.string(),
  subjectId: z.string(),
  termId: z.string(),
  score: z.number().min(0).max(100),
  remarks: z.string().optional()
});

export const attendanceSchema = z.object({
  studentId: z.string(),
  date: z.string().transform(s => new Date(s)),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'])
});

export const noticeSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  targetRoles: z.array(z.string()).optional()
});

export const paymentSchema = z.object({
  studentId: z.string(),
  amount: z.number().positive(),
  type: z.string(),
  description: z.string().optional()
});

// Student login — studentId + 6-char minimum password (no email required)
export const studentLoginSchema = z.object({
  studentId: z.string().min(6),
  password: z.string().min(6),
});

// Parent creation / update (admin-initiated)
export const parentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(8),
  studentIds: z.array(z.string().uuid()).optional(),
});

// Candidate (applicant) creation
export const candidateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.string().optional().transform(s => s ? new Date(s) : undefined),
  applicationData: z.record(z.unknown()).optional(),
});
