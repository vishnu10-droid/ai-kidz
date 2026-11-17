const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const controller = require("../controller/orderController");

router.use(requireAuth);

router.get("/", controller.mine);
router.post("/", controller.create);
router.get("/:id", controller.mineOne);

module.exports = router;
