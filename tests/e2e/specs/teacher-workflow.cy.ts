describe('Teacher Workflow', () => {
  beforeEach(() => {
    cy.visit('/');
    // Login as teacher
    cy.request('POST', '/auth/login', {
      email: 'teacher@school.com',
      password: 'password123'
    }).then((response) => {
      window.localStorage.setItem('token', response.body.token);
    });
  });

  it('should create and view grades', () => {
    // Create exam
    cy.request({
      method: 'POST',
      url: '/grades/exams',
      headers: {
        'Authorization': `Bearer ${window.localStorage.getItem('token')}`
      },
      body: {
        name: 'Math Test',
        classId: 'class-id',
        date: '2024-01-15',
        maxMarks: 100
      }
    }).then((response) => {
      expect(response.status).to.eq(201);
      
      // Add grade
      cy.request({
        method: 'POST',
        url: '/grades',
        headers: {
          'Authorization': `Bearer ${window.localStorage.getItem('token')}`
        },
        body: {
          examId: response.body.id,
          studentId: 'student-id',
          marks: 85
        }
      }).then((gradeResponse) => {
        expect(gradeResponse.status).to.eq(201);
      });
    });
  });
});