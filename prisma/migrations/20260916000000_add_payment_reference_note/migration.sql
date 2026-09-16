-- Add manual-payment metadata columns to Payment.
-- IF NOT EXISTS keeps this safe on environments where the columns were
-- already applied via `prisma db push` during development.
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "reference" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "note" TEXT;
