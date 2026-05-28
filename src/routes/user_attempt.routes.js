const { Router } = require("express");
const { getAll, getOne, create } = require("../controllers/user_attempt.controller");
const authMiddleware = require("../utils/auth.middleware");

const router = Router();

router.get("/", authMiddleware, getAll);
router.get("/:id", authMiddleware, getOne);
router.post("/", authMiddleware, create);

module.exports = router;
