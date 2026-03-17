// Create the dynamic link
    const verifyLink = `http://localhost:3000/verify-darshan?plate=${encodeURIComponent(licensePlate)}`;

    // 3. Draft the Email HTML & Attach the Image
    const mailOptions = {
      from: `"Alipiri Toll Node" <aiprojectvit23@gmail.com>`,
      to: contactInfo.email,
      subject: `Alipiri Entry Permit - ${licensePlate}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #f97316; text-align: center;">ALIPIRI CHECKPOINT PERMIT</h2>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          
          <p><strong>Vehicle:</strong> ${licensePlate} (${vehicleType})</p>
          <p><strong>Entry Window:</strong> ${timeSlot}</p>
          <p><strong>Payment Status:</strong> ${paymentStatus} (₹${fee})</p>
          <p><strong>Total Pilgrims:</strong> ${pilgrimNames.length}</p>

          <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 2px;">Official QR Code</p>
            <img src="cid:unique-qr-code" alt="Ticket QR Code" style="width: 200px; height: 200px; border: 2px solid #000; border-radius: 10px;" />
          </div>

          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 14px; color: #333; margin-bottom: 15px;"><strong>MANDATORY NEXT STEP:</strong> You must upload your TTD Darshan Tickets for AI Verification before reaching the checkpoint.</p>
            <a href="${verifyLink}" style="background-color: #f97316; color: #000; padding: 15px 30px; text-decoration: none; font-weight: 900; border-radius: 8px; display: inline-block; letter-spacing: 1px;">LAUNCH AI VERIFICATION →</a>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: 'qrcode.png',
          content: base64Data,
          encoding: 'base64',
          cid: 'unique-qr-code' 
        }
      ]
    };