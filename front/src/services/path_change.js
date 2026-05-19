const fs = require('fs').promises;
const path = require('path');

async function moveJsonFiles(sourceDir, targetDir) {
  try {
    await fs.access(sourceDir);
    await fs.mkdir(targetDir, { recursive: true });

    const files = await fs.readdir(sourceDir);
    const jsonFiles = files.filter(file => path.extname(file).toLowerCase() === '.json');

    if (jsonFiles.length === 0) {
      console.log('Нет .json файлов для переноса.');
      return;
    }
    await Promise.all(jsonFiles.map(async (file) => {
      const srcPath = path.join(sourceDir, file);
      const destPath = path.join(targetDir, file);
      await fs.rename(srcPath, destPath);
    }));

    console.log(`Перенесено ${jsonFiles.length} .json файлов из "${sourceDir}" в "${targetDir}"`);
  } catch (err) {
    console.error('Ошибка при переносе файлов:', err.message);
    throw err;
  }
}

module.exports = moveJsonFiles;

moveJsonFiles('./testovye_zameki', './a');