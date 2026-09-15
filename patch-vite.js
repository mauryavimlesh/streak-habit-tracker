import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `// Serve static files in production
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(\`Server is running on port \${PORT}\`);
  });
}
export default app;`;

const newStr = `
import { createServer as createViteServer } from 'vite';

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(\`Server running on http://0.0.0.0:\${PORT}\`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
`;

code = code.replace(targetStr, newStr);
fs.writeFileSync('server.ts', code);
console.log("Patched server.ts successfully");
