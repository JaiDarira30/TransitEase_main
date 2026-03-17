"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, getDocs, doc, getDoc, onSnapshot, orderBy, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  
  // Storage for both cities
  const [velloreBookings, setVelloreBookings] = useState([]);
  const [tirupatiBookings, setTirupatiBookings] = useState([]);
  
  // 🔹 NEW: Dynamic IP State
  const [ipAddress, setIpAddress] = useState("Detecting Node...");

  // 🔹 NEW: Fetch the real IP and Location on mount
  useEffect(() => {
    const fetchNetworkData = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();
        if (data.ip) {
          setIpAddress(`${data.ip} (${data.city}, ${data.region_code})`);
        } else {
          setIpAddress("Encrypted Node");
        }
      } catch (error) {
        console.error("IP tracking blocked or offline:", error);
        setIpAddress("Local / Offline Node");
      }
    };

    fetchNetworkData();
  }, []);

  useEffect(() => {
    let unsubVellore;
    let unsubTirupati;

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        router.push("/admin/login");
        return;
      }

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(userRef);

        if (snap.exists() && snap.data().role === "admin") {
          setIsAdmin(true);
          fetchUsers();
          
          // 1. Sync Vellore VIT Data
          const qVellore = query(collection(db, "bookings"), orderBy("timestamp", "desc"));
          unsubVellore = onSnapshot(qVellore, (snapshot) => {
            setVelloreBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          });

          // 2. Sync Tirupati Alipiri Data
          const qTirupati = query(collection(db, "alipiri_bookings"), orderBy("timestamp", "desc"));
          unsubTirupati = onSnapshot(qTirupati, (snapshot) => {
            setTirupatiBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          });

        } else {
          await signOut(auth);
          router.push("/admin/login");
        }
      } catch (err) {
        console.error("Node Auth Error:", err);
      }
      setLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubVellore) unsubVellore(); 
      if (unsubTirupati) unsubTirupati();
    };
  }, [router]);

  const fetchUsers = async () => {
    const q = query(collection(db, "users"));
    const querySnapshot = await getDocs(q);
    setUsers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleDeleteBooking = async (id, name, collectionName) => {
    const confirmCancel = window.confirm(`Permanently purge neural ticket for ${name}?`);
    if (!confirmCancel) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      alert("Ticket successfully purged from node archive.");
    } catch (err) {
      alert("Purge failed. Check Firestore security rules.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-cyan-500 font-black tracking-widest animate-pulse uppercase">Syncing Security Protocol...</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-10 font-sans selection:bg-cyan-500/30">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter italic text-cyan-500">TransitEase Admin</h1>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-[10px] font-black uppercase tracking-widest animate-pulse">System Online</div>
          <button onClick={handleLogout} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 hover:text-red-500 transition">Secure Logout</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard title="Total Commuters" value={users.length} sub="Database Nodes" color="white" />
        <StatCard title="Vellore Active" value={velloreBookings.length} sub="Student Bookings" color="cyan" />
        <StatCard title="Tirupati Active" value={tirupatiBookings.length} sub="Vehicle Toll Passes" color="orange" />
        <StatCard title="Active Node IP" value={ipAddress.split(' ')[0]} sub={ipAddress.split(' ').slice(1).join(' ') || "Global"} color="gray" />
      </div>

      {/* TABLE 1: VELLORE BOOKINGS */}
      <section className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl mb-10">
        <div className="bg-cyan-500/10 p-6 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-xs font-black text-cyan-400 uppercase tracking-widest italic">Vellore Sector: VIT Hub Archive</h2>
        </div>
        <div className="overflow-x-auto p-6">
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="text-gray-500 font-black border-b border-white/10 uppercase tracking-tighter italic">
                <th className="pb-4">Timestamp</th>
                <th className="pb-4">Student Info</th>
                <th className="pb-4">Route Info</th>
                <th className="pb-4 text-center">Seats / Genders</th>
                <th className="pb-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {velloreBookings.map((ticket) => (
                <tr key={ticket.id} className="group hover:bg-white/[0.02] transition">
                  <td className="py-4 text-gray-400">
                    {new Date(ticket.timestamp).toLocaleDateString()}<br/>{new Date(ticket.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-4">
                    <p className="text-cyan-400 font-black uppercase tracking-tighter">{ticket.userEmail}</p>
                    <p className="text-gray-600 text-[9px] italic">{ticket.passengerDetails?.[0]?.name || "N/A"}</p>
                  </td>
                  <td className="py-4">
                    <p className="font-black text-white italic">{ticket.route}</p>
                    <p className="text-[9px] text-gray-600 uppercase">{ticket.startStop} → {ticket.endStop}</p>
                  </td>
                  <td className="py-4 text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      {ticket.passengerDetails?.map((p, i) => (
                        <span key={i} className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${p.gender === 'Female' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'}`}>S{p.seat}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <button onClick={() => handleDeleteBooking(ticket.id, ticket.passengerDetails?.[0]?.name, "bookings")} className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-lg text-[8px] font-black uppercase hover:bg-red-500 hover:text-white transition">Cancel</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {velloreBookings.length === 0 && <p className="py-10 text-center text-gray-700 text-xs font-black tracking-widest uppercase">Archive Empty</p>}
        </div>
      </section>

      {/* TABLE 2: TIRUPATI BOOKINGS */}
      <section className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl mb-10">
        <div className="bg-orange-500/10 p-6 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-xs font-black text-orange-400 uppercase tracking-widest italic">Tirupati Sector: Alipiri Checkpoint Archive</h2>
        </div>
        <div className="overflow-x-auto p-6">
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="text-gray-500 font-black border-b border-white/10 uppercase tracking-tighter italic">
                <th className="pb-4">Timestamp</th>
                <th className="pb-4">Email / License Plate</th>
                <th className="pb-4">Vehicle Specs</th>
                <th className="pb-4 text-center">Time Slot</th>
                <th className="pb-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tirupatiBookings.map((ticket) => (
                <tr key={ticket.id} className="group hover:bg-white/[0.02] transition">
                  <td className="py-4 text-gray-400">
                    {new Date(ticket.timestamp).toLocaleDateString()}<br/>{new Date(ticket.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-4">
                    <p className="text-orange-400 font-black uppercase tracking-tighter">{ticket.userEmail}</p>
                    <p className="text-white text-sm font-black italic">{ticket.licensePlate}</p>
                  </td>
                  <td className="py-4">
                    <p className="font-black text-gray-300 italic">{ticket.vehicleType}</p>
                    <p className="text-[9px] text-gray-600 uppercase">{ticket.passengers} Passengers</p>
                  </td>
                  <td className="py-4 text-center">
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full font-black text-gray-400">{ticket.timeSlot}</span>
                  </td>
                  <td className="py-4 text-right">
                    <button onClick={() => handleDeleteBooking(ticket.id, ticket.licensePlate, "alipiri_bookings")} className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-lg text-[8px] font-black uppercase hover:bg-red-500 hover:text-white transition">Revoke</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tirupatiBookings.length === 0 && <p className="py-10 text-center text-gray-700 text-xs font-black tracking-widest uppercase">Archive Empty</p>}
        </div>
      </section>

      {/* USER MANAGEMENT TABLE */}
      <section className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 overflow-hidden shadow-2xl">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-8 italic">Global Commuter Database</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Commuter</th>
                <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">AI Trainer</th>
                <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Role</th>
                <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 flex items-center gap-3">
                    <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'U'}&background=06b6d4&color=fff`} className="w-8 h-8 rounded-lg border border-white/10" alt="User avatar" />
                    <div>
                      <p className="text-sm font-bold">{user.displayName || "Anonymous"}</p>
                      <p className="text-[10px] text-gray-600 font-medium">{user.email}</p>
                    </div>
                  </td>
                  <td className="py-4 text-center">
                    <span className={`text-[8px] font-black px-2 py-1 rounded uppercase ${user.aiTrainingAllowed ? 'bg-cyan-500/10 text-cyan-400' : 'bg-gray-800 text-gray-500'}`}>
                      {user.aiTrainingAllowed ? "Opted In" : "Privacy Mode"}
                    </span>
                  </td>
                  <td className="py-4 text-center">
                    <span className={`text-[8px] font-black px-2 py-1 rounded uppercase border ${user.role === 'admin' ? 'border-red-500/50 text-red-400' : 'border-gray-700 text-gray-500'}`}>
                      {user.role || 'user'}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <button className="text-[10px] font-black text-cyan-500 uppercase hover:underline opacity-0 group-hover:opacity-100 transition-opacity">Edit Access</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, sub, color }) {
  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">{title}</p>
      <h3 className={`text-3xl font-black ${color === 'cyan' ? 'text-cyan-400' : color === 'orange' ? 'text-orange-400' : 'text-white'}`}>{value}</h3>
      <p className="text-[10px] text-gray-600 mt-1 font-bold">{sub}</p>
    </div>
  );
}