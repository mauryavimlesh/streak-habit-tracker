import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "const candidateModels = ['gemini-3.1-pro-preview', 'gemini-2.5-flash'];",
  "const candidateModels = ['gemini-3.1-pro-preview', 'gemini-3.6-flash', 'gemini-3.8-flash'];"
);

// If it's a 429 quota error, throw immediately so the outer catch can return 503 instead of falling back to a 404
const errCatchStr = `      } catch (err: any) {
        console.warn(\`Model \${model} attempt failed:\`, err?.message || err); lastError = err; fs.appendFileSync('error.log', \`Model \${model} error: \` + (err?.stack || err) + '\\n');
        if (err?.message?.includes('429') || err?.message?.includes('quota') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
          throw err;
        }
      }`;

code = code.replace(/      \} catch \(err: any\) \{[\s\S]*?      \}/, errCatchStr);

fs.writeFileSync('server.ts', code);
