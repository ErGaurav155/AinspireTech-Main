import * as z from "zod";

export const formSchema = z.object({
  name: z.string().min(2, { message: "name must be at least 2 letter." }),
  subject: z.string().min(5, { message: "Please write subject." }),
  email: z.string().min(3, { message: "Please enter email." }),
  phone: z.string().min(1, { message: "Phone number is required." }),
  message: z.string().optional(),
  address: z.string().optional(),
});

export const formSchema1 = z.object({
  message: z.string().min(5, { message: "name must be at least 5 letter." }),
});
