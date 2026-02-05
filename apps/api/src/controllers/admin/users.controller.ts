import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import User from "@/models/user.model";

// GET /api/admin/users - Get all users (admin only)
export const getUsersController = async (req: Request, res: Response) => {
  try {
    // Connect to database
    await connectToDatabase();

    // Get all users sorted by creation date (newest first)
    const users = await User.find({}).sort({ createdAt: -1 }).lean();

    // Optional: Remove sensitive data from response
    const sanitizedUsers = users.map((user) => ({
      _id: user._id,
      email: user.email,
      clerkId: user.clerkId,
      firstName: user.firstName,
      lastName: user.lastName,
    }));

    return res.status(200).json({
      success: true,
      data: sanitizedUsers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
