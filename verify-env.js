// verify-env.js
// This script runs verification for necessary environment variables at runtime on Vercel or locally.
// It logs warnings if any expected variables are missing, without exposing any key values.

function verifyEnvironmentVariables() {
  const expectedVars = ['GEMINI_API_KEY', 'FIREBASE_SERVICE_ACCOUNT'];
  let allConfigured = true;

  console.log('--- Environment Variable Verification ---');
  for (const envVar of expectedVars) {
    const value = process.env[envVar];
    if (!value) {
      console.warn(`\u26A0\uFE0F  Warning: Expected environment variable '${envVar}' is missing or empty.`);
      allConfigured = false;
    } else {
      console.log(`\u2705  Success: '${envVar}' is securely configured (length: ${value.length}).`);
    }
  }
  console.log('-----------------------------------------');

  if (!allConfigured) {
    console.warn('Some environment variables are missing. Functionality depending on these variables may fail.');
  } else {
    console.log('All expected environment variables are present.');
  }
}

// Execute verification
verifyEnvironmentVariables();
