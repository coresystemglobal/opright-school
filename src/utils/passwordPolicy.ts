import { z } from "zod";

export const PASSWORD_COMPLEXITY_MESSAGE =
  "Password must include uppercase, lowercase, number, and special character";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(30, "Password must be 30 characters or fewer")
  .refine(
    (value) =>
      /[a-z]/.test(value) &&
      /[A-Z]/.test(value) &&
      /\d/.test(value) &&
      /[^A-Za-z0-9]/.test(value),
    PASSWORD_COMPLEXITY_MESSAGE
  );
