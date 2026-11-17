const router = require("express").Router();
const controller = require("../controller/certificateController");

router.get("/verify", controller.verify);

module.exports = router;
