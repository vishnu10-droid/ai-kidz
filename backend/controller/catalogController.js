const { Course, StoreProduct } = require("../models");

exports.listCourses = async (_req, res, next) => {
  try { return res.json(await Course.find().populate("category_id").sort("title")); }
  catch (error) { return next(error); }
};

exports.listProducts = async (_req, res, next) => {
  try { return res.json(await StoreProduct.find().sort("name")); }
  catch (error) { return next(error); }
};
