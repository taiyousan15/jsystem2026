#!/usr/bin/env node
'use strict';

const { GoogleAuthManager } = require('../dist/index');

async function main() {
  console.log('');
  console.log('  Google Auth System - Initial Setup');
  console.log('  ===================================');
  console.log('');
  console.log('  Chrome will open. Please log in to your Google account.');
  console.log('  After login, the session will be saved for automated use.');
  console.log('');

  const manager = new GoogleAuthManager({
    headless: false,
    enableLevels: [5],
  });

  const result = await manager.authenticateAtLevel(5);

  if (result.success) {
    console.log('');
    console.log('  Setup complete! Session saved.');
    console.log('  You can now use google-auth-system in your project:');
    console.log('');
    console.log('    import { GoogleAuthManager } from "google-auth-system";');
    console.log('    const auth = new GoogleAuthManager();');
    console.log('    const result = await auth.authenticate();');
    console.log('');
  } else {
    console.error('  Setup failed. Please try again.');
  }

  await manager.cleanup();
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error('Setup error:', err.message || err);
  process.exit(1);
});
