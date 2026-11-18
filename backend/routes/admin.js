const router = require("express").Router();
const { requireAuth, authorizeRoles } = require("../middleware/auth");
const controller = require("../controller/adminController");

router.use(requireAuth, authorizeRoles("admin"));

router.get("/overview", controller.overview);
router.get("/analytics", controller.analytics);

router.get("/trials", controller.listTrials);
router.patch("/trials/:id", controller.updateTrial);
router.post("/staff", controller.createStaff);

router.get("/users", controller.listUsers);
router.patch("/users/:id", controller.updateUser);
router.delete("/users/:id", controller.deleteUser);

router.get("/schools", controller.listSchools);
router.post("/schools", controller.createSchool);
router.patch("/schools/:id", controller.updateSchool);
router.delete("/schools/:id", controller.deleteSchool);

router.get("/franchises", controller.listFranchises);
router.post("/franchises", controller.createFranchise);
router.patch("/franchises/:id", controller.updateFranchise);
router.delete("/franchises/:id", controller.deleteFranchise);

router.get("/orders", controller.listOrders);
router.patch("/orders/:id", controller.updateOrder);

router.get("/enquiries", controller.listEnquiries);
router.patch("/enquiries/:id", controller.updateEnquiry);

router.post("/notifications", controller.broadcast);

module.exports = router;
