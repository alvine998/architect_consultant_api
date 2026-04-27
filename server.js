require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const sequelize = require("./src/utils/db");
const userRoutes = require("./src/routes/user.routes");
const authRoutes = require("./src/routes/auth.routes");

// Import models to ensure they're synced
require("./src/models/user.model");
require("./src/models/otp.model");

const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads directory
app.use('/uploads', express.static(uploadsDir));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

sequelize.sync({ alter: true }).then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
