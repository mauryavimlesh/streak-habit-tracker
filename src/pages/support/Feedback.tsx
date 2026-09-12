import React from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, MessageSquare } from 'lucide-react';
import { FeedbackForm } from '../../components/feedback/FeedbackForm';
import { DeveloperFooter } from '../../components/layout/DeveloperFooter';

export default function Feedback() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-[#0d0e12] text-white pb-24 select-none">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0d0e12]/90 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#8cee28]" />
              <span>Feedback & Bug Reports</span>
            </h1>
            <p className="text-xs text-[#7d8495]">Help make STREAK better</p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-md mx-auto w-full px-5 pt-4 space-y-5">
        <FeedbackForm />
        <DeveloperFooter />
      </main>
    </div>
  );
}
