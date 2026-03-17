"use client";

import { useState } from "react";
import { db, storage } from "@/lib/firebase"; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function VerifyDarshan() {
  const [formData, setFormData] = useState({ name: "", mobile: "", email: "" });
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      return alert("Please upload your TTD PDF ticket.");
    }
    
    setIsUploading(true);

    try {
      // 1. Generate unique filename for the PDF
      const fileExtension = file.name.split('.').pop();
      const fileName = `darshan_${Date.now()}_${formData.name.replace(/\s+/g, '_')}.${fileExtension}`;
      const storageRef = ref(storage, `darshan_tickets/${fileName}`);
      
      // 2. Upload to Firebase Storage
      const uploadResult = await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(uploadResult.ref);

      // 3. Save details and PDF link to Firestore
      await addDoc(collection(db, "darshan_verifications"), {
        ...formData,
        pdfUrl: fileUrl,
        status: "PENDING_REVIEW",
        createdAt: serverTimestamp(),
      });

      alert("Documents uploaded! Verification usually takes 15 minutes.");
      
      // Reset Form
      setFile(null);
      setFormData({ name: "", mobile: "", email: "" });
      
    } catch (err) {
      console.error("Upload Error:", err);
      alert("Upload failed. Check your Firebase Storage rules.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#0f1730] p-10 rounded-[2.5rem] border border-orange-500/20 shadow-2xl">
        <h2 className="text-2xl font-black text-orange-400 uppercase tracking-tighter mb-2 italic text-center">
          Darshan Verification
        </h2>
        <p className="text-[10px] text-gray-500 font-bold uppercase text-center mb-8 tracking-widest">
          Upload TTD ticket to activate Alipiri Fast-Track
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text" 
            placeholder="Primary Pilgrim Name" 
            required 
            value={formData.name}
            className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-orange-500 transition-all" 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
          />
          <input 
            type="email" 
            placeholder="Email ID" 
            required 
            value={formData.email}
            className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-orange-500 transition-all" 
            onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
          />
          <input 
            type="text" 
            placeholder="Mobile Number" 
            required 
            value={formData.mobile}
            className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-orange-500 transition-all" 
            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} 
          />
          
          <div className={`border-2 border-dashed p-8 rounded-xl text-center transition-all ${file ? 'border-orange-500/50 bg-orange-500/5' : 'border-white/10'}`}>
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              id="pdf-upload" 
              onChange={(e) => setFile(e.target.files[0])} 
            />
            <label htmlFor="pdf-upload" className="cursor-pointer">
              <span className="text-xs font-bold text-gray-400 uppercase block">
                {file ? file.name : "Select TTD PDF Ticket"}
              </span>
              {file && <span className="text-[9px] text-orange-500 mt-2 block italic">Click to change file</span>}
            </label>
          </div>

          <button 
            type="submit" 
            disabled={isUploading} 
            className={`w-full py-4 rounded-2xl uppercase text-[11px] font-black tracking-widest shadow-lg transition-all ${
              isUploading ? "bg-gray-700 cursor-not-allowed" : "bg-orange-500 text-black hover:bg-orange-400"
            }`}
          >
            {isUploading ? "Processing..." : "Submit for Verification"}
          </button>
        </form>
      </div>
    </div>
  );
}
