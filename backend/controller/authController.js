const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, School, Franchise, Student, Parent } = require("../models");

const publicRoles = ["student", "parent", "school_admin", "franchise"];
const organizationCode = (name) => `${name.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;
const userResponse = (user) => ({ id: user._id, email: user.email, full_name: user.full_name, phone: user.phone || null, city: user.city || null, state: user.state || null, avatar_url: user.avatar_url || null, roles: user.roles });
const tokenFor = (user) => jwt.sign({ id: user._id, roles: user.roles }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "1d" });

exports.register = async (req, res, next) => {
  try {
    const { email, password, full_name, role, organization_name, address, phone, territory } = req.body;
    if (!publicRoles.includes(role)) return res.status(400).json({ message: "Only student, parent, school_admin or franchise may register publicly" });
    if (!email || !password || !full_name) return res.status(400).json({ message: "email, password and full_name are required" });
    if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ message: "Email is already registered" });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
    const user = await User.create({ email, password: await bcrypt.hash(password, 12), full_name, phone: phone || undefined, city: req.body.city || undefined, state: req.body.state || undefined, roles: [role] });
    if (role === "student") await Student.create({ user_id: user._id, full_name, status: "active" });
    if (role === "parent") await Parent.create({ user_id: user._id, full_name, email, phone: phone || undefined });
    if (role === "school_admin") await School.create({ name: organization_name || `${full_name}'s School`, code: organizationCode(organization_name || full_name), address, contact_email: email, contact_phone: phone, owner_id: user._id, status: "active" });
    if (role === "franchise") await Franchise.create({ name: organization_name || `${full_name}'s Franchise`, code: organizationCode(organization_name || full_name), territory, contact_email: email, owner_id: user._id, status: "active" });
    return res.status(201).json({ token: tokenFor(user), user: userResponse(user) });
  } catch (error) { return next(error); }
};

exports.login = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase() }).select("+password");
    if (!user || !(await bcrypt.compare(req.body.password || "", user.password))) return res.status(401).json({ message: "Invalid email or password" });
    return res.json({ token: tokenFor(user), user: userResponse(user) });
  } catch (error) { return next(error); }
};

exports.logout = async (_req, res) => res.status(204).end();

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user: userResponse(user) });
  } catch (error) { return next(error); }
};
