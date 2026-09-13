import fs from 'fs';
let code = fs.readFileSync('src/pages/auth/Login.tsx', 'utf8');

if (!code.includes('continueAsGuest')) {
  code = code.replace(
    "const { user } = useAuth();",
    "const { user, continueAsGuest } = useAuth();"
  );
  
  code = code.replace(
    "const handleGoogleSignIn = async () => {",
    `const handleGuestSignIn = () => {
    continueAsGuest();
    navigate('/');
  };

  const handleGoogleSignIn = async () => {`
  );
  
  const googleBtn = `              Continue with Google
            </button>`;
  
  const guestBtn = `              Continue with Google
            </button>
            
            <button 
              type="button"
              onClick={handleGuestSignIn}
              disabled={loading}
              className="w-full bg-white/5 border border-white/10 text-text-primary font-medium rounded-xl py-3 flex items-center justify-center gap-3 hover:bg-white/10 transition-colors disabled:opacity-50 mt-4"
            >
              Continue as Guest
            </button>`;
            
  code = code.replace(googleBtn, guestBtn);
}

fs.writeFileSync('src/pages/auth/Login.tsx', code);
