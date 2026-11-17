require("dotenv").config();

const { connectDatabase } = require("./config/db");
const app = require("./app");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`AIKIDZ API listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start API:", error.message);
    process.exit(1);
  }
};

startServer();
