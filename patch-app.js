import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const importStatement = "import { HabitNotificationEngine } from './components/HabitNotificationEngine';\n";
if (!code.includes('HabitNotificationEngine')) {
  code = code.replace("import { TimerProvider } from './lib/timer/TimerContext';", "import { TimerProvider } from './lib/timer/TimerContext';\n" + importStatement);
  code = code.replace("return <>{children}</>;\n}", "return (\n    <>\n      <HabitNotificationEngine />\n      {children}\n    </>\n  );\n}");
  fs.writeFileSync('src/App.tsx', code);
}
