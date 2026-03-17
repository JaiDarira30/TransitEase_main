import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request) {
  try {
    const { email } = await request.json();
    
    // Log for debugging
    console.log("Attempting to send OTP to:", email);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("Missing EMAIL_USER or EMAIL_PASS in .env.local");
      return NextResponse.json({ success: false, error: "Server config error" }, { status: 500 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Test the connection before sending
    await transporter.verify();

    await transporter.sendMail({
      from: `"TransitEase Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verification Code: " + otp,
      html: `
        <div style="background:#000; color:#fff; padding:30px; border-radius:20px; text-align:center; font-family:sans-serif;">
          <h2 style="color:#06b6d4;">TransitEase Authentication</h2>
          <h1 style="font-size:48px; letter-spacing:10px; margin:20px 0; color:#fff;">${otp}</h1>
        </div>`
    });

    return NextResponse.json({ success: true, otp });
  } catch (error) {
    // THIS LOG IS CRUCIAL: Check your terminal for this output!
    console.error("NODEMAILER ERROR:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}