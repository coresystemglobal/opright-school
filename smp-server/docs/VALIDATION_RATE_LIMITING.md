# Validation & Rate Limiting Implementation

## Overview
Added centralized input validation using Zod and rate limiting using express-rate-limit to secure the application.

## Files Created

### 1. `/src/middleware/validate.ts`
Reusable validation middleware that accepts Zod schemas and validates request bodies.

### 2. `/src/utils/schemas.ts`
Common validation schemas for:
- Authentication (login, register)
- Students, Teachers
- Grades, Attendance
- Notices, Payments

### 3. `/src/middleware/rateLimiter.ts`
Three rate limiting configurations:
- `authLimiter`: 5 requests per 15 minutes (for login/register)
- `apiLimiter`: 100 requests per 15 minutes (general API)
- `strictLimiter`: 10 requests per 15 minutes (bulk operations)

## Routes Updated

### Authentication (`/routes/auth.ts`)
- POST `/login` - authLimiter + loginSchema
- POST `/register` - authLimiter + registerSchema

### Classes (`/routes/classes.ts`)
- POST `/` - apiLimiter + classSchema
- POST `/:classId/enroll` - apiLimiter + enrollSchema

### Attendance (`/routes/attendance.ts`)
- POST `/` - apiLimiter + attendanceSchema

### Payments (`/routes/payments.ts`)
- POST `/fees` - apiLimiter + feeSchema
- POST `/` - apiLimiter + paymentCreateSchema

### Gradebook (`/routes/gradebook.ts`)
- POST `/assignments` - apiLimiter
- POST `/grades` - apiLimiter
- POST `/grades/bulk` - strictLimiter
- POST `/examinations` - apiLimiter
- POST `/exam-results` - apiLimiter

### Global (`/src/app.ts`)
- Added `apiLimiter` as global middleware (100 req/15min)

## Usage

### Adding Validation to New Routes
```typescript
import { validate } from '../middleware/validate';
import { z } from 'zod';

const mySchema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});

router.post('/', validate(mySchema), async (req, res, next) => {
  // req.body is now validated and typed
});
```

### Adding Rate Limiting
```typescript
import { apiLimiter, authLimiter, strictLimiter } from '../middleware/rateLimiter';

router.post('/sensitive', authLimiter, handler);
router.post('/normal', apiLimiter, handler);
router.post('/bulk', strictLimiter, handler);
```

## Benefits
- ✅ Prevents invalid data from reaching controllers
- ✅ Protects against brute force attacks
- ✅ Prevents API abuse
- ✅ Consistent error responses via global error handler
- ✅ Type-safe request bodies with Zod
