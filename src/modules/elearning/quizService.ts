import { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError } from "../../utils/errors";

type QuizQuestion = Record<string, unknown>;
type QuizAnswer = Record<string, unknown>;

export class QuizService {
  constructor(private prisma: PrismaClient) {}

  async createQuiz(
    tenantId: string,
    data: {
      lessonId?: string;
      title: string;
      description?: string;
      duration?: number;
      passingScore?: number;
      questions: QuizQuestion[];
    }
  ) {
    return this.prisma.quiz.create({
      data: {
        ...data,
        tenantId,
        questions: data.questions as Prisma.InputJsonValue,
      },
    });
  }

  async getQuizzes(tenantId: string, lessonId?: string) {
    return this.prisma.quiz.findMany({
      where: { tenantId, lessonId },
      include: { _count: { select: { attempts: true } } },
    });
  }

  async submitQuiz(tenantId: string, quizId: string, studentId: string, answers: QuizAnswer[]) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, tenantId },
    });

    if (!quiz) {
      throw new NotFoundError("Quiz not found");
    }

    const questions = quiz.questions as Array<Record<string, unknown>>;
    let totalScore = 0;
    let earnedScore = 0;

    questions.forEach((question, index) => {
      const points = Number(question.points ?? 1);
      totalScore += points;

      const studentAnswer = answers.find(
        (answer) => answer.questionId === question.id || answer.questionId === index
      );

      if (
        (question.type === "multiple_choice" || question.type === "true_false") &&
        studentAnswer?.answer === question.answer
      ) {
        earnedScore += points;
      }
    });

    const scorePercent = totalScore > 0 ? (earnedScore / totalScore) * 100 : 0;
    const passed = scorePercent >= quiz.passingScore;

    return this.prisma.quizAttempt.create({
      data: {
        quizId,
        studentId,
        answers: answers as Prisma.InputJsonValue,
        score: scorePercent,
        passed,
        completedAt: new Date(),
      },
    });
  }

  async getAttempts(tenantId: string, quizId: string, studentId: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, tenantId },
      select: { id: true },
    });

    if (!quiz) {
      throw new NotFoundError("Quiz not found");
    }

    return this.prisma.quizAttempt.findMany({
      where: { quizId, studentId },
      orderBy: { createdAt: "desc" },
    });
  }
}
