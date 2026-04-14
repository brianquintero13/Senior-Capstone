import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { type, subject, body, priority, email } = await request.json();

    if (!email || !subject || !body) {
      return NextResponse.json(
        { error: "Missing required fields: email, subject, body" },
        { status: 400 }
      );
    }

    console.log("📧 Attempting to send email:", { type, subject, email });
    console.log("🔑 SendGrid API Key exists:", !!process.env.SENDGRID_API_KEY);
    console.log("🔑 API Key starts with:", process.env.SENDGRID_API_KEY?.substring(0, 10) + "...");

    // Use SendGrid API - easier for testing
    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: email }],
          subject: subject
        }],
        from: { email: 'stamosron79@gmail.com', name: 'ShadeSync AI' },
        content: [{
          type: 'text/html',
          value: body.replace(/\n/g, '<br>')
        }]
      }),
    });

    console.log("📨 SendGrid response status:", sendgridResponse.status);
    
    // SendGrid returns 202 for accepted
    if (sendgridResponse.status === 202) {
      console.log(`✅ Email accepted by SendGrid to ${email}`);
      return NextResponse.json({
        success: true,
        message: "Notification sent successfully",
        type,
        recipient: email
      });
    } else {
      const responseText = await sendgridResponse.text();
      console.log("📨 SendGrid response body:", responseText);
      throw new Error(`SendGrid API error (${sendgridResponse.status}): ${responseText}`);
    }

  } catch (error) {
    console.error("❌ Send notification API error:", error);
    
    // Fallback to console if email service fails
    console.log("📧 Email content (service failed):");
    console.log("To:", email || 'unknown');
    console.log("Subject:", subject || 'unknown');
    console.log("Body:", body || 'unknown');
    
    return NextResponse.json(
      { 
        error: `Failed to send email: ${error.message}`,
        fallback: "Email content logged to console"
      },
      { status: 500 }
    );
  }
}
