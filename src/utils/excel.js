const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * Export users to Excel file
 * @param {Array} users - Array of user objects
 * @param {String} filename - Output filename (default: users.xlsx)
 * @returns {String} - Path to generated file
 */
const exportUsersToExcel = (users, filename = 'users.xlsx') => {
  try {
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    
    // Format data for Excel (exclude password field)
    const formattedUsers = users.map(user => ({
      ID: user.id,
      Name: user.name,
      Email: user.email,
      'Created At': user.createdAt,
      'Updated At': user.updatedAt,
    }));

    // Create worksheet from data
    const worksheet = XLSX.utils.json_to_sheet(formattedUsers);
    
    // Add column widths for better readability
    const colWidths = [
      { wch: 8 },  // ID
      { wch: 20 }, // Name
      { wch: 30 }, // Email
      { wch: 20 }, // Created At
      { wch: 20 }, // Updated At
    ];
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filepath = path.join(uploadsDir, filename);
    XLSX.writeFile(workbook, filepath);

    return filepath;
  } catch (error) {
    throw new Error(`Failed to export users to Excel: ${error.message}`);
  }
};

/**
 * Import users from Excel file
 * @param {String} filepath - Path to Excel file
 * @returns {Array} - Array of user objects
 */
const importUsersFromExcel = (filepath) => {
  try {
    const workbook = XLSX.readFile(filepath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert sheet to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Validate and format data
    const users = data.map((row, index) => {
      if (!row.Name || !row.Email) {
        throw new Error(`Row ${index + 2}: Name and Email are required fields`);
      }

      return {
        name: row.Name?.trim(),
        email: row.Email?.trim(),
        password: row.Password?.trim() || null, // Optional password field
      };
    });

    return users;
  } catch (error) {
    throw new Error(`Failed to import users from Excel: ${error.message}`);
  }
};

/**
 * Validate user data from Excel
 * @param {Array} users - Array of user objects
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
const validateUserData = (users) => {
  const errors = [];

  users.forEach((user, index) => {
    const row = index + 2; // Excel row number (header is row 1)

    if (!user.name || typeof user.name !== 'string') {
      errors.push(`Row ${row}: Name is required and must be a string`);
    }

    if (!user.email || typeof user.email !== 'string') {
      errors.push(`Row ${row}: Email is required and must be a string`);
    } else if (!isValidEmail(user.email)) {
      errors.push(`Row ${row}: Invalid email format`);
    }

    if (user.password && typeof user.password !== 'string') {
      errors.push(`Row ${row}: Password must be a string`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Simple email validation
 * @param {String} email
 * @returns {Boolean}
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

module.exports = {
  exportUsersToExcel,
  importUsersFromExcel,
  validateUserData,
};
