const { Router } = require("express");
const {
  register,
  login,
  getAll,
  getOne,
  create,
  update,
  remove,
} = require("../controllers/admin.controller");
const adminMiddleware = require("../utils/admin.middleware");

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.get("/", adminMiddleware, getAll);
router.get("/:id", adminMiddleware, getOne);
router.post("/", adminMiddleware, create);
router.put("/:id", adminMiddleware, update);
router.delete("/:id", adminMiddleware, remove);

module.exports = router;
