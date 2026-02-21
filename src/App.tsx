/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, Calendar, Info, Timer, Send } from 'lucide-react';
import { supabase } from './lib/supabase';

// --- Constants & Types ---

const BD_OFFSET_MS = 6 * 60 * 60 * 1000;
const BN_DIGITS_MAP: Record<string, string> = {
  "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪", "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯"
};
const BN_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
];

interface Division {
  name: string;
  iftar: string; // HH:MM
}

const FALLBACK_DIVISIONS: Division[] = [
  { name: "ঢাকা বিভাগ", iftar: "18:00" },
  { name: "চট্টগ্রাম বিভাগ", iftar: "17:55" },
  { name: "রাজশাহী বিভাগ", iftar: "18:05" },
  { name: "খুলনা বিভাগ", iftar: "18:04" },
  { name: "বরিশাল বিভাগ", iftar: "18:01" },
  { name: "সিলেট বিভাগ", iftar: "17:53" },
  { name: "রংপুর বিভাগ", iftar: "18:03" },
  { name: "ময়মনসিংহ বিভাগ", iftar: "17:59" },
];

// --- Utilities ---

function toBnDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS_MAP[d]);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function getBdNow() {
  return new Date(Date.now() + BD_OFFSET_MS);
}

function getBdDateParts(date: Date) {
  return {
    y: date.getUTCFullYear(),
    m: date.getUTCMonth(),
    d: date.getUTCDate(),
    hh: date.getUTCHours(),
    mm: date.getUTCMinutes(),
    ss: date.getUTCSeconds()
  };
}

function getTargetUtcMs(iftarHHMM: string, addDays: number) {
  const now = getBdNow();
  const p = getBdDateParts(now);
  const [H, M] = iftarHHMM.split(":").map(Number);

  // target BD date = today + addDays
  const baseUtcMsForBdMidnight = Date.UTC(p.y, p.m, p.d, 0, 0, 0);
  const bdMidnightUtcMs = baseUtcMsForBdMidnight - BD_OFFSET_MS;
  const targetUtcMs = bdMidnightUtcMs + (addDays * 24 * 60 * 60 * 1000) + (H * 60 * 60 * 1000) + (M * 60 * 1000);

  return targetUtcMs;
}

function format12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const hh12 = h % 12 || 12;
  const ampm = h >= 12 ? 'পিএম' : 'এএম';
  return `${toBnDigits(pad2(hh12))}:${toBnDigits(pad2(m))} ${ampm}`;
}

// --- Components ---

const CountdownCard = ({ division, nowUtcMs }: { division: Division; nowUtcMs: number; key?: string }) => {
  const targetTodayUtc = getTargetUtcMs(division.iftar, 0);
  const isAfterIftar = nowUtcMs >= targetTodayUtc;
  const targetUtc = isAfterIftar ? getTargetUtcMs(division.iftar, 1) : targetTodayUtc;
  
  const diffMs = Math.max(0, targetUtc - nowUtcMs);
  const totalSeconds = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 flex flex-col justify-between hover:bg-white transition-all shadow-md h-full"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
            <MapPin size={18} />
          </div>
          <h3 className="font-black text-lg text-slate-800">{division.name}</h3>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none mb-1">ইফতার</span>
          <span className="font-black text-slate-700 text-sm md:text-base">{format12h(division.iftar)}</span>
        </div>
      </div>
      
      <div className={`px-3 py-2.5 rounded-xl flex flex-col items-center ${isAfterIftar ? 'bg-amber-50 border border-amber-100' : 'bg-emerald-50 border border-emerald-100'}`}>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">
          {isAfterIftar ? 'আগামীকাল বাকি' : 'বাকি সময়'}
        </span>
        <div className="text-lg md:text-xl font-black text-slate-900 flex gap-1.5 leading-none">
          <span>{toBnDigits(h)}<small className="text-xs ml-0.5 opacity-60">ঘণ্টা</small></span>
          <span>{toBnDigits(pad2(m))}<small className="text-xs ml-0.5 opacity-60">মিনিট</small></span>
          <span>{toBnDigits(pad2(s))}<small className="text-xs ml-0.5 opacity-60">সেকেন্ড</small></span>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [nowUtcMs, setNowUtcMs] = useState(Date.now());
  const [divisions, setDivisions] = useState<Division[]>(FALLBACK_DIVISIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDivisions = async () => {
      try {
        const { data, error } = await supabase
          .from('divisions')
          .select('name, iftar')
          .order('id', { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) {
          setDivisions(data);
        }
      } catch (err) {
        console.error('Error fetching from Supabase:', err);
        // Fallback is already set in state
      } finally {
        setLoading(false);
      }
    };

    fetchDivisions();

    const timer = setInterval(() => {
      setNowUtcMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const bdNow = useMemo(() => new Date(nowUtcMs + BD_OFFSET_MS), [nowUtcMs]);
  const p = useMemo(() => getBdDateParts(bdNow), [bdNow]);

  const hh12 = p.hh % 12 || 12;
  const ampm = p.hh >= 12 ? 'পিএম' : 'এএম';
  const formattedTime = `${toBnDigits(pad2(hh12))}:${toBnDigits(pad2(p.mm))}:${toBnDigits(pad2(p.ss))} ${ampm}`;
  const formattedDate = `${toBnDigits(p.d)} ${BN_MONTHS[p.m]} ${toBnDigits(p.y)}`;

  // Ramadan Calculation for 2026 (Start: Feb 19, 2026)
  const ramadanDate = useMemo(() => {
    const start = new Date(2026, 1, 19).getTime(); // Feb 19, 2026
    const today = new Date(p.y, p.m, p.d).getTime();
    let diffDays = Math.floor((today - start) / (24 * 60 * 60 * 1000)) + 1;
    
    // Update to next Ramadan day after all Iftars are done for today
    const allIftars = divisions.map(d => getTargetUtcMs(d.iftar, 0));
    const maxIftarMs = Math.max(...allIftars);
    
    if (nowUtcMs >= maxIftarMs) {
      diffDays += 1;
    }

    if (diffDays >= 1 && diffDays <= 30) {
      return `${toBnDigits(diffDays)} তম রমজান`;
    }
    return null;
  }, [p.y, p.m, p.d, nowUtcMs, divisions]);

  // Grouping divisions as requested
  const row1 = divisions.slice(0, 3); // Dhaka, Chittagong, Rajshahi
  const row2 = divisions.slice(3, 6); // Khulna, Barisal, Sylhet
  const row3 = divisions.slice(6, 8); // Rangpur, Mymensingh

  return (
    <div className="h-[100dvh] w-screen bg-slate-50 text-slate-900 font-sans overflow-hidden flex flex-col">
      {/* Edge-to-Edge Full Screen Container */}
      <div className="flex-1 flex flex-col bg-white/30 backdrop-blur-xl relative overflow-hidden">
        {/* Compact Header - Full Width */}
        <header className="px-8 py-4 flex items-center justify-center border-b border-slate-200/60 bg-white/80 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200">
              <Clock size={20} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">ইফতার কাউন্টডাউন</h1>
            <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 ml-4">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              লাইভ আপডেট
            </p>
          </div>
        </header>

        {/* Content Area - Optimized for Full Screen & Responsive */}
        <main className="flex-1 px-6 md:px-12 py-6 flex flex-col gap-6 overflow-y-auto lg:overflow-y-hidden justify-start lg:justify-center items-center scrollbar-thin scrollbar-thumb-slate-200">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-emerald-700 font-bold animate-pulse">তথ্য লোড হচ্ছে...</p>
              </div>
            </div>
          )}

          {/* Dynamic Title - Larger for Full Screen */}
          {(() => {
            const allIftars = divisions.map(d => getTargetUtcMs(d.iftar, 0));
            const maxIftarMs = Math.max(...allIftars);
            const isTomorrow = nowUtcMs >= maxIftarMs;
            return (
              <motion.h2 
                key={isTomorrow ? 'tomorrow' : 'today'}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-3xl md:text-5xl font-black text-slate-800 mb-2 md:mb-4 drop-shadow-sm text-center"
              >
                {isTomorrow ? "আগামীকালের ইফতারের সময়সূচি" : "আজকে ইফতারের সময়সূচি"}
              </motion.h2>
            );
          })()}

          {/* Centered Ramadan, Date and Time - Larger for Full Screen */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row justify-center items-center gap-6 md:gap-12 mb-4 md:mb-8"
          >
            <div className="text-center order-2 md:order-1">
              <p className="text-xs uppercase font-bold text-slate-400 tracking-widest leading-none mb-2">আজকের তারিখ</p>
              <p className="text-base md:text-lg font-bold text-slate-700 bg-white/90 px-6 py-2 rounded-full border border-slate-200 shadow-md">{formattedDate}</p>
            </div>

            {ramadanDate && (
              <div className="flex flex-col items-center pt-2 md:pt-4 order-1 md:order-2">
                <span className="bg-emerald-600 text-white px-8 md:px-10 py-3 md:py-4 rounded-full text-xl md:text-2xl font-black shadow-xl shadow-emerald-200 border border-emerald-500">
                  {ramadanDate}
                </span>
              </div>
            )}

            <div className="text-center order-3">
              <p className="text-xs uppercase font-bold text-slate-400 tracking-widest leading-none mb-2">বর্তমান সময়</p>
              <p className="text-base md:text-lg font-bold text-slate-700 bg-white/90 px-6 py-2 rounded-full border border-slate-200 shadow-md">{formattedTime}</p>
            </div>
          </motion.div>

          <AnimatePresence mode="popLayout">
            <div className="w-full max-w-[1600px] flex flex-col gap-6 pb-12 lg:pb-0">
              {/* Main Grid for first 6 items (and all items on mobile/tablet) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {divisions.slice(0, 6).map((div) => (
                  <div key={div.name} className="h-36 md:h-40">
                    <CountdownCard division={div} nowUtcMs={nowUtcMs} />
                  </div>
                ))}
                
                {/* On mobile and tablet, show the remaining 2 items in the same grid flow */}
                <div className="contents lg:hidden">
                  {divisions.slice(6, 8).map((div) => (
                    <div key={div.name} className="h-36 md:h-40">
                      <CountdownCard division={div} nowUtcMs={nowUtcMs} />
                    </div>
                  ))}
                </div>
              </div>

              {/* On Desktop (LG screens), show the last 2 items centered in a separate row */}
              <div className="hidden lg:flex justify-center gap-6">
                {divisions.slice(6, 8).map((div) => (
                  <div key={div.name} className="h-36 md:h-40 w-[calc(33.333%-1rem)]">
                    <CountdownCard division={div} nowUtcMs={nowUtcMs} />
                  </div>
                ))}
              </div>
            </div>
          </AnimatePresence>
          {/* Mobile Footer - Only visible after scrolling on mobile */}
          <footer className="md:hidden mt-12 pb-10 flex flex-col items-center gap-4 px-6">
            <div className="flex items-center gap-2 text-amber-700/80 text-center">
              <Info size={12} className="shrink-0" />
              <p className="text-[10px] font-medium">সময়গুলো প্রতিদিন পরিবর্তিত হতে পারে। আপনার এলাকার সঠিক সময় অনুযায়ী ইফতার করুন।</p>
            </div>
            
            <a 
              href="https://t.me/tuhinextapkbuilder" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-1.5 bg-[#24A1DE] text-white rounded-full text-[10px] font-bold hover:bg-[#1d86b9] transition-colors shadow-sm"
            >
              <Send size={12} />
              Telegram Channel
            </a>
            
            <p className="text-[10px] text-slate-400 font-bold">
              &copy; Rakibul Hasan Tuhin
            </p>
          </footer>
        </main>

        {/* Desktop Footer - Hidden on mobile */}
        <footer className="hidden md:flex px-12 py-4 bg-slate-50/90 border-t border-slate-200/60 items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 text-amber-700">
            <Info size={16} className="shrink-0" />
            <p className="text-sm font-medium">সময়গুলো প্রতিদিন পরিবর্তিত হতে পারে। আপনার এলাকার সঠিক সময় অনুযায়ী ইফতার করুন।</p>
          </div>
          
          <div className="flex items-center gap-4">
            <a 
              href="https://t.me/tuhinextapkbuilder" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-1.5 bg-[#24A1DE] text-white rounded-full text-xs font-bold hover:bg-[#1d86b9] transition-colors shadow-sm"
            >
              <Send size={14} />
              Telegram Channel
            </a>
            <p className="text-sm text-slate-400 font-bold">
              &copy; Rakibul Hasan Tuhin
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
