const mongoose = require("mongoose");
const { Schema } = mongoose;
const ref = (name, required = false) => ({ type: Schema.Types.ObjectId, ref: name, required });
const model = (name, fields) => mongoose.models[name] || mongoose.model(name, new Schema(fields, { timestamps: true }));
const roles = ["admin", "school_admin", "franchise", "teacher", "student", "parent"];

const User = model("User", { email: { type: String, required: true, unique: true, lowercase: true }, password: { type: String, required: true, select: false }, full_name: { type: String, required: true }, phone: String, city: String, state: String, avatar_url: String, is_active: { type: Boolean, default: true }, roles: [{ type: String, enum: roles }] });
const School = model("School", { name: String, code: { type: String, unique: true }, address: String, contact_email: String, contact_phone: String, owner_id: ref("User", true), status: { type: String, default: "active" } });
const Franchise = model("Franchise", { name: String, code: { type: String, unique: true }, territory: String, contact_email: String, owner_id: ref("User", true), status: { type: String, default: "active" } });
const Teacher = model("Teacher", { user_id: ref("User"), school_id: ref("School"), franchise_id: ref("Franchise"), full_name: String, email: String, phone: String, subject: String, specialization: String, status: { type: String, default: "active" } });
const Student = model("Student", { user_id: ref("User"), school_id: ref("School"), franchise_id: ref("Franchise"), batch_id: ref("Batch"), parent_id: ref("Parent"), full_name: String, roll_number: String, grade: String, age: Number, status: { type: String, default: "active" } });
const Parent = model("Parent", { user_id: ref("User", true), full_name: String, email: String, phone: String });
const CourseCategory = model("CourseCategory", { name: String, slug: String });
const Course = model("Course", { title: String, slug: { type: String, unique: true }, level: String, price: Number, image_url: String, description: String, category_id: ref("CourseCategory"), syllabus: [String], is_published: { type: Boolean, default: true } });
const Lesson = model("Lesson", { course_id: ref("Course"), title: String, order: Number, content: String, video_url: String, duration_min: Number });
const StoreProduct = model("StoreProduct", { name: String, slug: { type: String, unique: true }, price: Number, category: String, description: String, short_description: String, image_url: String, in_stock: Boolean, stock: Number });
const Batch = model("Batch", { name: String, grade: String, school_id: ref("School"), franchise_id: ref("Franchise"), teacher_id: ref("Teacher"), course_id: ref("Course") });
const Enrollment = model("Enrollment", { student_id: ref("Student"), course_id: ref("Course"), batch_id: ref("Batch"), progress: { type: Number, default: 0 }, status: { type: String, default: "active" } });
const AttendanceRecord = model("AttendanceRecord", { student_id: ref("Student"), batch_id: ref("Batch"), date: Date, status: String, marked_by: ref("User") });
const FeeInvoice = model("FeeInvoice", { school_id: ref("School"), franchise_id: ref("Franchise"), student_id: ref("Student"), amount: Number, due_date: Date, status: { type: String, default: "pending" }, receipt_number: String });
const Assignment = model("Assignment", { batch_id: ref("Batch"), course_id: ref("Course"), teacher_id: ref("Teacher"), title: String, description: String, due_date: Date, max_marks: Number });
const AssignmentSubmission = model("AssignmentSubmission", { assignment_id: ref("Assignment"), student_id: ref("Student"), content: String, status: String, marks: Number, feedback: String });
const Quiz = model("Quiz", { course_id: ref("Course"), title: String, questions: [Schema.Types.Mixed] });
const QuizSubmission = model("QuizSubmission", { student_id: ref("Student"), quiz_id: ref("Quiz"), score: Number, passed: Boolean });
const Notification = model("Notification", { user_id: ref("User"), title: String, message: String, read: { type: Boolean, default: false } });

module.exports = { User, School, Franchise, Teacher, Student, Parent, CourseCategory, Course, Lesson, StoreProduct, Batch, Enrollment, AttendanceRecord, FeeInvoice, Assignment, AssignmentSubmission, Quiz, QuizSubmission, Notification, roles };
