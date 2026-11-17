const router = require("express").Router();
const controller = require("../controller/catalogController");
router.get("/courses", controller.listCourses);
router.get("/courses/:slug", controller.getCourse);
router.get("/products", controller.listProducts);
router.get("/products/:slug", controller.getProduct);
module.exports = router;
