import React, { useState, useEffect } from 'react';
import { Search, X, UserPlus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { searchPeople, PublicUserProfile } from '../../lib/usernameService';
import { FriendRelation, FriendRequest } from '../../lib/socialService';

interface SocialSearchProps {
  friends: FriendRelation[];
  requests: FriendRequest[];
  onSendRequest: (targetUsername: string) => Promise<void>;
  currentUid?: string;
}

export default function SocialSearch({
  friends,
  requests,
  onSendRequest,
  currentUid,
}: SocialSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicUserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Debounced search query
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    setSearchError(null);
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchPeople(searchQuery, currentUid);
        setSearchResults(results);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchError("Couldn't complete search. Try again.");
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, currentUid]);

  return (
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
                      onClick={() => onSendRequest(u.username)}
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
  );
}
