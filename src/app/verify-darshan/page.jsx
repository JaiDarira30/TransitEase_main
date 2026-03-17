"use client";

import { useState } from "react";
import { db, storage } from "@/lib/firebase"; // Ensure storage is exported in firebase.js
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function VerifyDarshan() {
  const [formData, setFormData] = useState({ name: "", mobile: "", email: "" });
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please upload your TTD PDF ticket.");
    setIsUploading(true);

    try {
      // 1. Upload PDF to Firebase Storage
      const storageRef = ref(storage, `darshan_tickets/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      // 2. Save Verification Request
      await addDoc(collection(db, "darshan_verifications"), {
        ...formData,
        pdfUrl: fileUrl,
        status: "PENDING_REVIEW",
        timestamp: new Date().toISOString()
      });

      alert("Documents uploaded! Our agents will verify your Darshan ticket within 15 minutes.");
    } catch (err) { alert("Upload failed."); }
    setIsUploading(false);
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#0f1730] p-10 rounded-[2.5rem] border border-orange-500/20 shadow-2xl">
        <h2 className="text-xl font-black text-orange-400 uppercase tracking-tighter mb-2 italic text-center">Darshan Verification</h2>
        <p className="text-[10px] text-gray-500 font-bold uppercase text-center mb-8">Upload your TTD ticket to activate your Alipiri Fast-Track.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="text" placeholder="Primary Pilgrim Name" required className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs outline-none focus:border-orange-500" onChange={(e)=>setFormData({...formData, name: e.target.value})} />
          <input type="email" placeholder="Email ID" required className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs outline-none focus:border-orange-500" onChange={(e)=>setFormData({...formData, email: e.target.value})} />
          <input type="text" placeholder="Mobile Number" required className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs outline-none focus:border-orange-500" onChange={(e)=>setFormData({...formData, mobile: e.target.value})} />
          
          <div className="border-2 border-dashed border-white/10 p-8 rounded-xl text-center hover:border-orange-500/50 transition-colors">
            <input type="file" accept=".pdf" required className="hidden" id="pdf-upload" onChange={(e)=>setFile(e.target.files[0])} />
            <label htmlFor="pdf-upload" className="cursor-pointer">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                {file ? file.name : "Select TTD PDF Ticket"}
              </span>
            </label>
          </div>

          <button type="submit" disabled={isUploading} className="w-full bg-orange-500 text-black font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-lg">
            {isUploading ? "Uploading to Cloud..." : "Submit for Verification"}
          </button>
        </form>
      </div>
    </div>
  );
}