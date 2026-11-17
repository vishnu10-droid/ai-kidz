const router = require("express").Router();
const { requireAuth, authorizeRoles } = require("../middleware/auth");
const controller = require("../controller/studentController");

router.use(requireAuth, authorizeRoles("student"));

/* Gamified learning hub */
router.get("/profile", controller.profile);
router.get("/continue-lesson", controller.continueLesson);
router.post("/lessons/complete", controller.completeLessonV2);
router.post("/quizzes/submit", controller.submitQuizV2);
router.get("/live-classes", controller.liveClasses);
router.get("/diy-guides", controller.diyGuides);

router.get("/overview", controller.overview);

router.get("/courses", controller.myCourses);
router.get("/courses/:id", controller.courseDetail);
router.post("/courses/:id/lessons/:lessonId/complete", controller.completeLesson);
router.delete("/courses/:id/lessons/:lessonId/complete", controller.completeLesson);

router.get("/assignments", controller.listAssignments);
router.post("/assignments/:id/submit", controller.submitAssignment);

router.get("/quizzes", controller.listQuizzes);
router.get("/quizzes/:id", controller.getQuiz);
router.post("/quizzes/:id/submit", controller.submitQuiz);

router.get("/certificates", controller.certificates);
router.get("/attendance", controller.attendance);

module.exports = router;
