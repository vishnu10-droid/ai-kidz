const express = require("express");
const { requireAuth, authorizeRoles } = require("../middleware/auth");
const { forOrganization } = require("../controller/organizationController");

const organizationRoutes = (kind) => {
  const router = express.Router();
  const controller = forOrganization(kind);
  router.use(requireAuth, authorizeRoles(kind === "school" ? "school_admin" : "franchise"));

  router.get("/overview", controller.overview);
  router.get("/dashboard", controller.overview); // legacy alias

  router.get("/batches", controller.listBatches);
  router.post("/batches", controller.createBatch);
  router.patch("/batches/:id", controller.updateBatch);
  router.delete("/batches/:id", controller.deleteBatch);
  router.get("/batches/:id/students", controller.batchStudents);

  router.get("/classes", controller.listClasses);
  router.post("/classes", controller.createClass);
  router.patch("/classes/:id", controller.updateClass);
  router.delete("/classes/:id", controller.deleteClass);
  router.get("/classes/:id/students", controller.classStudents);

  router.get("/teachers", controller.listTeachers);
  router.post("/teachers", controller.createTeacher);
  router.patch("/teachers/:id", controller.updateTeacher);
  router.post("/teachers/:id/password", controller.setTeacherPassword);
  router.delete("/teachers/:id", controller.deleteTeacher);

  router.get("/students", controller.listStudents);
  router.post("/students", controller.createStudent);
  router.patch("/students/:id", controller.updateStudent);
  router.delete("/students/:id", controller.deleteStudent);

  router.get("/fees", controller.listFees);
  router.post("/fees", controller.createFee);
  router.post("/fees/:id/pay", controller.payFee);
  router.delete("/fees/:id", controller.deleteFee);

  router.get("/attendance", controller.getAttendance);
  router.post("/attendance", controller.saveAttendance);

  router.get("/enquiries", controller.listEnquiries);
  router.patch("/enquiries/:id", controller.updateEnquiry);

  router.get("/revenue", controller.revenue);
  return router;
};

module.exports = { school: organizationRoutes("school"), franchise: organizationRoutes("franchise") };
