const fs = require('fs');
const path = require('path');

// Path to the tsconfig.json in node_modules
const tsConfigPath = path.join(
  __dirname,
  'node_modules',
  '@supabase',
  'auth-helpers-nextjs',
  'tsconfig.json'
);

// Read the tsconfig.json file
fs.readFile(tsConfigPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  try {
    const tsConfig = JSON.parse(data);
    
    // Update the extends path to point to the correct location
    if (tsConfig.extends) {
      tsConfig.extends = path.relative(
        path.dirname(tsConfigPath),
        path.join(__dirname, 'tsconfig.base.json')
      ).replace(/\\/g, '/');
      
      // Write the updated config back to the file
      fs.writeFile(
        tsConfigPath,
        JSON.stringify(tsConfig, null, 2),
        'utf8',
        (err) => {
          if (err) {
            console.error('Error writing file:', err);
          } else {
            console.log('Successfully updated tsconfig.json in @supabase/auth-helpers-nextjs');
          }
        }
      );
    }
  } catch (e) {
    console.error('Error parsing tsconfig.json:', e);
  }
});
