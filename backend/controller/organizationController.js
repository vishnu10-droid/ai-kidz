const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const {
  User,
  School,
  Franchise,
  Batch,
  Class,
  Teacher,
  Student,
  Parent,
  FeeInvoice,
  AttendanceRecord,
  Enquiry,
  Notification,
} = require("../models");
const { withId, withIds, dayOnly, uniqueCode, randomPassword, pct, money } = require("./helpers");

const config = {
  school: { Model: School, ownerField: "school_id", label: "school", role: "school_admin" },
  franchise: { Model: Franchise, ownerField: "franchise_id", label: "centre", role: "franchise" },
};

const randomCode = (prefix) => `${prefix}-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;

exports.forOrganization = (kind) => {
  const { Model, ownerField, label, role } = config[kind];
  const findOrg = (req) => Model.findOne({ owner_id: req.user.id });

  const requireOrg = async (req, res) => {
    const org = await findOrg(req);
    if (!org) res.status(404).json({ message: `No ${label} is linked to this account` });
    return org;
  };

  const batchBelongsTo = async (org, batchId) => Batch.findOne({ _id: batchId, [ownerField]: org._id });
  const classBelongsTo = async (org, classId) => Class.findOne({ _id: classId, [ownerField]: org._id });

  /* ------------------------------------------------------------- overview */

  const overview = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const orgFilter = { [ownerField]: org._id };
      const monthAgo = new Date(Date.now() - 30 * 86_400_000);

      const [students, teachers, batches, classes, fees, attendance, recentStudents, upcoming] = await Promise.all([
        Student.countDocuments({ ...orgFilter, status: "active" }),
        Teacher.countDocuments({ ...orgFilter, status: "active" }),
        Batch.find(orgFilter).populate("teacher_id", "full_name email").lean(),
        Class.find(orgFilter).populate("teacher_id", "full_name email").lean(),
        FeeInvoice.find(orgFilter).lean(),
        AttendanceRecord.find({ batch_id: { $in: (await Batch.find(orgFilter).select("_id").lean()).map((b) => b._id) }, date: { $gte: monthAgo } }).lean(),
        Student.find(orgFilter).sort("-createdAt").limit(5).lean(),
        Batch.find(orgFilter).populate("teacher_id", "full_name").limit(4).lean(),
      ]);

      const present = attendance.filter((row) => row.status === "present").length;
      const pendingFees = fees.filter((f) => f.status === "pending");
      const paidFees = fees.filter((f) => f.status === "paid");

      return res.json({
        organization: withId(org.toObject ? org.toObject() : org),
        kpis: {
          students,
          teachers,
          batches: batches.length,
          classes: classes.length,
          attendanceRate: pct(present, attendance.length),
          pendingFeesCount: pendingFees.length,
          pendingFeesAmount: money(pendingFees.reduce((n, f) => n + Number(f.amount || 0), 0)),
          collected: money(paidFees.reduce((n, f) => n + Number(f.amount || 0), 0)),
        },
        batches: withIds(batches),
        classes: withIds(classes),
        recentStudents: withIds(recentStudents),
        upcomingBatches: withIds(upcoming),
      });
    } catch (error) {
      return next(error);
    }
  };

  /* -------------------------------------------------------------- batches */

  const listBatches = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const batches = await Batch.find({ [ownerField]: org._id }).populate("teacher_id", "full_name email").sort("-createdAt").lean();
      const counts = await Student.aggregate([
        { $match: { batch_id: { $in: batches.map((b) => b._id) } } },
        { $group: { _id: "$batch_id", n: { $sum: 1 } } },
      ]);
      const map = new Map(counts.map((row) => [String(row._id), row.n]));
      return res.json(withIds(batches).map((batch) => ({ ...batch, studentCount: map.get(String(batch._id)) || 0 })));
    } catch (error) {
      return next(error);
    }
  };

  const createBatch = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const { name, grade, teacher_id, schedule, room, course_id } = req.body;
      if (!name) return res.status(400).json({ message: "Batch name is required" });
      if (teacher_id) {
        const teacher = await Teacher.findOne({ _id: teacher_id, [ownerField]: org._id });
        if (!teacher) return res.status(400).json({ message: "Teacher does not belong to your organization" });
      }
      const batch = await Batch.create({ name, grade, teacher_id: teacher_id || undefined, schedule, room, course_id: course_id || undefined, [ownerField]: org._id });
      return res.status(201).json(withId(batch.toObject()));
    } catch (error) {
      return next(error);
    }
  };

  const updateBatch = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const allowed = ["name", "grade", "teacher_id", "schedule", "room", "status", "course_id"];
      const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
      if (update.teacher_id) {
        const teacher = await Teacher.findOne({ _id: update.teacher_id, [ownerField]: org._id });
        if (!teacher) return res.status(400).json({ message: "Teacher does not belong to your organization" });
      }
      const batch = await Batch.findOneAndUpdate({ _id: req.params.id, [ownerField]: org._id }, update, { new: true }).lean();
      if (!batch) return res.status(404).json({ message: "Batch not found" });
      return res.json(withId(batch));
    } catch (error) {
      return next(error);
    }
  };

  const deleteBatch = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const batch = await Batch.findOneAndDelete({ _id: req.params.id, [ownerField]: org._id });
      if (!batch) return res.status(404).json({ message: "Batch not found" });
      await Student.updateMany({ batch_id: batch._id }, { $unset: { batch_id: 1 } });
      return res.json({ ok: true });
    } catch (error) {
      return next(error);
    }
  };

  const batchStudents = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const batch = await batchBelongsTo(org, req.params.id);
      if (!batch) return res.status(404).json({ message: "Batch not found" });
      const students = await Student.find({ batch_id: batch._id }).sort("full_name").lean();
      return res.json(withIds(students));
    } catch (error) {
      return next(error);
    }
  };

  /* -------------------------------------------------------------- classes */

  const listClasses = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const classes = await Class.find({ [ownerField]: org._id }).populate("teacher_id", "full_name email").sort("-createdAt").lean();
      const counts = await Student.aggregate([
        { $match: { class_id: { $in: classes.map((item) => item._id) } } },
        { $group: { _id: "$class_id", n: { $sum: 1 } } },
      ]);
      const map = new Map(counts.map((row) => [String(row._id), row.n]));
      return res.json(withIds(classes).map((item) => ({ ...item, studentCount: map.get(String(item._id)) || 0 })));
    } catch (error) {
      return next(error);
    }
  };

  const createClass = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const { name, grade, section, teacher_id, schedule, room, course_id } = req.body;
      if (!name) return res.status(400).json({ message: "Class name is required" });
      if (teacher_id) {
        const teacher = await Teacher.findOne({ _id: teacher_id, [ownerField]: org._id });
        if (!teacher) return res.status(400).json({ message: "Teacher does not belong to your organization" });
      }
      const created = await Class.create({
        name,
        grade,
        section,
        teacher_id: teacher_id || undefined,
        schedule,
        room,
        course_id: course_id || undefined,
        [ownerField]: org._id,
      });
      return res.status(201).json(withId(created.toObject()));
    } catch (error) {
      return next(error);
    }
  };

  const updateClass = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const allowed = ["name", "grade", "section", "teacher_id", "schedule", "room", "status", "course_id"];
      const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
      if (update.teacher_id) {
        const teacher = await Teacher.findOne({ _id: update.teacher_id, [ownerField]: org._id });
        if (!teacher) return res.status(400).json({ message: "Teacher does not belong to your organization" });
      }
      const item = await Class.findOneAndUpdate({ _id: req.params.id, [ownerField]: org._id }, update, { new: true }).lean();
      if (!item) return res.status(404).json({ message: "Class not found" });
      return res.json(withId(item));
    } catch (error) {
      return next(error);
    }
  };

  const deleteClass = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const item = await Class.findOneAndDelete({ _id: req.params.id, [ownerField]: org._id });
      if (!item) return res.status(404).json({ message: "Class not found" });
      await Student.updateMany({ class_id: item._id }, { $unset: { class_id: 1 } });
      return res.json({ ok: true });
    } catch (error) {
      return next(error);
    }
  };

  const classStudents = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const item = await classBelongsTo(org, req.params.id);
      if (!item) return res.status(404).json({ message: "Class not found" });
      const students = await Student.find({ class_id: item._id }).sort("full_name").lean();
      return res.json(withIds(students));
    } catch (error) {
      return next(error);
    }
  };

  /* ------------------------------------------------------------- teachers */

  const listTeachers = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const teachers = await Teacher.find({ [ownerField]: org._id }).sort("-createdAt").lean();
      const batches = await Batch.find({ [ownerField]: org._id }).select("teacher_id name").lean();
      const classes = await Class.find({ [ownerField]: org._id }).select("teacher_id name").lean();
      return res.json(
        withIds(teachers).map((teacher) => ({
          ...teacher,
          hasLogin: Boolean(teacher.user_id),
          batches: batches.filter((b) => String(b.teacher_id) === String(teacher._id)).map((b) => b.name),
          classes: classes.filter((c) => String(c.teacher_id) === String(teacher._id)).map((c) => c.name),
        })),
      );
    } catch (error) {
      return next(error);
    }
  };

  const createTeacher = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const { full_name, email, phone, subject, password } = req.body;
      if (!full_name || !email) return res.status(400).json({ message: "Full name and email are required" });
      const tempPassword = password && String(password).length >= 8 ? password : randomPassword();
      let user = await User.findOne({ email: String(email).toLowerCase() });
      let generated = null;
      if (!user) {
        user = await User.create({
          email: String(email).toLowerCase(),
          full_name,
          password: await bcrypt.hash(tempPassword, 12),
          phone,
          roles: ["teacher"],
        });
        generated = tempPassword;
      } else if (!user.roles.includes("teacher")) {
        user.roles = [...new Set([...user.roles, "teacher"])];
        await user.save();
      }
      const teacher = await Teacher.create({
        user_id: user._id,
        full_name,
        email: String(email).toLowerCase(),
        phone,
        subject,
        [ownerField]: org._id,
      });
      await Notification.create({
        user_id: user._id,
        title: `Welcome to ${org.name}`,
        message: `Your teacher account is ready. You have been added by ${org.name}.`,
        link: "/teacher/dashboard",
      });
      return res.status(201).json({ teacher: withId(teacher.toObject()), id: String(teacher._id), generatedPassword: generated, hasLogin: true });
    } catch (error) {
      return next(error);
    }
  };

  const updateTeacher = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const allowed = ["full_name", "email", "phone", "subject", "specialization", "status"];
      const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
      const teacher = await Teacher.findOneAndUpdate({ _id: req.params.id, [ownerField]: org._id }, update, { new: true }).lean();
      if (!teacher) return res.status(404).json({ message: "Teacher not found" });
      if (teacher.user_id && update.full_name) await User.findByIdAndUpdate(teacher.user_id, { full_name: update.full_name });
      return res.json(withId(teacher));
    } catch (error) {
      return next(error);
    }
  };

  const setTeacherPassword = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const teacher = await Teacher.findOne({ _id: req.params.id, [ownerField]: org._id });
      if (!teacher) return res.status(404).json({ message: "Teacher not found" });
      const password = req.body.password && String(req.body.password).length >= 8 ? req.body.password : randomPassword();
      if (teacher.user_id) {
        await User.findByIdAndUpdate(teacher.user_id, { password: await bcrypt.hash(password, 12) });
      } else {
        if (!teacher.email) return res.status(400).json({ message: "Teacher email is required" });
        const user = await User.create({
          email: teacher.email,
          full_name: teacher.full_name,
          password: await bcrypt.hash(password, 12),
          roles: ["teacher"],
        });
        teacher.user_id = user._id;
        await teacher.save();
      }
      return res.json({ ok: true, hasLogin: true, password });
    } catch (error) {
      return next(error);
    }
  };

  const deleteTeacher = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const teacher = await Teacher.findOneAndDelete({ _id: req.params.id, [ownerField]: org._id });
      if (!teacher) return res.status(404).json({ message: "Teacher not found" });
      await Promise.all([
        Batch.updateMany({ teacher_id: teacher._id }, { $unset: { teacher_id: 1 } }),
        Class.updateMany({ teacher_id: teacher._id }, { $unset: { teacher_id: 1 } }),
      ]);
      return res.json({ ok: true });
    } catch (error) {
      return next(error);
    }
  };

  /* ------------------------------------------------------------- students */

  const listStudents = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const filter = { [ownerField]: org._id };
      if (req.query.batch_id && mongoose.isValidObjectId(req.query.batch_id)) filter.batch_id = req.query.batch_id;
      if (req.query.class_id && mongoose.isValidObjectId(req.query.class_id)) filter.class_id = req.query.class_id;
      const students = await Student.find(filter)
        .populate("batch_id", "name grade")
        .populate("class_id", "name grade section")
        .populate("parent_id", "full_name email phone")
        .sort("full_name")
        .lean();
      return res.json(withIds(students));
    } catch (error) {
      return next(error);
    }
  };

  const resolveParent = async (parentEmail) => {
    if (!parentEmail) return null;
    const email = String(parentEmail).toLowerCase();
    const user = await User.findOne({ email, roles: "parent" });
    if (user) {
      const existing = await Parent.findOne({ user_id: user._id });
      if (existing) return existing;
      return Parent.create({ user_id: user._id, full_name: user.full_name, email, phone: user.phone });
    }
    const byEmail = await Parent.findOne({ email });
    if (byEmail) return byEmail;
    return Parent.create({ full_name: String(parentEmail).split("@")[0], email });
  };

  const createStudent = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const { full_name, roll_number, batch_id, class_id, parent_email, email, grade } = req.body;
      if (!full_name) return res.status(400).json({ message: "Student name is required" });
      if (batch_id) {
        const batch = await batchBelongsTo(org, batch_id);
        if (!batch) return res.status(400).json({ message: "Batch does not belong to your organization" });
      }
      if (class_id) {
        const item = await classBelongsTo(org, class_id);
        if (!item) return res.status(400).json({ message: "Class does not belong to your organization" });
      }
      const parent = await resolveParent(parent_email);
      const student = await Student.create({
        full_name,
        roll_number: roll_number || randomCode("STU"),
        email,
        grade,
        batch_id: batch_id || undefined,
        class_id: class_id || undefined,
        parent_id: parent?._id,
        [ownerField]: org._id,
      });
      if (parent?.user_id) {
        await Notification.create({
          user_id: parent.user_id,
          title: `${full_name} was added to ${org.name}`,
          message: `You can now follow attendance, fees and progress for ${full_name}.`,
          link: "/parent/dashboard",
        });
      }
      return res.status(201).json(withId(student.toObject()));
    } catch (error) {
      return next(error);
    }
  };

  const updateStudent = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const allowed = ["full_name", "roll_number", "batch_id", "class_id", "grade", "status", "email", "age"];
      const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
      if (update.batch_id) {
        const batch = await batchBelongsTo(org, update.batch_id);
        if (!batch) return res.status(400).json({ message: "Batch does not belong to your organization" });
      }
      if (update.class_id) {
        const item = await classBelongsTo(org, update.class_id);
        if (!item) return res.status(400).json({ message: "Class does not belong to your organization" });
      }
      if (req.body.parent_email) {
        const parent = await resolveParent(req.body.parent_email);
        if (parent) update.parent_id = parent._id;
      }
      const student = await Student.findOneAndUpdate({ _id: req.params.id, [ownerField]: org._id }, update, { new: true })
        .populate("batch_id", "name")
        .populate("class_id", "name")
        .lean();
      if (!student) return res.status(404).json({ message: "Student not found" });
      return res.json(withId(student));
    } catch (error) {
      return next(error);
    }
  };

  const deleteStudent = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const student = await Student.findOneAndDelete({ _id: req.params.id, [ownerField]: org._id });
      if (!student) return res.status(404).json({ message: "Student not found" });
      await Promise.all([FeeInvoice.deleteMany({ student_id: student._id }), AttendanceRecord.deleteMany({ student_id: student._id })]);
      return res.json({ ok: true });
    } catch (error) {
      return next(error);
    }
  };

  /* ----------------------------------------------------------------- fees */

  const listFees = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const filter = { [ownerField]: org._id };
      if (req.query.status) filter.status = req.query.status;
      if (req.query.student_id) filter.student_id = req.query.student_id;
      const fees = await FeeInvoice.find(filter).populate("student_id", "full_name roll_number").sort("-createdAt").lean();
      return res.json(withIds(fees));
    } catch (error) {
      return next(error);
    }
  };

  const createFee = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const { student_id, title, amount, due_date } = req.body;
      const student = await Student.findOne({ _id: student_id, [ownerField]: org._id });
      if (!student) return res.status(400).json({ message: "Student does not belong to your organization" });
      if (!amount || Number(amount) <= 0) return res.status(400).json({ message: "A valid amount is required" });
      const fee = await FeeInvoice.create({
        [ownerField]: org._id,
        student_id: student._id,
        title: title || "Tuition fee",
        amount: Number(amount),
        due_date: due_date || undefined,
        status: "pending",
        receipt_number: uniqueCode("INV"),
      });
      if (student.user_id) {
        await Notification.create({
          user_id: student.user_id,
          title: "New fee invoice",
          message: `${fee.title} · Rs ${Number(fee.amount).toLocaleString("en-IN")} is due.`,
          link: "/parent/dashboard",
        });
      }
      return res.status(201).json(withId(fee.toObject()));
    } catch (error) {
      return next(error);
    }
  };

  const payFee = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const fee = await FeeInvoice.findOne({ _id: req.params.id, [ownerField]: org._id });
      if (!fee) return res.status(404).json({ message: "Invoice not found" });
      if (fee.status === "paid") return res.status(409).json({ message: "Invoice is already paid" });
      fee.status = "paid";
      fee.paid_at = new Date();
      fee.method = req.body.method || "cash";
      if (!fee.receipt_number) fee.receipt_number = uniqueCode("RCP");
      await fee.save();
      return res.json(withId(fee.toObject()));
    } catch (error) {
      return next(error);
    }
  };

  const deleteFee = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const fee = await FeeInvoice.findOneAndDelete({ _id: req.params.id, [ownerField]: org._id });
      if (!fee) return res.status(404).json({ message: "Invoice not found" });
      return res.json({ ok: true });
    } catch (error) {
      return next(error);
    }
  };

  /* ----------------------------------------------------------- attendance */

  const getAttendance = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const { batch_id } = req.query;
      if (!batch_id) return res.status(400).json({ message: "batch_id is required" });
      const batch = await batchBelongsTo(org, batch_id);
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

  const saveAttendance = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const { batch_id, records } = req.body;
      const batch = await batchBelongsTo(org, batch_id);
      if (!batch || !Array.isArray(records)) return res.status(400).json({ message: "Batch and records are required" });
      const date = dayOnly(req.body.date);
      const allowed = new Set((await Student.find({ batch_id: batch._id }).select("_id").lean()).map((s) => String(s._id)));
      const saved = [];
      for (const record of records) {
        if (!allowed.has(String(record.student_id))) continue;
        if (!["present", "absent", "late"].includes(record.status)) continue;
        const row = await AttendanceRecord.findOneAndUpdate(
          { student_id: record.student_id, batch_id: batch._id, date },
          { status: record.status, marked_by: req.user.id },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        saved.push(withId(row.toObject()));
      }
      return res.json({ saved: saved.length, date, records: saved });
    } catch (error) {
      return next(error);
    }
  };

  /* ------------------------------------------------------------ enquiries */

  const listEnquiries = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      if (kind !== "franchise") return res.json([]);
      const filter = { franchise_id: org._id };
      if (req.query.status) filter.status = req.query.status;
      return res.json(withIds(await Enquiry.find(filter).sort("-createdAt").lean()));
    } catch (error) {
      return next(error);
    }
  };

  const updateEnquiry = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      if (kind !== "franchise") return res.status(403).json({ message: "Only centres manage local enquiries" });
      const enquiry = await Enquiry.findOneAndUpdate(
        { _id: req.params.id, franchise_id: org._id },
        { status: req.body.status },
        { new: true },
      ).lean();
      if (!enquiry) return res.status(404).json({ message: "Enquiry not found" });
      return res.json(withId(enquiry));
    } catch (error) {
      return next(error);
    }
  };

  const revenue = async (req, res, next) => {
    try {
      const org = await requireOrg(req, res);
      if (!org) return;
      const fees = await FeeInvoice.find({ [ownerField]: org._id }).lean();
      const paid = fees.filter((f) => f.status === "paid");
      const total = paid.reduce((n, f) => n + Number(f.amount || 0), 0);
      const share = Number(org.revenue_share ?? (kind === "franchise" ? 70 : 100));
      const months = [];
      for (let i = 5; i >= 0; i -= 1) {
        const d = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - i, 1));
        months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleString("en-IN", { month: "short" }), value: 0 });
      }
      const map = new Map(months.map((m) => [m.key, m]));
      for (const fee of paid) {
        const bucket = map.get(new Date(fee.paid_at || fee.createdAt).toISOString().slice(0, 7));
        if (bucket) bucket.value += Number(fee.amount || 0);
      }
      return res.json({
        revenue: money(total),
        revenueShare: share,
        yourShare: money((total * share) / 100),
        aikidzShare: money((total * (100 - share)) / 100),
        pending: money(fees.filter((f) => f.status === "pending").reduce((n, f) => n + Number(f.amount || 0), 0)),
        series: months.map((m) => ({ label: m.label, value: money(m.value) })),
      });
    } catch (error) {
      return next(error);
    }
  };

  return {
    overview,
    listBatches,
    createBatch,
    updateBatch,
    deleteBatch,
    batchStudents,
    listClasses,
    createClass,
    updateClass,
    deleteClass,
    classStudents,
    listTeachers,
    createTeacher,
    updateTeacher,
    setTeacherPassword,
    deleteTeacher,
    listStudents,
    createStudent,
    updateStudent,
    deleteStudent,
    listFees,
    createFee,
    payFee,
    deleteFee,
    getAttendance,
    saveAttendance,
    listEnquiries,
    updateEnquiry,
    revenue,
    role,
  };
};
