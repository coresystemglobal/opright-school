type AttendanceStats = {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
};

type SubjectSummary = {
  subjectName: string;
  average: number;
  gradeCount: number;
};

type RecentGrade = {
  subjectName: string;
  assignmentTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
};

export type InsightPromptContext = {
  studentName: string;
  termName: string;
  attendance: AttendanceStats;
  subjects: SubjectSummary[];
  overallAverage: number | null;
  recentGrades: RecentGrade[];
};

export function buildInsightPrompt(ctx: InsightPromptContext): string {
  const attendanceLine = ctx.attendance.total > 0
    ? `Rate: ${ctx.attendance.attendanceRate.toFixed(1)}% | Present: ${ctx.attendance.present}/${ctx.attendance.total} | Absent: ${ctx.attendance.absent} | Late: ${ctx.attendance.late} | Excused: ${ctx.attendance.excused}`
    : "No attendance records in this period.";

  const subjectLines = ctx.subjects.length > 0
    ? ctx.subjects
        .map(s => `- ${s.subjectName}: ${s.average.toFixed(1)}% avg across ${s.gradeCount} assignment(s)`)
        .join("\n")
    : "No graded subjects yet.";

  const recentLines = ctx.recentGrades.length > 0
    ? ctx.recentGrades
        .map(g => `- ${g.subjectName} / "${g.assignmentTitle}": ${g.score}/${g.maxScore} (${g.percentage.toFixed(1)}%)`)
        .join("\n")
    : "No recent grades recorded.";

  const overallLine = ctx.overallAverage !== null
    ? `Overall average: ${ctx.overallAverage.toFixed(1)}%`
    : "Overall average: not yet calculated.";

  // TODO: This is the key prompt — you can shape the tone and specificity here.
  // Consider:
  //   - Tone: supportive/warm vs clinical/formal
  //   - Urgency language: "may benefit from" vs "needs immediate attention on"
  //   - Whether to highlight positive trends (e.g. improving scores) vs just current state
  return `You are a caring but data-driven educational advisor reviewing a student's academic performance.
Your role is to help parents and teachers take practical, specific action. Avoid generic advice.
Every recommendation must be grounded in the actual data below.

Student: ${ctx.studentName} | Term: ${ctx.termName}

ATTENDANCE (last 30 days):
${attendanceLine}

SUBJECT AVERAGES (current term):
${subjectLines}

${overallLine}

RECENT GRADE TREND (last 8 assignments, newest first):
${recentLines}

Respond with a JSON object — no markdown, no code fences, raw JSON only — with exactly these keys:
{
  "strengths": "1-2 sentences on what is genuinely going well, with specific numbers",
  "concerns": "specific subjects or patterns that need attention, with evidence from the data — or 'None identified' if all looks good",
  "parentRecommendations": ["2-3 specific, actionable steps a non-teacher parent can take at home"],
  "teacherRecommendations": ["1-2 classroom strategies the teacher can apply, referencing specific subjects"]
}`;
}
