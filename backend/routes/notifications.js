const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const controller = require("../controller/notificationController");

router.use(requireAuth);

router.get("/", controller.list);
router.post("/read-all", controller.markAllRead);
router.post("/:id/read", controller.markRead);

module.exports = router;
