// components/FeedbackForm.tsx
"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const feedbackSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  message: z.string().optional(),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface FeedbackFormProps {
  onSubmit: (data: FeedbackFormData) => void;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSubmit }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="p-4 mt-1 bg-gray-100 rounded "
    >
      <p className="font-semibold text-base text-sky-600 mb-2">
        BOOK APPOINTMENT NOW / CONTACT US
      </p>
      <div className="mb-3">
        <input
          {...register("name")}
          placeholder="Name"
          className="border  p-2 w-full rounded shadow  border-gray-400 outline-none"
        />
        {errors.name && (
          <p className="text-red-500 text-sm">{errors.name.message}</p>
        )}
      </div>
      <div className="mb-3">
        <input
          {...register("email")}
          placeholder="Email"
          className="border p-2 w-full rounded shadow border-gray-400 outline-none"
        />
        {errors.email && (
          <p className="text-red-500 text-sm">{errors.email.message}</p>
        )}
      </div>
      <div className="mb-3">
        <input
          {...register("phone")}
          placeholder="Phone"
          className="border p-2 w-full rounded shadow border-gray-400 outline-none"
        />
        {errors.phone && (
          <p className="text-red-500 text-sm">{errors.phone.message}</p>
        )}
      </div>
      <div className="mb-3">
        <textarea
          {...register("message")}
          placeholder="What is the issue?"
          className="border p-2 w-full rounded shadow border-gray-400 outline-none max-h-15"
        />
        {errors.message && (
          <p className="text-red-500 text-sm">{errors.message.message}</p>
        )}
      </div>
      <button
        type="submit"
        className="text-base font-semibold bg-sky-500 hover:bg-sky-300 w-[50%] text-white py-2 px-4 rounded"
      >
        Submit
      </button>
    </form>
  );
};

export default FeedbackForm;
