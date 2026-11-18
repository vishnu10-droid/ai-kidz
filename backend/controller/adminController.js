const {
  User,
  School,
  Franchise,
  Teacher,
  Student,
  Batch,
  FeeInvoice,
  Order,
  OrderItem,
  Enquiry,
  Assignment,
  Notification,
  TrialBooking,
  Course,
  CourseCategory,
  CourseModule,
  Lesson,
  BlogPost,
  roles,
} = require("../models");
const bcrypt = require("bcryptjs");
const { withId, withIds, money } = require("./helpers");

const monthKey = (date) => new Date(date).toISOString().slice(0, 7);
const dayKey = (date) => new Date(date).toISOString().slice(0, 10);

/** Percentage change between two windows; null when there is no baseline. */
const percentChange = (current, previous) => {
  if (!previous) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

const inWindow = (value, start, end) => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= start.getTime() && time < end.getTime();
};

const sum = (rows, field) => rows.reduce((total, row) => total + Number(row[field] || 0), 0);

/** Admin notifications are personalised, so collect every admin's inbox. */
async function adminNotifications(limit = 8) {
  const admins = await User.find({ roles: "admin" }).select("_id").lean();
  const rows = await Notification.find({ user_id: { $in: admins.map((a) => a._id) } })
    .sort("-createdAt")
    .limit(limit)
    .lean();
  return withIds(rows);
}

async function adminTrends(now, paidFees, paidOrders, trials, enquiries) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const start = new Date(end.getTime() - 30 * 86400000);
  const previousStart = new Date(start.getTime() - 30 * 86400000);

  const currentRevenue =
    sum(paidFees.filter((r) => inWindow(r.paid_at || r.createdAt, start, end)), "amount") +
    sum(paidOrders.filter((r) => inWindow(r.placed_at || r.createdAt, start, end)), "total");
  const previousRevenue =
    sum(paidFees.filter((r) => inWindow(r.paid_at || r.createdAt, previousStart, start)), "amount") +
    sum(paidOrders.filter((r) => inWindow(r.placed_at || r.createdAt, previousStart, start)), "total");

  const currentOrders = paidOrders.filter((r) => inWindow(r.placed_at || r.createdAt, start, end)).length;
  const previousOrders = paidOrders.filter((r) => inWindow(r.placed_at || r.createdAt, previousStart, start)).length;
  const currentTrials = trials.filter((r) => inWindow(r.createdAt, start, end)).length;
  const previousTrials = trials.filter((r) => inWindow(r.createdAt, previousStart, start)).length;
  const currentEnquiries = enquiries.filter((r) => inWindow(r.createdAt, start, end)).length;
  const previousEnquiries = enquiries.filter((r) => inWindow(r.createdAt, previousStart, start)).length;

  return {
    revenue: percentChange(currentRevenue, previousRevenue),
    orders: percentChange(currentOrders, previousOrders),
    trials: percentChange(currentTrials, previousTrials),
    enquiries: percentChange(currentEnquiries, previousEnquiries),
  };
}

/** GET /api/admin/overview */
exports.overview = async (_req, res, next) => {
  try {
    const [schools, franchises, students, teachers, batches, users, paidFees, paidOrders, enquiries, trials, allOrders] =
      await Promise.all([
        School.find().lean(),
        Franchise.find().lean(),
        Student.countDocuments({ status: "active" }),
        Teacher.countDocuments({ status: "active" }),
        Batch.countDocuments({ status: "active" }),
        User.countDocuments(),
        FeeInvoice.find({ status: "paid" }).select("amount paid_at createdAt").lean(),
        Order.find({ payment_status: "paid" }).select("total placed_at createdAt").lean(),
        Enquiry.find().sort("-createdAt").limit(50).lean(),
        TrialBooking.find().select("createdAt status").lean(),
        Order.countDocuments(),
      ]);

    const feeRevenue = paidFees.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const orderRevenue = paidOrders.reduce((sum, row) => sum + Number(row.total || 0), 0);
    const revenue = money(feeRevenue + orderRevenue);

    // Six-month revenue trend from paid invoices + paid store orders.
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleString("en-IN", { month: "short" }), fees: 0, orders: 0 });
    }
    const byMonth = new Map(months.map((m) => [m.key, m]));
    for (const fee of paidFees) {
      const bucket = byMonth.get(monthKey(fee.paid_at || fee.createdAt));
      if (bucket) bucket.fees += Number(fee.amount || 0);
    }
    for (const order of paidOrders) {
      const bucket = byMonth.get(monthKey(order.placed_at || order.createdAt));
      if (bucket) bucket.orders += Number(order.total || 0);
    }

    const [recentUsers, recentStudents, recentPayments, recentOrders, recentAssignments] = await Promise.all([
      User.find().sort("-createdAt").limit(4).select("full_name roles createdAt").lean(),
      Student.find().sort("-createdAt").limit(3).select("full_name roll_number createdAt").lean(),
      FeeInvoice.find({ status: "paid" }).sort("-paid_at").limit(3).populate("student_id", "full_name").lean(),
      Order.find().sort("-createdAt").limit(4).lean(),
      Assignment.find().sort("-createdAt").limit(2).select("title createdAt").lean(),
    ]);

    const activity = [
      ...recentUsers.map((u) => ({
        id: `u-${u._id}`,
        type: "user",
        title: `${u.full_name} joined`,
        description: (u.roles || []).join(", ") || "member",
        at: u.createdAt,
      })),
      ...recentStudents.map((s) => ({
        id: `s-${s._id}`,
        type: "student",
        title: `${s.full_name} enrolled`,
        description: s.roll_number || "New student",
        at: s.createdAt,
      })),
      ...recentPayments.map((p) => ({
        id: `p-${p._id}`,
        type: "payment",
        title: `Fee paid · Rs ${Number(p.amount || 0).toLocaleString("en-IN")}`,
        description: p.student_id?.full_name || "Student",
        at: p.paid_at || p.createdAt,
      })),
      ...recentOrders.map((o) => ({
        id: `o-${o._id}`,
        type: "order",
        title: `Order ${o.order_number}`,
        description: `Rs ${Number(o.total || 0).toLocaleString("en-IN")} · ${o.payment_status}`,
        at: o.placed_at || o.createdAt,
      })),
      ...recentAssignments.map((a) => ({
        id: `a-${a._id}`,
        type: "assignment",
        title: `Assignment created`,
        description: a.title,
        at: a.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 12);

    return res.json({
      kpis: {
        revenue,
        feeRevenue: money(feeRevenue),
        orderRevenue: money(orderRevenue),
        schools: schools.length,
        onboardedSchools: schools.filter((s) => s.lab_status === "active").length,
        activeSchools: schools.filter((s) => s.status === "active").length,
        pendingSchools: schools.filter((s) => s.lab_status !== "active").length,
        franchises: franchises.length,
        activeFranchises: franchises.filter((f) => f.status === "active").length,
        students,
        teachers,
        batches,
        users,
        orders: allOrders,
        totalOrders: allOrders,
        pendingEnquiries: enquiries.filter((e) => e.status === "new").length,
        activeTrials: trials.filter((t) => !["cancelled", "attended", "converted"].includes(t.status)).length,
        pendingTrials: trials.filter((t) => t.status === "new").length,
        totalTrials: trials.length,
        franchiseRevenue: money(feeRevenue * 0.3),
      },
      trends: await adminTrends(now, paidFees, paidOrders, trials, enquiries),
      revenueSeries: months.map((m) => ({
        label: m.label,
        fees: money(m.fees),
        orders: money(m.orders),
        total: money(m.fees + m.orders),
      })),
      activity,
      notifications: await adminNotifications(),
      recentOrders: withIds(recentOrders),
      recentEnquiries: withIds(enquiries.slice(0, 5)),
      recentTrials: withIds(
        await TrialBooking.find().sort("-createdAt").limit(5).lean(),
      ),
      pendingSchools: withIds(schools.filter((s) => s.lab_status !== "active")),
    });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/admin/users */
exports.listUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) filter.roles = req.query.role;
    if (req.query.search) {
      const rx = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ full_name: rx }, { email: rx }, { phone: rx }];
    }
    const users = await User.find(filter).sort("-createdAt").lean();
    return res.json(withIds(users));
  } catch (error) {
    return next(error);
  }
};

/** PATCH /api/admin/users/:id */
exports.updateUser = async (req, res, next) => {
  try {
    const update = {};
    if (req.body.roles !== undefined) {
      if (!Array.isArray(req.body.roles) || req.body.roles.some((role) => !roles.includes(role))) {
        return res.status(400).json({ message: "Invalid roles" });
      }
      update.roles = [...new Set(req.body.roles)];
    }
    if (req.body.role !== undefined) {
      if (!roles.includes(req.body.role)) return res.status(400).json({ message: "Invalid role" });
      update.roles = [req.body.role];
    }
    if (req.body.is_active !== undefined) update.is_active = Boolean(req.body.is_active);
    if (req.body.full_name !== undefined) update.full_name = req.body.full_name;
    if (req.body.phone !== undefined) update.phone = req.body.phone;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(withId(user));
  } catch (error) {
    return next(error);
  }
};

/** DELETE /api/admin/users/:id — soft delete by deactivating. */
exports.deleteUser = async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ message: "You cannot deactivate your own account" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true }).lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(withId(user));
  } catch (error) {
    return next(error);
  }
};

/** GET /api/admin/schools */
exports.listSchools = async (_req, res, next) => {
  try {
    const schools = await School.find().sort("-createdAt").lean();
    const ids = schools.map((s) => s._id);
    const [studentRows, teacherRows, batchRows] = await Promise.all([
      Student.aggregate([{ $match: { school_id: { $in: ids } } }, { $group: { _id: "$school_id", n: { $sum: 1 } } }]),
      Teacher.aggregate([{ $match: { school_id: { $in: ids } } }, { $group: { _id: "$school_id", n: { $sum: 1 } } }]),
      Batch.aggregate([{ $match: { school_id: { $in: ids } } }, { $group: { _id: "$school_id", n: { $sum: 1 } } }]),
    ]);
    const countMap = (rows) => new Map(rows.map((r) => [String(r._id), r.n]));
    const students = countMap(studentRows);
    const teachers = countMap(teacherRows);
    const batches = countMap(batchRows);
    return res.json(
      withIds(schools).map((school) => ({
        ...school,
        students: students.get(String(school._id)) || 0,
        teachers: teachers.get(String(school._id)) || 0,
        batches: batches.get(String(school._id)) || 0,
      })),
    );
  } catch (error) {
    return next(error);
  }
};

/** POST /api/admin/schools */
exports.createSchool = async (req, res, next) => {
  try {
    const { name, city, address, state, contact_email, contact_phone, lab_status } = req.body;
    if (!name) return res.status(400).json({ message: "School name is required" });
    const code = req.body.code || `SCH-${Date.now().toString().slice(-6)}`;
    const school = await School.create({
      name,
      code,
      city,
      address,
      state,
      contact_email,
      contact_phone,
      lab_status: lab_status === "active" ? "active" : "pending",
      status: "active",
    });
    return res.status(201).json(withId(school.toObject()));
  } catch (error) {
    return next(error);
  }
};

/** PATCH /api/admin/schools/:id */
exports.updateSchool = async (req, res, next) => {
  try {
    const allowed = ["name", "city", "address", "state", "contact_email", "contact_phone", "lab_status", "status", "code"];
    const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const school = await School.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!school) return res.status(404).json({ message: "School not found" });
    return res.json(withId(school));
  } catch (error) {
    return next(error);
  }
};

exports.deleteSchool = async (req, res, next) => {
  try {
    const school = await School.findByIdAndDelete(req.params.id);
    if (!school) return res.status(404).json({ message: "School not found" });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/admin/franchises */
exports.listFranchises = async (_req, res, next) => {
  try {
    const franchises = await Franchise.find().sort("-createdAt").lean();
    const ids = franchises.map((f) => f._id);
    const [studentRows, paidRows, batchRows] = await Promise.all([
      Student.aggregate([{ $match: { franchise_id: { $in: ids } } }, { $group: { _id: "$franchise_id", n: { $sum: 1 } } }]),
      FeeInvoice.aggregate([
        { $match: { franchise_id: { $in: ids }, status: "paid" } },
        { $group: { _id: "$franchise_id", total: { $sum: "$amount" } } },
      ]),
      Batch.aggregate([{ $match: { franchise_id: { $in: ids } } }, { $group: { _id: "$franchise_id", n: { $sum: 1 } } }]),
    ]);
    const studentMap = new Map(studentRows.map((r) => [String(r._id), r.n]));
    const revenueMap = new Map(paidRows.map((r) => [String(r._id), r.total]));
    const batchMap = new Map(batchRows.map((r) => [String(r._id), r.n]));
    return res.json(
      withIds(franchises).map((franchise) => {
        const revenue = Number(revenueMap.get(String(franchise._id)) || 0);
        const share = Number(franchise.revenue_share ?? 70);
        return {
          ...franchise,
          students: studentMap.get(String(franchise._id)) || 0,
          batches: batchMap.get(String(franchise._id)) || 0,
          revenue,
          franchiseShare: money((revenue * share) / 100),
          aikidzShare: money((revenue * (100 - share)) / 100),
        };
      }),
    );
  } catch (error) {
    return next(error);
  }
};

exports.createFranchise = async (req, res, next) => {
  try {
    const { name, city, address, state, territory, contact_email, contact_phone, revenue_share } = req.body;
    if (!name) return res.status(400).json({ message: "Centre name is required" });
    const franchise = await Franchise.create({
      name,
      code: req.body.code || `FRN-${Date.now().toString().slice(-6)}`,
      city,
      address,
      state,
      territory,
      contact_email,
      contact_phone,
      revenue_share: Number(revenue_share ?? 70),
      status: "active",
    });
    return res.status(201).json(withId(franchise.toObject()));
  } catch (error) {
    return next(error);
  }
};

exports.updateFranchise = async (req, res, next) => {
  try {
    const allowed = ["name", "city", "address", "state", "territory", "contact_email", "contact_phone", "revenue_share", "status", "code"];
    const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (update.revenue_share !== undefined) update.revenue_share = Number(update.revenue_share);
    const franchise = await Franchise.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!franchise) return res.status(404).json({ message: "Centre not found" });
    return res.json(withId(franchise));
  } catch (error) {
    return next(error);
  }
};

exports.deleteFranchise = async (req, res, next) => {
  try {
    const franchise = await Franchise.findByIdAndDelete(req.params.id);
    if (!franchise) return res.status(404).json({ message: "Centre not found" });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/admin/orders */
exports.listOrders = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.payment_status) filter.payment_status = req.query.payment_status;
    const orders = await Order.find(filter).sort("-createdAt").lean();
    const items = await OrderItem.find({ order_id: { $in: orders.map((o) => o._id) } }).lean();
    const grouped = new Map();
    for (const item of items) {
      const key = String(item.order_id);
      grouped.set(key, [...(grouped.get(key) || []), withId(item)]);
    }
    return res.json(
      withIds(orders).map((order) => ({
        ...order,
        items: grouped.get(String(order._id)) || [],
        itemCount: (grouped.get(String(order._id)) || []).reduce((n, i) => n + i.quantity, 0),
      })),
    );
  } catch (error) {
    return next(error);
  }
};

exports.updateOrder = async (req, res, next) => {
  try {
    const allowed = ["status", "payment_status", "customer_name", "customer_phone", "shipping_address"];
    const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!order) return res.status(404).json({ message: "Order not found" });
    return res.json(withId(order));
  } catch (error) {
    return next(error);
  }
};

/** GET /api/admin/enquiries */
exports.listEnquiries = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const enquiries = await Enquiry.find(filter)
      .sort("-createdAt")
      .populate("franchise_id", "name city")
      .populate("school_id", "name city")
      .lean();
    return res.json(withIds(enquiries));
  } catch (error) {
    return next(error);
  }
};

exports.updateEnquiry = async (req, res, next) => {
  try {
    const allowed = ["status", "franchise_id", "school_id", "message", "subject"];
    const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!enquiry) return res.status(404).json({ message: "Enquiry not found" });
    return res.json(withId(enquiry));
  } catch (error) {
    return next(error);
  }
};

/** POST /api/admin/notifications — used by other roles is not exposed; kept for admin broadcast. */
exports.broadcast = async (req, res, next) => {
  try {
    const { title, message, role } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });
    const filter = role ? { roles: role } : {};
    const users = await User.find(filter).select("_id").lean();
    await Notification.insertMany(users.map((user) => ({ user_id: user._id, title, message, link: req.body.link })));
    return res.status(201).json({ sent: users.length });
  } catch (error) {
    return next(error);
  }
};

/* ------------------------------------------------------- analytics / CRM */

function analyticsBuckets(range, now) {
  const buckets = [];
  if (range === "weekly") {
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      buckets.push({
        key: dayKey(d),
        label: d.toLocaleString("en-IN", { weekday: "short" }),
        full: d.toLocaleString("en-IN", { day: "numeric", month: "short" }),
      });
    }
  } else {
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      buckets.push({
        key: monthKey(d),
        label: d.toLocaleString("en-IN", { month: "short" }),
        full: d.toLocaleString("en-IN", { month: "long", year: "numeric" }),
      });
    }
  }
  return buckets;
}

/** GET /api/admin/analytics?range=weekly|monthly */
exports.analytics = async (req, res, next) => {
  try {
    const range = req.query.range === "monthly" ? "monthly" : "weekly";
    const now = new Date();
    const buckets = analyticsBuckets(range, now);
    const start = new Date(range === "monthly" ? `${buckets[0].key}-01T00:00:00.000Z` : `${buckets[0].key}T00:00:00.000Z`);
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const span = end.getTime() - start.getTime();
    const previousStart = new Date(start.getTime() - span);

    const [paidFees, paidOrders, trials, enquiries] = await Promise.all([
      FeeInvoice.find({ status: "paid" }).select("amount paid_at createdAt").lean(),
      Order.find({ payment_status: "paid" }).select("total placed_at createdAt").lean(),
      TrialBooking.find().select("createdAt").lean(),
      Enquiry.find().select("createdAt").lean(),
    ]);

    const bucketKey = (date) => (range === "monthly" ? monthKey(date) : dayKey(date));
    const points = buckets.map((bucket) => ({
      ...bucket,
      revenue: 0,
      fees: 0,
      orders: 0,
      trials: 0,
      enquiries: 0,
    }));
    const byKey = new Map(points.map((p) => [p.key, p]));

    for (const fee of paidFees) {
      const bucket = byKey.get(bucketKey(fee.paid_at || fee.createdAt));
      if (bucket) bucket.fees = money(bucket.fees + Number(fee.amount || 0));
    }
    for (const order of paidOrders) {
      const bucket = byKey.get(bucketKey(order.placed_at || order.createdAt));
      if (bucket) bucket.orders = money(bucket.orders + Number(order.total || 0));
    }
    for (const trial of trials) {
      const bucket = byKey.get(bucketKey(trial.createdAt));
      if (bucket) bucket.trials += 1;
    }
    for (const enquiry of enquiries) {
      const bucket = byKey.get(bucketKey(enquiry.createdAt));
      if (bucket) bucket.enquiries += 1;
    }
    for (const point of points) point.revenue = money(point.fees + point.orders);

    const collect = (from, to) => ({
      revenue: money(
        sum(paidFees.filter((r) => inWindow(r.paid_at || r.createdAt, from, to)), "amount") +
          sum(paidOrders.filter((r) => inWindow(r.placed_at || r.createdAt, from, to)), "total"),
      ),
      orders: paidOrders.filter((r) => inWindow(r.placed_at || r.createdAt, from, to)).length,
      trials: trials.filter((r) => inWindow(r.createdAt, from, to)).length,
      enquiries: enquiries.filter((r) => inWindow(r.createdAt, from, to)).length,
    });

    const totals = collect(start, end);
    const previous = collect(previousStart, start);
    const change = Object.fromEntries(
      Object.keys(totals).map((key) => [key, percentChange(totals[key], previous[key])]),
    );

    return res.json({
      range,
      generatedAt: now.toISOString(),
      points,
      totals,
      previous,
      change,
    });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/admin/trials */
exports.listTrials = async (_req, res, next) => {
  try {
    const rows = await TrialBooking.find().sort({ status: 1, preferred_date: 1 }).lean();
    return res.json(withIds(rows));
  } catch (error) {
    return next(error);
  }
};

/** PATCH /api/admin/trials/:id */
exports.updateTrial = async (req, res, next) => {
  try {
    const update = {};
    if (req.body.status !== undefined) {
      if (!TrialBooking.schema.path("status").enumValues.includes(req.body.status)) {
        return res.status(400).json({ message: "Invalid trial status" });
      }
      update.status = req.body.status;
    }
    if (req.body.notes !== undefined) update.notes = req.body.notes;
    const trial = await TrialBooking.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).lean();
    if (!trial) return res.status(404).json({ message: "Trial booking not found" });
    return res.json(withId(trial));
  } catch (error) {
    return next(error);
  }
};

/** POST /api/admin/staff — admins invite teachers/school staff directly. */
exports.createStaff = async (req, res, next) => {
  try {
    const { full_name, email, password, role, school_id, franchise_id } = req.body;
    const allowed = ["teacher", "school_admin", "franchise", "admin"];
    if (!full_name || !email || !password) {
      return res.status(400).json({ message: "full_name, email and password are required" });
    }
    if (!allowed.includes(role)) return res.status(400).json({ message: "Invalid staff role" });
    if (String(password).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    if (await User.exists({ email: String(email).toLowerCase() })) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const user = await User.create({
      email: String(email).toLowerCase(),
      password: await bcrypt.hash(String(password), 12),
      full_name,
      roles: [role],
    });

    if (role === "teacher") {
      await Teacher.create({
        user_id: user._id,
        full_name,
        email: user.email,
        school_id: school_id || undefined,
        franchise_id: franchise_id || undefined,
        status: "active",
      });
    }

    const admins = await User.find({ roles: "admin" }).select("_id").lean();
    await Notification.insertMany(
      admins.map((admin) => ({
        user_id: admin._id,
        title: "New staff account",
        message: `${full_name} was added as ${role}.`,
        link: "/admin/users",
      })),
    );

    return res.status(201).json(withId(user.toObject()));
  } catch (error) {
    return next(error);
  }
};

/* ---------------------------------------------------------- course admin */

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const categoryLite = (category) =>
  category ? { id: String(category._id), name: category.name, slug: category.slug } : null;

function courseAdminLite(course, counts = {}) {
  return {
    id: String(course._id),
    title: course.title,
    slug: course.slug,
    short_description: course.short_description ?? null,
    description: course.description ?? null,
    image_url: course.image_url ?? null,
    age_group: course.age_group ?? null,
    duration: course.duration ?? null,
    level: course.level ?? "Beginner",
    price: Number(course.price || 0),
    syllabus: course.syllabus ?? [],
    is_published: course.is_published !== false,
    category: categoryLite(course.category_id),
    category_id: course.category_id ? String(course.category_id._id || course.category_id) : null,
    modules: counts.modules ?? 0,
    lessons: counts.lessons ?? 0,
    createdAt: course.createdAt ? new Date(course.createdAt).toISOString() : null,
  };
}

async function courseCounts(courseIds) {
  const ids = courseIds.map(String);
  const [modules, lessons] = await Promise.all([
    CourseModule.find({ course_id: { $in: ids } }).select("course_id").lean(),
    Lesson.find({ course_id: { $in: ids } }).select("course_id").lean(),
  ]);
  const tally = (rows) => {
    const map = new Map();
    for (const row of rows) {
      const key = String(row.course_id);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  };
  return { modules: tally(modules), lessons: tally(lessons) };
}

async function resolveCategory(value) {
  if (!value) return undefined;
  const bySlug = await CourseCategory.findOne({ slug: String(value).trim().toLowerCase() }).select("_id").lean();
  if (bySlug) return bySlug._id;
  if (String(value).match(/^[a-f\d]{24}$/i)) {
    const byId = await CourseCategory.findById(value).select("_id").lean();
    if (byId) return byId._id;
  }
  return undefined;
}

const courseFields = (body, includeCategory = true) => {
  const fields = {};
  for (const key of [
    "title", "slug", "short_description", "description", "image_url",
    "age_group", "duration", "level",
  ]) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  if (body.price !== undefined) fields.price = Math.max(0, Number(body.price) || 0);
  if (body.is_published !== undefined) {
    fields.is_published = body.is_published === true || body.is_published === "true" || body.is_published === "published";
  }
  if (body.syllabus !== undefined) {
    fields.syllabus = Array.isArray(body.syllabus)
      ? body.syllabus
      : String(body.syllabus).split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
  }
  if (includeCategory && body.category !== undefined) fields.category_id = body.category;
  if (includeCategory && body.category_id !== undefined) fields.category_id = body.category_id;
  return fields;
};

/** GET /api/admin/courses — every course, published or draft. */
exports.listCourses = async (_req, res, next) => {
  try {
    const courses = await Course.find().populate("category_id").sort("-createdAt").lean();
    const counts = await courseCounts(courses.map((c) => c._id));
    return res.json(
      courses.map((course) =>
        courseAdminLite(course, {
          modules: counts.modules.get(String(course._id)) ?? 0,
          lessons: counts.lessons.get(String(course._id)) ?? 0,
        }),
      ),
    );
  } catch (error) {
    return next(error);
  }
};

/** GET /api/admin/courses/categories */
exports.listCourseCategories = async (_req, res, next) => {
  try {
    const categories = await CourseCategory.find().sort({ position: 1, name: 1 }).lean();
    return res.json(withIds(categories));
  } catch (error) {
    return next(error);
  }
};

/** POST /api/admin/courses */
exports.createCourse = async (req, res, next) => {
  try {
    if (!String(req.body.title || "").trim()) {
      return res.status(400).json({ message: "Course title is required" });
    }
    const fields = courseFields(req.body);
    let slug = slugify(fields.slug || fields.title);
    if (!slug) return res.status(400).json({ message: "A valid course title or slug is required" });
    if (await Course.exists({ slug })) {
      return res.status(409).json({ message: "A course with that slug already exists" });
    }
    fields.slug = slug;
    if (fields.category_id !== undefined) {
      fields.category_id = await resolveCategory(fields.category_id);
    }
    const course = await Course.create(fields);
    return res.status(201).json(courseAdminLite(course));
  } catch (error) {
    return next(error);
  }
};

/** PATCH /api/admin/courses/:id */
exports.updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const fields = courseFields(req.body);
    if (fields.slug !== undefined) {
      fields.slug = slugify(fields.slug);
      if (!fields.slug) return res.status(400).json({ message: "Invalid slug" });
      const clash = await Course.exists({ slug: fields.slug, _id: { $ne: course._id } });
      if (clash) return res.status(409).json({ message: "A course with that slug already exists" });
    }
    if (fields.category_id !== undefined) fields.category_id = await resolveCategory(fields.category_id);

    Object.assign(course, fields);
    await course.save();
    await course.populate("category_id");
    const counts = await courseCounts([course._id]);
    return res.json(
      courseAdminLite(course.toObject(), {
        modules: counts.modules.get(String(course._id)) ?? 0,
        lessons: counts.lessons.get(String(course._id)) ?? 0,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/** DELETE /api/admin/courses/:id */
exports.deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    await Promise.all([
      CourseModule.deleteMany({ course_id: course._id }),
      Lesson.deleteMany({ course_id: course._id }),
    ]);
    return res.json({ message: "Course deleted" });
  } catch (error) {
    return next(error);
  }
};

/* ------------------------------------------------------------ blog admin */

const blogLite = (post) => ({
  id: String(post._id),
  title: post.title,
  slug: post.slug,
  excerpt: post.excerpt ?? null,
  content: post.content ?? "",
  cover_image: post.cover_image ?? null,
  category: post.category ?? "News",
  author: post.author ?? "AIKIDZ Team",
  tags: post.tags ?? [],
  is_published: post.is_published !== false,
  published_at: (post.published_at || post.createdAt || new Date()).toISOString(),
  read_minutes: post.read_minutes ?? 4,
  views: post.views ?? 0,
  createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
});

const blogFields = (body) => {
  const fields = {};
  for (const key of ["title", "slug", "excerpt", "content", "cover_image", "category", "author", "read_minutes"]) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  if (body.read_minutes !== undefined) fields.read_minutes = Math.max(1, Number(body.read_minutes) || 4);
  if (body.tags !== undefined) {
    fields.tags = Array.isArray(body.tags)
      ? body.tags
      : String(body.tags).split(/,|\r?\n/).map((tag) => tag.trim()).filter(Boolean);
  }
  if (body.is_published !== undefined) {
    fields.is_published = body.is_published === true || body.is_published === "true" || body.is_published === "published";
  }
  if (body.published_at !== undefined && body.published_at) fields.published_at = new Date(body.published_at);
  return fields;
};

/** GET /api/admin/blogs — every post, including drafts. */
exports.listBlogs = async (_req, res, next) => {
  try {
    const posts = await BlogPost.find().sort("-published_at").lean();
    return res.json(posts.map(blogLite));
  } catch (error) {
    return next(error);
  }
};

/** POST /api/admin/blogs */
exports.createBlog = async (req, res, next) => {
  try {
    if (!String(req.body.title || "").trim()) {
      return res.status(400).json({ message: "Blog title is required" });
    }
    const fields = blogFields(req.body);
    const slug = slugify(fields.slug || fields.title);
    if (!slug) return res.status(400).json({ message: "A valid blog title is required" });
    if (await BlogPost.exists({ slug })) {
      return res.status(409).json({ message: "A blog with that slug already exists" });
    }
    fields.slug = slug;
    const post = await BlogPost.create(fields);
    return res.status(201).json(blogLite(post.toObject()));
  } catch (error) {
    return next(error);
  }
};

/** PATCH /api/admin/blogs/:id */
exports.updateBlog = async (req, res, next) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Blog post not found" });

    const fields = blogFields(req.body);
    if (req.body.slug !== undefined) {
      const slug = slugify(req.body.slug);
      if (!slug) return res.status(400).json({ message: "Invalid slug" });
      if (await BlogPost.exists({ slug, _id: { $ne: post._id } })) {
        return res.status(409).json({ message: "A blog with that slug already exists" });
      }
      fields.slug = slug;
    }
    Object.assign(post, fields);
    await post.save();
    return res.json(blogLite(post.toObject()));
  } catch (error) {
    return next(error);
  }
};

/** DELETE /api/admin/blogs/:id */
exports.deleteBlog = async (req, res, next) => {
  try {
    const post = await BlogPost.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: "Blog post not found" });
    return res.json({ message: "Blog post deleted" });
  } catch (error) {
    return next(error);
  }
};
