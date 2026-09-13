import fs from 'fs';
let code = fs.readFileSync('src/pages/AICoach.tsx', 'utf8');

const searchStr = `      const data = await response.json();
      
      if (data.text) {`;
const replaceStr = `      const data = await response.json();
      
      if (!response.ok) {
         throw new Error(data.error || 'Server error');
      }
      
      if (data.text) {`;

code = code.replace(searchStr, replaceStr);

const searchErrStr = `      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I am having trouble connecting right now.' }]);`;
const replaceErrStr = `      setMessages(prev => [...prev, { role: 'ai', text: error.message || 'Sorry, I am having trouble connecting right now.' }]);`;

code = code.replace(searchErrStr, replaceErrStr);

fs.writeFileSync('src/pages/AICoach.tsx', code);
