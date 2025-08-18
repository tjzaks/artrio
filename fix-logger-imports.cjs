const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/components/admin/AdminLogsPanel.tsx',
  'src/components/admin/SystemControlsPanel.tsx', 
  'src/components/MediaUpload.tsx',
  'src/components/NotificationBell.tsx',
  'src/components/ReportUserDialog.tsx',
  'src/pages/AdminDashboard.tsx',
  'src/pages/NotFound.tsx',
  'src/pages/UserProfile.tsx'
];

console.log('🔧 Fixing missing logger imports...');

filesToFix.forEach(filePath => {
  try {
    const fullPath = path.join(__dirname, filePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Check if file already has logger import
    if (content.includes('import { logger }') || content.includes("import logger")) {
      console.log(`✅ ${filePath} - already has logger import`);
      return;
    }
    
    // Check if file uses logger
    if (!content.includes('logger.')) {
      console.log(`⚠️  ${filePath} - doesn't use logger`);
      return;
    }
    
    // Find the last import line
    const lines = content.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex >= 0) {
      // Insert logger import after last import
      lines.splice(lastImportIndex + 1, 0, "import { logger } from '@/utils/logger';");
      
      const newContent = lines.join('\n');
      fs.writeFileSync(fullPath, newContent, 'utf8');
      console.log(`✅ ${filePath} - added logger import`);
    } else {
      console.log(`❌ ${filePath} - couldn't find import section`);
    }
    
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
});

console.log('🎉 Logger import fixes complete!');