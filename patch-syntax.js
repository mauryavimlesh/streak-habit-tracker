import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(`      } catch (err: any) {
        console.warn(\`Model \${model} attempt failed:\`, err?.message || err);
        lastError = err;
      }
      }
    }`, `      } catch (err: any) {
        console.warn(\`Model \${model} attempt failed:\`, err?.message || err);
        lastError = err;
      }
    }`);

fs.writeFileSync('server.ts', code);
