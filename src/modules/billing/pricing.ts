const RATE_STANDARD = 500;     // ₦500/student for ≤1,000 students
const RATE_VOLUME = 400;       // ₦400/student for >1,000 (applies to full count)
const MIN_FLOOR = 50_000;      // ₦50,000 minimum per term
const SESSION_DISCOUNT = 0.15; // 15% off for per_session billing cycle

export interface TermCharge {
  studentCount: number;
  ratePerStudent: number;
  baseAmount: number;
  discountedAmount: number;
  billingCycle: 'per_term' | 'per_session';
}

export interface PricingComparison {
  studentCount: number;
  ratePerStudent: number;
  termAmount: number;
  sessionAmount: number;
}

export function calculatePrice(studentCount: number): number {
  const rate = studentCount > 1000 ? RATE_VOLUME : RATE_STANDARD;
  return Math.max(studentCount * rate, MIN_FLOOR);
}

export function calculateTermCharge(
  studentCount: number,
  billingCycle: 'per_term' | 'per_session',
): TermCharge {
  const baseAmount = calculatePrice(studentCount);
  const ratePerStudent = studentCount > 1000 ? RATE_VOLUME : RATE_STANDARD;
  const discountedAmount =
    billingCycle === 'per_session'
      ? Math.round(baseAmount * (1 - SESSION_DISCOUNT))
      : baseAmount;

  return { studentCount, ratePerStudent, baseAmount, discountedAmount, billingCycle };
}

const COMPARISON_SIZES = [50, 100, 250, 500, 750, 1000, 1500, 2000, 3000];

export function getPricingComparison(): PricingComparison[] {
  return COMPARISON_SIZES.map((studentCount) => {
    const baseAmount = calculatePrice(studentCount);
    const ratePerStudent = studentCount > 1000 ? RATE_VOLUME : RATE_STANDARD;
    return {
      studentCount,
      ratePerStudent,
      termAmount: baseAmount,
      sessionAmount: Math.round(baseAmount * (1 - SESSION_DISCOUNT)),
    };
  });
}
