#!/usr/bin/env node
'use strict';

const { GoogleAuthManager } = require('../dist/index');

async function main() {
  const args = process.argv.slice(2);
  const options = {};

  if (args.includes('--storage-state')) options.storageState = true;
  if (args.includes('--profile')) options.profile = true;
  if (args.includes('--meta')) options.sessionMeta = true;

  const hasSpecific = options.storageState || options.profile || options.sessionMeta;

  console.log('');
  console.log('  Google Auth System - Session Clear');
  console.log('  ==================================');
  console.log('');

  if (!hasSpecific) {
    console.log('  Clearing ALL session data (cookies, profile, metadata)...');
  } else {
    if (options.storageState) console.log('  - Clearing StorageState (Cookie JSON)');
    if (options.profile) console.log('  - Clearing Chrome Profile');
    if (options.sessionMeta) console.log('  - Clearing Session Metadata');
  }
  console.log('');

  const manager = new GoogleAuthManager();
  const result = await manager.clearSession(hasSpecific ? options : {});

  if (result.errors.length === 0) {
    console.log('  Session cleared successfully.');
    console.log('  Run "google-auth-setup" to log in again.');
  } else {
    console.error('  Some errors occurred:');
    for (const err of result.errors) {
      console.error('    -', err);
    }
  }
  console.log('');
}

main().catch((err) => {
  console.error('Clear error:', err.message || err);
  process.exit(1);
});
