import { useState } from 'react';
import { ChevronLeft, Sparkles, Send } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function AICoach() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Array<{role: 'user' | 'ai', text: string}>>([
    { role: 'ai', text: 'Hey Vimlesh! 👋 How can I help you with your habits today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });
      
      const data = await response.json();
      
      if (data.text) {
        setMessages(prev => [...prev, { role: 'ai', text: data.text }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I am having trouble connecting right now.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d0e12] text-white max-w-md mx-auto">
      <header className="flex items-center justify-between p-6 pb-4 border-b border-[#1f232c]">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#13151b] border border-[#1f232c] hover:bg-white/10 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 text-[#7d8495]" />
        </button>
        <div className="text-center">
          <h1 className="text-base font-semibold flex items-center gap-1.5 justify-center text-white">
            AI Coach <Sparkles className="w-4 h-4 text-[#a78bfa]" />
          </h1>
          <p className="text-xs text-[#8cee28] font-medium">● Online</p>
        </div>
        <div className="w-10 h-10" />
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`p-4 max-w-[85%] rounded-[20px] shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-[#23381c] border border-[#345228] text-white rounded-br-sm' 
                  : 'bg-[#13151b] border border-[#1f232c] text-[#e4e7ec] rounded-bl-sm'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="p-4 bg-[#13151b] border border-[#1f232c] rounded-[20px] rounded-bl-sm">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 rounded-full bg-[#7d8495] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-[#7d8495] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-[#7d8495] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] border-t border-[#1f232c] bg-[#0d0e12]">
        <div className="relative">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask anything..."
            className="w-full bg-[#13151b] border border-[#1f232c] rounded-2xl pl-5 pr-12 py-3.5 outline-none focus:border-[#8cee28]/50 transition-colors text-sm text-white placeholder-[#7d8495]"
          />
          <button 
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="absolute right-2 top-2 bottom-2 w-9 flex items-center justify-center rounded-xl bg-[#8cee28] text-black disabled:opacity-40 transition-opacity hover:opacity-90 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
