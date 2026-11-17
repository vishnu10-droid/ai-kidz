const crypto = require("crypto");
const mongoose = require("mongoose");
const {
  Student,
  Course,
  Enrollment,
  Lesson,
  LessonProgress,
  Assignment,
  AssignmentSubmission,
  Quiz,
  QuizSubmission,
  Notification,
  LiveSession,
  DiyKitGuide,
  Teacher,
} = require("../models");
const { withId, withIds, pct } = require("./helpers");

/* ------------------------------------------------------------- gamification */

const RANKS = [
  { min: 500, title: "AI Prodigy" },
  { min: 200, title: "Robo Builder" },
  { min: 0, title: "Junior Robo Maker" },
];
const XP_PER_LEVEL = 200;

const rankForXp = (xp) => (RANKS.find((rank) => Number(xp || 0) >= rank.min) ?? RANKS[RANKS.length - 1]).title;
const levelForXp = (xp) => Math.max(1, Math.floor(Number(xp || 0) / XP_PER_LEVEL) + 1);
const CERT_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const certificateCode = () => {
  let code = "";
  for (let index = 0; index < 5; index += 1) {
    code += CERT_ALPHABET[crypto.randomInt(CERT_ALPHABET.length)];
  }
  return `AKZ-CERT-${code}`;
};

const BADGES = {
  firstRobot: { badgeId: "first-robot-built", title: "First Robot Built", icon: "first-circuit" },
  sensorMaster: { badgeId: "sensor-master", title: "Sensor Master", icon: "sensor-master" },
  courseFinisher: { badgeId: "course-finisher", title: "Course Finisher", icon: "course-finisher" },
  quizAce: { badgeId: "quiz-ace", title: "Quiz Ace", icon: "quiz-ace" },
  assignmentHero: { badgeId: "assignment-hero", title: "Assignment Hero", icon: "assignment-hero" },
  streakStarter: { badgeId: "streak-starter", title: "Streak Starter", icon: "streak-starter" },
};

const gamificationPayload = (student) => {
  const xpPoints = Number(student.xpPoints || 0);
  return {
    xpPoints,
    streakDays: Number(student.streakDays || 1),
    rankTitle: student.rankTitle || rankForXp(xpPoints),
    level: levelForXp(xpPoints),
    xpToNextLevel: XP_PER_LEVEL - (xpPoints % XP_PER_LEVEL),
    badgeCount: (student.badges || []).length,
    badges: (student.badges || []).map((badge) => ({
      badgeId: badge.badgeId,
      title: badge.title,
      icon: badge.icon,
      unlockedAt: badge.unlockedAt,
    })),
  };
};

const publicStudent = (student) => ({
  id: String(student._id),
  full_name: student.full_name,
  email: student.email,
  roll_number: student.roll_number,
  grade: student.grade,
  batch: student.batch_id ?? null,
  school: student.school_id ?? null,
  xpPoints: Number(student.xpPoints || 0),
  streakDays: Number(student.streakDays || 1),
  lastActiveDate: student.lastActiveDate,
  rankTitle: student.rankTitle || rankForXp(student.xpPoints),
  level: levelForXp(student.xpPoints),
  badges: gamificationPayload(student).badges,
});

/** Streak: same day keeps it, yesterday grows it, anythingolder resets to 1. */
const touchStreak = (student) => {
  const now = new Date();
  const last = student.lastActiveDate ? new Date(student.lastActiveDate) : null;
  if (!last || Number.isNaN(last.getTime())) {
    student.streakDays = 1;
  } else {
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const previous = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());
    const diffDays = Math.round((today - previous) / 86400000);
    if (diffDays === 1) student.streakDays = Number(student.streakDays || 0) + 1;
    else if (diffDays > 1) student.streakDays = 1;
    else if (!student.streakDays) student.streakDays = 1;
  }
  student.lastActiveDate = now;
  student.rankTitle = rankForXp(student.xpPoints);
  return student.streakDays;
};

const awardXp = (student, amount) => {
  student.xpPoints = Number(student.xpPoints || 0) + Number(amount || 0);
  student.rankTitle = rankForXp(student.xpPoints);
  touchStreak(student);
  return Number(student.xpPoints);
};

const awardBadge = (student, badge, unlockedAt = new Date()) => {
  if (!badge) return null;
  const existing = (student.badges || []).find((entry) => entry.badgeId === badge.badgeId);
  if (existing) return null;
  student.badges.push({ ...badge, unlockedAt });
  return badge.badgeId;
};

const syncEnrolledCourse = (student, courseId, patch) => {
  if (!Array.isArray(student.enrolledCourses)) student.enrolledCourses = [];
  let row = student.enrolledCourses.find((entry) => String(entry.courseId) === String(courseId));
  if (!row) {
    student.enrolledCourses.push({ courseId });
    row = student.enrolledCourses[student.enrolledCourses.length - 1];
  }
  if (patch.progressPercentage !== undefined) row.progressPercentage = patch.progressPercentage;
  if (patch.completedLessons !== undefined) row.completedLessons = patch.completedLessons;
  if (patch.completedAt !== undefined) row.completedAt = patch.completedAt;
  if (patch.certificateId !== undefined) row.certificateId = patch.certificateId;
  return row;
};

const mirrorFor = (student, courseId) =>
  (student.enrolledCourses || []).find((entry) => String(entry.courseId) === String(courseId));

/* ------------------------------------------------------------ shared loads */

const currentStudent = (req) =>
  Student.findOne({ user_id: req.user.id })
    .populate("batch_id", "name grade schedule room")
    .populate("school_id", "name city");

const courseStats = async (studentId, courseId) => {
  const [lessons, progressRows] = await Promise.all([
    Lesson.find({ course_id: courseId }).sort({ position: 1, order: 1 }).select("_id").lean(),
    LessonProgress.find({ student_id: studentId, course_id: courseId }).select("lesson_id").lean(),
  ]);
  const completedLessonIds = progressRows.map((row) => String(row.lesson_id));
  const totalLessons = lessons.length;
  const progress = totalLessons ? Math.round((completedLessonIds.length / totalLessons) * 100) : 0;
  return { totalLessons, completedLessonIds, progress };
};

const findCourse = async (reference) => {
  if (!reference) return null;
  const filter = mongoose.isValidObjectId(reference)
    ? { $or: [{ _id: reference }, { slug: reference }] }
    : { slug: reference };
  return Course.findOne(filter).lean();
};

/** Every enrolled course with live progress, certificate and mirror metadata. */
const enrolledCourseRows = async (student) => {
  const enrollments = await Enrollment.find({ student_id: student._id }).populate("course_id").lean();
  const rows = [];
  for (const enrollment of enrollments) {
    const course = enrollment.course_id;
    if (!course) continue;
    const stats = await courseStats(student._id, course._id);
    const mirror = mirrorFor(student, course._id);
    const certificateId =
      mirror?.certificateId ||
      (stats.progress >= 100 ? `AKZ-CERT-${String(enrollment._id).slice(-5).toUpperCase()}` : null);
    rows.push({
      enrollmentId: String(enrollment._id),
      courseId: String(course._id),
      course: withId(course),
      progress: stats.progress,
      progressPercentage: stats.progress,
      totalLessons: stats.totalLessons,
      completedLessons: stats.completedLessonIds.length,
      completedLessonIds: stats.completedLessonIds,
      certificateId,
      completedAt: mirror?.completedAt ?? (stats.progress >= 100 ? enrollment.updatedAt : null),
      status: stats.progress >= 100 ? "completed" : "active",
    });
  }

  // Mirrors without an Enrollment row (e.g. imported history) still surface.
  for (const mirror of student.enrolledCourses || []) {
    if (rows.some((row) => row.courseId === String(mirror.courseId))) continue;
    const course = await Course.findById(mirror.courseId).lean();
    if (!course) continue;
    const stats = await courseStats(student._id, course._id);
    rows.push({
      enrollmentId: null,
      courseId: String(course._id),
      course: withId(course),
      progress: Math.round(Number(mirror.progressPercentage || stats.progress)),
      progressPercentage: Math.round(Number(mirror.progressPercentage || stats.progress)),
      totalLessons: stats.totalLessons,
      completedLessons: (mirror.completedLessons || []).length,
      completedLessonIds: (mirror.completedLessons || []).map(String),
      certificateId: mirror.certificateId || null,
      completedAt: mirror.completedAt ?? null,
      status: Number(mirror.progressPercentage || 0) >= 100 ? "completed" : "active",
    });
  }

  return rows;
};

const lessonPayload = (lesson) => ({
  ...withId(lesson),
  duration: lesson.duration_minutes ?? lesson.duration_min ?? 15,
});

/* ------------------------------------------------------------------- routes */

/** GET /api/student/profile */
exports.profile = async (req, res, next) => {
  try {
    const student = await currentStudent(req);
    if (!student) return res.status(404).json({ message: "Student profile not linked to this account" });
    touchStreak(student);
    student.rankTitle = rankForXp(student.xpPoints);
    await student.save();

    const courses = await enrolledCourseRows(student);
    return res.json({
      student: publicStudent(student),
      gamification: gamificationPayload(student),
      courses,
    });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/student/continue-lesson */
exports.continueLesson = async (req, res, next) => {
  try {
    const student = await currentStudent(req);
    if (!student) return res.status(404).json({ message: "Student profile not linked to this account" });
    const enrollments = await Enrollment.find({ student_id: student._id })
      .populate("course_id")
      .sort("-updatedAt")
      .lean();

    for (const enrollment of enrollments) {
      const course = enrollment.course_id;
      if (!course) continue;
      const [lessons, progressRows] = await Promise.all([
        Lesson.find({ course_id: course._id }).sort({ position: 1, order: 1 }).lean(),
        LessonProgress.find({ student_id: student._id, course_id: course._id }).select("lesson_id").lean(),
      ]);
      const done = new Set(progressRows.map((row) => String(row.lesson_id)));
      const next = lessons.find((lesson) => !done.has(String(lesson._id)));
      if (!next) continue;
      const progress = lessons.length ? Math.round((done.size / lessons.length) * 100) : 0;
      return res.json({
        enrollmentId: String(enrollment._id),
        course: withId(course),
        lesson: lessonPayload(next),
        progress,
        totalLessons: lessons.length,
        completedLessons: done.size,
        remainingLessons: lessons.length - done.size,
        resumeUrl: `/student/learn/${course.slug}`,
      });
    }

    return res.json(null);
  } catch (error) {
    return next(error);
  }
};

/** Shared completion handler for both the legacy route and POST /lessons/complete. */
const completeLessonFor = async (res, next, req, courseRef, lessonId, remove = false) => {
  try {
    const student = await currentStudent(req);
    if (!student) return res.status(404).json({ message: "Student profile not linked to this account" });
    const course = await findCourse(courseRef);
    if (!course) return res.status(404).json({ message: "Course not found" });
    const enrollment = await Enrollment.findOne({ student_id: student._id, course_id: course._id });
    if (!enrollment) return res.status(404).json({ message: "You are not enrolled in this course" });
    if (!mongoose.isValidObjectId(lessonId)) return res.status(404).json({ message: "Lesson not found" });
    const lesson = await Lesson.findOne({ _id: lessonId, course_id: course._id }).lean();
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const alreadyComplete = await LessonProgress.exists({ student_id: student._id, lesson_id: lesson._id });
    if (remove) {
      await LessonProgress.deleteOne({ student_id: student._id, lesson_id: lesson._id });
    } else {
      await LessonProgress.findOneAndUpdate(
        { student_id: student._id, lesson_id: lesson._id },
        { course_id: course._id, completed_at: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }

    const stats = await courseStats(student._id, course._id);
    await Enrollment.updateOne(
      { _id: enrollment._id },
      {
        progress: stats.progress,
        status: stats.progress >= 100 ? "completed" : "active",
        completed_lessons: stats.completedLessonIds,
      },
    );

    let xpAwarded = 0;
    let badgeAwarded = null;
    const mirror = syncEnrolledCourse(student, course._id, {
      progressPercentage: stats.progress,
      completedLessons: stats.completedLessonIds,
    });

    if (!remove) {
      if (!alreadyComplete) {
        xpAwarded = 20;
        awardXp(student, xpAwarded);
      }
      if (stats.progress >= 100 && !mirror.certificateId) {
        mirror.certificateId = certificateCode();
        mirror.completedAt = new Date();
      }
      if (stats.progress >= 100) {
        badgeAwarded = awardBadge(student, BADGES.courseFinisher) || badgeAwarded;
        if (!mirror.completedAt) mirror.completedAt = new Date();
      }
      const completedCount = await LessonProgress.countDocuments({ student_id: student._id });
      if (completedCount === 1) {
        badgeAwarded = awardBadge(student, BADGES.firstRobot) || badgeAwarded;
      }
      if (Number(student.streakDays || 0) >= 5) {
        badgeAwarded = awardBadge(student, BADGES.streakStarter) || badgeAwarded;
      }
    }

    await student.save();

    if (!remove && stats.progress >= 100 && !alreadyComplete && student.user_id) {
      await Notification.create({
        user_id: student.user_id,
        title: "Course completed",
        message: `You finished ${course.title}. Your certificate is ready.`,
        link: "/student/certificates",
      });
    }

    return res.json({
      lessonId: String(lesson._id),
      completed: !remove,
      progress: stats.progress,
      total: stats.totalLessons,
      done: stats.completedLessonIds.length,
      xpAwarded,
      badgeAwarded,
      gamification: gamificationPayload(student),
      certificate:
        stats.progress >= 100 && mirror.certificateId
          ? {
              id: mirror.certificateId,
              code: mirror.certificateId,
              courseTitle: course.title,
              issuedAt: mirror.completedAt,
            }
          : null,
      course: withId(course),
    });
  } catch (error) {
    return next(error);
  }
};

/** POST /api/student/lessons/complete */
exports.completeLessonV2 = (req, res, next) =>
  completeLessonFor(res, next, req, req.body.courseId, req.body.lessonId, false);

/** Legacy: POST / DELETE /api/student/courses/:id/lessons/:lessonId/complete */
exports.completeLesson = (req, res, next) =>
  completeLessonFor(res, next, req, req.params.id, req.params.lessonId, req.method === "DELETE");

/** GET /api/student/overview */
exports.overview = async (req, res, next) => {
  try {
    const student = await currentStudent(req);
    if (!student) return res.status(404).json({ message: "Student profile not linked to this account" });
    const enrollments = await Enrollment.find({ student_id: student._id }).populate("course_id").lean();
    const courses = [];
    for (const enrollment of enrollments) {
      if (!enrollment.course_id) continue;
      const stats = await courseStats(student._id, enrollment.course_id._id);
      courses.push({
        enrollmentId: String(enrollment._id),
        course: withId(enrollment.course_id),
        progress: stats.progress,
        totalLessons: stats.totalLessons,
        completedLessons: stats.completedLessonIds.length,
      });
    }
    const assignments = await Assignment.find({ batch_id: student.batch_id?._id || student.batch_id }).sort("due_date").lean();
    const submissions = await AssignmentSubmission.find({ student_id: student._id }).lean();
    const submissionMap = new Map(submissions.map((s) => [String(s.assignment_id), s]));
    const pending = assignments.filter((a) => !submissionMap.has(String(a._id)));
    const quizzes = await QuizSubmission.find({ student_id: student._id }).lean();
    const avgProgress = courses.length ? Math.round(courses.reduce((n, c) => n + c.progress, 0) / courses.length) : 0;
    return res.json({
      student: withId(student.toObject ? student.toObject() : student),
      gamification: gamificationPayload(student),
      kpis: {
        courses: courses.length,
        avgProgress,
        pendingAssignments: pending.length,
        certificates: courses.filter((c) => c.progress >= 100).length,
        quizAverage: quizzes.length ? Math.round(quizzes.reduce((n, q) => n + Number(q.score || 0), 0) / quizzes.length) : null,
        xpPoints: Number(student.xpPoints || 0),
        streakDays: Number(student.streakDays || 1),
        badges: (student.badges || []).length,
        rankTitle: student.rankTitle || rankForXp(student.xpPoints),
        level: levelForXp(student.xpPoints),
      },
      courses,
      upcomingAssignments: withIds(pending.slice(0, 4)).map((a) => ({ ...a, submission: null })),
      graded: withIds(submissions.filter((s) => s.status === "graded").slice(0, 4)),
    });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/student/courses */
exports.myCourses = async (req, res, next) => {
  try {
    const student = await currentStudent(req);
    if (!student) return res.json([]);
    const rows = await enrolledCourseRows(student);
    return res.json(
      rows.map((row) => ({
        enrollmentId: row.enrollmentId ?? row.courseId,
        course: row.course,
        progress: row.progress,
        totalLessons: row.totalLessons,
        completedLessons: row.completedLessons,
        certificateId: row.certificateId,
      })),
    );
  } catch (error) {
    return next(error);
  }
};

/** GET /api/student/courses/:id */
exports.courseDetail = async (req, res, next) => {
  try {
    const student = await currentStudent(req);
    if (!student) return res.status(404).json({ message: "Student profile not linked to this account" });
    const course = await findCourse(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    const enrollment = await Enrollment.findOne({ student_id: student._id, course_id: course._id }).lean();
    if (!enrollment) return res.status(404).json({ message: "You are not enrolled in this course" });
    const lessons = await Lesson.find({ course_id: course._id }).sort({ position: 1, order: 1 }).lean();
    const completed = new Set(
      (
        await LessonProgress.find({ student_id: student._id, course_id: course._id })
          .select("lesson_id")
          .lean()
      ).map((row) => String(row.lesson_id)),
    );
    const progress = lessons.length ? Math.round((completed.size / lessons.length) * 100) : Math.round(Number(enrollment.progress || 0));
    const mirror = mirrorFor(student, course._id);
    return res.json({
      enrollmentId: String(enrollment._id),
      course: withId(course),
      lessons: withIds(lessons).map((lesson) => ({ ...lesson, completed: completed.has(String(lesson._id)) })),
      totalLessons: lessons.length,
      completedLessons: completed.size,
      progress,
      certificateId: mirror?.certificateId || null,
      gamification: gamificationPayload(student),
    });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/student/assignments — pending / submitted / graded */
exports.listAssignments = async (req, res, next) => {
  try {
    const student = await currentStudent(req);
    if (!student) return res.json([]);
    const batchId = student.batch_id?._id || student.batch_id;
    const assignments = await Assignment.find({ batch_id: batchId }).populate("batch_id", "name").sort("due_date").lean();
    const submissions = await AssignmentSubmission.find({ student_id: student._id }).lean();
    const map = new Map(submissions.map((s) => [String(s.assignment_id), withId(s)]));
    return res.json(
      withIds(assignments).map((assignment) => {
        const submission = map.get(String(assignment._id)) || null;
        const status = submission ? (submission.status === "graded" ? "graded" : "submitted") : "pending";
        return { ...assignment, submission, status };
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/** POST /api/student/assignments/:id/submit */
exports.submitAssignment = async (req, res, next) => {
  try {
    const student = await currentStudent(req);
    if (!student) return res.status(404).json({ message: "Student profile not linked to this account" });
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    const batchId = student.batch_id?._id || student.batch_id;
    if (String(assignment.batch_id) !== String(batchId)) return res.status(403).json({ message: "This assignment is not for your batch" });

    const content = String(req.body.content || "").trim();
    const fileUrl = String(req.body.fileUrl || req.body.file_url || "").trim();
    const projectUrl = String(req.body.projectUrl || req.body.project_url || "").trim();
    if (!content && !fileUrl && !projectUrl) {
      return res.status(400).json({ message: "Add your work, a project link or a file before submitting" });
    }

    const existing = await AssignmentSubmission.findOne({ assignment_id: assignment._id, student_id: student._id });
    const submission = await AssignmentSubmission.findOneAndUpdate(
      { assignment_id: assignment._id, student_id: student._id },
      {
        content: content || undefined,
        file_url: fileUrl || undefined,
        project_url: projectUrl || undefined,
        status: "submitted",
        submitted_at: new Date(),
        marks: null,
        feedback: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    let xpAwarded = 0;
    let badgeAwarded = null;
    if (!existing) {
      xpAwarded = 25;
      awardXp(student, xpAwarded);
      badgeAwarded = awardBadge(student, BADGES.assignmentHero);
      await student.save();
    }

    if (assignment.teacher_id) {
      const teacher = await Teacher.findById(assignment.teacher_id);
      if (teacher?.user_id) {
        await Notification.create({
          user_id: teacher.user_id,
          title: "New submission",
          message: `${student.full_name} submitted ${assignment.title}.`,
          link: "/teacher/dashboard",
        });
      }
    }

    return res.status(201).json({
      ...withId(submission.toObject()),
      xpAwarded,
      badgeAwarded,
      gamification: gamificationPayload(student),
    });
  } catch (error) {
    return next(error);
  }
};

/** POST /api/student/quizzes/submit — score is correct answers (or a %) + totalQuestions. */
exports.submitQuizV2 = async (req, res, next) => {
  try {
    const student = await currentStudent(req);
    if (!student) return res.status(404).json({ message: "Student profile not linked to this account" });
    const rawScore = Number(req.body.score || 0);
    const totalQuestions = Number(req.body.totalQuestions || 0);
    const percent =
      totalQuestions > 0 && rawScore <= totalQuestions
        ? Math.round((rawScore / totalQuestions) * 100)
        : Math.round(rawScore);
    const score = Math.max(0, Math.min(100, percent));

    let xpAwarded = 0;
    let badgeAwarded = null;
    if (score >= 100) {
      xpAwarded = 30;
      badgeAwarded = awardBadge(student, BADGES.quizAce);
    } else if (score > 70) {
      xpAwarded = 10;
    }
    if (xpAwarded) awardXp(student, xpAwarded);
    else touchStreak(student);
    await student.save();

    let course = null;
    if (req.body.courseId) course = await findCourse(req.body.courseId);

    return res.status(201).json({
      score,
      passed: score >= 50,
      xpAwarded,
      badgeAwarded,
      gamification: gamificationPayload(student),
      course: course ? { id: String(course._id), title: course.title } : null,
      lessonId: req.body.lessonId ? String(req.body.lessonId) : null,
    });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/student/quizzes */
exports.listQuizzes = async (req, res, next) => {
  try {
    const student = await currentStudent(req);
    if (!student) return res.json([]);
    const courseIds = (await Enrollment.find({ student_id: student._id }).select("course_id").lean()).map((row) => row.course_id);
    const quizzes = await Quiz.find({ course_id: { $in: courseIds } }).populate("course_id", "title").lean();
    const submissions = await QuizSubmission.find({ student_id: student._id }).lean();
    return res.json(
      withIds(quizzes).map((quiz) => {
        const attempts = submissions.filter((s) => String(s.quiz_id) === String(quiz._id));
        const best = attempts.length ? Math.max(...attempts.map((a) => Number(a.score || 0))) : null;
        return { ...quiz, questionCount: quiz.questions?.length || 0, questions: undefined, attempts: attempts.length, bestScore: best };
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/** GET /api/student/quizzes/:id — hides correct answers. */
exports.getQuiz = async (req, res, next) => {
  try {
    const student = await currentStudent(req);
    if (!student) return res.status(404).json({ message: "Student profile not linked to this account" });
    const quiz = await Quiz.findById(req.params.id).populate("course_id", "title").lean();
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    const attempts = await QuizSubmission.find({ student_id: student._id, quiz_id: quiz._id }).sort("-createdAt").lean();
    return res.json({
      ...withId(quiz),
      questions: (quiz.questions || []).map((question, index) => ({
        index,
        question: question.question,
        options: question.options || [],
      })),
      attempts: withIds(attempts),
    });
  } catch (error) {
    return next(error);
  }
};

/** POST /api/student/quizzes/:id/submit */
exports.submitQuiz = async (req, res, next) => {
  try {
    const student = await currentStudent(req);
    if (!student) return res.status(404).json({ message: "Student profile not linked to this account" });
    const quiz = await Quiz.findById(req.params.id).populate("course_id", "title");
    if (!quiz || !Array.isArray(req.body.answers)) return res.status(400).json({ message: "Valid quiz and answers are required" });
    const correct = quiz.questions.reduce((total, question, index) => total + (Number(req.body.answers[index]) === Number(question.correct_index) ? 1 : 0), 0);
    const score = quiz.questions.length ? Math.round((correct / quiz.questions.length) * 100) : 0;
    const submission = await QuizSubmission.create({ student_id: student._id, quiz_id: quiz._id, answers: req.body.answers.map(Number), score, passed: score >= 50 });

    let xpAwarded = 0;
    let badgeAwarded = null;
    if (score >= 100) {
      xpAwarded = 30;
      badgeAwarded = awardBadge(student, BADGES.quizAce);
    } else if (score > 70) {
      xpAwarded = 10;
    }
    if (xpAwarded) awardXp(student, xpAwarded);
    else touchStreak(student);
    await student.save();

    if (student.user_id) {
      await Notification.create({
        user_id: student.user_id,
        title: score >= 50 ? "Quiz passed" : "Quiz completed",
        message: `${quiz.course_id?.title || quiz.title}: ${score}% (${correct}/${quiz.questions.length})`,
        link: "/student/quizzes",
      });
    }
    return res.status(201).json({
      score,
      passed: submission.passed,
      correct,
      total: quiz.questions.length,
      submissionId: String(submission._id),
      xpAwarded,
      badgeAwarded,
      gamification: gamificationPayload(student),
    });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/student/live-classes */
exports.liveClasses = async (req, res, next) => {
  try {
    const student = await currentStudent(req);
    if (!student) return res.json({ batch: null, sessions: [], now: new Date().toISOString() });
    const batchId = student.batch_id?._id || student.batch_id;
    const sessions = await LiveSession.find({ batchId })
      .populate("teacherId", "full_name email avatar_url")
      .sort("startTime")
      .lean();
    const now = new Date();
    const rows = sessions
      .map((session) => {
        const start = session.startTime ? new Date(session.startTime) : null;
        const end = session.endTime ? new Date(session.endTime) : null;
        let status = session.status || "upcoming";
        if (status !== "completed") {
          if (start && end && now >= start && now <= end) status = "live";
          else if (end && now > end) status = "completed";
          else status = "upcoming";
        }
        return {
          ...withId(session),
          status,
          teacherName: session.teacherId?.full_name ?? "AIKIDZ instructor",
          batchName: student.batch_id?.name ?? "Your batch",
          canJoin: status === "live",
        };
      })
      .filter((session) => session.status !== "completed")
      .sort((a, b) => {
        if (a.status === "live" && b.status !== "live") return -1;
        if (b.status === "live" && a.status !== "live") return 1;
        return new Date(a.startTime || 0) - new Date(b.startTime || 0);
      });
    return res.json({
      batch: student.batch_id ? { id: String(student.batch_id._id), name: student.batch_id.name, schedule: student.batch_id.schedule } : null,
      sessions: rows,
      now: now.toISOString(),
    });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/student/diy-guides */
exports.diyGuides = async (req, res, next) => {
  try {
    const guides = await DiyKitGuide.find().sort("createdAt").lean();
    return res.json(withIds(guides));
  } catch (error) {
    return next(error);
  }
};

/** GET /api/student/certificates */
exports.certificates = async (req, res, next) => {
  try {
    const student = await currentStudent(req);
    if (!student) return res.json([]);
    const enrollments = await Enrollment.find({ student_id: student._id }).populate("course_id").lean();
    const rows = [];
    let dirty = false;
    for (const enrollment of enrollments) {
      if (!enrollment.course_id) continue;
      const stats = await courseStats(student._id, enrollment.course_id._id);
      if (stats.progress < 100) continue;
      const mirror = mirrorFor(student, enrollment.course_id._id);
      let code = mirror?.certificateId;
      if (!code) {
        code = certificateCode();
        const row = syncEnrolledCourse(student, enrollment.course_id._id, {
          progressPercentage: stats.progress,
          completedLessons: stats.completedLessonIds,
          certificateId: code,
          completedAt: mirror?.completedAt || new Date(),
        });
        row.certificateId = code;
        dirty = true;
      }
      rows.push({
        id: String(enrollment._id),
        course: withId(enrollment.course_id),
        progress: stats.progress,
        code,
        issuedAt: mirror?.completedAt || enrollment.updatedAt || enrollment.enrolled_at,
      });
    }
    if (dirty) await student.save();
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
};

/** GET /api/student/attendance */
exports.attendance = async (req, res, next) => {
  try {
    const student = await currentStudent(req);
    if (!student) return res.json({ summary: { present: 0, absent: 0, late: 0, total: 0, percentage: 0 }, records: [] });
    const { monthRange } = require("./helpers");
    const AttendanceRecord = require("../models").AttendanceRecord;
    const { start, end } = monthRange(req.query.month);
    const records = await AttendanceRecord.find({ student_id: student._id, date: { $gte: start, $lt: end } }).sort("date").lean();
    const present = records.filter((r) => r.status === "present").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const late = records.filter((r) => r.status === "late").length;
    return res.json({
      month: start.toISOString().slice(0, 7),
      summary: { present, absent, late, total: records.length, percentage: pct(present + late, records.length) },
      records: withIds(records),
    });
  } catch (error) {
    return next(error);
  }
};
