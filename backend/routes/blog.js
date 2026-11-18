const router = require("express").Router();
const controller = require("../controller/blogController");

router.get("/", controller.listBlogs);
router.get("/:slug", controller.getBlog);

module.exports = router;
