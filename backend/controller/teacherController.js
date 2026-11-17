const { Teacher, Batch, AttendanceRecord, Assignment, AssignmentSubmission } = require("../models");
const currentTeacher = (req) => Teacher.findOne({ user_id: req.user.id });

exports.listBatches = async (req, res, next) => { try { const teacher = await currentTeacher(req); return res.json(teacher ? await Batch.find({ teacher_id: teacher._id }) : []); } catch (error) { return next(error); } };
exports.markAttendance = async (req, res, next) => {
  try {
    const teacher = await currentTeacher(req);
    if (!teacher) return res.status(404).json({ message: "Teacher profile not found" });
    const batch = await Batch.findOne({ _id: req.body.batch_id, teacher_id: teacher._id });
    if (!batch || !Array.isArray(req.body.records)) return res.status(400).json({ message: "Assigned batch and attendance records are required" });
    const date = new Date(req.body.date);
    const records = await Promise.all(req.body.records.map(({ student_id, status }) => AttendanceRecord.findOneAndUpdate({ student_id, batch_id: batch._id, date }, { status, marked_by: req.user.id }, { upsert: true, new: true, setDefaultsOnInsert: true })));
    return res.json(records);
  } catch (error) { return next(error); }
};
exports.listAssignments = async (req, res, next) => { try { const teacher = await currentTeacher(req); return res.json(teacher ? await Assignment.find({ teacher_id: teacher._id }).populate("batch_id") : []); } catch (error) { return next(error); } };
exports.createAssignment = async (req, res, next) => {
  try {
    const teacher = await currentTeacher(req);
    const batch = await Batch.findOne({ _id: req.body.batch_id, teacher_id: teacher?._id });
    if (!teacher || !batch) return res.status(400).json({ message: "Assigned batch is required" });
    return res.status(201).json(await Assignment.create({ batch_id: batch._id, teacher_id: teacher._id, title: req.body.title, description: req.body.description, due_date: req.body.due_date }));
  } catch (error) { return next(error); }
};
exports.gradeSubmission = async (req, res, next) => {
  try {
    const teacher = await currentTeacher(req);
    const submission = await AssignmentSubmission.findById(req.body.submission_id).populate("assignment_id");
    if (!teacher || !submission || String(submission.assignment_id.teacher_id) !== String(teacher._id)) return res.status(404).json({ message: "Submission not found" });
    submission.marks = req.body.marks; submission.feedback = req.body.feedback; await submission.save();
    return res.json(submission);
  } catch (error) { return next(error); }
};
