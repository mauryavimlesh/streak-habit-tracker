import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const errCatchStr = `      } catch (err: any) {
        console.warn(\`Model \${model} attempt failed:\`, err?.message || err);
        lastError = err;
      }`;
      
code = code.replace(/      \} catch \(err: any\) \{[\s\S]*?      \}/, errCatchStr);
fs.writeFileSync('server.ts', code);
