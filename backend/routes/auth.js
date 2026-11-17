const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const controller = require("../controller/authController");
router.post("/register", controller.register);
router.post("/login", controller.login);
router.post("/logout", requireAuth, controller.logout);
router.get("/me", requireAuth, controller.me);
module.exports = router;
