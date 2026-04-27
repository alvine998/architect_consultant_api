const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * Generate a sample Excel template for user import
 * Run this script to create a sample_users_template.xlsx file
 */
const generateSampleTemplate = () => {
  try {
    const workbook = XLSX.utils.book_new();

    // Sample data
    const sampleData = [
      {
        Name: 'John Doe',
        Email: 'john.doe@example.com',
        Password: 'password123'
      },
      {
        Name: 'Jane Smith',
        Email: 'jane.smith@example.com',
        Password: 'password456'
      },
      {
        Name: 'Bob Johnson',
        Email: 'bob.johnson@example.com',
        Password: ''
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);

    // Add column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Name
      { wch: 30 }, // Email
      { wch: 20 }, // Password
    ];

    // Add data validation note
    const noteWorksheet = XLSX.utils.aoa_to_sheet([
      ['User Import Template'],
      [''],
      ['Instructions:'],
      ['1. Fill in the Name, Email, and Password columns'],
      ['2. Name and Email are required fields'],
      ['3. Password is optional (random one will be generated if not provided)'],
      ['4. Email must be in valid format (e.g., user@example.com)'],
      ['5. Do not modify the header row'],
      [''],
      ['Example Data:'],
    ]);

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

    const templatePath = path.join(process.cwd(), 'sample_users_template.xlsx');
    XLSX.writeFile(workbook, templatePath);

    console.log(`✓ Template generated: ${templatePath}`);
    return templatePath;
  } catch (error) {
    console.error(`Failed to generate template: ${error.message}`);
    throw error;
  }
};

// Run if executed directly
if (require.main === module) {
  generateSampleTemplate();
}

module.exports = { generateSampleTemplate };
