import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAppointmentQuestion {
  id: string;
  question: string;
  type: "text" | "email" | "tel" | "date" | "select" | "textarea";
  required: boolean;
  options?: string[];
}

export interface IAppointmentQuestions extends Document {
  clerkId: string;
  chatbotType:
    | "chatbot-customer-supportt"
    | "chatbot-e-commerce"
    | "chatbot-lead-generation"
    | "chatbot-education";
  questions: IAppointmentQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentQuestionSchema = new Schema<IAppointmentQuestion>(
  {
    id: {
      type: String,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    question: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 200,
    },
    type: {
      type: String,
      required: true,
      enum: ["text", "email", "tel", "date", "select", "textarea"],
    },
    required: {
      type: Boolean,
      default: false,
    },
    options: {
      type: [String],
      validate: {
        validator: function (options: string[] | undefined) {
          // Only validate options if type is 'select'
          if (this.type === "select") {
            return options && options.length > 0;
          }
          return true;
        },
        message: "At least one option is required for select type questions",
      },
    },
  },
  { _id: false },
);

const AppointmentQuestionsSchema = new Schema<IAppointmentQuestions>(
  {
    clerkId: {
      type: String,
      required: true,
    },
    chatbotType: {
      type: String,
      required: true,
      enum: [
        "chatbot-customer-support",
        "chatbot-e-commerce",
        "chatbot-lead-generation",
        "chatbot-education",
      ],
    },
    questions: {
      type: [AppointmentQuestionSchema],
      required: true,
      validate: {
        validator: function (questions: IAppointmentQuestion[]) {
          return questions.length > 0;
        },
        message: "At least one question is required",
      },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for optimized queries
AppointmentQuestionsSchema.index({ chatbotType: 1 });
AppointmentQuestionsSchema.index({ clerkId: 1 });

const WebAppointmentQuestions =
  mongoose.models?.WebAppointmentQuestions ||
  mongoose.model<IAppointmentQuestions>(
    "WebAppointmentQuestions",
    AppointmentQuestionsSchema,
  );

export default WebAppointmentQuestions;
