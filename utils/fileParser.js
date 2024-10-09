const fs = require('fs');
const csvParser = require('csv-parser');
const xlsx = require('xlsx');

// Parse CSV file
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const students = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => students.push(data))
      .on('end', () => resolve(students))
      .on('error', (error) => reject(error));
  });
};

// Parse XLSX file
const parseXLSX = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const students = xlsx.utils.sheet_to_json(sheet);
  return students;
};

module.exports = {
  parseCSV,
  parseXLSX,
};
