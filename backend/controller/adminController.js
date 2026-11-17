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
  roles,
} = require("../models");
const { withId, withIds, money } = require("./helpers");

const monthKey = (date) => new Date(date).toISOString().slice(0, 7);

/** GET /api/admin/overview */
exports.overview = async (_req, res, next) => {
  try {
    const [schools, franchises, students, teachers, batches, users, paidFees, paidOrders, enquiries] =
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
        activeSchools: schools.filter((s) => s.status === "active").length,
        franchises: franchises.length,
        students,
        teachers,
        batches,
        users,
        orders: await Order.countDocuments(),
        pendingEnquiries: enquiries.filter((e) => e.status === "new").length,
        pendingSchools: schools.filter((s) => s.lab_status !== "active").length,
        franchiseRevenue: money(feeRevenue * 0.3),
      },
      revenueSeries: months.map((m) => ({
        label: m.label,
        fees: money(m.fees),
        orders: money(m.orders),
        total: money(m.fees + m.orders),
      })),
      activity,
      recentOrders: withIds(recentOrders),
      recentEnquiries: withIds(enquiries.slice(0, 5)),
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
