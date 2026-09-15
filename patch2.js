import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const targetIndex = code.indexOf('import { createServer as createViteServer } from \'vite\';');

if (targetIndex !== -1) {
  code = code.substring(0, targetIndex);
  code += `
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
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
  fs.writeFileSync('server.ts', code);
  console.log("Patched server.ts successfully");
} else {
  console.log("Could not find target index");
}
