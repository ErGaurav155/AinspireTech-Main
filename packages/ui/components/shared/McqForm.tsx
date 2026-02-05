// components/FeedbackForm.tsx
"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const McqFormSchema = z.object({
  Topic: z.string().min(4, "Topic is required"),
  Level: z.string().min(4, "Please enter a Level"),
  Exam: z.string().optional(),
  Info: z.string().optional(),
});

type McqFormFormData = z.infer<typeof McqFormSchema>;

interface McqFormFormProps {
  onSubmit: (data: McqFormFormData) => void;
  send: boolean;
}

const McqFormPage: React.FC<McqFormFormProps> = ({ onSubmit, send }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<McqFormFormData>({
    resolver: zodResolver(McqFormSchema),
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="p-4  bg-gray-100 rounded "
    >
      <p className="font-semibold text-base text-sky-600 mb-2">
        Fill The Form To Generate Mcq Test.
      </p>
      <div className="mb-3">
        <input
          {...register("Topic")}
          placeholder="Topic Name"
          className="border  p-2 w-full rounded shadow  border-gray-400 outline-none"
        />
        {errors.Topic && (
          <p className="text-red-500 text-sm">{errors.Topic.message}</p>
        )}
      </div>
      <div className="mb-3">
        <input
          {...register("Level")}
          placeholder="Level Eg.Easy"
          className="border p-2 w-full rounded shadow border-gray-400 outline-none"
        />
        {errors.Level && (
          <p className="text-red-500 text-sm">{errors.Level.message}</p>
        )}
      </div>
      <div className="mb-3">
        <input
          {...register("Exam")}
          placeholder="Related Eg.JEE Exam Based"
          className="border p-2 w-full rounded shadow border-gray-400 outline-none"
        />
        {errors.Exam && (
          <p className="text-red-500 text-sm">{errors.Exam.message}</p>
        )}
      </div>
      <div className="mb-3">
        <textarea
          {...register("Info")}
          placeholder="Add More Info"
          className="border p-2 w-full rounded shadow border-gray-400 outline-none max-h-15"
        />
        {errors.Info && (
          <p className="text-red-500 text-sm">{errors.Info.message}</p>
        )}
      </div>
      {send ? (
        <button
          type="submit"
          className="text-base font-semibold bg-sky-500 hover:bg-sky-300 w-[50%] text-white py-2 px-4 rounded"
        >
          Submitting...
        </button>
      ) : (
        <button
          type="submit"
          className="text-base font-semibold bg-sky-500 hover:bg-sky-300 w-[50%] text-white py-2 px-4 rounded"
        >
          Submit
        </button>
      )}
    </form>
  );
};

export default McqFormPage;
