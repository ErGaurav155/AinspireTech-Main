import { connectToDatabase } from "@/config/database.config";
import User from "@/models/user.model";
import nodemailer from "nodemailer";

import { Twilio } from "twilio";

export const sendSubscriptionEmailToOwner = async ({
  email,
  userDbId,
  subscriptionId,
}: {
  email: string;
  userDbId: string;
  subscriptionId: string;
}) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "New Subscription Alert",
    text: `Congratulations! A customer has subscribed. UserID: ${userDbId}, SubscriptionID: ${subscriptionId}`,
  };

  await transporter.sendMail(mailOptions);
};

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
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "New Subscription Alert",
    text: `Congratulations! You has subscribed To AgentID:${agentId}, UserID: ${userDbId}, SubscriptionID: ${subscriptionId}. Please add code widget provided on webchatbot dashboard to your website code so it easily appears on your website.`,
  };

  await transporter.sendMail(mailOptions);
};
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
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "New Subscription Alert",
    text: `Congratulations! SomeOne Booked New Appointment. name:${data[0].answer}, email:${data[1].answer}, other details are: ${data[3].answer}. Please go to dashboard to get detailed appointment information`,
  };

  await transporter.sendMail(mailOptions);
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
}: {
  userId: string;
  data: QuestionAnswer[];
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

    if (!user.phone) {
      throw new Error("User phone number not available");
    }
    PhoneNumber = user.phone;
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
