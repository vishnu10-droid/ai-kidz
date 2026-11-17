const { Notification } = require("../models");
const { withId, withIds } = require("./helpers");

/** GET /api/notifications */
exports.list = async (req, res, next) => {
  try {
    const rows = await Notification.find({ user_id: req.user.id }).sort("-createdAt").limit(40).lean();
    const unread = rows.filter((row) => !row.read).length;
    return res.json({ unread, notifications: withIds(rows) });
  } catch (error) {
    return next(error);
  }
};

/** POST /api/notifications/:id/read */
exports.markRead = async (req, res, next) => {
  try {
    const row = await Notification.findOneAndUpdate({ _id: req.params.id, user_id: req.user.id }, { read: true }, { new: true }).lean();
    if (!row) return res.status(404).json({ message: "Notification not found" });
    return res.json(withId(row));
  } catch (error) {
    return next(error);
  }
};

/** POST /api/notifications/read-all */
exports.markAllRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany({ user_id: req.user.id, read: false }, { read: true });
    return res.json({ updated: result.modifiedCount || 0 });
  } catch (error) {
    return next(error);
  }
};
