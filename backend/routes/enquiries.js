const router = require("express").Router();
const controller = require("../controller/enquiryController");

router.post("/", controller.create);

module.exports = router;
