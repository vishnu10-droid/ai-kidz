const { Student, Enrollment, Quiz, QuizSubmission } = require("../models");

exports.myCourses = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user_id: req.user.id });
    if (!student) return res.json([]);
    const rows = await Enrollment.find({ student_id: student._id }).populate("course_id");
    return res.json(rows.map((row) => row.course_id));
  } catch (error) { return next(error); }
};
exports.submitQuiz = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user_id: req.user.id });
    const quiz = await Quiz.findById(req.body.quiz_id);
    if (!student || !quiz || !Array.isArray(req.body.answers)) return res.status(400).json({ message: "Valid quiz and answers are required" });
    const correct = quiz.questions.reduce((total, question, index) => total + (req.body.answers[index] === question.correct_index ? 1 : 0), 0);
    const score = quiz.questions.length ? Math.round((correct / quiz.questions.length) * 100) : 0;
    const submission = await QuizSubmission.create({ student_id: student._id, quiz_id: quiz._id, score, passed: score >= 50 });
    return res.status(201).json({ score, passed: submission.passed, submission_id: submission._id });
  } catch (error) { return next(error); }
};
