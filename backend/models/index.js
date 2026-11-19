const mongoose = require("mongoose");
const { Schema } = mongoose;
const ref = (name, required = false) => ({ type: Schema.Types.ObjectId, ref: name, required });
const model = (name, fields, options = {}) =>
  mongoose.models[name] || mongoose.model(name, new Schema(fields, { timestamps: true, ...options }));
const roles = ["admin", "school_admin", "franchise", "teacher", "student", "parent"];

/* ------------------------------------------------------------------ core */

const User = model("User", {
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  full_name: { type: String, required: true, trim: true },
  phone: String,
  city: String,
  state: String,
  avatar_url: String,
  is_active: { type: Boolean, default: true },
  roles: [{ type: String, enum: roles }],
});

const School = model("School", {
  name: { type: String, required: true, trim: true },
  code: { type: String, unique: true, sparse: true },
  address: String,
  city: String,
  state: String,
  contact_email: String,
  contact_phone: String,
  lab_status: { type: String, enum: ["pending", "active"], default: "pending" },
  status: { type: String, enum: ["pending", "active", "suspended"], default: "active" },
  owner_id: ref("User"),
});

const Franchise = model("Franchise", {
  name: { type: String, required: true, trim: true },
  code: { type: String, unique: true, sparse: true },
  city: String,
  state: String,
  address: String,
  territory: String,
  contact_email: String,
  contact_phone: String,
  revenue_share: { type: Number, default: 70, min: 0, max: 100 },
  status: { type: String, enum: ["pending", "active", "suspended"], default: "active" },
  owner_id: ref("User"),
});

const Teacher = model("Teacher", {
  user_id: ref("User"),
  school_id: ref("School"),
  franchise_id: ref("Franchise"),
  full_name: { type: String, required: true },
  email: { type: String, lowercase: true, trim: true },
  phone: String,
  subject: String,
  specialization: String,
  status: { type: String, enum: ["active", "inactive"], default: "active" },
});

const Student = model("Student", {
  user_id: ref("User"),
  school_id: ref("School"),
  franchise_id: ref("Franchise"),
  batch_id: ref("Batch"),
  class_id: ref("Class"),
  parent_id: ref("Parent"),
  full_name: { type: String, required: true },
  roll_number: String,
  email: { type: String, lowercase: true, trim: true },
  grade: String,
  age: Number,
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  // Gamification — XP, streaks and achievements power the student hub.
  xpPoints: { type: Number, default: 0 },
  streakDays: { type: Number, default: 1 },
  lastActiveDate: { type: Date, default: Date.now },
  rankTitle: { type: String, default: "Junior Robo Maker" },
  badges: [
    {
      badgeId: String,
      title: String,
      icon: String,
      unlockedAt: { type: Date, default: Date.now },
    },
  ],
  enrolledCourses: [
    {
      courseId: { type: Schema.Types.ObjectId, ref: "Course" },
      completedLessons: [{ type: String }],
      progressPercentage: { type: Number, default: 0 },
      completedAt: Date,
      certificateId: String,
    },
  ],
});

const Parent = model("Parent", {
  user_id: ref("User"),
  full_name: String,
  email: { type: String, lowercase: true, trim: true },
  phone: String,
});

/* --------------------------------------------------------------- catalog */

const CourseCategory = model("CourseCategory", {
  name: String,
  slug: { type: String, unique: true },
  description: String,
  position: Number,
});

const Course = model("Course", {
  title: String,
  slug: { type: String, unique: true },
  short_description: String,
  level: String,
  price: Number,
  image_url: String,
  description: String,
  age_group: String,
  duration: String,
  category_id: ref("CourseCategory"),
  syllabus: [String],
  is_published: { type: Boolean, default: true },
});

const CourseModule = model("CourseModule", { course_id: ref("Course"), title: String, position: Number });

const Lesson = model("Lesson", {
  course_id: ref("Course"),
  module_id: ref("CourseModule"),
  title: String,
  order: Number,
  position: Number,
  content: String,
  video_url: String,
  pdf_url: String,
  duration_min: Number,
  duration_minutes: Number,
});

const ProductCategory = model("ProductCategory", {
  name: String,
  slug: { type: String, unique: true },
  position: Number,
});

const StoreProduct = model("StoreProduct", {
  name: String,
  slug: { type: String, unique: true },
  price: Number,
  mrp: Number,
  rating: Number,
  reviews_count: Number,
  age_group: String,
  category: String,
  category_id: ref("ProductCategory"),
  description: String,
  short_description: String,
  image_url: String,
  specifications: Schema.Types.Mixed,
  box_contents: [String],
  images: [{ url: String, position: Number }],
  is_featured: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  in_stock: Boolean,
  stock: Number,
});

/* -------------------------------------------------------------- learning */

const Batch = model("Batch", {
  name: { type: String, required: true },
  grade: String,
  school_id: ref("School"),
  franchise_id: ref("Franchise"),
  teacher_id: ref("Teacher"),
  course_id: ref("Course"),
  schedule: String,
  room: String,
  status: { type: String, enum: ["active", "archived"], default: "active" },
});

const Class = model("Class", {
  name: { type: String, required: true },
  grade: String,
  section: String,
  school_id: ref("School"),
  franchise_id: ref("Franchise"),
  teacher_id: ref("Teacher"),
  course_id: ref("Course"),
  schedule: String,
  room: String,
  status: { type: String, enum: ["active", "archived"], default: "active" },
});

const Enrollment = model("Enrollment", {
  student_id: ref("Student"),
  course_id: ref("Course"),
  batch_id: ref("Batch"),
  progress: { type: Number, default: 0 },
  status: { type: String, default: "active" },
  completed_lessons: [ref("Lesson")],
  enrolled_at: { type: Date, default: Date.now },
});

const LessonProgress = model(
  "LessonProgress",
  {
    student_id: ref("Student", true),
    course_id: ref("Course", true),
    lesson_id: ref("Lesson", true),
    completed_at: { type: Date, default: Date.now },
  },
  { indexes: [] },
);
LessonProgress.schema.index({ student_id: 1, lesson_id: 1 }, { unique: true });

const AttendanceRecord = model("AttendanceRecord", {
  student_id: ref("Student", true),
  batch_id: ref("Batch", true),
  date: { type: Date, required: true },
  status: { type: String, enum: ["present", "absent", "late"], default: "present" },
  marked_by: ref("User"),
});
AttendanceRecord.schema.index({ student_id: 1, batch_id: 1, date: 1 }, { unique: true });

const FeeInvoice = model("FeeInvoice", {
  school_id: ref("School"),
  franchise_id: ref("Franchise"),
  student_id: ref("Student", true),
  title: { type: String, default: "Tuition fee" },
  amount: { type: Number, required: true, min: 0 },
  due_date: Date,
  status: { type: String, enum: ["pending", "paid"], default: "pending" },
  paid_at: Date,
  method: String,
  receipt_number: { type: String, unique: true, sparse: true },
});

const Assignment = model("Assignment", {
  batch_id: ref("Batch", true),
  course_id: ref("Course"),
  teacher_id: ref("Teacher"),
  title: { type: String, required: true },
  description: String,
  due_date: Date,
  max_marks: { type: Number, default: 100 },
});

const AssignmentSubmission = model("AssignmentSubmission", {
  assignment_id: ref("Assignment", true),
  student_id: ref("Student", true),
  content: String,
  file_url: String,
  project_url: String,
  marks: Number,
  feedback: String,
  status: { type: String, enum: ["submitted", "graded"], default: "submitted" },
  submitted_at: { type: Date, default: Date.now },
});

const Quiz = model("Quiz", {
  course_id: ref("Course"),
  title: String,
  description: String,
  questions: [
    {
      question: String,
      options: [String],
      correct_index: Number,
    },
  ],
});

const QuizSubmission = model("QuizSubmission", {
  student_id: ref("Student"),
  quiz_id: ref("Quiz"),
  answers: [Number],
  score: Number,
  passed: Boolean,
});

const Notification = model("Notification", {
  user_id: ref("User", true),
  title: String,
  message: String,
  link: String,
  read: { type: Boolean, default: false },
});

/* ----------------------------------------------------- live / DIY learning */

const LiveSession = model("LiveSession", {
  title: { type: String, required: true },
  batchId: ref("Batch"),
  teacherId: ref("User"),
  meetingUrl: String,
  startTime: Date,
  endTime: Date,
  topic: String,
  status: { type: String, enum: ["upcoming", "live", "completed"], default: "upcoming" },
});

const DiyKitGuide = model("DiyKitGuide", {
  title: { type: String, required: true },
  kitType: String,
  difficulty: { type: String, enum: ["Easy", "Medium", "Advanced"], default: "Easy" },
  componentsNeeded: [String],
  circuitDiagramUrl: String,
  codeSnippet: String,
  troubleshootingSteps: [String],
});

/* ---------------------------------------------------------- commerce / CRM */

const Order = model("Order", {
  order_number: { type: String, unique: true },
  user_id: ref("User"),
  customer_name: String,
  customer_email: String,
  customer_phone: String,
  shipping_address: String,
  payment_method: { type: String, enum: ["cod", "razorpay"], default: "cod" },
  total: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["pending", "placed", "confirmed", "packed", "shipped", "delivered", "cancelled"],
    default: "placed",
  },
  payment_status: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending",
  },
  placed_at: { type: Date, default: Date.now },
});

const OrderItem = model("OrderItem", {
  order_id: ref("Order", true),
  product_id: ref("StoreProduct"),
  name: String,
  price: Number,
  quantity: { type: Number, default: 1 },
});

const Enquiry = model("Enquiry", {
  name: { type: String, required: true },
  email: String,
  phone: String,
  city: String,
  subject: String,
  message: String,
  source: { type: String, default: "website" },
  status: { type: String, enum: ["new", "contacted", "follow_up", "converted", "closed"], default: "new" },
  franchise_id: ref("Franchise"),
  school_id: ref("School"),
});

const BlogPost = model("BlogPost", {
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  excerpt: String,
  content: String,
  cover_image: String,
  category: { type: String, default: "News" },
  author: { type: String, default: "AIKIDZ Team" },
  tags: [String],
  is_published: { type: Boolean, default: true },
  published_at: { type: Date, default: Date.now },
  read_minutes: { type: Number, default: 4 },
  views: { type: Number, default: 0 },
});

const TrialBooking = model("TrialBooking", {
  parent_name: { type: String, required: true, trim: true },
  child_name: { type: String, required: true, trim: true },
  child_age: Number,
  email: { type: String, lowercase: true, trim: true },
  phone: String,
  preferred_program: String,
  preferred_date: String,
  preferred_time: String,
  status: {
    type: String,
    enum: ["new", "scheduled", "attended", "converted", "cancelled"],
    default: "new",
  },
  notes: String,
  source: { type: String, default: "website" },
});

module.exports = {
  User,
  School,
  Franchise,
  Teacher,
  Student,
  Parent,
  CourseCategory,
  Course,
  CourseModule,
  Lesson,
  ProductCategory,
  StoreProduct,
  Batch,
  Class,
  Enrollment,
  LessonProgress,
  AttendanceRecord,
  FeeInvoice,
  Assignment,
  AssignmentSubmission,
  Quiz,
  QuizSubmission,
  Notification,
  LiveSession,
  DiyKitGuide,
  Order,
  OrderItem,
  Enquiry,
  TrialBooking,
  BlogPost,
  roles,
};
