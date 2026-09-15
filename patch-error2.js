import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace("console.warn(`Model ${model} attempt failed:`, err?.message || err);", "console.warn(`Model ${model} attempt failed:`, err?.message || err); lastError = err;");
code = code.replace("throw lastError || new Error('No response from AI model');", "throw new Error(`All models failed. Last error: ${lastError?.message || lastError}`);");
fs.writeFileSync('server.ts', code);
