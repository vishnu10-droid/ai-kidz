const router = require("express").Router();
const { requireAuth, authorizeRoles } = require("../middleware/auth");
const controller = require("../controller/teacherController");

router.use(requireAuth, authorizeRoles("teacher"));
router.get("/batches", controller.listBatches);
router.post("/attendance", controller.markAttendance);
router.get("/assignments", controller.listAssignments);
router.post("/assignments", controller.createAssignment);
router.post("/submissions/grade", controller.gradeSubmission);

module.exports = router;
