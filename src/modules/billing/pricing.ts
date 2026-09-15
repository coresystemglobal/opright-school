const RATE_STANDARD = 500;     // ₦500/student for the first 1,000 students
const RATE_VOLUME = 400;       // ₦400/student for each student ABOVE 1,000 (marginal)
const VOLUME_THRESHOLD = 1000; // marginal tier boundary
const MIN_FLOOR = 50_000;      // ₦50,000 minimum per term
const SESSION_DISCOUNT = 0.15; // 15% off for per_session billing cycle

/**
 * Marginal (tiered) base amount, before the minimum floor:
 * the first 1,000 students bill at ₦500 each, and only the students
 * beyond 1,000 bill at ₦400 each. This keeps the price monotonic across
 * the threshold (no cliff where 1,001 students costs less than 1,000).
 */
function marginalBaseAmount(studentCount: number): number {
  const standardTier = Math.min(studentCount, VOLUME_THRESHOLD) * RATE_STANDARD;
  const volumeTier = Math.max(studentCount - VOLUME_THRESHOLD, 0) * RATE_VOLUME;
  return standardTier + volumeTier;
}

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
  return Math.max(marginalBaseAmount(studentCount), MIN_FLOOR);
}

export function calculateTermCharge(
  studentCount: number,
  billingCycle: 'per_term' | 'per_session',
): TermCharge {
  const baseAmount = calculatePrice(studentCount);
  // Marginal rate applied to the top tier (informational).
  const ratePerStudent = studentCount > VOLUME_THRESHOLD ? RATE_VOLUME : RATE_STANDARD;
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
    const ratePerStudent = studentCount > VOLUME_THRESHOLD ? RATE_VOLUME : RATE_STANDARD;
    return {
      studentCount,
      ratePerStudent,
      termAmount: baseAmount,
      sessionAmount: Math.round(baseAmount * (1 - SESSION_DISCOUNT)),
    };
  });
}
