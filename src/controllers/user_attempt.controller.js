const { Op } = require("sequelize");
const UserAttempt = require("../models/user_attempt.model");

const getAll = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;
    const where = {};

    if (req.query.email) {
      where.email = { [Op.like]: `%${req.query.email.trim()}%` };
    }

    if (req.query.success !== undefined) {
      where.success = req.query.success === "true" || req.query.success === true;
    }

    const { count, rows } = await UserAttempt.findAndCountAll({
      where,
      limit,
      offset,
      order: [["timestamp", "DESC"]],
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
    const attempt = await UserAttempt.findByPk(req.params.id);
    if (!attempt) return res.status(404).json({ message: "User attempt not found" });

    res.json(attempt);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { email, success } = req.body;

    if (!email || success === undefined) {
      return res.status(400).json({ message: "Email and success are required" });
    }

    const attempt = await UserAttempt.create({
      email,
      ipaddress: req.body.ipaddress || req.ip,
      success: success === true || success === "true",
    });

    res.status(201).json(attempt);
  } catch (err) {
    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({ message: err.errors.map((e) => e.message) });
    }

    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAll, getOne, create };
