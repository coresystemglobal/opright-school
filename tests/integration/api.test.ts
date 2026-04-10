/**
 * API integration tests — exercises every major route group against the live DB.
 * Requires the Greenwood Academy seed to be present (npm run seed).
 *
 * Run: npx jest tests/integration/api.test.ts --testTimeout=30000
 */

import request from 'supertest';
import app from '../../src/app';

const TENANT = 'greenwood';

let adminToken: string;
let teacherToken: string;

// ── Auth ──────────────────────────────────────────────────────────────────────
describe('POST /auth/login', () => {
  it('returns token for valid admin credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('X-Tenant-ID', TENANT)
      .send({ email: 'admin@greenwood.edu', password: 'Admin@1234' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role.name).toBe('Admin');
    adminToken = res.body.token;
  });

  it('returns token for valid teacher credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('X-Tenant-ID', TENANT)
      .send({ email: 'teacher@greenwood.edu', password: 'Teacher@1234' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    teacherToken = res.body.token;
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('X-Tenant-ID', TENANT)
      .send({ email: 'admin@greenwood.edu', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('rejects missing email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('X-Tenant-ID', TENANT)
      .send({ password: 'Admin@1234' });

    expect(res.status).toBe(400);
  });
});

// ── Auth helpers ──────────────────────────────────────────────────────────────
function adminReq() {
  return { token: adminToken, tenant: TENANT };
}

function withAuth(r: request.Test, { token, tenant }: { token: string; tenant: string }) {
  return r.set('Authorization', `Bearer ${token}`).set('X-Tenant-ID', tenant);
}

// ── Health ─────────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns status ok (no auth required)', async () => {
    const res = await request(app).get('/health').set('X-Tenant-ID', TENANT);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ── Students ──────────────────────────────────────────────────────────────────
describe('/students', () => {
  it('GET / returns seeded students', async () => {
    const res = await withAuth(request(app).get('/students'), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
    const list = Array.isArray(res.body) ? res.body : res.body.students ?? res.body.data ?? [];
    expect(list.length).toBeGreaterThan(0);
  });

  it('GET / rejects unauthenticated requests', async () => {
    const res = await request(app).get('/students').set('X-Tenant-ID', TENANT);
    expect(res.status).toBe(401);
  });

  let createdStudentId: string;

  it('POST / creates a student', async () => {
    const res = await withAuth(request(app).post('/students'), { token: adminToken, tenant: TENANT })
      .send({ firstName: 'Test', lastName: 'Student', dob: '2010-01-01' });
    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty('id');
    createdStudentId = res.body.id;
  });

  it('GET /:id returns the created student', async () => {
    if (!createdStudentId) return;
    const res = await withAuth(request(app).get(`/students/${createdStudentId}`), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('Test');
  });

  it('DELETE /:id removes the student', async () => {
    if (!createdStudentId) return;
    const res = await withAuth(request(app).delete(`/students/${createdStudentId}`), { token: adminToken, tenant: TENANT });
    expect([200, 204]).toContain(res.status);
  });
});

// ── Teachers ──────────────────────────────────────────────────────────────────
describe('/teachers', () => {
  it('GET / returns seeded teachers', async () => {
    const res = await withAuth(request(app).get('/teachers'), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
    const list = Array.isArray(res.body) ? res.body : res.body.teachers ?? res.body.data ?? [];
    expect(list.length).toBeGreaterThan(0);
  });

  it('teacher role cannot access /teachers (ADMIN only)', async () => {
    const res = await withAuth(request(app).get('/teachers'), { token: teacherToken, tenant: TENANT });
    expect(res.status).toBe(403);
  });
});

// ── Classes ───────────────────────────────────────────────────────────────────
describe('/classes', () => {
  it('GET / returns seeded classes', async () => {
    const res = await withAuth(request(app).get('/classes'), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
    const list = Array.isArray(res.body) ? res.body : res.body.classes ?? res.body.data ?? [];
    expect(list.length).toBeGreaterThan(0);
  });
});

// ── Academic Years ────────────────────────────────────────────────────────────
describe('/academic-years', () => {
  it('GET / returns seeded academic years', async () => {
    const res = await withAuth(request(app).get('/academic-years'), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
    const list = Array.isArray(res.body) ? res.body : res.body.data ?? [];
    expect(list.some((y: any) => y.name === '2025/2026')).toBe(true);
  });

  it('GET /current returns current academic year', async () => {
    const res = await withAuth(request(app).get('/academic-years/current'), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
    expect(res.body.isCurrent).toBe(true);
  });
});

// ── Terms ─────────────────────────────────────────────────────────────────────
describe('/terms', () => {
  it('GET / returns seeded terms', async () => {
    const res = await withAuth(request(app).get('/terms'), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
    const list = Array.isArray(res.body) ? res.body : res.body.data ?? [];
    expect(list.length).toBeGreaterThanOrEqual(3);
  });
});

// ── Subjects ──────────────────────────────────────────────────────────────────
describe('/subjects', () => {
  it('GET / returns seeded subjects', async () => {
    const res = await withAuth(request(app).get('/subjects'), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
    const list = Array.isArray(res.body) ? res.body : res.body.data ?? [];
    expect(list.length).toBeGreaterThan(0);
  });
});

// ── Timetables ────────────────────────────────────────────────────────────────
describe('/timetables', () => {
  it('GET /class/:classId returns timetable for JSS 1', async () => {
    // First get JSS1 id
    const classRes = await withAuth(request(app).get('/classes'), { token: adminToken, tenant: TENANT });
    const classes = Array.isArray(classRes.body) ? classRes.body : classRes.body.classes ?? classRes.body.data ?? [];
    const jss1 = classes.find((c: any) => c.name === 'JSS 1');
    if (!jss1) return;

    const res = await withAuth(request(app).get(`/timetables/class/${jss1.id}`), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
    const list = Array.isArray(res.body) ? res.body : res.body.data ?? [];
    expect(list.length).toBeGreaterThan(0);
  });
});

// ── Attendance ────────────────────────────────────────────────────────────────
describe('/attendance', () => {
  it('GET /student/:id returns attendance for a student', async () => {
    // Fetch any student first
    const studentsRes = await withAuth(request(app).get('/students'), { token: adminToken, tenant: TENANT });
    const students = Array.isArray(studentsRes.body) ? studentsRes.body : [];
    if (!students.length) return;
    const res = await withAuth(request(app).get(`/attendance/student/${students[0].id}`), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── Events ────────────────────────────────────────────────────────────────────
describe('/events', () => {
  it('GET / returns seeded events', async () => {
    const res = await withAuth(request(app).get('/events'), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('title');
    expect(res.body[0]).toHaveProperty('type');
    expect(res.body[0]).toHaveProperty('startDate');
  });

  it('GET /upcoming returns upcoming events', async () => {
    const res = await withAuth(request(app).get('/events/upcoming'), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  let createdEventId: string;

  it('POST / creates an event with partial datetime (datetime-local format)', async () => {
    const res = await withAuth(request(app).post('/events'), { token: adminToken, tenant: TENANT })
      .send({ title: 'API Test Event', type: 'Academic', startDate: '2026-07-01T09:00', venue: 'Test Hall' });
    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('API Test Event');
    createdEventId = res.body.id;
  });

  it('POST / returns safe error message on invalid data (no internal leak)', async () => {
    const res = await withAuth(request(app).post('/events'), { token: adminToken, tenant: TENANT })
      .send({ title: 'Bad Event', type: 'Sports', startDate: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body.error).not.toMatch(/prisma|invocation|argument|startDate/i);
    expect(res.body.error).toMatch(/failed/i);
  });

  it('GET /:id/participants returns empty array for new event', async () => {
    if (!createdEventId) return;
    const res = await withAuth(request(app).get(`/events/${createdEventId}/participants`), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── Roles ─────────────────────────────────────────────────────────────────────
describe('/roles', () => {
  it('GET / returns tenant roles', async () => {
    const res = await withAuth(request(app).get('/roles'), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
    const list = Array.isArray(res.body) ? res.body : res.body.roles ?? res.body.data ?? [];
    expect(list.some((r: any) => r.name === 'Admin')).toBe(true);
  });

  it('GET /permissions returns all permissions', async () => {
    const res = await withAuth(request(app).get('/roles/permissions'), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
    const list = Array.isArray(res.body) ? res.body : res.body.data ?? [];
    expect(list.length).toBeGreaterThan(0);
  });
});

// ── Gradebook ─────────────────────────────────────────────────────────────────
describe('/gradebook', () => {
  it('GET /assignments returns seeded assignment', async () => {
    const res = await withAuth(request(app).get('/gradebook/assignments'), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
  });
});

// ── Library ───────────────────────────────────────────────────────────────────
describe('/library', () => {
  it('GET /books returns book list (empty is ok)', async () => {
    const res = await withAuth(request(app).get('/library/books'), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
  });
});

// ── Transport ─────────────────────────────────────────────────────────────────
describe('/transport', () => {
  it('GET /buses returns bus list', async () => {
    const res = await withAuth(request(app).get('/transport/buses'), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
  });
});

// ── Inventory ─────────────────────────────────────────────────────────────────
describe('/inventory', () => {
  it('GET /assets returns asset list', async () => {
    const res = await withAuth(request(app).get('/inventory/assets'), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
  });
});

// ── Disciplinary ──────────────────────────────────────────────────────────────
describe('/disciplinary', () => {
  it('GET /records returns disciplinary records', async () => {
    const res = await withAuth(request(app).get('/disciplinary/records'), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
  });
});

// ── Hostel ────────────────────────────────────────────────────────────────────
describe('/hostel', () => {
  it('GET /rooms returns hostel rooms', async () => {
    const res = await withAuth(request(app).get('/hostel/rooms'), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
  });
});

// ── Sports ────────────────────────────────────────────────────────────────────
describe('/sports', () => {
  it('GET /activities returns sports activities', async () => {
    const res = await withAuth(request(app).get('/sports/activities'), { token: adminToken, tenant: TENANT });
    expect(res.status).toBe(200);
  });
});

// ── Tenant isolation ──────────────────────────────────────────────────────────
describe('Tenant isolation', () => {
  it('rejects requests with an unknown tenant subdomain', async () => {
    const res = await request(app)
      .get('/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-ID', 'nonexistent-school-xyz');
    // tenantMiddleware returns 400 "Tenant not found" for unknown subdomains
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/tenant not found/i);
  });
});
