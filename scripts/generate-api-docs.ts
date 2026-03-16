import fs from "node:fs/promises";
import path from "node:path";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type Mount = {
  basePath: string;
  routeFile: string;
  authRequired: boolean;
  roles: string[];
};

type Endpoint = {
  method: HttpMethod;
  path: string;
  authRequired: boolean;
  roles: string[];
  tag: string;
  summary: string;
  description: string;
  deprecated?: boolean;
  requestBody?: RequestBodyConfig;
  queryParams?: QueryParam[];
  pathParams: string[];
  successStatus: number;
};

type QueryParam = {
  name: string;
  description: string;
  required?: boolean;
  schema: Record<string, unknown>;
};

type RequestBodyConfig = {
  contentType?: string;
  example?: unknown;
  schema?: Record<string, unknown>;
};

const projectRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(projectRoot, "src");
const docsRoot = path.join(projectRoot, "docs");
const swaggerDir = path.join(docsRoot, "swagger");
const postmanDir = path.join(docsRoot, "postman");

const appFile = path.join(srcRoot, "app.ts");
const docsBaseUrl = "http://demo.localhost:3000";
const publicBaseUrl = "http://localhost:3000";

async function main() {
  const mounts = await getRouteMounts();
  const endpoints = await getEndpoints(mounts);

  endpoints.push({
    method: "GET",
    path: "/health",
    authRequired: false,
    roles: [],
    tag: "System",
    summary: "Health Check",
    description: "Returns a lightweight application and cache health status.",
    pathParams: [],
    successStatus: 200,
  });

  endpoints.sort((left, right) => {
    if (left.tag !== right.tag) return left.tag.localeCompare(right.tag);
    if (left.path !== right.path) return left.path.localeCompare(right.path);
    return left.method.localeCompare(right.method);
  });

  const openApi = buildOpenApiDocument(endpoints);
  const postman = buildPostmanCollection(endpoints);

  await fs.mkdir(swaggerDir, { recursive: true });
  await fs.mkdir(postmanDir, { recursive: true });

  await fs.writeFile(
    path.join(swaggerDir, "openapi.json"),
    `${JSON.stringify(openApi, null, 2)}\n`,
    "utf8",
  );

  await fs.writeFile(
    path.join(postmanDir, "school-saas.postman_collection.json"),
    `${JSON.stringify(postman, null, 2)}\n`,
    "utf8",
  );

  console.log(`Generated ${endpoints.length} API endpoints`);
  console.log(`OpenAPI: ${path.relative(projectRoot, path.join(swaggerDir, "openapi.json"))}`);
  console.log(
    `Postman: ${path.relative(projectRoot, path.join(postmanDir, "school-saas.postman_collection.json"))}`,
  );
}

async function getRouteMounts(): Promise<Mount[]> {
  const appSource = await fs.readFile(appFile, "utf8");
  const importMap = new Map<string, string>();

  for (const match of appSource.matchAll(/import\s+(\w+)\s+from\s+"(\.\/routes\/[^"]+)";/g)) {
    const [, identifier, routeImport] = match;
    importMap.set(identifier, path.join(srcRoot, routeImport.replace("./", "") + ".ts"));
  }

  const mounts: Mount[] = [];

  for (const line of appSource.split("\n")) {
    if (!line.includes("app.use(")) continue;

    const basePathMatch = line.match(/app\.use\(\s*["'`](\/[^"'`]*)["'`]\s*,/);
    if (!basePathMatch) continue;

    const routeIdentifierMatch = line.match(/,\s*(\w+)\s*\);/);
    if (!routeIdentifierMatch) continue;

    const routeIdentifier = routeIdentifierMatch[1];
    const routeFile = importMap.get(routeIdentifier);
    if (!routeFile) continue;

    mounts.push({
      basePath: basePathMatch[1],
      routeFile,
      authRequired: line.includes("authMiddleware"),
      roles: [...line.matchAll(/"([^"]+)"/g)]
        .map((match) => match[1])
        .filter((value) => !value.startsWith("/")),
    });
  }

  return mounts;
}

async function getEndpoints(mounts: Mount[]): Promise<Endpoint[]> {
  const endpoints: Endpoint[] = [];

  for (const mount of mounts) {
    const routeSource = await fs.readFile(mount.routeFile, "utf8");
    const authRequired = mount.authRequired || /router\.use\([^)]*authMiddleware/.test(routeSource);

    for (const line of routeSource.split("\n")) {
      const routeMatch = line.match(/router\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/i);
      if (!routeMatch) continue;

      const method = routeMatch[1].toUpperCase() as HttpMethod;
      const routePath = routeMatch[2];
      const fullPath = normalizeRoutePath(mount.basePath, routePath);
      const tag = getTag(fullPath);
      const requestBody = getRequestBodyConfig(method, fullPath);
      const queryParams = getQueryParams(method, fullPath);
      const deprecated = isDeprecatedEndpoint(method, fullPath);

      endpoints.push({
        method,
        path: fullPath,
        authRequired,
        roles: mount.roles,
        tag,
        summary: getSummary(method, fullPath, tag),
        description: getDescription(method, fullPath, authRequired, mount.roles),
        deprecated,
        requestBody,
        queryParams,
        pathParams: getPathParams(fullPath),
        successStatus: getSuccessStatus(method, fullPath),
      });
    }
  }

  return endpoints;
}

function buildOpenApiDocument(endpoints: Endpoint[]) {
  const paths: Record<string, Record<string, unknown>> = {};
  const tags = Array.from(
    endpoints.reduce((acc, endpoint) => {
      acc.set(endpoint.tag, {
        name: endpoint.tag,
        description: getTagDescription(endpoint.tag),
      });
      return acc;
    }, new Map<string, { name: string; description: string }>()),
  ).map(([, value]) => value);

  for (const endpoint of endpoints) {
    const openApiPath = toOpenApiPath(endpoint.path);
    const parameters = [
      ...endpoint.pathParams.map((name) => ({
        name,
        in: "path",
        required: true,
        description: `${startCase(name)} identifier.`,
        schema: { type: "string" },
      })),
      ...(endpoint.queryParams ?? []).map((param) => ({
        name: param.name,
        in: "query",
        required: Boolean(param.required),
        description: param.description,
        schema: param.schema,
      })),
    ];

    const operation: Record<string, unknown> = {
      tags: [endpoint.tag],
      summary: endpoint.summary,
      description: endpoint.description,
      operationId: getOperationId(endpoint.method, endpoint.path),
      parameters,
      responses: {
        [endpoint.successStatus]: getSuccessResponse(endpoint),
        400: {
          description: "Bad request",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        ...(endpoint.authRequired
          ? {
              401: {
                description: "Missing or invalid bearer token",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              403: {
                description: "Insufficient permissions or wrong tenant",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            }
          : {}),
        500: {
          description: "Unexpected server error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
      deprecated: Boolean(endpoint.deprecated),
    };

    if (endpoint.authRequired) {
      operation.security = [{ bearerAuth: [] }];
    }

    if (endpoint.requestBody) {
      operation.requestBody = {
        required: true,
        content: {
          [endpoint.requestBody.contentType ?? "application/json"]: {
            schema:
              endpoint.requestBody.schema ??
              schemaFromExample(endpoint.requestBody.example ?? {}),
            ...(endpoint.requestBody.example !== undefined
              ? { example: endpoint.requestBody.example }
              : {}),
          },
        },
      };
    }

    paths[openApiPath] ??= {};
    paths[openApiPath][endpoint.method.toLowerCase()] = operation;
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "School SaaS API",
      version: "1.0.0",
      description: [
        "API reference for the multi-tenant School SaaS backend.",
        "",
        "Tenant resolution is host-based. In local development, use a tenant subdomain such as `http://demo.localhost:3000` or send a matching `Host` header when calling `http://localhost:3000`.",
        "",
        "Protected routes require a bearer token obtained from `POST /auth/login`.",
      ].join("\n"),
    },
    servers: [
      {
        url: "/",
        description: "Current origin",
      },
      {
        url: docsBaseUrl,
        description: "Local tenant example",
      },
    ],
    tags,
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string", example: "Invalid credentials" },
          },
          required: ["error"],
        },
      },
    },
  };
}

function buildPostmanCollection(endpoints: Endpoint[]) {
  const itemsByTag = new Map<string, any[]>();

  for (const endpoint of endpoints) {
    const baseVariable = getPostmanBaseVariable(endpoint);
    const pathSegments = endpoint.path.split("/").filter(Boolean).map((segment) =>
      segment.startsWith(":") ? `{{${segment.slice(1)}}}` : segment,
    );

    const query = (endpoint.queryParams ?? []).map((param) => ({
      key: param.name,
      value: getQueryDefaultValue(param),
      description: param.description,
      disabled: !param.required,
    }));

    const headers = endpoint.requestBody?.contentType === "multipart/form-data"
      ? []
      : endpoint.requestBody
        ? [{ key: "Content-Type", value: endpoint.requestBody.contentType ?? "application/json" }]
        : [];

    const item = {
      name: endpoint.summary,
      request: {
        method: endpoint.method,
        header: headers,
        ...(endpoint.authRequired ? {} : { auth: { type: "noauth" } }),
        body: getPostmanBody(endpoint.requestBody),
        url: {
          raw: `{{${baseVariable}}}${toPostmanPath(endpoint.path)}${query.length > 0 ? "?" : ""}${query
            .map((param) => `${param.key}=${param.value}`)
            .join("&")}`,
          host: [`{{${baseVariable}}}`],
          path: pathSegments,
          ...(query.length > 0 ? { query } : {}),
        },
        description: endpoint.description,
      },
      response: [],
    };

    if (!itemsByTag.has(endpoint.tag)) {
      itemsByTag.set(endpoint.tag, []);
    }

    itemsByTag.get(endpoint.tag)!.push(item);
  }

  return {
    info: {
      name: "School SaaS API",
      description: [
        "Generated Postman collection for the School SaaS backend.",
        "",
        "Set `baseUrl` to a tenant-aware host such as `http://demo.localhost:3000`.",
        "Set `publicBaseUrl` to the plain application origin for public routes such as `/health` and `/docs`.",
        "For protected endpoints, set `authToken` after calling `POST /auth/login`.",
      ].join("\n"),
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    auth: {
      type: "bearer",
      bearer: [{ key: "token", value: "{{authToken}}", type: "string" }],
    },
    variable: [
      { key: "baseUrl", value: docsBaseUrl },
      { key: "publicBaseUrl", value: publicBaseUrl },
      { key: "authToken", value: "replace-with-jwt" },
      { key: "id", value: "replace-with-id" },
      { key: "studentId", value: "replace-with-student-id" },
      { key: "classId", value: "replace-with-class-id" },
      { key: "courseId", value: "replace-with-course-id" },
      { key: "teacherId", value: "replace-with-teacher-id" },
      { key: "termId", value: "replace-with-term-id" },
      { key: "subjectId", value: "replace-with-subject-id" },
      { key: "assignmentId", value: "replace-with-assignment-id" },
      { key: "certificateNumber", value: "replace-with-certificate-number" },
      { key: "healthRecordId", value: "replace-with-health-record-id" },
      { key: "key", value: "replace-with-upload-key" },
    ],
    item: Array.from(itemsByTag.entries()).map(([tag, items]) => ({
      name: tag,
      item: items,
    })),
  };
}

function getPostmanBaseVariable(endpoint: Endpoint) {
  if (endpoint.path === "/health" || endpoint.path.startsWith("/docs")) {
    return "publicBaseUrl";
  }

  return "baseUrl";
}

function getSuccessResponse(endpoint: Endpoint) {
  if (endpoint.successStatus === 204) {
    return { description: "No content" };
  }

  if (endpoint.deprecated) {
    return {
      description: "Moved endpoint notice",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: { type: "string" },
              newEndpoint: { type: "string" },
            },
          },
        },
      },
    };
  }

  return {
    description: "Successful response",
    content: {
      "application/json": {
        schema: {
          oneOf: [{ type: "object" }, { type: "array", items: { type: "object" } }],
        },
      },
    },
  };
}

function getRequestBodyConfig(method: HttpMethod, fullPath: string): RequestBodyConfig | undefined {
  if (method === "GET" || method === "DELETE") {
    return undefined;
  }

  if (fullPath === "/upload") {
    return {
      contentType: "multipart/form-data",
      schema: {
        type: "object",
        properties: {
          file: {
            type: "string",
            format: "binary",
          },
        },
        required: ["file"],
      },
    };
  }

  const example = getExampleForEndpoint(method, fullPath);

  return {
    contentType: "application/json",
    example,
  };
}

function getExampleForEndpoint(method: HttpMethod, fullPath: string): unknown {
  if (fullPath === "/auth/login") {
    return { email: "admin@demo.com", password: "password123" };
  }

  if (fullPath === "/auth/register") {
    return {
      email: "teacher@demo.com",
      password: "password123",
      firstName: "Ada",
      lastName: "Nwosu",
      roleId: "{{id}}",
    };
  }

  if (fullPath === "/roles") {
    return {
      name: "LIBRARIAN",
      description: "Library manager role",
      permissionIds: ["{{id}}"],
    };
  }

  if (fullPath === "/roles/assign") {
    return { userId: "{{id}}", roleId: "{{id}}" };
  }

  if (fullPath === "/students" && (method === "POST" || method === "PUT")) {
    return {
      firstName: "Ada",
      lastName: "Nwosu",
      dateOfBirth: "2012-05-20",
      email: "ada.student@demo.com",
      phone: "+2348000000000",
      address: "12 Palm Avenue",
      classId: "{{classId}}",
    };
  }

  if (fullPath === "/teachers" && (method === "POST" || method === "PUT")) {
    return {
      firstName: "Emeka",
      lastName: "Okafor",
      email: "emeka.teacher@demo.com",
      phone: "+2348000000001",
      subjectIds: ["{{subjectId}}"],
    };
  }

  if (fullPath === "/classes") {
    return { name: "JSS 1A", level: "JSS1", teacherId: "{{teacherId}}" };
  }

  if (fullPath === "/classes/:classId/enroll") {
    return { studentId: "{{studentId}}" };
  }

  if (fullPath === "/attendance") {
    return {
      studentId: "{{studentId}}",
      date: "2026-03-16",
      status: "PRESENT",
      remarks: "Arrived on time",
    };
  }

  if (fullPath === "/payments/fees") {
    return {
      name: "Second Term Tuition",
      amount: 45000,
      dueDate: "2026-04-01",
    };
  }

  if (fullPath === "/payments") {
    return {
      feeId: "{{id}}",
      studentId: "{{studentId}}",
      amount: 45000,
      method: "CARD",
    };
  }

  if (fullPath === "/academic-years" && (method === "POST" || method === "PUT")) {
    return {
      name: "2026/2027",
      startDate: "2026-09-01",
      endDate: "2027-07-31",
      isCurrent: true,
    };
  }

  if (fullPath === "/terms" && (method === "POST" || method === "PUT")) {
    return {
      name: "Second Term",
      academicYearId: "{{id}}",
      startDate: "2026-01-10",
      endDate: "2026-04-15",
      isCurrent: true,
    };
  }

  if (fullPath === "/subjects") {
    return {
      name: "Mathematics",
      code: "MTH101",
      description: "Core math curriculum",
      classId: "{{classId}}",
      teacherId: "{{teacherId}}",
      academicYearId: "{{id}}",
    };
  }

  if (fullPath === "/subjects/:id/assign-teacher") {
    return { teacherId: "{{teacherId}}" };
  }

  if (fullPath === "/timetables" && (method === "POST" || method === "PUT")) {
    return {
      academicYearId: "{{id}}",
      subjectId: "{{subjectId}}",
      classId: "{{classId}}",
      teacherId: "{{teacherId}}",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:00",
      room: "Block A",
    };
  }

  if (fullPath === "/attendances") {
    return {
      studentId: "{{studentId}}",
      date: "2026-03-16",
      status: "PRESENT",
      remarks: "Morning assembly attended",
    };
  }

  if (fullPath === "/attendances/bulk") {
    return [
      {
        studentId: "{{studentId}}",
        date: "2026-03-16",
        status: "PRESENT",
      },
    ];
  }

  if (fullPath === "/gradebook/assignments") {
    return {
      academicYearId: "{{id}}",
      termId: "{{termId}}",
      subjectId: "{{subjectId}}",
      title: "Algebra Homework",
      description: "Solve questions 1 to 10",
      maxScore: 20,
      weight: 10,
      dueDate: "2026-03-20T12:00:00.000Z",
    };
  }

  if (fullPath === "/gradebook/grades") {
    return {
      studentId: "{{studentId}}",
      subjectId: "{{subjectId}}",
      assignmentId: "{{assignmentId}}",
      score: 18,
      maxScore: 20,
      remarks: "Excellent work",
      gradedBy: "{{teacherId}}",
    };
  }

  if (fullPath === "/gradebook/grades/bulk") {
    return [
      {
        studentId: "{{studentId}}",
        subjectId: "{{subjectId}}",
        assignmentId: "{{assignmentId}}",
        score: 18,
        maxScore: 20,
      },
    ];
  }

  if (fullPath === "/gradebook/examinations") {
    return {
      academicYearId: "{{id}}",
      termId: "{{termId}}",
      subjectId: "{{subjectId}}",
      name: "Midterm Examination",
      examDate: "2026-03-25T09:00:00.000Z",
      duration: 90,
      maxScore: 100,
      passingScore: 40,
      room: "Hall 1",
    };
  }

  if (fullPath === "/gradebook/exam-results") {
    return {
      examinationId: "{{id}}",
      studentId: "{{studentId}}",
      score: 84,
      grade: "A",
      remarks: "Strong performance",
    };
  }

  if (fullPath === "/library/books") {
    return {
      title: "Things Fall Apart",
      author: "Chinua Achebe",
      isbn: "9780385474542",
      genre: "Literature",
      copies: 5,
    };
  }

  if (fullPath === "/library/borrow") {
    return {
      bookId: "{{id}}",
      borrowerId: "{{studentId}}",
      borrowerType: "STUDENT",
      dueDate: "2026-03-30T00:00:00.000Z",
    };
  }

  if (fullPath === "/library/return/:id") {
    return { fine: 0 };
  }

  if (fullPath === "/transport/buses") {
    return {
      busNumber: "BUS-001",
      capacity: 40,
      driverName: "Mr Adewale",
      driverPhone: "+2348000000002",
    };
  }

  if (fullPath === "/transport/routes") {
    return {
      busId: "{{id}}",
      routeName: "North Route",
      stops: ["Ikeja", "Ojodu", "Berger"],
      pickupTime: "06:30",
    };
  }

  if (fullPath === "/transport/assignments") {
    return {
      studentId: "{{studentId}}",
      routeId: "{{id}}",
      pickupStop: "Ojodu",
      dropoffStop: "Ojodu",
    };
  }

  if (fullPath === "/inventory/assets") {
    return {
      name: "Desktop Computer",
      category: "IT",
      quantity: 10,
      unitPrice: 250000,
      location: "ICT Lab",
    };
  }

  if (fullPath === "/inventory/transactions") {
    return {
      assetId: "{{id}}",
      type: "ALLOCATED",
      quantity: 2,
      recipientId: "{{teacherId}}",
      notes: "Assigned to ICT department",
    };
  }

  if (fullPath === "/events") {
    return {
      title: "Inter-house Sports",
      description: "Annual sports competition",
      startDate: "2026-04-10T09:00:00.000Z",
      endDate: "2026-04-10T17:00:00.000Z",
      venue: "Main Field",
    };
  }

  if (fullPath === "/events/:id/participants") {
    return {
      participantId: "{{studentId}}",
      participantType: "STUDENT",
    };
  }

  if (fullPath === "/disciplinary/records") {
    return {
      studentId: "{{studentId}}",
      incidentType: "MISCONDUCT",
      description: "Late to class repeatedly",
      actionTaken: "Warning issued",
      status: "OPEN",
    };
  }

  if (fullPath === "/disciplinary/records/:id") {
    return {
      actionTaken: "Suspended for one day",
      status: "RESOLVED",
    };
  }

  if (fullPath === "/health/records" || fullPath === "/health/records/:studentId") {
    return {
      studentId: "{{studentId}}",
      bloodGroup: "O+",
      genotype: "AA",
      allergies: ["Dust"],
      notes: "Carries inhaler",
    };
  }

  if (fullPath === "/health/incidents") {
    return {
      healthRecordId: "{{healthRecordId}}",
      incidentType: "FEVER",
      description: "Reported high temperature",
      treatment: "Paracetamol administered",
      incidentDate: "2026-03-16T10:30:00.000Z",
    };
  }

  if (fullPath === "/health/vaccinations") {
    return {
      healthRecordId: "{{healthRecordId}}",
      vaccineName: "Tetanus",
      dateAdministered: "2026-03-01T00:00:00.000Z",
      administeredBy: "School Nurse",
    };
  }

  if (fullPath === "/hostel/rooms") {
    return {
      roomNumber: "A12",
      hostelBlock: "Girls Hostel",
      capacity: 6,
      occupied: 0,
    };
  }

  if (fullPath === "/hostel/assignments") {
    return {
      roomId: "{{id}}",
      studentId: "{{studentId}}",
      bedNumber: "B2",
    };
  }

  if (fullPath === "/hostel/meal-plans") {
    return {
      name: "Standard Plan",
      mealsPerDay: 3,
      dietaryNotes: "No peanuts",
    };
  }

  if (fullPath === "/hostel/visitors") {
    return {
      studentId: "{{studentId}}",
      visitorName: "Jane Doe",
      relationship: "Parent",
      checkInTime: "2026-03-16T14:00:00.000Z",
    };
  }

  if (fullPath === "/hostel/visitors/:id/checkout") {
    return {};
  }

  if (fullPath === "/sports/activities") {
    return {
      name: "Football",
      type: "TEAM",
      coachId: "{{teacherId}}",
      schedule: "Tue/Thu 16:00",
    };
  }

  if (fullPath === "/sports/enrollments") {
    return {
      studentId: "{{studentId}}",
      activityId: "{{id}}",
    };
  }

  if (fullPath === "/sports/competitions") {
    return {
      activityId: "{{id}}",
      name: "Regional Finals",
      competitionDate: "2026-05-03T10:00:00.000Z",
      venue: "City Stadium",
    };
  }

  if (fullPath === "/courses") {
    return {
      title: "Basic Mathematics",
      description: "Self-paced online course",
      teacherId: "{{teacherId}}",
      isPublished: true,
    };
  }

  if (fullPath === "/courses/:id/enroll") {
    return { studentId: "{{studentId}}" };
  }

  if (fullPath === "/courses/progress") {
    return {
      enrollmentId: "{{id}}",
      lessonId: "{{id}}",
      completed: true,
      timeSpent: 35,
    };
  }

  if (fullPath === "/elearning/quizzes") {
    return {
      lessonId: "{{id}}",
      title: "Week 1 Quiz",
      questions: [{ prompt: "2 + 2 = ?", options: ["3", "4"], answer: "4" }],
    };
  }

  if (fullPath === "/elearning/quizzes/:id/submit") {
    return {
      studentId: "{{studentId}}",
      answers: [{ questionId: "{{id}}", answer: "4" }],
    };
  }

  if (fullPath === "/elearning/assignments/:assignmentId/submit") {
    return {
      studentId: "{{studentId}}",
      submissionText: "Attached my solution.",
      attachmentUrl: "https://example.com/submission.pdf",
    };
  }

  if (fullPath === "/elearning/submissions/:id/grade") {
    return {
      grade: 88,
      feedback: "Well researched",
      gradedBy: "{{teacherId}}",
    };
  }

  if (fullPath === "/elearning/live-classes") {
    return {
      title: "Live Physics Revision",
      teacherId: "{{teacherId}}",
      scheduledAt: "2026-03-20T15:00:00.000Z",
      status: "SCHEDULED",
      meetingUrl: "https://meet.example.com/physics-revision",
    };
  }

  if (fullPath === "/elearning/live-classes/:id") {
    return {
      title: "Live Physics Revision",
      status: "LIVE",
    };
  }

  if (fullPath === "/elearning/live-classes/:id/attendance") {
    return {
      studentId: "{{studentId}}",
      joinedAt: "2026-03-20T15:02:00.000Z",
      leftAt: "2026-03-20T15:57:00.000Z",
    };
  }

  if (fullPath === "/elearning/discussions") {
    return {
      courseId: "{{courseId}}",
      title: "Week 2 Questions",
      content: "Share any blockers here.",
    };
  }

  if (fullPath === "/elearning/discussions/:id/replies") {
    return { content: "Here is my reply." };
  }

  if (fullPath === "/elearning/discussions/:id/pin") {
    return { isPinned: true };
  }

  if (fullPath === "/elearning/certificates") {
    return {
      courseId: "{{courseId}}",
      studentId: "{{studentId}}",
    };
  }

  if (fullPath === "/queue/reports") {
    return {
      tenantId: "{{id}}",
      payload: {
        reportType: "attendance-summary",
        date: "2026-03-16",
      },
    };
  }

  if (method === "POST" && fullPath === "/notices") {
    return {
      title: "This feature is not implemented",
      content: "The notice endpoints currently return HTTP 501.",
    };
  }

  return {};
}

function getQueryParams(method: HttpMethod, fullPath: string): QueryParam[] | undefined {
  const stringParam = (name: string, description: string, required = false): QueryParam => ({
    name,
    description,
    required,
    schema: { type: "string" },
  });

  if (method === "GET" && fullPath === "/subjects") {
    return [
      stringParam("classId", "Filter by class identifier."),
      stringParam("academicYearId", "Filter by academic year identifier."),
      stringParam("teacherId", "Filter by teacher identifier."),
    ];
  }

  if (method === "GET" && fullPath === "/terms") {
    return [stringParam("academicYearId", "Filter terms by academic year.")];
  }

  if (method === "GET" && fullPath === "/timetables/class/:classId") {
    return [stringParam("academicYearId", "Optionally limit entries to one academic year.")];
  }

  if (method === "GET" && fullPath === "/timetables/teacher/:teacherId") {
    return [stringParam("academicYearId", "Optionally limit entries to one academic year.")];
  }

  if (method === "GET" && fullPath === "/attendances") {
    return [
      stringParam("studentId", "Filter by student identifier."),
      stringParam("classId", "Filter by class identifier."),
      stringParam("date", "Filter by a single ISO date."),
      stringParam("startDate", "Attendance range start date."),
      stringParam("endDate", "Attendance range end date."),
    ];
  }

  if (method === "GET" && fullPath === "/attendances/stats/:studentId") {
    return [
      stringParam("startDate", "Range start date.", true),
      stringParam("endDate", "Range end date.", true),
    ];
  }

  if (method === "GET" && fullPath === "/attendances/class/:classId/report") {
    return [stringParam("date", "Report date.", true)];
  }

  if (method === "GET" && fullPath === "/gradebook/assignments") {
    return [
      stringParam("subjectId", "Filter by subject identifier."),
      stringParam("termId", "Filter by term identifier."),
    ];
  }

  if (method === "GET" && fullPath === "/gradebook/grades/student/:studentId") {
    return [
      stringParam("subjectId", "Filter by subject identifier."),
      stringParam("assignmentId", "Filter by assignment identifier."),
    ];
  }

  if (method === "GET" && fullPath === "/gradebook/exam-results") {
    return [
      stringParam("examinationId", "Filter by examination identifier."),
      stringParam("studentId", "Filter by student identifier."),
    ];
  }

  if (method === "GET" && fullPath === "/library/books") {
    return [
      stringParam("title", "Search by title."),
      stringParam("author", "Search by author."),
      stringParam("genre", "Filter by genre."),
      stringParam("available", "Filter available books only."),
    ];
  }

  if (method === "GET" && fullPath === "/library/transactions") {
    return [
      stringParam("bookId", "Filter by book identifier."),
      stringParam("borrowerId", "Filter by borrower identifier."),
      stringParam("status", "Filter by transaction status."),
    ];
  }

  if (method === "GET" && fullPath === "/transport/routes") {
    return [stringParam("busId", "Filter routes by bus identifier.")];
  }

  if (method === "GET" && fullPath === "/transport/assignments") {
    return [stringParam("studentId", "Filter assignments by student identifier.")];
  }

  if (method === "GET" && fullPath === "/inventory/assets") {
    return [stringParam("category", "Filter assets by category.")];
  }

  if (method === "GET" && fullPath === "/inventory/transactions") {
    return [stringParam("assetId", "Filter transactions by asset identifier.")];
  }

  if (method === "GET" && fullPath === "/events") {
    return [
      stringParam("startDate", "Filter events from this date."),
      stringParam("endDate", "Filter events until this date."),
      stringParam("category", "Filter by event category."),
    ];
  }

  if (method === "GET" && fullPath === "/disciplinary/records") {
    return [
      stringParam("studentId", "Filter by student identifier."),
      stringParam("status", "Filter by record status."),
    ];
  }

  if (method === "GET" && fullPath === "/sports/activities") {
    return [stringParam("type", "Filter activities by type.")];
  }

  if (method === "GET" && fullPath === "/sports/competitions") {
    return [stringParam("activityId", "Filter competitions by activity identifier.")];
  }

  if (method === "GET" && fullPath === "/courses") {
    return [
      {
        name: "isPublished",
        description: "Filter by publication status.",
        schema: { type: "boolean" },
      },
      stringParam("teacherId", "Filter by teacher identifier."),
    ];
  }

  if (method === "GET" && fullPath === "/elearning/quizzes") {
    return [stringParam("lessonId", "Filter quizzes by lesson identifier.")];
  }

  if (method === "GET" && fullPath === "/elearning/quizzes/:id/attempts") {
    return [stringParam("studentId", "Optionally narrow attempts to one student.")];
  }

  if (method === "GET" && fullPath === "/elearning/submissions") {
    return [
      stringParam("assignmentId", "Filter by assignment identifier."),
      stringParam("studentId", "Filter by student identifier."),
    ];
  }

  if (method === "GET" && fullPath === "/elearning/live-classes") {
    return [
      stringParam("teacherId", "Filter by teacher identifier."),
      stringParam("status", "Filter by class status."),
    ];
  }

  return undefined;
}

function getSummary(method: HttpMethod, fullPath: string, tag: string) {
  const overrides: Record<string, string> = {
    "POST /auth/login": "Login",
    "POST /auth/register": "Register User",
    "GET /health": "Health Check",
    "POST /queue/reports": "Process Report Webhook",
    "POST /upload": "Upload File",
    "GET /upload/signed-url/:key": "Get Signed File URL",
    "DELETE /upload/:key": "Delete Uploaded File",
    "GET /academic-years/current": "Get Current Academic Year",
    "GET /terms/current": "Get Current Term",
    "POST /classes/:classId/enroll": "Enroll Student In Class",
    "GET /attendance/student/:studentId": "Get Student Attendance",
    "POST /gradebook/grades/bulk": "Bulk Record Grades",
    "GET /gradebook/grades/student/:studentId/subject/:subjectId/average": "Get Subject Average",
    "GET /gradebook/report-card/:studentId/term/:termId": "Get Student Report Card",
    "GET /attendances/stats/:studentId": "Get Attendance Statistics",
    "GET /attendances/class/:classId/report": "Get Class Attendance Report",
    "POST /events/:id/participants": "Add Event Participant",
    "GET /events/:id/participants": "List Event Participants",
    "POST /hostel/visitors/:id/checkout": "Check Out Visitor",
    "POST /courses/:id/enroll": "Enroll Student In Course",
    "GET /courses/enrollments/:studentId": "Get Student Course Enrollments",
    "POST /courses/progress": "Update Course Progress",
    "POST /elearning/quizzes/:id/submit": "Submit Quiz",
    "GET /elearning/quizzes/:id/attempts": "Get Quiz Attempts",
    "POST /elearning/assignments/:assignmentId/submit": "Submit Assignment",
    "PUT /elearning/submissions/:id/grade": "Grade Submission",
    "POST /elearning/live-classes/:id/attendance": "Record Live Class Attendance",
    "GET /elearning/live-classes/:id/attendance": "Get Live Class Attendance",
    "POST /elearning/discussions/:id/replies": "Reply To Discussion",
    "PUT /elearning/discussions/:id/pin": "Pin Discussion",
    "GET /elearning/certificates/verify/:certificateNumber": "Verify Certificate",
  };

  const key = `${method} ${fullPath}`;
  if (overrides[key]) {
    return overrides[key];
  }

  if (fullPath === `/${tag.toLowerCase().replace(/\s+/g, "-")}` || fullPath === `/${tag.toLowerCase()}`) {
    if (method === "GET") return `List ${tag}`;
    if (method === "POST") return `Create ${singularize(tag)}`;
  }

  const segments = fullPath.split("/").filter(Boolean);
  const resource = segments.filter((segment) => !segment.startsWith(":")).slice(-1)[0] ?? tag;
  const verb = {
    GET: segments.some((segment) => segment.startsWith(":")) ? "Get" : "List",
    POST: "Create",
    PUT: "Update",
    PATCH: "Update",
    DELETE: "Delete",
  }[method];

  return `${verb} ${startCase(singularize(resource))}`;
}

function getDescription(method: HttpMethod, fullPath: string, authRequired: boolean, roles: string[]) {
  const parts = [
    `${getSummary(method, fullPath, getTag(fullPath))}.`,
  ];

  if (authRequired) {
    parts.push("Requires a valid bearer token.");
  } else {
    parts.push("Public endpoint.");
  }

  if (roles.length > 0) {
    parts.push(`Mounted with role restrictions: ${roles.join(", ")}.`);
  }

  if (fullPath.startsWith("/grades")) {
    parts.push("Legacy endpoint retained for compatibility. Use the gradebook routes instead.");
  }

  if (fullPath.startsWith("/notices")) {
    parts.push("This feature currently returns HTTP 501 and is not implemented yet.");
  }

  return parts.join(" ");
}

function getSuccessStatus(method: HttpMethod, fullPath: string) {
  if (method === "DELETE") return 204;
  if (fullPath.startsWith("/grades")) return 301;
  if (method === "POST") {
    if (fullPath === "/hostel/visitors/:id/checkout") return 200;
    return 201;
  }
  return 200;
}

function getTag(fullPath: string) {
  const firstSegment = fullPath.split("/").filter(Boolean)[0] ?? "system";
  const explicit: Record<string, string> = {
    auth: "Auth",
    roles: "Roles",
    students: "Students",
    teachers: "Teachers",
    classes: "Classes",
    attendance: "Attendance",
    grades: "Legacy Grades",
    notices: "Notices",
    payments: "Payments",
    "academic-years": "Academic Years",
    terms: "Terms",
    subjects: "Subjects",
    timetables: "Timetables",
    attendances: "Attendances",
    gradebook: "Gradebook",
    library: "Library",
    transport: "Transport",
    inventory: "Inventory",
    events: "Events",
    disciplinary: "Disciplinary",
    health: "Health",
    hostel: "Hostel",
    sports: "Sports",
    upload: "Uploads",
    parent: "Parent",
    courses: "Courses",
    elearning: "E-Learning",
    queue: "Queue",
    docs: "Documentation",
  };

  return explicit[firstSegment] ?? startCase(firstSegment);
}

function getTagDescription(tag: string) {
  const descriptions: Record<string, string> = {
    Auth: "Tenant-scoped authentication and user registration.",
    Roles: "Role and permission management.",
    Students: "Student CRUD operations.",
    Teachers: "Teacher CRUD operations.",
    Classes: "Class management and enrollment.",
    Attendance: "Legacy attendance endpoints.",
    "Legacy Grades": "Legacy grade endpoints that redirect clients to gradebook routes.",
    Notices: "Placeholder notice endpoints.",
    Payments: "Fee creation and payment tracking.",
    "Academic Years": "Academic year lifecycle endpoints.",
    Terms: "Term and semester lifecycle endpoints.",
    Subjects: "Subject management and teacher assignment.",
    Timetables: "Class and teacher timetable management.",
    Attendances: "Detailed attendance workflows and reports.",
    Gradebook: "Assignments, grades, examinations, and report cards.",
    Library: "Book catalog, circulation, and reporting.",
    Transport: "Buses, routes, and student transport assignments.",
    Inventory: "Asset catalog and transaction tracking.",
    Events: "School event management.",
    Disciplinary: "Student disciplinary records and statistics.",
    Health: "Health records, incidents, and vaccinations.",
    Hostel: "Hostel rooming, meals, and visitor logs.",
    Sports: "Sports activities, enrollments, and competitions.",
    Uploads: "File upload and signed URL endpoints.",
    Parent: "Parent-facing read-only dashboard endpoints.",
    Courses: "Course authoring, enrollment, and learner progress.",
    "E-Learning": "Quizzes, submissions, live classes, discussions, and certificates.",
    Queue: "Webhook endpoints used by background jobs.",
    Documentation: "Machine-readable and browser-based API docs.",
    System: "Operational endpoints.",
  };

  return descriptions[tag] ?? `${tag} endpoints.`;
}

function isDeprecatedEndpoint(method: HttpMethod, fullPath: string) {
  return method !== "GET" && fullPath.startsWith("/grades") || (method === "GET" && fullPath.startsWith("/grades"));
}

function normalizeRoutePath(basePath: string, routePath: string) {
  if (routePath === "/") return basePath;
  if (basePath.endsWith("/")) return `${basePath.slice(0, -1)}${routePath}`;
  return `${basePath}${routePath}`;
}

function toOpenApiPath(value: string) {
  return value.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

function toPostmanPath(value: string) {
  return value.replace(/:([A-Za-z0-9_]+)/g, "{{$1}}");
}

function getPathParams(fullPath: string) {
  return [...fullPath.matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => match[1]);
}

function getOperationId(method: HttpMethod, fullPath: string) {
  return `${method.toLowerCase()}${fullPath
    .replace(/\/:([A-Za-z0-9_]+)/g, "_$1")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")}`;
}

function schemaFromExample(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) {
    return {
      type: "array",
      items: value.length > 0 ? schemaFromExample(value[0]) : { type: "object" },
    };
  }

  if (value === null) {
    return { nullable: true };
  }

  if (typeof value === "string") return { type: "string" };
  if (typeof value === "number") return { type: Number.isInteger(value) ? "integer" : "number" };
  if (typeof value === "boolean") return { type: "boolean" };

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(record).map(([key, nestedValue]) => [key, schemaFromExample(nestedValue)]),
      ),
    };
  }

  return { type: "object" };
}

function getPostmanBody(requestBody?: RequestBodyConfig) {
  if (!requestBody) return undefined;

  if (requestBody.contentType === "multipart/form-data") {
    return {
      mode: "formdata",
      formdata: [
        {
          key: "file",
          type: "file",
          src: "",
        },
      ],
    };
  }

  return {
    mode: "raw",
    raw: JSON.stringify(requestBody.example ?? {}, null, 2),
    options: {
      raw: {
        language: "json",
      },
    },
  };
}

function getQueryDefaultValue(param: QueryParam) {
  if (param.schema.type === "boolean") return "true";
  if (param.name.toLowerCase().includes("date")) return "2026-03-16";
  return `{{${param.name}}}`;
}

function singularize(value: string) {
  if (value.endsWith("ies")) return `${value.slice(0, -3)}y`;
  if (value.endsWith("ses")) return value.slice(0, -2);
  if (value.endsWith("s")) return value.slice(0, -1);
  return value;
}

function startCase(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
