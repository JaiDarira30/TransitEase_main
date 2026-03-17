"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../lib/firebase"; 
import { doc, getDoc } from "firebase/firestore"; 

/* ================= DATA ================= */
const cities = [
  { name: "Hyderabad", slug: "hyderabad", icon: "/cities/hyderabad.png", subtitle: "Charminar City" },
  { name: "Vellore", slug: "vellore", icon: "/cities/vellore.png", subtitle: "Historic Fort City" },
  { name: "Tirupati", slug: "tirupati", icon: "/cities/tirupati.png", subtitle: "Pilgrimage Hub" },
  { name: "Bangalore", slug: "bangalore", icon: "/cities/bangalore.png", subtitle: "Silicon Valley of India" },
];

/* ================= ANIMATION VARIANTS ================= */
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: "easeOut" }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
};

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  /* ================= CHATBOT STATES ================= */
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { sender: "ai", text: "SAARTHI Global Travel Node online. Tell me your destination, and I will calculate the optimal route and itinerary." }
  ]);
  const messagesEndRef = useRef(null);

  /* ================= AUTH OBSERVER WITH PERMISSION GUARD ================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          const userRef = doc(db, "users", currentUser.uid);
          const snap = await getDoc(userRef);
          
          if (snap.exists()) {
            setUser({ ...currentUser, role: snap.data().role });
          } else {
            setUser(currentUser);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Firebase Permission Guard:", error.message);
        setUser(currentUser); // Fallback: allow login even if Firestore role-check fails
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* ================= SCROLL LISTENER ================= */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ================= CLICK OUTSIDE DROPDOWN ================= */
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ================= CHAT SCROLL LISTENER ================= */
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.reload();
  };

  /* ================= CHAT SUBMIT HANDLER ================= */
  const handleChatSend = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = { sender: "user", text: chatInput };
    const currentHistory = [...chatMessages]; 

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.text, history: currentHistory })
      });

      const data = await res.json();

      if (res.ok) {
        setChatMessages((prev) => [...prev, { sender: "ai", text: data.reply }]);
      } else {
        setChatMessages((prev) => [...prev, { sender: "ai", text: `[SYSTEM ERROR]: ${data.error}` }]);
      }
    } catch (error) {
      setChatMessages((prev) => [...prev, { sender: "ai", text: "[SYSTEM ERROR]: SAARTHI node disconnected." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 relative">
      
      {/* ================= NAVBAR ================= */}
      <header className={`fixed top-0 w-full z-40 transition-all duration-300 ${scrolled ? "bg-black/80 backdrop-blur-md py-3 border-b border-white/5" : "bg-transparent py-4 md:py-6"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center">
          <Link href="/" className="hover:opacity-80 transition shrink-0">
            <Image src="/logo.png" alt="TransitEase" width={180} height={45} priority className="w-32 md:w-[180px] h-auto" />
          </Link>

          <nav className="flex items-center gap-4 md:gap-10">
            <Link href="#cities" className="hidden md:block text-sm font-medium text-gray-400 hover:text-white transition">Cities</Link>
            <Link href="#about" className="hidden md:block text-sm font-medium text-gray-400 hover:text-white transition">About</Link>

            {!user ? (
              <div className="flex items-center gap-4 md:gap-6">
                <Link href="/login" className="hidden sm:block text-sm font-medium hover:text-cyan-400 transition">Login</Link>
                <Link href="/register" className="px-4 md:px-6 py-2 bg-cyan-500 text-black rounded-md font-bold hover:bg-cyan-400 transition shadow-lg shadow-cyan-500/20 text-xs md:text-sm">
                  Register
                </Link>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 md:gap-3 bg-white/5 p-1 pr-3 md:pr-4 rounded-full border border-white/10 hover:border-cyan-500/50 transition-all"
                >
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-cyan-900 overflow-hidden relative border border-cyan-500/20 shrink-0">
                    <Image src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'U'}&background=06b6d4&color=fff`} alt="Profile" fill className="object-cover" />
                  </div>
                  <span className="text-xs md:text-sm font-semibold tracking-wide hidden sm:block">{user.displayName || "User"}</span>
                  <svg className={`w-3 h-3 md:w-4 md:h-4 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-56 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-2"
                    >
                      <div className="px-4 py-3 border-b border-white/5 mb-1">
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Logged in as</p>
                        <p className="text-sm font-medium truncate text-cyan-400">{user.email}</p>
                      </div>

                      {user?.role === "admin" && (
                        <Link 
                          href="/admin/dashboard" 
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-cyan-400 hover:bg-cyan-400/10 transition border-b border-white/5 font-bold"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                          Admin Dashboard
                        </Link>
                      )}

                      <Link 
                        href="/details" 
                        className="block px-4 py-2.5 text-sm hover:bg-white/5 transition border-b border-white/5"
                      >
                        View Details
                      </Link>
                      
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition mt-1 border-t border-white/5">
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* ================= HERO SECTION ================= */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-cyan-500/10 rounded-full blur-[80px] md:blur-[120px] pointer-events-none animate-pulse" />
        
        <motion.div initial="initial" animate="animate" variants={staggerContainer} className="relative z-10">
          <motion.h1 variants={fadeInUp} className="text-5xl sm:text-6xl md:text-8xl font-black mb-4 tracking-tighter leading-tight">
            Smarter Public Transport
          </motion.h1>
          <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl md:text-7xl font-black mb-8 text-cyan-400 tracking-tighter">
            Powered by AI Intelligence
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-gray-400 text-base md:text-lg lg:text-xl max-w-3xl mx-auto mb-10 leading-relaxed font-light px-4">
            Real-time crowd prediction, delay estimation, and comfort analytics <br className="hidden md:block" />
            for smarter commuting decisions across Indian cities.
          </motion.p>
          <motion.div variants={fadeInUp}>
            <Link href="#cities" className="inline-block px-8 py-3 md:px-10 md:py-4 bg-cyan-500 text-black font-extrabold rounded-md hover:bg-cyan-400 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-cyan-500/20">
              Explore Cities
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ================= CITIES SECTION ================= */}
      <section id="cities" className="py-24 md:py-32 bg-[#020617] relative">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="flex flex-col items-center mb-16 md:mb-20 text-center">
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">Operational Cities</h2>
            <div className="h-1.5 w-24 bg-cyan-500 rounded-full" />
          </div>

          <motion.div 
            variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"
          >
            {cities.map((city) => (
              <motion.div
                key={city.slug}
                variants={fadeInUp}
                whileHover={{ y: -10 }}
                className="group relative bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-8 hover:border-cyan-500/50 transition-all duration-300 backdrop-blur-sm"
              >
                <div className="flex justify-center mb-6 md:mb-8 relative">
                  <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Image src={city.icon} alt={city.name} width={100} height={100} className="relative z-10 group-hover:scale-110 transition duration-500 md:w-[120px] md:h-[120px]" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-center mb-2">{city.name}</h3>
                <p className="text-gray-500 text-center mb-6 md:mb-8 text-xs md:text-sm font-medium">{city.subtitle}</p>
                <Link href={`/city/${city.slug}`} className="block text-center text-cyan-400 font-bold group-hover:text-white transition-colors text-sm md:text-base">
                  View Dashboard →
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ================= ABOUT SECTION ================= */}
      <section id="about" className="py-24 md:py-32 bg-black relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-cyan-500/5 blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-24 items-center">
            
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-6 md:mb-8 tracking-tight">
                Redefining the <br />
                <span className="text-cyan-400">Commuting Experience</span>
              </h2>
              <p className="text-gray-400 text-base md:text-lg leading-relaxed mb-8 md:mb-10">
                TransitEase is more than just a tracking app. It is an intelligent mobility platform 
                designed to solve travel uncertainty. By merging real-time transit data with 
                advanced machine learning, we provide commuters with the insights they need 
                before they even step out of their homes.
              </p>

              <div className="space-y-6 md:space-y-8">
                {[
                  { title: "Predictive Analytics", desc: "Know crowd density levels 30 minutes in advance." },
                  { title: "Delay Estimation", desc: "AI-calculated arrival times based on historical traffic patterns." },
                  { title: "Comfort Metrics", desc: "Unique scores based on temperature and seating availability." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 md:gap-5">
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-1">
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-cyan-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base md:text-lg text-white">{item.title}</h4>
                      <p className="text-sm md:text-base text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="grid grid-cols-2 gap-4 md:gap-6"
            >
              <div className="bg-white/5 border border-white/10 p-6 md:p-10 rounded-2xl md:rounded-3xl mt-0 lg:mt-12">
                <p className="text-4xl md:text-5xl font-black text-cyan-400 mb-2">95%</p>
                <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Prediction Accuracy</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-6 md:p-10 rounded-2xl md:rounded-3xl">
                <p className="text-4xl md:text-5xl font-black text-white mb-2">4</p>
                <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Major Cities</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-6 md:p-10 rounded-2xl md:rounded-3xl mt-0 lg:-mt-12">
                <p className="text-4xl md:text-5xl font-black text-white mb-2">24/7</p>
                <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Data Processing</p>
              </div>
              <div className="bg-cyan-500 p-6 md:p-10 rounded-2xl md:rounded-3xl shadow-xl shadow-cyan-500/20">
                <p className="text-4xl md:text-5xl font-black text-black mb-2">AI</p>
                <p className="text-[10px] md:text-xs font-bold text-black/60 uppercase tracking-widest">Intelligence</p>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ================= UPCOMING CITIES ================= */}
      <section className="py-20 md:py-24 bg-black relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 md:mb-16"
          >
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 text-gray-300">Expanding Soon</h2>
            <p className="text-gray-500 text-xs md:text-sm italic">Bringing AI-driven comfort prediction to more hubs</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { name: "Chennai", state: "Tamil Nadu" },
              { name: "Mumbai", state: "Maharashtra" },
              { name: "Pune", state: "Maharashtra" },
              { name: "Vijayawada", state: "Andhra Pradesh" }
            ].map((city, i) => (
              <motion.div
                key={city.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center group hover:bg-white/[0.05] transition-all"
              >
                <span className="text-[10px] md:text-xs font-bold text-cyan-500/60 uppercase tracking-widest mb-1 md:mb-2">Coming Soon</span>
                <h4 className="text-lg md:text-xl font-bold text-gray-200 group-hover:text-cyan-400 transition-colors">{city.name}</h4>
                <p className="text-[9px] md:text-[10px] text-gray-600 font-medium uppercase mt-1">{city.state}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="py-12 md:py-16 border-t border-white/5 text-center bg-black px-4">
        <Image src="/logo.png" alt="TransitEase" width={140} height={35} className="mx-auto mb-6 md:mb-8 opacity-40 grayscale w-[120px] md:w-[140px]" />

        <div className="mb-6">
          <Link href="/admin/login" className="text-[8px] md:text-[9px] font-black text-gray-700 uppercase tracking-[0.5em] hover:text-red-500 transition-colors">
            Terminal Access (Staff Only)
          </Link>
        </div>

        <p className="text-[10px] md:text-xs text-gray-600 uppercase tracking-[0.2em] md:tracking-[0.3em]">© 2026 TransitEase All Rights Reserved · Comfort Before You Commute</p>
        <p className="text-[10px] md:text-xs text-gray-600 uppercase tracking-[0.2em] md:tracking-[0.3em]">Made with ❤️ By Jai Darira</p>
      </footer>

      {/* ================= SAARTHI CHATBOT (ASKDISHA STYLE) ================= */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        
        {/* Chat Window Modal */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="mb-4 w-80 sm:w-96 bg-[#0f1730]/95 backdrop-blur-xl border border-cyan-500/30 rounded-[2rem] shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col h-[450px]"
            >
              <div className="bg-cyan-500/10 border-b border-cyan-500/20 p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isChatLoading ? 'bg-orange-500 animate-ping' : 'bg-cyan-400 animate-pulse'}`} />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
                    {isChatLoading ? 'Processing...' : 'SAARTHI ChatBot'}
                  </h3>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white transition-colors text-lg font-bold">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium leading-relaxed ${
                      msg.sender === 'user' ? 'bg-cyan-600 text-white rounded-br-sm' : 'bg-white/5 border border-white/10 text-gray-300 rounded-bl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/10 text-cyan-400 p-3 rounded-2xl rounded-bl-sm text-xs font-black italic tracking-widest animate-pulse">
                      SYNCING...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleChatSend} className="p-4 border-t border-white/5 bg-black/40">
                <div className="relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isChatLoading}
                    placeholder="Ask SAARTHI to plan a trip..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-xs text-white placeholder:text-gray-600 outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
                  />
                  <button type="submit" disabled={isChatLoading} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500 hover:text-black transition-colors disabled:opacity-50 font-bold">
                    ↑
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AskDISHA Style Floating Trigger */}
        <div className="flex items-center gap-4 mt-2">
          {!isChatOpen && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white text-black px-5 py-2.5 rounded-full text-xs font-black shadow-2xl hidden sm:block animate-pulse border-2 border-cyan-500 shadow-cyan-500/20"
            >
              Plan Trip with SAARTHI
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 border-[3px] border-white shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center justify-center relative overflow-visible group"
          >
            <div className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold shadow-lg">
              {isChatOpen ? '-' : '1'}
            </div>
            
            <span className="text-3xl relative z-10 group-hover:rotate-12 transition-transform duration-300">
              {isChatOpen ? '✕' : '🤖'}
            </span>
            
            {!isChatOpen && (
               <div className="absolute inset-1 rounded-full border border-white/20 border-dashed animate-[spin_10s_linear_infinite]" />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}