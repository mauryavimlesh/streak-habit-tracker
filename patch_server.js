import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const search = `  } catch (error: any) {
    console.error('AI Coach Error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }`;

const replace = `  } catch (error: any) {
    console.error('AI Coach Error:', error);
    const msg = error.message?.toLowerCase() || '';
    if (msg.includes('resource_exhausted') || msg.includes('quota') || msg.includes('429')) {
      return res.status(429).json({ error: 'The AI Coach is currently at capacity due to high demand. Please try again in a few minutes!' });
    }
    res.status(500).json({ error: 'Failed to generate response. Please try again.' });
  }`;

code = code.replace(search, replace);
fs.writeFileSync('server.ts', code);
