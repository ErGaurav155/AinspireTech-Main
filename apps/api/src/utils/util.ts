import Razorpay from "razorpay";

// Helper function to check if user is owner
export const isOwner = (email: string | null): boolean => {
  return email === "gauravgkhaire@gmail.com";
};

let razorpayInstance: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (razorpayInstance) {
    return razorpayInstance;
  }

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error(
      "Razorpay credentials are not set in environment variables",
    );
  }

  razorpayInstance = new Razorpay({
    key_id,
    key_secret,
  });

  return razorpayInstance;
}

export function validateRazorpayConfig(): void {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error(
      "Razorpay configuration is missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file",
    );
  }
}
