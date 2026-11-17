const router = require("express").Router();
const { requireAuth, authorizeRoles } = require("../middleware/auth");
const controller = require("../controller/teacherController");

router.use(requireAuth, authorizeRoles("teacher"));

router.get("/overview", controller.overview);

router.get("/batches", controller.listBatches);
router.get("/batches/:id/students", controller.batchStudents);
router.get("/students", controller.listStudents);

router.get("/attendance", controller.getAttendance);
router.post("/attendance", controller.markAttendance);

router.get("/assignments", controller.listAssignments);
router.post("/assignments", controller.createAssignment);
router.patch("/assignments/:id", controller.updateAssignment);
router.delete("/assignments/:id", controller.deleteAssignment);

router.get("/submissions", controller.listSubmissions);
router.post("/submissions/:id/grade", controller.gradeSubmission);

module.exports = router;
