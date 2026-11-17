const router = require("express").Router();
const { requireAuth, authorizeRoles } = require("../middleware/auth");
const controller = require("../controller/adminController");
router.use(requireAuth, authorizeRoles("admin"));
router.get("/kpis", controller.kpis);
router.get("/users", controller.listUsers);
router.patch("/users/:id/roles", controller.updateUserRoles);
module.exports = router;
