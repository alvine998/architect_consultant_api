const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getAll, getOne, update, remove, exportUsers, importUsers } = require('../controllers/user.controller');
const { generateSampleTemplate } = require('../utils/generate-template');
const authMiddleware = require('../utils/auth.middleware');

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    const allowedExtensions = ['.xlsx', '.xls'];
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed (.xlsx, .xls)'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

router.get('/', authMiddleware, getAll);
router.get('/:id', authMiddleware, getOne);
router.put('/:id', authMiddleware, update);
router.delete('/:id', authMiddleware, remove);

// Export and Import routes
router.get('/export/excel', authMiddleware, exportUsers);
router.post('/import/excel', authMiddleware, upload.single('file'), importUsers);

// Template download route
router.get('/import/template', authMiddleware, (req, res) => {
  try {
    const templatePath = path.join(process.cwd(), 'sample_users_template.xlsx');
    
    // Generate template if it doesn't exist
    if (!fs.existsSync(templatePath)) {
      generateSampleTemplate();
    }

    res.download(templatePath, 'users_template.xlsx');
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
