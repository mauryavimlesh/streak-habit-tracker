import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const search = `function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, onboardingCompleted, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-t-2 border-accent-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const isCompleted = Boolean(`;

const regex = /function ProtectedRoute\(\{ children \}: \{ children: React\.ReactNode \}\) \{\s+const \{ user, profile, onboardingCompleted, loading \} = useAuth\(\);\s+if \(loading\) \{\s+return \(\s+<div className="min-h-screen flex items-center justify-center bg-background">\s+<div className="w-8 h-8 border-t-2 border-accent-primary rounded-full animate-spin"><\/div>\s+<\/div>\s+\);\s+\}\s+const isCompleted = Boolean\(/;

const replace = `function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, onboardingCompleted, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-t-2 border-accent-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user && !profile?.isGuest) {
    return <Navigate to="/login" replace />;
  }

  const isCompleted = Boolean(`;

code = code.replace(regex, replace);
fs.writeFileSync('src/App.tsx', code);
