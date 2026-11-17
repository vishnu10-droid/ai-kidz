const {
  Teacher,
  Batch,
  Student,
  AttendanceRecord,
  Assignment,
  AssignmentSubmission,
  Notification,
} = require("../models");
const { withId, withIds, dayOnly, pct } = require("./helpers");

const currentTeacher = (req) => Teacher.findOne({ user_id: req.user.id });

const decorateBatches = async (batches) => {
  const ids = batches.map((b) => b._id);
  const [counts, pending] = await Promise.all([
    Student.aggregate([{ $match: { batch_id: { $in: ids } } }, { $group: { _id: "$batch_id", n: { $sum: 1 } } }]),
    Assignment.aggregate([
      { $match: { batch_id: { $in: ids } } },
      {
        $lookup: {
          from: "assignmentsubmissions",
          let: { assignmentId: "$_id" },
          pipeline: [{ $match: { $expr: { $eq: ["$assignment_id", "$$assignmentId"] } } }],
          as: "subs",
        },
      },
      { $project: { batch_id: 1, subs: { $size: "$subs" } } },
    ]),
  ]);
  const countMap = new Map(counts.map((row) => [String(row._id), row.n]));
  return withIds(batches).map((batch) => ({
    ...batch,
    studentCount: countMap.get(String(batch._id)) || 0,
    assignmentCount: pending.filter((row) => String(row.batch_id) === String(batch._id)).length,
  }));
};

/** GET /api/teacher/overview */
exports.overview = async (req, res, next) => {
  try {
    const teacher = await currentTeacher(req);
    if (!teacher) return res.status(404).json({ message: "Teacher profile not linked to this account" });
    const batches = await Batch.find({ teacher_id: teacher._id }).populate("school_id", "name city").populate("franchise_id", "name city").lean();
    const decorated = await decorateBatches(batches);
    const batchIds = batches.map((b) => b._id);
    const [students, assignments, submissions, attendance] = await Promise.all([
      Student.countDocuments({ batch_id: { $in: batchIds } }),
      Assignment.find({ teacher_id: teacher._id }).populate("batch_id", "name").sort("-createdAt").lean(),
      AssignmentSubmission.find({ assignment_id: { $in: (await Assignment.find({ teacher_id: teacher._id }).select("_id").lean()).map((a) => a._id) } })
        .populate("student_id", "full_name roll_number")
        .populate("assignment_id", "title max_marks")
        .sort("-createdAt")
        .lean(),
      AttendanceRecord.find({ batch_id: { $in: batchIds } }).lean(),
    ]);
    const present = attendance.filter((row) => row.status === "present").length;
    return res.json({
      teacher: withId(teacher.toObject()),
      kpis: {
        batches: batches.length,
        students,
        assignments: assignments.length,
        pendingGrading: submissions.filter((row) => row.status !== "graded").length,
        attendanceRate: pct(present, attendance.length),
      },
      batches: decorated,
      assignments: withIds(assignments),
      submissions: withIds(submissions),
    });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/teacher/batches */
exports.listBatches = async (req, res, next) => {
  try {
    const teacher = await currentTeacher(req);
    if (!teacher) return res.json([]);
    const batches = await Batch.find({ teacher_id: teacher._id })
      .populate("school_id", "name city")
      .populate("franchise_id", "name city")
      .sort("-createdAt")
      .lean();
    return res.json(await decorateBatches(batches));
  } catch (error) {
    return next(error);
  }
};

exports.batchStudents = async (req, res, next) => {
  try {
    const teacher = await currentTeacher(req);
    const batch = teacher && (await Batch.findOne({ _id: req.params.id, teacher_id: teacher._id }));
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    const students = await Student.find({ batch_id: batch._id }).sort("full_name").lean();
    return res.json(withIds(students));
  } catch (error) {
    return next(error);
  }
};

/** GET /api/teacher/students */
exports.listStudents = async (req, res, next) => {
  try {
    const teacher = await currentTeacher(req);
    if (!teacher) return res.json([]);
    const batchIds = (await Batch.find({ teacher_id: teacher._id }).select("_id name").lean()).map((b) => b._id);
    const students = await Student.find({ batch_id: { $in: batchIds } }).populate("batch_id", "name").sort("full_name").lean();
    return res.json(withIds(students));
  } catch (error) {
    return next(error);
  }
};

/** GET /api/teacher/attendance?batch_id&date */
exports.getAttendance = async (req, res, next) => {
  try {
    const teacher = await currentTeacher(req);
    const { batch_id } = req.query;
    if (!teacher || !batch_id) return res.status(400).json({ message: "An assigned batch is required" });
    const batch = await Batch.findOne({ _id: batch_id, teacher_id: teacher._id });
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    const date = dayOnly(req.query.date);
    const [students, records] = await Promise.all([
      Student.find({ batch_id: batch._id }).sort("full_name").lean(),
      AttendanceRecord.find({ batch_id: batch._id, date }).lean(),
    ]);
    const byStudent = new Map(records.map((row) => [String(row.student_id), row.status]));
    return res.json({
      batch: withId(batch.toObject()),
      date,
      rows: withIds(students).map((student) => ({ student, status: byStudent.get(String(student._id)) || "present" })),
    });
  } catch (error) {
    return next(error);
  }
};

/** POST /api/teacher/attendance */
exports.markAttendance = async (req, res, next) => {
  try {
    const teacher = await currentTeacher(req);
    const batch = teacher && (await Batch.findOne({ _id: req.body.batch_id, teacher_id: teacher._id }));
    if (!batch || !Array.isArray(req.body.records)) return res.status(400).json({ message: "Assigned batch and attendance records are required" });
    const date = dayOnly(req.body.date);
    const allowed = new Set((await Student.find({ batch_id: batch._id }).select("_id").lean()).map((s) => String(s._id)));
    let saved = 0;
    for (const record of req.body.records) {
      if (!allowed.has(String(record.student_id))) continue;
      await AttendanceRecord.findOneAndUpdate(
        { student_id: record.student_id, batch_id: batch._id, date },
        { status: record.status || "present", marked_by: req.user.id },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      saved += 1;
    }
    return res.json({ saved, date });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/teacher/assignments */
exports.listAssignments = async (req, res, next) => {
  try {
    const teacher = await currentTeacher(req);
    if (!teacher) return res.json([]);
    const assignments = await Assignment.find({ teacher_id: teacher._id }).populate("batch_id", "name grade").sort("-createdAt").lean();
    const submissions = await AssignmentSubmission.find({ assignment_id: { $in: assignments.map((a) => a._id) } }).lean();
    return res.json(
      withIds(assignments).map((assignment) => {
        const rows = submissions.filter((row) => String(row.assignment_id) === String(assignment._id));
        return {
          ...assignment,
          submissionCount: rows.length,
          gradedCount: rows.filter((row) => row.status === "graded").length,
          pendingCount: rows.filter((row) => row.status !== "graded").length,
        };
      }),
    );
  } catch (error) {
    return next(error);
  }
};

exports.createAssignment = async (req, res, next) => {
  try {
    const teacher = await currentTeacher(req);
    const batch = teacher && (await Batch.findOne({ _id: req.body.batch_id, teacher_id: teacher._id }));
    if (!teacher || !batch) return res.status(400).json({ message: "Choose one of your batches" });
    if (!req.body.title) return res.status(400).json({ message: "Title is required" });
    const assignment = await Assignment.create({
      batch_id: batch._id,
      teacher_id: teacher._id,
      title: req.body.title,
      description: req.body.description,
      due_date: req.body.due_date || undefined,
      max_marks: Number(req.body.max_marks || 100),
    });
    const students = await Student.find({ batch_id: batch._id }).select("user_id").lean();
    await Notification.insertMany(
      students.filter((s) => s.user_id).map((student) => ({
        user_id: student.user_id,
        title: "New assignment",
        message: `${assignment.title} · due ${assignment.due_date ? new Date(assignment.due_date).toLocaleDateString("en-IN") : "soon"}`,
        link: "/student/assignments",
      })),
    );
    return res.status(201).json(withId(assignment.toObject()));
  } catch (error) {
    return next(error);
  }
};

exports.updateAssignment = async (req, res, next) => {
  try {
    const teacher = await currentTeacher(req);
    if (!teacher) return res.status(404).json({ message: "Teacher profile not found" });
    const allowed = ["title", "description", "due_date", "max_marks"];
    const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const assignment = await Assignment.findOneAndUpdate({ _id: req.params.id, teacher_id: teacher._id }, update, { new: true }).lean();
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    return res.json(withId(assignment));
  } catch (error) {
    return next(error);
  }
};

exports.deleteAssignment = async (req, res, next) => {
  try {
    const teacher = await currentTeacher(req);
    if (!teacher) return res.status(404).json({ message: "Teacher profile not found" });
    const assignment = await Assignment.findOneAndDelete({ _id: req.params.id, teacher_id: teacher._id });
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    await AssignmentSubmission.deleteMany({ assignment_id: assignment._id });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/teacher/submissions */
exports.listSubmissions = async (req, res, next) => {
  try {
    const teacher = await currentTeacher(req);
    if (!teacher) return res.json([]);
    const assignmentIds = (await Assignment.find({ teacher_id: teacher._id }).select("_id").lean()).map((a) => a._id);
    const filter = { assignment_id: { $in: assignmentIds } };
    if (req.query.assignment_id) filter.assignment_id = req.query.assignment_id;
    if (req.query.status) filter.status = req.query.status;
    const submissions = await AssignmentSubmission.find(filter)
      .populate("student_id", "full_name roll_number")
      .populate("assignment_id", "title batch_id max_marks")
      .sort("-createdAt")
      .lean();
    return res.json(withIds(submissions));
  } catch (error) {
    return next(error);
  }
};

/** POST /api/teacher/submissions/:id/grade */
exports.gradeSubmission = async (req, res, next) => {
  try {
    const teacher = await currentTeacher(req);
    const submission = await AssignmentSubmission.findById(req.params.id).populate("assignment_id");
    if (!teacher || !submission || String(submission.assignment_id.teacher_id) !== String(teacher._id)) {
      return res.status(404).json({ message: "Submission not found" });
    }
    const marks = Number(req.body.marks);
    if (!Number.isFinite(marks) || marks < 0 || marks > 100) {
      return res.status(400).json({ message: "Marks must be between 0 and 100" });
    }
    submission.marks = marks;
    submission.feedback = req.body.feedback || "";
    submission.status = "graded";
    await submission.save();

    const student = await Student.findById(submission.student_id);
    if (student?.user_id) {
      await Notification.create({
        user_id: student.user_id,
        title: "Assignment graded",
        message: `${submission.assignment_id.title} · ${marks}/100${submission.feedback ? ` · ${submission.feedback}` : ""}`,
        link: "/student/assignments",
      });
    }
    return res.json(withId(submission.toObject()));
  } catch (error) {
    return next(error);
  }
};
