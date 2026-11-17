const router = require("express").Router();
const { requireAuth, authorizeRoles } = require("../middleware/auth");
const controller = require("../controller/parentController");

router.use(requireAuth, authorizeRoles("parent"));

router.get("/overview", controller.overview);
router.get("/children", controller.listChildren);
router.get("/attendance", controller.attendance);
router.get("/fees", controller.listFees);
router.post("/fees/:id/pay", controller.payFee);
router.get("/progress", controller.progress);

module.exports = router;
