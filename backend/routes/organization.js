const express = require("express");
const { requireAuth, authorizeRoles } = require("../middleware/auth");
const { forOrganization } = require("../controller/organizationController");

const organizationRoutes = (kind) => {
  const router = express.Router();
  const controller = forOrganization(kind);
  router.use(requireAuth, authorizeRoles(kind === "school" ? "school_admin" : "franchise"));
  router.get("/dashboard", controller.dashboard);
  router.post("/batches", controller.createBatch);
  router.post("/teachers", controller.createTeacher);
  router.post("/teachers/login", controller.createTeacherLogin);
  router.post("/students", controller.createStudent);
  router.get("/fees", controller.listFees);
  router.post("/fees", controller.createFee);
  return router;
};

module.exports = { school: organizationRoutes("school"), franchise: organizationRoutes("franchise") };
