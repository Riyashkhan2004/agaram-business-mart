const { Resend } = require("resend");

const resend = new Resend("re_N1cT1AsS_D9iKe2UhorXUk79qy41f42GN");

async function sendTestEmail() {
    const { data, error } = await resend.emails.send({
        from: "Agaram Business Mart <onboarding@resend.dev>",
        to: "delivered@resend.dev",
        subject: "Agaram Business Mart - Test Email",
        html: `
            <h2>Welcome to Agaram Business Mart!</h2>
            <p>Your email integration is working.</p>
        `,
    });

    if (error) {
        console.error("Email failed:", error);
        return;
    }

    console.log("Email sent successfully:", data);
}

sendTestEmail();