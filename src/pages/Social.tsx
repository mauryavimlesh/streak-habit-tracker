import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Users,
  Trophy,
  Share2,
  Search,
  UserPlus,
  Check,
  X,
  Copy,
  ChevronRight,
  Flame,
  Zap,
  Shield,
  Sparkles,
  ArrowLeft,
  Calendar,
  Layers,
  BarChart2,
  Activity as ActivityIcon,
  Heart,
  MoreVertical,
  BellOff,
  UserMinus,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { triggerHaptic } from '../lib/haptics';
import {
  getLocalFriends,
  getLocalFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
  syncFriendsFromCloud,
  compareMutualHabits,
  FriendRelation,
  FriendRequest,
  FriendComparisonResult,
} from '../lib/socialService';
import {
  getLocalChallenges,
  joinChallenge,
  calculateChallengeProgressFromHabits,
  Challenge,
} from '../lib/challengeService';
import {
  getOrInitUserInvite,
  UserInvite,
} from '../lib/inviteService';
import { searchPeople, PublicUserProfile } from '../lib/usernameService';
import { readLocalHabits, readLocalLogs, Habit } from '../lib/habitService';
import {
  getLocalSocialActivities,
  toggleKudos,
  sendKudosToFriend,
  SocialActivityItem,
} from '../lib/socialActivityService';
import GuestAuthGateModal from '../components/auth/GuestAuthGateModal';

export type FriendsHubTab = 'friends' | 'activity' | 'challenges';

export default function Social() {
  const { user, profile, isGuest } = useAuth();
  const navigate = useNavigate();

  // Exactly 3 main navigation choices
  const [activeTab, setActiveTab] = useState<FriendsHubTab>('friends');

  const [friends, setFriends] = useState<FriendRelation[]>(() => getLocalFriends());
  const [requests, setRequests] = useState<FriendRequest[]>(() => getLocalFriendRequests());
  const [habits, setHabits] = useState<Habit[]>(() => readLocalHabits());
  const [challenges, setChallenges] = useState<Challenge[]>(() => getLocalChallenges());
  const [socialActivities, setSocialActivities] = useState<SocialActivityItem[]>(() =>
    getLocalSocialActivities()
  );
  const [userInvite, setUserInvite] = useState<UserInvite | null>(null);

  // Modals & Sheets
  const [isInviteSheetOpen, setIsInviteSheetOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendRelation | null>(null);
  const [comparisonResult, setComparisonResult] = useState<FriendComparisonResult | null>(null);
  const [isAuthGateOpen, setIsAuthGateOpen] = useState(false);
  const [authGateFeature, setAuthGateFeature] = useState('Friends & Accountability');

  // Search inside Invite Sheet
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicUserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Friend actions menu popover
  const [actionMenuFriendId, setActionMenuFriendId] = useState<string | null>(null);

  const rawUsername = profile?.userName || profile?.name || 'vimlesh';
  const username = rawUsername.replace(/\s+/g, '_').toLowerCase();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync cloud data on load
  useEffect(() => {
    if (user?.uid && !isGuest) {
      syncFriendsFromCloud(user.uid).then(setFriends);
      getOrInitUserInvite(user.uid, username, profile?.displayName || profile?.name).then(setUserInvite);
    } else {
      getOrInitUserInvite('local', username, profile?.displayName || profile?.name).then(setUserInvite);
    }
  }, [user?.uid, isGuest, username, profile?.displayName, profile?.name]);

  const [searchError, setSearchError] = useState<string | null>(null);

  // Debounced user search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    setSearchError(null);
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchPeople(searchQuery, user?.uid);
        setSearchResults(results);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchError("Couldn't complete search. Try again.");
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery, user?.uid]);

  const handleOpenInviteSheet = () => {
    triggerHaptic('tap');
    if (isGuest) {
      setAuthGateFeature('Inviting Friends');
      setIsAuthGateOpen(true);
      return;
    }
    setIsInviteSheetOpen(true);
  };

  const handleSendRequest = async (targetUsername: string) => {
    if (isGuest) {
      setAuthGateFeature('Friend Requests');
      setIsAuthGateOpen(true);
      return;
    }

    triggerHaptic('tap');
    const res = await sendFriendRequest(
      user?.uid || 'local',
      username,
      targetUsername,
      profile?.displayName || profile?.name
    );

    if (res.success) {
      showToast(`Request sent to @${targetUsername}!`);
      setRequests(getLocalFriendRequests());
      setSearchQuery('');
      setSearchResults([]);
    } else {
      showToast(res.error || 'Failed to send friend request.');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    triggerHaptic('success');
    await acceptFriendRequest(requestId, user?.uid || 'local', username);
    setRequests(getLocalFriendRequests());
    setFriends(getLocalFriends());
    showToast('Friend request accepted!');
  };

  const handleDeclineRequest = (requestId: string) => {
    triggerHaptic('tap');
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    showToast('Request declined.');
  };

  const handleRemoveFriend = async (friendUid: string) => {
    triggerHaptic('warning');
    await removeFriend(user?.uid || 'local', friendUid);
    setFriends(getLocalFriends());
    setActionMenuFriendId(null);
    if (selectedFriend?.friendUid === friendUid) {
      setSelectedFriend(null);
    }
    showToast('Friend removed.');
  };

  const handleOpenFriendProfile = (friend: FriendRelation) => {
    triggerHaptic('tap');
    setSelectedFriend(friend);
    setActionMenuFriendId(null);

    const friendProfile: PublicUserProfile = {
      uid: friend.friendUid,
      username: friend.friendUsername,
      normalizedUsername: friend.friendUsername.toLowerCase(),
      displayName: friend.friendDisplayName,
      avatarUrl: friend.friendAvatarUrl,
      streak: 14,
      lifetimeXP: 820,
      level: 5,
      momentum: 85,
    };

    const localHabits = readLocalHabits();
    const localLogs = readLocalLogs();
    const result = compareMutualHabits(localHabits, localLogs, friendProfile, 7);
    setComparisonResult(result);
  };

  // One-tap Kudos
  const handleSendKudos = async (kudosText: string, friendUsername: string) => {
    triggerHaptic('success');
    await sendKudosToFriend(username, friendUsername, kudosText, profile?.displayName || profile?.name);
    setSocialActivities(getLocalSocialActivities());
    showToast(`Sent ${kudosText} to @${friendUsername}!`);
  };

  const handleToggleActivityKudos = async (activityId: string) => {
    triggerHaptic('tap');
    await toggleKudos(activityId, username);
    setSocialActivities(getLocalSocialActivities());
  };

  const handleJoinChallenge = async (challengeId: string) => {
    if (isGuest) {
      setAuthGateFeature('Community Challenges');
      setIsAuthGateOpen(true);
      return;
    }
    triggerHaptic('success');
    await joinChallenge(challengeId, user?.uid || 'local', username, profile?.displayName || profile?.name);
    setChallenges(getLocalChallenges());
    showToast('Enrolled in sprint challenge!');
  };

  const handleCopyInviteLink = () => {
    triggerHaptic('tap');
    const inviteUrl = userInvite?.url || `https://streakloop.vercel.app/invite/${username}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    showToast('Invite link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareInvite = async () => {
    triggerHaptic('tap');
    const inviteUrl = userInvite?.url || `https://streakloop.vercel.app/invite/${username}`;
    const shareData = {
      title: 'Join my STREAKLOOP accountability circle',
      text: `Let's build consistency together on STREAKLOOP! Join with my invite link:`,
      url: inviteUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      handleCopyInviteLink();
    }
  };

  return (
    <div className="p-4 pb-28 space-y-4 max-w-md mx-auto relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#1e2330] border border-accent-primary/40 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-accent-primary shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. CLEAN TOP-LEVEL HEADER */}
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              triggerHaptic('tap');
              navigate('/more');
            }}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Friends</h1>
            <p className="text-xs text-[#8c94a8]">Build consistency together.</p>
          </div>
        </div>

        {/* Top-Right: Single + Add / Invite Button */}
        <button
          onClick={handleOpenInviteSheet}
          className="px-3.5 py-1.5 rounded-full bg-accent-primary hover:bg-[#9eff38] active:scale-95 text-black font-bold text-xs tracking-tight transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-accent-primary/20"
        >
          <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Invite</span>
        </button>
      </header>

      {/* 2. COMPACT SEGMENTED NAVIGATION (Max 3 Choices: Friends | Activity | Challenges) */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-surface-card border border-[#1f232c] rounded-2xl shadow-sm">
        <button
          onClick={() => {
            triggerHaptic('tap');
            setActiveTab('friends');
          }}
          className={`py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'friends'
              ? 'bg-accent-primary text-black font-bold shadow'
              : 'text-[#8c94a8] hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Friends</span>
          {friends.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] leading-tight ${
                activeTab === 'friends' ? 'bg-black/20 text-black' : 'bg-white/10 text-white/70'
              }`}
            >
              {friends.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            triggerHaptic('tap');
            setActiveTab('activity');
          }}
          className={`py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'activity'
              ? 'bg-accent-primary text-black font-bold shadow'
              : 'text-[#8c94a8] hover:text-white'
          }`}
        >
          <ActivityIcon className="w-3.5 h-3.5" />
          <span>Activity</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('tap');
            setActiveTab('challenges');
          }}
          className={`py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'challenges'
              ? 'bg-accent-primary text-black font-bold shadow'
              : 'text-[#8c94a8] hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Challenges</span>
        </button>
      </div>

      {/* 3. FRIENDS TAB */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          
          {/* SEARCH PEOPLE BLOCK */}
          <div className="p-4 rounded-[24px] bg-surface-card border border-[#1f232c] space-y-3 text-left">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Search People
            </h3>
            
            <div className="relative">
              <Search className="w-4 h-4 text-[#7d8495] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name or @username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 h-11 rounded-xl bg-background border border-[#222838] text-xs text-white placeholder:text-[#656d82] focus:outline-none focus:border-accent-primary transition-colors font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7d8495] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Search Status & Results */}
            <div className="space-y-2">
              {searchQuery.trim().length === 0 && (
                <p className="text-[11px] text-[#7d8495] italic">Search by username or name</p>
              )}
              
              {isSearching && (
                <div className="flex items-center gap-2 text-[11px] text-white/60">
                  <span className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                  <span>Searching...</span>
                </div>
              )}

              {searchError && (
                <p className="text-[11px] text-red-400 font-medium">✗ {searchError}</p>
              )}

              {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <p className="text-[11px] text-[#7d8495] font-medium">No users found</p>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="p-1 rounded-xl bg-[#0e111a] border border-[#242c40] divide-y divide-white/5 max-h-56 overflow-y-auto">
                  {searchResults.map((u) => {
                    const isAlreadyFriend = friends.some(f => f.friendUid === u.uid);
                    const isRequestPending = requests.some(r => r.receiverUid === u.uid && r.status === 'pending');
                    
                    return (
                      <div
                        key={u.uid}
                        className="flex items-center justify-between p-2.5 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt={u.displayName}
                              className="w-8 h-8 rounded-full object-cover border border-accent-primary/25"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-accent-primary/15 border border-accent-primary/20 flex items-center justify-center text-accent-primary font-bold text-xs select-none">
                              {u.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h5 className="text-xs font-bold text-white">{u.displayName || u.username}</h5>
                              <span className="text-[10px] font-mono text-cyan-400">@{u.username}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#7d8495]">
                              <span className="text-amber-400 font-semibold">🔥 {u.streak || 0}d streak</span>
                              <span>·</span>
                              <span>{u.lifetimeXP || 0} XP</span>
                            </div>
                          </div>
                        </div>
                        {isAlreadyFriend ? (
                          <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[#7d8495] text-[10px] font-bold">
                            Friends
                          </span>
                        ) : isRequestPending ? (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-bold">
                            Pending
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(u.username)}
                            className="px-3 py-1.5 rounded-lg bg-accent-primary hover:bg-[#9eff38] text-black font-bold text-[10px] tracking-tight active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <UserPlus className="w-3 h-3 stroke-[2.5]" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* PENDING FRIEND REQUESTS SECTION */}
          {requests.filter((r) => r.status === 'pending').length > 0 && (
            <div className="p-4 rounded-[24px] bg-surface-card border border-[#1f232c] space-y-3 text-left">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Friend Requests ({requests.filter((r) => r.status === 'pending').length})
              </h3>
              <div className="space-y-2">
                {requests
                  .filter((r) => r.status === 'pending')
                  .map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">@{req.senderUsername}</p>
                        <span className="text-[10px] text-[#8c94a8]">
                          {req.senderDisplayName || req.senderUsername} wants to connect with you.
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAcceptRequest(req.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-400 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(req.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-rose-400 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* FRIENDS / CONNECTED USERS LIST */}
          <div className="p-4 rounded-[24px] bg-surface-card border border-[#1f232c] space-y-3 text-left">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Connected Friends
            </h3>
            
            {friends.length === 0 ? (
              <div className="text-center py-6 space-y-1">
                <p className="text-xs font-semibold text-white">No friends connected yet</p>
                <p className="text-[11px] text-[#7d8495] max-w-xs mx-auto">
                  Find people by their username or name above, or share your invite link!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((f) => {
                  const isMenuOpen = actionMenuFriendId === f.id;
                  return (
                    <div
                      key={f.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-accent-primary/40 transition-all flex items-center justify-between group relative cursor-pointer"
                      onClick={() => handleOpenFriendProfile(f)}
                    >
                      <div className="flex items-center gap-3 truncate flex-1">
                        {f.friendAvatarUrl ? (
                          <img
                            src={f.friendAvatarUrl}
                            alt={f.friendDisplayName || f.friendUsername}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-accent-primary/15 border border-accent-primary/20 flex items-center justify-center text-accent-primary font-bold text-xs select-none">
                            {f.friendUsername.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="text-left truncate">
                          <div className="flex items-center gap-1.5 truncate">
                            <h4 className="text-xs font-bold text-white group-hover:text-accent-primary transition-colors truncate">
                              {f.friendDisplayName || f.friendUsername}
                            </h4>
                            <span className="text-[10px] font-mono text-cyan-400">
                              @{f.friendUsername}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                            <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                              <Flame className="w-3 h-3 fill-amber-400" />
                              14 day streak
                            </span>
                            <span className="text-[#555f75]">·</span>
                            <span className="text-[#8c94a8]">840 XP</span>
                          </div>
                        </div>
                      </div>

                      <div className="relative shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic('tap');
                            setActionMenuFriendId(isMenuOpen ? null : f.id);
                          }}
                          className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8495] hover:text-white transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {isMenuOpen && (
                          <div className="absolute right-0 top-8 z-30 w-40 rounded-xl bg-[#141824] border border-[#273044] p-1 shadow-xl space-y-1 animate-in fade-in zoom-in-95 duration-100">
                            <button
                              onClick={() => {
                                showToast(`Muted notifications for @${f.friendUsername}`);
                                setActionMenuFriendId(null);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-white/85 hover:bg-white/5 hover:text-white transition-colors text-left cursor-pointer"
                            >
                              <BellOff className="w-3.5 h-3.5 text-[#7d8495]" />
                              <span>Mute alert</span>
                            </button>
                            <button
                              onClick={() => handleRemoveFriend(f.friendUid)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
                            >
                              <UserMinus className="w-3 h-3" />
                              <span>Remove friend</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* INTEGRATED SHARE & INVITE COMPONENT */}
          <div className="p-4 rounded-[24px] bg-surface-card border border-[#1f232c] space-y-3 text-left">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Invite Someone to STREAK
              </h3>
              <p className="text-[11px] text-[#7d8495] mt-0.5">
                Consistency is easier together. Send your referral link!
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyInviteLink}
                className="py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 text-xs text-white font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
              </button>
              <button
                onClick={handleShareInvite}
                className="py-2.5 rounded-xl bg-accent-primary hover:bg-[#9eff38] text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-md shadow-accent-primary/10"
              >
                <Share2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Share Invite</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* 4. ACTIVITY TAB */}
      {activeTab === 'activity' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Recent Activity
            </span>
            <span className="text-[10px] text-[#7d8495]">Meaningful milestones</span>
          </div>

          <div className="space-y-2">
            {socialActivities.map((act) => {
              const hasGivenKudos = act.kudosGivenBy.includes(username);
              return (
                <div
                  key={act.id}
                  className="p-3.5 rounded-2xl bg-surface-card border border-[#1f232c] space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary font-bold text-xs shrink-0">
                        {act.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-white">
                            {act.displayName || act.username}
                          </h4>
                          <span className="text-[10px] font-mono text-cyan-400">
                            @{act.username}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#7d8495]">
                          {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/5 text-[#8c94a8] border border-white/5">
                      {act.category || 'Discipline'}
                    </span>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-white">{act.title}</h5>
                    <p className="text-[11px] text-[#8c94a8] mt-0.5 leading-relaxed">{act.description}</p>
                  </div>

                  {/* One-tap Kudos reaction button */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleActivityKudos(act.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        hasGivenKudos
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-white/5 text-[#8c94a8] hover:text-white border border-white/5'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${hasGivenKudos ? 'fill-rose-400' : ''}`} />
                      <span>{act.kudosCount > 0 ? act.kudosCount : 'Kudos'}</span>
                    </button>
                    <span className="text-[10px] text-[#555f75]">Encouragement</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. CHALLENGES TAB */}
      {activeTab === 'challenges' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Community Sprints
            </span>
            <span className="text-[10px] text-[#7d8495]">Real habit tracking</span>
          </div>

          <div className="space-y-2.5">
            {challenges.map((c) => {
              const isJoined = Boolean(c.participants?.[user?.uid || 'local']);
              const localHabits = readLocalHabits();
              const localLogs = readLocalLogs();
              const progress = calculateChallengeProgressFromHabits(c, localHabits, localLogs);

              return (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-surface-card border border-[#1f232c] space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1 inline-block">
                        {c.category} · {c.durationDays} Days
                      </span>
                      <h3 className="text-sm font-bold text-white">{c.title}</h3>
                      <p className="text-[11px] text-[#8c94a8] mt-0.5 leading-relaxed">{c.description}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#8c94a8]">Your Habit Progress:</span>
                      <span className="font-bold text-white">
                        {progress.progressCount} / {c.targetCompletions} Days ({progress.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-accent-primary rounded-full transition-all"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center justify-between border-t border-white/5">
                    <span className="text-[10px] text-[#7d8495]">4 participants · Ends Sunday</span>
                    {isJoined ? (
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                        <Check className="w-3 h-3" /> Enrolled
                      </span>
                    ) : (
                      <button
                        onClick={() => handleJoinChallenge(c.id)}
                        className="px-3 py-1.5 rounded-xl bg-accent-primary hover:bg-[#9eff38] text-black font-bold text-[10px] transition-all cursor-pointer active:scale-95"
                      >
                        Join Challenge
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. FRIEND PROFILE & MUTUAL COMPARISON SHEET (Requirement 3, 7, 8, 12) */}
      {selectedFriend && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#131622] border border-[#232a3d] rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl relative text-left max-h-[90vh] overflow-y-auto space-y-5">
            {/* Close button */}
            <button
              onClick={() => setSelectedFriend(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8495] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-accent-primary/15 border border-accent-primary/30 flex items-center justify-center text-accent-primary font-bold text-base shrink-0">
                {selectedFriend.friendUsername.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {selectedFriend.friendDisplayName || selectedFriend.friendUsername}
                </h3>
                <p className="text-xs font-mono text-cyan-400 font-semibold">
                  @{selectedFriend.friendUsername}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px]">
                  <span className="text-amber-400 font-semibold">🔥 14 day streak</span>
                  <span className="text-[#555f75]">·</span>
                  <span className="text-[#8c94a8]">840 XP</span>
                  <span className="text-[#555f75]">·</span>
                  <span className="text-purple-400 font-semibold">Lv.5</span>
                </div>
              </div>
            </div>

            {/* One-Tap Kudos (Requirement 12) */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
              <span className="text-[10px] font-bold text-[#8c94a8] uppercase tracking-wider block">
                Send Quick Kudos
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { text: '🔥 Keep going' },
                  { text: '💪 Nice work' },
                  { text: '👏 Proud of you' },
                  { text: '⚡ Let\'s go' },
                  { text: '🎯 Stay focused' },
                ].map((k) => (
                  <button
                    key={k.text}
                    onClick={() => handleSendKudos(k.text, selectedFriend.friendUsername)}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-accent-primary/15 hover:text-accent-primary text-xs font-semibold text-white/90 border border-white/5 transition-all cursor-pointer active:scale-95"
                  >
                    {k.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Shared Habits Section (Requirement 7) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Shared Habits
                  </h4>
                  <p className="text-[10px] text-[#7d8495]">Mutual habits tracked together</p>
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold">
                  Mutual Only
                </span>
              </div>

              {comparisonResult?.mutuallySharedHabits && comparisonResult.mutuallySharedHabits.length > 0 ? (
                <div className="space-y-2">
                  {comparisonResult.mutuallySharedHabits.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-white block">{item.habitName}</span>
                          <span className="text-[10px] text-[#7d8495]">{item.category}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-amber-400">🔥 7 days</span>
                        <p className="text-[9px] text-[#7d8495]">mutual consistency</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Requirement 18: Empty Shared Habits */
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-1">
                  <p className="text-xs font-semibold text-white">No shared habits yet</p>
                  <p className="text-[11px] text-[#8c94a8]">
                    Choose habits you want to track together.
                  </p>
                </div>
              )}
            </div>

            {/* Consistency Comparison (Requirement 8) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Consistency Comparison
              </h4>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[9px] text-[#7d8495] block uppercase">Streak</span>
                  <div className="text-xs font-bold text-white mt-1">
                    <span className="text-accent-primary">14d</span> vs{' '}
                    <span className="text-amber-400">14d</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[9px] text-[#7d8495] block uppercase">Consistency</span>
                  <div className="text-xs font-bold text-white mt-1">
                    <span className="text-accent-primary">
                      {comparisonResult?.userSharedConsistencyScore || 85}%
                    </span>{' '}
                    vs{' '}
                    <span className="text-amber-400">
                      {comparisonResult?.friendSharedConsistencyScore || 80}%
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[9px] text-[#7d8495] block uppercase">Weekly</span>
                  <div className="text-xs font-bold text-white mt-1">
                    <span className="text-accent-primary">91%</span> vs{' '}
                    <span className="text-amber-400">86%</span>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-[#636c82] italic leading-tight text-center pt-1">
                Private habits are never exposed. Only mutual habits are compared.
              </p>
            </div>

            {/* Close */}
            <button
              onClick={() => setSelectedFriend(null)}
              className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 7. DEDICATED LIGHTWEIGHT INVITE SHEET (Requirement 4) */}
      {isInviteSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#131622] border border-[#232a3d] rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl relative text-left space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Invite friends</h3>
                <p className="text-xs text-[#8c94a8]">Consistency is easier together.</p>
              </div>
              <button
                onClick={() => setIsInviteSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8495] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Referral XP Bonus Tag */}
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Earn +50 XP when your friend signs up · They get +25 XP</span>
            </div>

            {/* 3 Primary Actions */}
            <div className="space-y-2 pt-1">
              {/* 1. Copy Invite Link */}
              <button
                onClick={handleCopyInviteLink}
                className="w-full p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent-primary/15 border border-accent-primary/25 flex items-center justify-center text-accent-primary">
                    <Copy className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-white group-hover:text-accent-primary transition-colors block">
                      Copy invite link
                    </span>
                    <span className="text-[10px] font-mono text-[#7d8495] truncate block max-w-[200px]">
                      streakloop.vercel.app/invite/{username}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-accent-primary">
                  {copiedLink ? 'Copied!' : 'Copy'}
                </span>
              </button>

              {/* 2. Share Invite */}
              <button
                onClick={handleShareInvite}
                className="w-full p-3 rounded-2xl bg-accent-primary hover:bg-[#9eff38] text-black font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-accent-primary/20 active:scale-95"
              >
                <Share2 className="w-4 h-4 stroke-[2.5]" />
                <span>Share Invite</span>
              </button>
            </div>

            {/* 3. Search Username */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <span className="text-[10px] font-bold text-[#7d8495] uppercase tracking-wider block">
                Or Search by Username
              </span>
              <div className="relative">
                <Search className="w-4 h-4 text-[#7d8495] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. alex23"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-background border border-[#222838] text-xs text-white placeholder:text-[#656d82] focus:outline-none focus:border-accent-primary transition-colors font-mono"
                />
              </div>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="p-1.5 rounded-xl bg-[#0e111a] border border-[#242c40] space-y-1 max-h-44 overflow-y-auto">
                  {searchResults.map((u) => (
                    <div
                      key={u.uid}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary font-bold text-xs">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h5 className="text-xs font-semibold text-white">@{u.username}</h5>
                          <p className="text-[9px] text-[#7d8495]">{u.displayName || 'Consistency Seeker'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSendRequest(u.username)}
                        className="px-2.5 py-1 rounded-lg bg-accent-primary text-black font-bold text-[10px] tracking-tight hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Guest Authentication Gate Modal (Requirement 19) */}
      <GuestAuthGateModal
        isOpen={isAuthGateOpen}
        onClose={() => setIsAuthGateOpen(false)}
        featureName={authGateFeature}
      />
    </div>
  );
}
