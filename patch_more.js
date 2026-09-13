import fs from 'fs';
let code = fs.readFileSync('src/pages/More.tsx', 'utf8');

const oldLogout = `{profile && (
        <div className="pt-6">
          <button 
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="w-full py-4 rounded-[16px] bg-red-500/10 text-red-400 font-medium text-sm hover:bg-red-500/20 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      )}`;

const newLogout = `{user && !user.isAnonymous ? (
        <div className="pt-6">
          <button 
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="w-full py-4 rounded-[16px] bg-red-500/10 text-red-400 font-medium text-sm hover:bg-red-500/20 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="pt-6">
          <button 
            onClick={() => {
              navigate('/login');
            }}
            className="w-full py-4 rounded-[16px] bg-[#8cee28]/10 text-[#8cee28] font-medium text-sm hover:bg-[#8cee28]/20 transition-colors cursor-pointer"
          >
            Sign In / Create Account
          </button>
        </div>
      )}`;

code = code.replace(oldLogout, newLogout);
fs.writeFileSync('src/pages/More.tsx', code);
