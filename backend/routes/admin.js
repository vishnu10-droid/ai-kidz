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

router.get("/courses", controller.listCourses);
router.get("/courses/categories", controller.listCourseCategories);
router.post("/courses", controller.createCourse);
router.patch("/courses/:id", controller.updateCourse);
router.delete("/courses/:id", controller.deleteCourse);

router.get("/blogs", controller.listBlogs);
router.post("/blogs", controller.createBlog);
router.patch("/blogs/:id", controller.updateBlog);
router.delete("/blogs/:id", controller.deleteBlog);

router.post("/notifications", controller.broadcast);

module.exports = router;
