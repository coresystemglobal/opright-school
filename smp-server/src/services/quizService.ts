import prisma from '../prisma/client';

export class QuizService {
  static async createQuiz(tenantId: string, data: any) {
    return prisma.quiz.create({
      data: { ...data, tenantId }
    });
  }

  static async getQuizzes(tenantId: string, lessonId?: string) {
    return prisma.quiz.findMany({
      where: { tenantId, lessonId },
      include: { _count: { select: { attempts: true } } }
    });
  }

  static async submitQuiz(quizId: string, studentId: string, answers: any[]) {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new Error('Quiz not found');

    const questions = quiz.questions as any[];
    let totalScore = 0;
    let earnedScore = 0;

    questions.forEach((q: any, idx: number) => {
      totalScore += q.points || 1;
      const studentAnswer = answers.find(a => a.questionId === q.id || a.questionId === idx);
      
      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        if (studentAnswer?.answer === q.answer) {
          earnedScore += q.points || 1;
        }
      }
    });

    const scorePercent = totalScore > 0 ? (earnedScore / totalScore) * 100 : 0;
    const passed = scorePercent >= quiz.passingScore;

    return prisma.quizAttempt.create({
      data: {
        quizId,
        studentId,
        answers,
        score: scorePercent,
        passed,
        completedAt: new Date()
      }
    });
  }

  static async getAttempts(quizId: string, studentId: string) {
    return prisma.quizAttempt.findMany({
      where: { quizId, studentId },
      orderBy: { createdAt: 'desc' }
    });
  }
}
