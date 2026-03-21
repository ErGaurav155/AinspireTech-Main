import { Resend } from "resend";
import { connectToDatabase } from "@/config/database.config";
import User from "@/models/user.model";
import { Twilio } from "twilio";

const resend = new Resend(process.env.RESEND_API_KEY);

// ================= OWNER EMAIL =================
export const sendSubscriptionEmailToOwner = async ({
  email,
  userDbId,
  subscriptionId,
}: {
  email: string;
  userDbId: string;
  subscriptionId: string;
}) => {
  await resend.emails.send({
    from: "notifications@rocketreplai.com",
    to: email,
    subject: "New Subscription Alert",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color:#3B82F6;">🎉 New Subscription</h2>
        <p><strong>User ID:</strong> ${userDbId}</p>
        <p><strong>Subscription ID:</strong> ${subscriptionId}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      </div>
    `,
  });
};

// ================= USER EMAIL =================
export const sendSubscriptionEmailToUser = async ({
  email,
  userDbId,
  agentId,
  subscriptionId,
}: {
  email: string;
  userDbId: string;
  agentId: string;
  subscriptionId: string;
}) => {
  await resend.emails.send({
    from: "notifications@rocketreplai.com",
    to: email,
    subject: "Subscription Confirmed",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color:#10B981;">✅ Subscription Confirmed</h2>
        <p><strong>Agent ID:</strong> ${agentId}</p>
        <p><strong>User ID:</strong> ${userDbId}</p>
        <p><strong>Subscription ID:</strong> ${subscriptionId}</p>
        <p>Please add the widget code from your dashboard to your website.</p>
      </div>
    `,
  });
};

// ================= APPOINTMENT EMAIL =================
interface QuestionAns {
  answer: string;
}

export const sendAppointmentEmailToUser = async ({
  email,
  data,
}: {
  email: string;
  data: QuestionAns[];
}) => {
  const name = data?.[0]?.answer || "Not provided";
  const userEmail = data?.[1]?.answer || "Not provided";
  const details = data?.[3]?.answer || "No details";

  await resend.emails.send({
    from: "notifications@rocketreplai.com",
    to: email,
    subject: "New Appointment Booked",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color:#8B5CF6;">📅 New Appointment</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Details:</strong> ${details}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      </div>
    `,
  });
};
const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);
interface QuestionAnswer {
  answer: string;
}
export async function sendWhatsAppInfo({
  data,
  userId,
  number,
}: {
  userId: string;
  data: QuestionAnswer[];
  number: string;
}) {
  try {
    await connectToDatabase();

    let PhoneNumber;
    if (!userId) {
      PhoneNumber = process.env.WHATSAPP_NUMBER;
    }
    const user = await User.findOne({ clerkId: userId }).exec();

    if (!user) {
      throw new Error("User not found");
    }

    if (!number) {
      throw new Error("User phone number not available");
    }
    PhoneNumber = Number(number);
    const result = await client.messages.create({
      from: `whatsapp:${process.env.NEXT_PUBLIC_TWILIO_NUMBER}`,
      to: `whatsapp:${PhoneNumber}`,
      contentSid: process.env.YOUR_MESSAGE_CONTENT_SID_HERE, // Replace with your template's Content SID
      contentVariables: JSON.stringify({
        "1": data[0].answer,
        "2": data[1].answer,
        "3": data[2].answer || "Not provided",
        "4": data[3].answer || "No message",
      }),
    });

    return { success: true };
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return {
      success: false,
    };
  }
}
