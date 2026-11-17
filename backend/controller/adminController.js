const { User, School, Teacher, Student, FeeInvoice, roles } = require("../models");

exports.kpis = async (_req, res, next) => {
  try {
    const [schools, teachers, students, paid] = await Promise.all([School.countDocuments(), Teacher.countDocuments(), Student.countDocuments(), FeeInvoice.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, total: { $sum: "$amount" } } }])]);
    return res.json({ schools, teachers, students, revenue: paid[0]?.total || 0 });
  } catch (error) { return next(error); }
};
exports.listUsers = async (_req, res, next) => { try { return res.json(await User.find().sort("-createdAt")); } catch (error) { return next(error); } };
exports.updateUserRoles = async (req, res, next) => {
  try {
    const nextRoles = req.body.roles;
    if (!Array.isArray(nextRoles) || nextRoles.some((role) => !roles.includes(role))) return res.status(400).json({ message: "Invalid roles" });
    const user = await User.findByIdAndUpdate(req.params.id, { roles: [...new Set(nextRoles)] }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  } catch (error) { return next(error); }
};
