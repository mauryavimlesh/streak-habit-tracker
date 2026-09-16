import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router';
import { 
  Bell, 
  Settings as SettingsIcon,
  ChevronRight,
  List,
  Target,
  BarChart2,
  Sparkles,
  Book,
  Clock,
  Palette,
  Cloud,
  Settings,
  HelpCircle,
  Compass,
  CheckCircle2,
  Play,
  Calendar
} from 'lucide-react';
import UserAvatar from '../components/profile/UserAvatar';
import EditProfileModal from '../components/profile/EditProfileModal';
import DeveloperFooter from '../components/layout/DeveloperFooter';
import { triggerHaptic } from '../lib/haptics';

export default function More() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const userName = profile?.userName?.split(' ')[0] || profile?.name?.split(' ')[0] || 'Vimlesh';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const menuItems = [
    { id: 'habits', label: 'My Habits', icon: List, color: 'text-blue-400', bg: 'bg-blue-400/20', path: '/habits' },
    { id: 'goals', label: 'Goals', icon: Target, color: 'text-pink-400', bg: 'bg-pink-400/20', path: '/goals' },
    { id: 'analytics', label: 'Analytics', icon: BarChart2, color: 'text-yellow-400', bg: 'bg-yellow-400/20', path: '/analytics' },
    { id: 'weekly-review', label: 'Weekly Review', sub: '(Sunday Reflection)', icon: Calendar, color: 'text-teal-400', bg: 'bg-teal-400/20', path: '/analytics?review=true' },
    { id: 'ai', label: 'AI Coach', sub: '(Chat with AI)', icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-400/20', path: '/ai-coach' },
    { id: 'activity', label: 'Focus / Activity Timer', icon: Play, color: 'text-emerald-400', bg: 'bg-emerald-400/20', path: '/activity/history' },
    { id: 'onboarding', label: 'Onboarding Flow', sub: '(Replay Intro)', icon: Compass, color: 'text-accent-primary', bg: 'bg-accent-primary/20', path: '/onboarding?replay=true' },
    { id: 'journal', label: 'Journal', icon: Book, color: 'text-fuchsia-400', bg: 'bg-fuchsia-400/20', path: '/journal' },
    { id: 'reminders', label: 'Reminders', icon: Clock, color: 'text-orange-400', bg: 'bg-orange-400/20', path: '/reminders' },
    { id: 'themes', label: 'Themes & Appearance', icon: Palette, color: 'text-cyan-400', bg: 'bg-cyan-400/20', path: '/themes' },
    { id: 'sync', label: 'Backup & Sync', icon: Cloud, color: 'text-blue-500', bg: 'bg-blue-500/20', path: '/sync' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'text-indigo-400', bg: 'bg-indigo-400/20', path: '/settings' },
    { id: 'help', label: 'Help & Support', icon: HelpCircle, color: 'text-blue-300', bg: 'bg-blue-300/20', path: '/support' },
  ];

  return (
    <div className="p-6 pb-28 space-y-6 max-w-md mx-auto relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#1e2330] border border-accent-primary/40 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-accent-primary" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between mt-2 mb-6">
        <h1 className="text-xl font-semibold">More</h1>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/reminders')}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors cursor-pointer"
          >
            <Bell className="w-5 h-5" />
          </button>
          <button 
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors cursor-pointer"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Profile Section */}
      <div 
        onClick={() => {
          triggerHaptic('tap');
          setIsEditModalOpen(true);
        }}
        className="flex items-center justify-between p-4 rounded-[24px] bg-surface-card border border-[#1f232c] cursor-pointer hover:bg-[#161922] transition-all shadow-sm group active:scale-[0.99]"
      >
        <div className="flex items-center gap-4">
          <UserAvatar
            avatarUrl={profile?.avatarUrl}
            name={userName}
            size="md"
            showBadge
            onBadgeClick={() => {
              triggerHaptic('tap');
              setIsEditModalOpen(true);
            }}
          />
          <div>
            <h2 className="font-semibold text-white tracking-tight text-[16px] group-hover:text-accent-primary transition-colors">
              {userName}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[12px] text-accent-primary font-medium hover:underline flex items-center">
                Edit Profile
              </span>
              <span className="text-[11px] text-[#7d8495]">·</span>
              <p className="text-[12px] text-[#7d8495]">
                {user && !user.isAnonymous ? 'Personal Plan · In Sync' : 'Guest Mode'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[#7d8495] group-hover:text-white transition-colors">
          <ChevronRight className="w-5 h-5" />
        </div>
      </div>

      {/* Menu List */}
      <div className="space-y-6">
        
        <div>
          <h3 className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider mb-2 ml-4">Personalization</h3>
          <div className="bg-surface-card border border-[#1f232c] rounded-[24px] p-2 divide-y divide-[#1e222c] shadow-sm">
            {menuItems.filter(i => ['themes', 'reminders'].includes(i.id)).map((item) => (
              <button key={item.id} onClick={() => item.path && navigate(item.path)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#181c26] transition-colors group cursor-pointer">
                <div className="flex items-center gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[15px] font-medium text-white/90 group-hover:text-white transition-colors">{item.label}</span>
                    {item.sub && <span className="text-[11px] text-[#7d8495]">{item.sub}</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#7d8495] group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider mb-2 ml-4">Productivity</h3>
          <div className="bg-surface-card border border-[#1f232c] rounded-[24px] p-2 divide-y divide-[#1e222c] shadow-sm">
            {menuItems.filter(i => ['goals', 'habits', 'analytics', 'weekly-review', 'activity', 'ai', 'journal'].includes(i.id)).map((item) => (
              <button key={item.id} onClick={() => item.path && navigate(item.path)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#181c26] transition-colors group cursor-pointer">
                <div className="flex items-center gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[15px] font-medium text-white/90 group-hover:text-white transition-colors">{item.label}</span>
                    {item.sub && <span className="text-[11px] text-[#7d8495]">{item.sub}</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#7d8495] group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider mb-2 ml-4">Account & Data</h3>
          <div className="bg-surface-card border border-[#1f232c] rounded-[24px] p-2 divide-y divide-[#1e222c] shadow-sm">
            {menuItems.filter(i => ['settings', 'sync'].includes(i.id)).map((item) => (
              <button key={item.id} onClick={() => item.path && navigate(item.path)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#181c26] transition-colors group cursor-pointer">
                <div className="flex items-center gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[15px] font-medium text-white/90 group-hover:text-white transition-colors">{item.label}</span>
                    {item.sub && <span className="text-[11px] text-[#7d8495]">{item.sub}</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#7d8495] group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider mb-2 ml-4">Other</h3>
          <div className="bg-surface-card border border-[#1f232c] rounded-[24px] p-2 divide-y divide-[#1e222c] shadow-sm">
            {menuItems.filter(i => ['help', 'onboarding'].includes(i.id)).map((item) => (
              <button key={item.id} onClick={() => item.path && navigate(item.path)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#181c26] transition-colors group cursor-pointer">
                <div className="flex items-center gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[15px] font-medium text-white/90 group-hover:text-white transition-colors">{item.label}</span>
                    {item.sub && <span className="text-[11px] text-[#7d8495]">{item.sub}</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#7d8495] group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {user && !user.isAnonymous ? (
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
            className="w-full py-4 rounded-[16px] bg-accent-primary/10 text-accent-primary font-medium text-sm hover:bg-accent-primary/20 transition-colors cursor-pointer"
          >
            Sign In / Create Account
          </button>
        </div>
      )}

      {/* Developer Footer */}
      <DeveloperFooter />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccessToast={showToast}
      />

    </div>
  );
}

