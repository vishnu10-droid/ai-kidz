const router = require("express").Router();
const { requireAuth, authorizeRoles } = require("../middleware/auth");
const controller = require("../controller/studentController");

router.use(requireAuth, authorizeRoles("student"));
router.get("/my-courses", controller.myCourses);
router.post("/quiz/submit", controller.submitQuiz);

module.exports = router;
