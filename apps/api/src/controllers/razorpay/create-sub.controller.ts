import { getRazorpay } from "@/utils/util";
import { Request, Response } from "express";

const MONTHLY_FIRST_CYCLE_OFFER_IDS = {
  insta: {
    "Insta-Automation-Pro": "offer_Szopjsx9O1ZR64",
    //  "offer_SwesHPkR1J7vDu",
  },
  web: {
    "chatbot-lead-generation": "offer_Szopjsx9O1ZR64",
    //  "offer_Swg8earHCXfe9f",
    "chatbot-education": "offer_Szopjsx9O1ZR64",
    //  "offer_Swg8earHCXfe9f",
  },
} as const;

const getMonthlyFirstCycleOfferId = (
  subscriptionType: string,
  productId: string,
  billingCycle: string,
) => {
  if (billingCycle !== "monthly") return undefined;

  if (subscriptionType === "insta") {
    return MONTHLY_FIRST_CYCLE_OFFER_IDS.insta[
      productId as keyof typeof MONTHLY_FIRST_CYCLE_OFFER_IDS.insta
    ];
  }

  if (subscriptionType === "web") {
    return MONTHLY_FIRST_CYCLE_OFFER_IDS.web[
      productId as keyof typeof MONTHLY_FIRST_CYCLE_OFFER_IDS.web
    ];
  }

  return undefined;
};

// POST /api/razorpay/subscription/create - Create Razorpay subscription
export const createRazorpaySubscriptionController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { razorpayplanId, buyerId, amount, referralCode, metadata } =
      req.body;

    // Validate required fields
    if (!buyerId || !razorpayplanId || !amount || !metadata) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: buyerId, productId, razorpayplanId,subscriptionType and amount are required",
        timestamp: new Date().toISOString(),
      });
    }
    const {
      subscriptionType,
      productId,
      billingCycle,
      previousSubscriptionId,
      previousSubscriptionType,
    } = metadata;
    const extraNotes = Object.fromEntries(
      Object.entries(metadata).filter(
        ([, value]) => value !== undefined && value !== null,
      ),
    );
    if (!subscriptionType || !productId || !billingCycle) {
      return res.status(400).json({
        success: false,
        error: "Invalid subscription type in metadata",
        timestamp: new Date().toISOString(),
      });
    }
    // Validate amount
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Amount must be a positive number",
        timestamp: new Date().toISOString(),
      });
    }
    const razorpay = getRazorpay();
    const offerId = getMonthlyFirstCycleOfferId(
      subscriptionType,
      productId,
      billingCycle,
    );

    // Create Razorpay subscription
    let subscription;
    try {
      subscription = await razorpay.subscriptions.create({
        plan_id: razorpayplanId,
        total_count: 12, // 12 months subscription
        customer_notify: 1 as 0 | 1,
        notes: {
          ...extraNotes,
          subscriptionType: subscriptionType,
          buyerId: buyerId,
          productId: productId,
          amount: amount.toString(),
          referralCode: referralCode || "",
          billingCycle,
          previousSubscriptionId: previousSubscriptionId || "",
          previousSubscriptionType: previousSubscriptionType || "",
          offerId: offerId || "",
        },
        ...(offerId ? { offer_id: offerId } : {}),
      });
    } catch (razorpayError: any) {
      console.error("Razorpay API error:", razorpayError);
      return res.status(400).json({
        success: false,
        error: `Razorpay error: ${razorpayError.error?.description || razorpayError.message}`,
        timestamp: new Date().toISOString(),
      });
    }

    if (!subscription) {
      return res.status(500).json({
        success: false,
        error: "Subscription creation failed - no response from Razorpay",
        timestamp: new Date().toISOString(),
      });
    }

    const subscriptionId = subscription.id;

    return res.status(201).json({
      success: true,
      data: {
        subscriptionId: subscriptionId,
        message: "Subscription created successfully",
        razorpayResponse: {
          id: subscription.id,
          status: subscription.status,
          current_start: subscription.current_start,
          current_end: subscription.current_end,
          created_at: subscription.created_at,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error creating Razorpay subscription:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create subscription",
      timestamp: new Date().toISOString(),
    });
  }
};
