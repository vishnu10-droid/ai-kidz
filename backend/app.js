
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(",").map(origin => origin.trim())
    : true,
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "AIKIDZ API is running",
  });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/catalog", require("./routes/catalog"));

const catalogController = require("./controller/catalogController");

app.get("/api/courses", catalogController.listCourses);
app.get("/api/courses/:slug", catalogController.getCourse);
app.get("/api/products", catalogController.listProducts);
app.get("/api/products/:slug", catalogController.getProduct);

const organization = require("./routes/organization");

app.use("/api/school", organization.school);
app.use("/api/franchise", organization.franchise);
app.use("/api/teacher", require("./routes/teacher"));
app.use("/api/student", require("./routes/student"));
app.use("/api/parent", require("./routes/parent"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/enquiries", require("./routes/enquiries"));
app.use("/api/certificates", require("./routes/certificates"));
app.use("/api/notifications", require("./routes/notifications"));

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((error, _req, res, _next) => {
  console.error(error);

  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }

  if (error.name === "CastError") {
    return res.status(400).json({ message: "That record id isn't valid" });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      message: "A record with that value already exists",
    });
  }

  return res.status(500).json({
    message: "Internal server error",
  });
});

module.exports = app;
