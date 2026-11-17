const { Enrollment, Lesson, LessonProgress, Student } = require("../models");

/**
 * GET /api/certificates/verify?code=AKZ-CERT-XXXXX
 * Public lookup: only the holder's name, course and issue date are returned.
 *
 * Legacy `AIK-XXXXXX` codes (derived from the enrollment id) are still accepted.
 */
exports.verify = async (req, res, next) => {
  try {
    const code = String(req.query.code ?? "").trim().toUpperCase();
    const akz = /^AKZ-CERT-([A-Z0-9]{5,12})$/.exec(code);
    if (akz) {
      const students = await Student.find({ "enrolledCourses.certificateId": code })
        .populate("enrolledCourses.courseId", "title slug")
        .lean();
      for (const student of students) {
        const entry = (student.enrolledCourses || []).find((row) => row.certificateId === code);
        const course = entry?.courseId;
        if (!entry || !course) continue;
        const [total, done] = await Promise.all([
          Lesson.countDocuments({ course_id: course._id }),
          LessonProgress.countDocuments({ student_id: student._id, course_id: course._id }),
        ]);
        const progress = total ? Math.round((done / total) * 100) : 0;
        if (progress < 100) continue;
        return res.json({
          student_name: student.full_name ?? "AIKIDZ learner",
          course_title: course.title,
          issued_at: entry.completedAt || student.updatedAt,
        });
      }
      return res.json(null);
    }

    const match = /^AIK-([0-9A-F]{6})$/.exec(code);
    if (!match) return res.json(null);

    const enrollments = await Enrollment.find()
      .populate("course_id", "title slug")
      .populate("student_id", "full_name")
      .lean();
    const enrollment = enrollments.find((row) =>
      String(row._id).toUpperCase().endsWith(match[1]),
    );
    if (!enrollment || !enrollment.course_id) return res.json(null);

    const [total, done] = await Promise.all([
      Lesson.countDocuments({ course_id: enrollment.course_id._id }),
      LessonProgress.countDocuments({
        student_id: enrollment.student_id?._id,
        course_id: enrollment.course_id._id,
      }),
    ]);
    const progress = total ? Math.round((done / total) * 100) : Math.round(Number(enrollment.progress || 0));
    if (progress < 100) return res.json(null);

    return res.json({
      student_name: enrollment.student_id?.full_name ?? "AIKIDZ learner",
      course_title: enrollment.course_id.title,
      issued_at: enrollment.updatedAt || enrollment.enrolled_at,
    });
  } catch (error) {
    return next(error);
  }
};
