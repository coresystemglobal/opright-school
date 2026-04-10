import { z } from "zod";

function emptyToUndefined(value: unknown) {
  return value === "" || value === null || value === undefined ? undefined : value;
}

export const uuidSchema = z.string().uuid();
export const idParamSchema = z.object({ id: uuidSchema });

export const optionalUuidSchema = z.preprocess(
  emptyToUndefined,
  uuidSchema.optional()
);

export const optionalStringSchema = z.preprocess(
  emptyToUndefined,
  z.string().min(1).optional()
);

export const optionalNumberSchema = z.preprocess(
  emptyToUndefined,
  z.coerce.number().optional()
);

export const optionalDateSchema = z.preprocess(
  emptyToUndefined,
  z.coerce.date().optional()
);

export const optionalBooleanSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return value;
}, z.boolean().optional());
