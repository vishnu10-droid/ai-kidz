const router = require("express").Router();
const controller = require("../controller/catalogController");
router.get("/courses", controller.listCourses);
router.get("/products", controller.listProducts);
module.exports = router;
