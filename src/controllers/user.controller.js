const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const { exportUsersToExcel, importUsersFromExcel, validateUserData } = require("../utils/excel");
const fs = require("fs");
const path = require("path");

const getAll = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : null;

    const where = search
      ? {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ["password"] },
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      data: rows,
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password"] },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, email, password } = req.body;
    await user.update({ name, email, password });
    const { password: _, ...data } = user.toJSON();
    res.json(data);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Email already in use" });
    }
    if (err.name === "SequelizeValidationError") {
      return res
        .status(400)
        .json({ message: err.errors.map((e) => e.message) });
    }
    res.status(500).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    await user.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const exportUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
    });

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found to export" });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
    const filename = `users_export_${timestamp}.xlsx`;

    const filepath = exportUsersToExcel(users, filename);

    res.download(filepath, filename, (err) => {
      if (err) {
        console.error("Download error:", err);
      }
      // Clean up file after download
      fs.unlink(filepath, (unlinkErr) => {
        if (unlinkErr) console.error("Cleanup error:", unlinkErr);
      });
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const importUsers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!req.file.mimetype.includes("spreadsheet") && !req.file.originalname.endsWith(".xlsx")) {
      return res.status(400).json({ message: "File must be an Excel file (.xlsx)" });
    }

    // Import users from Excel
    const usersData = importUsersFromExcel(req.file.path);

    // Validate data
    const validation = validateUserData(usersData);
    if (!validation.isValid) {
      fs.unlinkSync(req.file.path); // Clean up uploaded file
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: validation.errors 
      });
    }

    // Check for duplicate emails
    const emails = usersData.map(u => u.email);
    const existingUsers = await User.findAll({
      where: { email: { [Op.in]: emails } },
      attributes: ["email"],
    });

    const existingEmails = existingUsers.map(u => u.email);
    const duplicates = usersData.filter(u => existingEmails.includes(u.email));

    if (duplicates.length > 0) {
      fs.unlinkSync(req.file.path);
      return res.status(409).json({
        message: "Some users already exist",
        duplicates: duplicates.map(u => u.email),
      });
    }

    // Hash passwords and create users
    const createdUsers = [];
    const errors = [];

    for (let i = 0; i < usersData.length; i++) {
      try {
        const userData = usersData[i];
        const hashedPassword = await bcrypt.hash(
          userData.password || Math.random().toString(36).slice(-10),
          10
        );

        const user = await User.create({
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
        });

        const { password: _, ...userWithoutPassword } = user.toJSON();
        createdUsers.push(userWithoutPassword);
      } catch (userErr) {
        errors.push({
          row: i + 2,
          email: usersData[i].email,
          error: userErr.message,
        });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.status(201).json({
      message: "Import completed",
      created: createdUsers.length,
      failed: errors.length,
      data: createdUsers,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAll, getOne, update, remove, exportUsers, importUsers };
