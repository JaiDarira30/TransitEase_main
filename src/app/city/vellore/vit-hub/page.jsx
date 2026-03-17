"use client";

import { useState, useEffect, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import * as faceapi from '@vladmandic/face-api';

const ROUTES = {
  "Route 1": ["Main Gate", "Library", "SJT", "TT", "PRP", "MGB", "Girls Hostel"],
  "Route 2": ["Main Gate", "Boys Hostel A", "Boys Hostel B", "J Block", "K Block", "M Block", "P Block", "S Block", "T Block", "SJT", "TT"]
};

const BUS_LAYOUT = [
  ["DR", null, 1], ["DOOR", null, null],
  [2, 3, null, 4, 5], [6, 7, null, 8, 9],
  [10, 11, null, 12, 13], [14, 15, null, 16, 17], [18, 19, 20, 21, 22]
];

export default function VITHubTerminal() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(true); 

  const [selectedRoute, setSelectedRoute] = useState("Route 1");
  const [startStop, setStartStop] = useState("");
  const [endStop, setEndStop] = useState("");
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [occupiedSeats, setOccupiedSeats] = useState({});
  const [passengers, setPassengers] = useState([]); 
  const [isBooking, setIsBooking] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Modal States
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null); 

  // --- EFFECT 1: Load Models & Listeners ---
  useEffect(() => {
    let isMounted = true;

    const initModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.ageGenderNet.loadFromUri('/models');
        if (isMounted) setIsModelLoaded(true);
      } catch (err) {
        console.error("Failed to load Face API models.", err);
      }
    };
    initModels();

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (isMounted) setCurrentUser(user);
    });

    const unsubDb = onSnapshot(query(collection(db, "bookings")), (snap) => {
      let map = {};
      snap.forEach(d => {
        d.data().passengerDetails?.forEach(p => map[p.seat.toString()] = p.gender);
      });
      if (isMounted) setOccupiedSeats(map);
    });

    return () => {
      isMounted = false;
      unsubDb();
      unsubAuth();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  // --- EFFECT 2: Camera Control ---
  useEffect(() => {
    let isCameraEffectMounted = true;
    const startCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        if (isCameraEffectMounted && isCameraOn) {
          streamRef.current = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        } else {
          s.getTracks().forEach(t => t.stop());
        }
      } catch (err) {
        console.error("Camera error:", err);
        if (isCameraEffectMounted) setIsCameraOn(false); 
      }
    };
    if (isCameraOn) startCamera();
    else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    }
    return () => { isCameraEffectMounted = false; };
  }, [isCameraOn]);

  // --- EFFECT 3: Face Detection ---
  useEffect(() => {
    if (!isModelLoaded || !videoRef.current || !canvasRef.current) return;
    let anim;
    const loop = async () => {
      if (videoRef.current?.readyState === 4 && isCameraOn && videoRef.current.videoWidth > 0) {
        const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
        faceapi.matchDimensions(canvasRef.current, displaySize);
        const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withAgeAndGender();
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        resizedDetections.forEach(detection => {
          const box = detection.detection.box;
          const gender = detection.gender;
          const probability = Math.round(detection.genderProbability * 100);
          const boxColor = gender === "female" ? "#e91e63" : "#3498db";
          ctx.strokeStyle = boxColor; ctx.lineWidth = 3;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          ctx.fillStyle = boxColor; ctx.fillRect(box.x, box.y - 25, 130, 25);
          ctx.fillStyle = "#ffffff"; ctx.font = "bold 14px Arial";
          ctx.fillText(`${gender.toUpperCase()} (${probability}%)`, box.x + 5, box.y - 7);
        });
      }
      anim = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(anim);
  }, [isModelLoaded, isCameraOn]);

  useEffect(() => {
    setPassengers(selectedSeats.map(seat => ({ seat, name: "", reg: "", gender: "Male" })));
  }, [selectedSeats]);

  const updatePassenger = (index, field, value) => {
    const newPassengers = [...passengers];
    newPassengers[index][field] = value;
    setPassengers(newPassengers);
  };

  // --- MOCK RAZORPAY PAYMENT ---
  const handleRazorpayPayment = async (bookingData) => {
    setPaymentLoading(true);
    
    // Simulate a 2.5-second secure payment processing delay
    setTimeout(async () => {
      try {
        await finalizeBooking(bookingData, "Paid (Online - Mock)");
      } catch (e) {
        setErrorMessage("Payment Simulation Failed. Try 'Pay Later'.");
      } finally {
        setPaymentLoading(false);
      }
    }, 2500);
  };

  // --- CORE FINALIZATION ---
  const finalizeBooking = async (bookingData, status) => {
    setIsBooking(true);
    const finalData = { ...bookingData, paymentStatus: status };
    try {
      await addDoc(collection(db, "bookings"), finalData);
      await fetch("/api/send-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      });
      setSuccessMessage(`Success! Ticket generated with status: ${status}. The QR Code has been dispatched to your email.`);
      setSelectedSeats([]);
      setStartStop("");
      setEndStop("");
    } catch (e) {
      setErrorMessage("Cloud Sync Error.");
    }
    setIsBooking(false);
  };

  const handleAction = (type) => {
    if (passengers.some(p => !p.name || !p.reg) || !startStop || !endStop) 
      return setErrorMessage("Complete all passenger details and route stops.");

    const bookingData = {
      passengerDetails: passengers,
      route: selectedRoute, 
      startStop, 
      endStop,
      userEmail: currentUser?.email || "aiprojectvit23@gmail.com", // Fallback test email
      timestamp: new Date().toISOString()
    };

    if (type === "ONLINE") handleRazorpayPayment(bookingData);
    else finalizeBooking(bookingData, "Pay at Boarding");
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-4 font-sans flex flex-col">
      
      {/* ERROR MODAL */}
      <AnimatePresence>
        {errorMessage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#0f1730] border-2 border-red-500/50 p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center">
              <div className="text-red-500 text-4xl mb-4">!</div>
              <h2 className="text-lg font-black uppercase mb-2 tracking-tighter text-white">Booking Error</h2>
              <p className="text-gray-400 text-xs font-bold leading-relaxed mb-6">{errorMessage}</p>
              <button onClick={() => setErrorMessage(null)} className="w-full bg-red-500 text-white font-black py-3 rounded-xl uppercase text-[10px] tracking-widest hover:bg-red-600 transition-colors">Acknowledge</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUCCESS MODAL */}
      <AnimatePresence>
        {successMessage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#0f1730] border-2 border-green-500/50 p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center">
              <div className="w-16 h-16 mx-auto bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-3xl font-black mb-4">✓</div>
              <h2 className="text-lg font-black uppercase mb-2 tracking-tighter text-white">Seats Secured</h2>
              <p className="text-gray-400 text-xs font-bold leading-relaxed mb-6">{successMessage}</p>
              <button onClick={() => setSuccessMessage(null)} className="w-full bg-green-500 text-black font-black py-3 rounded-xl uppercase text-[10px] tracking-widest hover:bg-green-400 transition-colors">Done</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="flex justify-between items-center bg-[#0f1730] p-4 rounded-xl mb-4 border border-cyan-500/20 shadow-2xl">
        <Link href="/city/vellore" className="text-[10px] font-black uppercase text-gray-500 hover:text-cyan-400">← Back</Link>
        <h1 className="text-xl font-black italic text-cyan-400 uppercase tracking-tighter">VIT AI Shuttle Terminal</h1>
        <div className={`text-[10px] px-3 py-1 rounded-full font-black ${isCameraOn ? 'bg-green-500/20 text-green-500 animate-pulse' : 'bg-red-500/20 text-red-500'}`}>
          {isCameraOn ? 'AI SENSORS ACTIVE' : 'SENSORS OFFLINE'}
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6 flex-1 max-w-7xl mx-auto w-full">
        {/* LEFT: LIVE FEED */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">
          <div className="bg-black rounded-3xl overflow-hidden border-2 border-cyan-500/20 relative aspect-video shadow-2xl">
            {!isCameraOn && <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-black text-sm uppercase tracking-[0.3em]">Hardware Offline</div>}
            {!isModelLoaded && isCameraOn && <div className="absolute inset-0 flex items-center justify-center text-cyan-500 font-black text-xs uppercase bg-black/80 z-10">Syncing AI Brain...</div>}
            <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${!isCameraOn && 'hidden'}`} />
            <canvas ref={canvasRef} className={`absolute top-0 left-0 w-full h-full pointer-events-none ${!isCameraOn && 'hidden'}`} />
          </div>
          <div className="flex items-center justify-between bg-[#0f1730] px-6 py-4 rounded-2xl border border-white/5">
            <span className="text-[10px] font-black uppercase text-cyan-400 tracking-widest">Neural Visual Feed</span>
            <button onClick={() => setIsCameraOn(!isCameraOn)} className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${isCameraOn ? 'bg-cyan-500' : 'bg-gray-700'}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-[#0b1220] transition-transform ${isCameraOn ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* RIGHT: SEATING & CHECKOUT */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          <section className="bg-[#0f1730] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <h2 className="text-[10px] font-black text-cyan-400 uppercase mb-8 tracking-widest text-center italic">Select Seats (₹20)</h2>
            <div className="space-y-6 mx-auto w-fit">
              {BUS_LAYOUT.map((row, rIdx) => (
                <div key={rIdx} className="flex justify-center gap-4">
                  {row.map((seat, sIdx) => {
                    if (seat === null) return <div key={sIdx} className="w-10" />;
                    if (seat === "DR" || seat === "DOOR") return <div key={sIdx} className="w-12 h-12 text-[8px] flex items-center justify-center text-gray-700 font-black uppercase">{seat}</div>;
                    const genderBooked = occupiedSeats[seat.toString()];
                    const isSelected = selectedSeats.includes(seat);
                    return (
                      <button key={sIdx} disabled={!!genderBooked} onClick={() => setSelectedSeats(prev => isSelected ? prev.filter(s => s !== seat) : [...prev, seat])} className="group flex flex-col items-center gap-1">
                        <div className={`relative w-10 h-10 transition-all ${isSelected ? 'scale-110' : 'hover:scale-105'}`}>
                           <svg viewBox="0 0 24 24" className={`w-full h-full ${genderBooked === "Male" ? "fill-blue-500" : genderBooked === "Female" ? "fill-pink-500" : isSelected ? "fill-orange-500 shadow-lg" : "fill-none stroke-green-500 stroke-2"}`}>
                              <path d="M4 18v3h16v-3M6 10v6h12v-6M4 10V6a2 2 0 012-2h12a2 2 0 012 2v4M2 12h2M20 12h2" strokeLinecap="round" strokeLinejoin="round"/>
                           </svg>
                        </div>
                        <span className={`text-[8px] font-black ${genderBooked ? 'text-gray-600' : 'text-gray-500'}`}>₹20</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>

          {/* DYNAMIC FORM & DUAL BUTTONS */}
          <section className="bg-[#0f1730] p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl flex-1 overflow-y-auto max-h-[450px]">
            <h2 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest italic">Booking Intelligence</h2>
            <div className="grid grid-cols-2 gap-3">
              <select value={startStop} onChange={(e)=>setStartStop(e.target.value)} className="bg-black/40 border border-white/10 p-3 rounded-xl text-[10px] outline-none focus:border-cyan-500">
                <option value="">Boarding From</option>
                {ROUTES[selectedRoute].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={endStop} onChange={(e)=>setEndStop(e.target.value)} className="bg-black/40 border border-white/10 p-3 rounded-xl text-[10px] outline-none focus:border-cyan-500">
                <option value="">Destination</option>
                {ROUTES[selectedRoute].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {passengers.map((p, idx) => (
              <div key={idx} className="p-4 bg-white/5 rounded-2xl space-y-3 border border-white/5">
                <p className="text-[8px] font-black text-cyan-500 uppercase">Student {idx + 1} | Seat {p.seat}</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Full Name" className="bg-black/40 border border-white/10 p-2 rounded-lg text-[10px] outline-none focus:border-cyan-500" onChange={(e)=>updatePassenger(idx, "name", e.target.value)} />
                  <input type="text" placeholder="Reg No" className="bg-black/40 border border-white/10 p-2 rounded-lg text-[10px] outline-none focus:border-cyan-500" onChange={(e)=>updatePassenger(idx, "reg", e.target.value)} />
                </div>
              </div>
            ))}

            <div className="flex flex-col gap-3 pt-2">
              <button 
                onClick={() => handleAction("ONLINE")} 
                disabled={isBooking || paymentLoading || selectedSeats.length === 0}
                className="w-full bg-cyan-500 text-black font-black py-4 rounded-2xl uppercase text-[10px] tracking-[0.2em] shadow-lg hover:bg-cyan-400 transition-all"
              >
                {paymentLoading ? "Processing Payment..." : `Pay Online (₹${selectedSeats.length * 20})`}
              </button>
              <button 
                onClick={() => handleAction("LATER")} 
                disabled={isBooking || paymentLoading || selectedSeats.length === 0}
                className="w-full bg-white/5 border border-white/10 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-[0.2em] hover:bg-white/10 transition-all"
              >
                Book Now & Pay at Boarding
              </button>
            </div>
          </section>
        </div>
      </div>

      <footer className="mt-8 py-6 text-center border-t border-white/5">
        <p className="text-[9px] text-gray-700 font-black uppercase tracking-[0.5em] mb-1">Institutional Transit Partnerships</p>
        <p className="text-xs font-bold text-gray-400 italic">For school/university business solutions contact: aiprojectvit23@gmail.com</p>
      </footer>
    </div>
  );
}
