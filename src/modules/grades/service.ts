export class GradesService {
  getExamRedirect() {
    return {
      error: "This endpoint has moved",
      newEndpoint: "POST /gradebook/examinations",
    };
  }

  getGradeRedirect() {
    return {
      error: "This endpoint has moved",
      newEndpoint: "POST /gradebook/grades",
    };
  }

  getStudentGradesRedirect() {
    return {
      error: "This endpoint has moved",
      newEndpoint: "GET /gradebook/grades/student/:studentId",
    };
  }
}
