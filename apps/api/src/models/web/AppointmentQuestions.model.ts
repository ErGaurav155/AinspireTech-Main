import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAppointmentQuestion {
  id: string;
  question: string;
  type: "text" | "email" | "tel" | "date" | "select" | "textarea";
  required: boolean;
  options?: string[];
}

export interface ICustomerFlow {
  id: string;
  label: string;
  introMessage: string;
  completionAction: "book_appointment" | "submit_details";
  questions: IAppointmentQuestion[];
}

export interface IAppointmentQuestions extends Document {
  clerkId: string;
  chatbotType: "chatbot-lead-generation";
  quickReplies: string[];
  questions: IAppointmentQuestion[];
  flows: ICustomerFlow[];
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
    required: { type: Boolean, default: false },
    options: {
      type: [String],
      validate: {
        validator: function (this: IAppointmentQuestion, options?: string[]) {
          if (this.type === "select") {
            return !!options && options.length > 0;
          }
          return true;
        },
        message: "At least one option is required for select type questions",
      },
    },
  },
  { _id: false },
);

const CustomerFlowSchema = new Schema<ICustomerFlow>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, trim: true, maxlength: 30 },
    introMessage: { type: String, trim: true, maxlength: 300, default: "" },
    completionAction: {
      type: String,
      enum: ["book_appointment", "submit_details"],
      default: "submit_details",
    },
    questions: {
      type: [AppointmentQuestionSchema],
      required: true,
      validate: {
        validator: (questions: IAppointmentQuestion[]) => questions.length > 0,
        message: "Each customer flow requires at least one question",
      },
    },
  },
  { _id: false },
);

const AppointmentQuestionsSchema = new Schema<IAppointmentQuestions>(
  {
    clerkId: { type: String, required: true },
    chatbotType: {
      type: String,
      required: true,
      enum: ["chatbot-lead-generation"],
    },
    quickReplies: {
      type: [String],
      default: ["Book an appointment"],
      validate: {
        validator: (items: string[]) => items.length <= 5,
        message: "A flow can have at most five quick reply buttons",
      },
    },
    questions: {
      type: [AppointmentQuestionSchema],
      required: true,
      validate: {
        validator: (q: IAppointmentQuestion[]) => q.length > 0,
        message: "At least one question is required",
      },
    },
    flows: {
      type: [CustomerFlowSchema],
      default: [],
      validate: {
        validator: (items: ICustomerFlow[]) => items.length <= 5,
        message: "A chatbot can have at most five customer flows",
      },
    },
  },
  { timestamps: true },
);
AppointmentQuestionsSchema.index(
  { clerkId: 1, chatbotType: 1 },
  { unique: true },
);
AppointmentQuestionsSchema.index({ chatbotType: 1 });
AppointmentQuestionsSchema.index({ clerkId: 1 });

const WebAppointmentQuestions = (mongoose.models?.WebAppointmentQuestions ||
  mongoose.model<IAppointmentQuestions>(
    "WebAppointmentQuestions",
    AppointmentQuestionsSchema,
  )) as Model<IAppointmentQuestions>;

export default WebAppointmentQuestions;
