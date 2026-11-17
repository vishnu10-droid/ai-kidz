const {
  Parent,
  Student,
  AttendanceRecord,
  FeeInvoice,
  AssignmentSubmission,
  QuizSubmission,
  Enrollment,
  Notification,
} = require("../models");
const { withId, withIds, pct, money, monthRange } = require("./helpers");

const currentParent = (req) => Parent.findOne({ user_id: req.user.id });

const childOr404 = async (parent, studentId, res) => {
  const child = await Student.findOne({ _id: studentId, parent_id: parent._id })
    .populate("batch_id", "name grade schedule")
    .populate("school_id", "name city")
    .populate("franchise_id", "name city")
    .lean();
  if (!child) {
    res.status(404).json({ message: "Child not found on this account" });
    return null;
  }
  return child;
};

const attendanceSummary = (records) => {
  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const late = records.filter((r) => r.status === "late").length;
  return { present, absent, late, total: records.length, percentage: pct(present + late, records.length) };
};

/** GET /api/parent/overview */
exports.overview = async (req, res, next) => {
  try {
    const parent = await currentParent(req);
    if (!parent) return res.status(404).json({ message: "Parent profile not linked to this account" });
    const children = await Student.find({ parent_id: parent._id })
      .populate("batch_id", "name grade schedule")
      .populate("school_id", "name city")
      .populate("franchise_id", "name city")
      .lean();
    const ids = children.map((c) => c._id);
    const [attendance, fees, submissions, quizzes, enrollments] = await Promise.all([
      AttendanceRecord.find({ student_id: { $in: ids } }).lean(),
      FeeInvoice.find({ student_id: { $in: ids } }).sort("-createdAt").lean(),
      AssignmentSubmission.find({ student_id: { $in: ids } }).populate("assignment_id", "title max_marks").sort("-createdAt").lean(),
      QuizSubmission.find({ student_id: { $in: ids } }).populate("quiz_id", "title").lean(),
      Enrollment.find({ student_id: { $in: ids } }).populate("course_id", "title slug image_url").lean(),
    ]);
    const pending = fees.filter((f) => f.status === "pending");
    return res.json({
      parent: withId(parent.toObject()),
      children: withIds(children),
      kpis: {
        children: children.length,
        attendanceRate: attendanceSummary(attendance).percentage,
        pendingFees: pending.length,
        pendingAmount: money(pending.reduce((n, f) => n + Number(f.amount || 0), 0)),
        paidAmount: money(fees.filter((f) => f.status === "paid").reduce((n, f) => n + Number(f.amount || 0), 0)),
        graded: submissions.filter((s) => s.status === "graded").length,
      },
      attendance: attendanceSummary(attendance),
      fees: withIds(fees),
      recentGrades: withIds(submissions.filter((s) => s.status === "graded").slice(0, 5)),
      quizzes: withIds(quizzes),
      courses: withIds(enrollments),
    });
  } catch (error) {
    return next(error);
  }
};

exports.listChildren = async (req, res, next) => {
  try {
    const parent = await currentParent(req);
    if (!parent) return res.status(404).json({ message: "Parent profile not linked to this account" });
    const children = await Student.find({ parent_id: parent._id })
      .populate("batch_id", "name grade schedule")
      .populate("school_id", "name city")
      .sort("full_name")
      .lean();
    return res.json(withIds(children));
  } catch (error) {
    return next(error);
  }
};

/** GET /api/parent/attendance?student_id&month=YYYY-MM */
exports.attendance = async (req, res, next) => {
  try {
    const parent = await currentParent(req);
    if (!parent) return res.status(404).json({ message: "Parent profile not linked to this account" });
    if (!req.query.student_id) return res.status(400).json({ message: "student_id is required" });
    const child = await childOr404(parent, req.query.student_id, res);
    if (!child) return;
    const { start, end } = monthRange(req.query.month);
    const records = await AttendanceRecord.find({ student_id: child._id, date: { $gte: start, $lt: end } }).sort("date").lean();
    return res.json({
      child: withId(child),
      month: start.toISOString().slice(0, 7),
      summary: attendanceSummary(records),
      records: withIds(records).map((row) => ({ ...row, day: new Date(row.date).getUTCDate() })),
    });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/parent/fees */
exports.listFees = async (req, res, next) => {
  try {
    const parent = await currentParent(req);
    if (!parent) return res.status(404).json({ message: "Parent profile not linked to this account" });
    const children = await Student.find({ parent_id: parent._id }).select("_id full_name").lean();
    const filter = { student_id: { $in: children.map((c) => c._id) } };
    if (req.query.student_id) filter.student_id = req.query.student_id;
    if (req.query.status) filter.status = req.query.status;
    const fees = await FeeInvoice.find(filter).populate("student_id", "full_name roll_number").sort("-createdAt").lean();
    return res.json(withIds(fees));
  } catch (error) {
    return next(error);
  }
};

/** POST /api/parent/fees/:id/pay — simulated online payment. */
exports.payFee = async (req, res, next) => {
  try {
    const parent = await currentParent(req);
    if (!parent) return res.status(404).json({ message: "Parent profile not linked to this account" });
    const children = await Student.find({ parent_id: parent._id }).select("_id").lean();
    const fee = await FeeInvoice.findOne({ _id: req.params.id, student_id: { $in: children.map((c) => c._id) } });
    if (!fee) return res.status(404).json({ message: "Invoice not found" });
    if (fee.status === "paid") return res.status(409).json({ message: "This invoice is already paid" });
    fee.status = "paid";
    fee.paid_at = new Date();
    fee.method = req.body.method || "upi";
    await fee.save();
    if (parent.user_id) {
      await Notification.create({ user_id: parent.user_id, title: "Payment successful", message: `${fee.title} · Rs ${Number(fee.amount).toLocaleString("en-IN")} paid.`, link: "/parent/dashboard" });
    }
    return res.json(withId(fee.toObject()));
  } catch (error) {
    return next(error);
  }
};

/** GET /api/parent/progress?student_id */
exports.progress = async (req, res, next) => {
  try {
    const parent = await currentParent(req);
    if (!parent) return res.status(404).json({ message: "Parent profile not linked to this account" });
    if (!req.query.student_id) return res.status(400).json({ message: "student_id is required" });
    const child = await childOr404(parent, req.query.student_id, res);
    if (!child) return;
    const [submissions, quizzes, attendance, enrollments] = await Promise.all([
      AssignmentSubmission.find({ student_id: child._id })
        .populate({ path: "assignment_id", select: "title max_marks due_date" })
        .sort("-createdAt")
        .lean(),
      QuizSubmission.find({ student_id: child._id }).populate("quiz_id", "title").sort("-createdAt").lean(),
      AttendanceRecord.find({ student_id: child._id }).lean(),
      Enrollment.find({ student_id: child._id }).populate("course_id", "title slug image_url").lean(),
    ]);
    const graded = submissions.filter((s) => s.status === "graded");
    const average = graded.length ? Math.round(graded.reduce((n, s) => n + Number(s.marks || 0), 0) / graded.length) : null;
    return res.json({
      child: withId(child),
      summary: {
        attendanceRate: attendanceSummary(attendance).percentage,
        submitted: submissions.length,
        graded: graded.length,
        averageMarks: average,
        quizAverage: quizzes.length ? Math.round(quizzes.reduce((n, q) => n + Number(q.score || 0), 0) / quizzes.length) : null,
      },
      submissions: withIds(submissions),
      quizzes: withIds(quizzes),
      courses: withIds(enrollments),
    });
  } catch (error) {
    return next(error);
  }
};
