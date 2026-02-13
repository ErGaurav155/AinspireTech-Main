"use client";

import { useMemo, useState } from "react";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";

import { Input } from "@rocketreplai/ui/components/radix/input";
import { Textarea } from "@rocketreplai/ui/components/radix/textarea";
import { Button } from "@rocketreplai/ui/components/radix/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@rocketreplai/ui/components/radix/form";
import { createAppointment } from "@/lib/utils";
import { formSchema } from "@/lib/validator";

const ContactForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const themeStyles = useMemo(() => {
    return {
      contentBg: "bg-background",
      formBg: "bg-card",
      borderColor: "border-[#B026FF]/30",
      lightBorderColor: "border-[#00F0FF]/30",
      titleText: "text-foreground",
      descriptionText: "text-muted-foreground",
      ownerTitleText: "text-foreground",
      ownerDetailText: "text-muted-foreground",
      inputBg: "bg-background",
      inputBorder: "border-[#00F0FF]/30",
      inputText: "text-foreground",
      inputPlaceholder: "placeholder-muted-foreground",
      focusBorder: "focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF]",
    };
  }, []);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      subject: "",
      email: "",
      address: "",
      phone: "",
      message: "",
    },
  });

  // Submit handler
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      const Appointmentdata = {
        name: values.name,
        phone: values.phone,
        address: values.address,
        email: values.email,
        subject: values.subject,
        message: values.message,
      };

      const response = await createAppointment(Appointmentdata);

      if (response) {
        toast({
          title: "Appointment Booked Successfully",
          description: `We will contact you soon`,
          duration: 2000,
          className: "success-toast",
        });
        form.reset();
      } else {
        toast({
          title: "Appointment booking Failed",
          description: `Please try again`,
          duration: 2000,
          className: "error-toast",
        });
      }
    } catch (error) {
      toast({
        title: "Appointment booking Failed",
        description: `Please try again`,
        duration: 2000,
        className: "error-toast",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-screen pb-16 relative z-10">
      <div className="container mx-auto p-2 md:px-4">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Content Section */}
          <div className={`${themeStyles.contentBg} p-2 md:p-8 `}>
            <h1
              className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold ${themeStyles.titleText} leading-tight`}
            >
              THE FUTURE, <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#55edab]">
                AWAITS.
              </span>
            </h1>
            <p
              className={`${themeStyles.descriptionText} mt-6 text-lg font-montserrat`}
            >
              Got a burning AI idea, question, or just want to chat about what
              we do? We are all ears! Reach out, and our friendly team at
              RocketReplai AI will be right there to guide, assist, or simply
              share in your excitement. Lets make your AI journey memorable
              together!
            </p>

            {/* Owner Details */}
            <div
              className={`mt-10 border-t ${themeStyles.lightBorderColor} pt-6`}
            >
              <h1
                className={`${themeStyles.ownerTitleText} text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#55edab]`}
              >
                Owner Details:
              </h1>
              <div className="space-y-3">
                <p className={`${themeStyles.ownerDetailText} flex`}>
                  <span className="text-[#00F0FF] min-w-[100px]">Owner: </span>{" "}
                  Mr. GAURAV KHIARE
                </p>
                <p className={`${themeStyles.ownerDetailText} flex`}>
                  <span className="text-[#00F0FF] min-w-[100px]">
                    Business:
                  </span>
                  GK Services
                </p>
                <p className={`${themeStyles.ownerDetailText} flex`}>
                  <span className="text-[#00F0FF] min-w-[100px]">Email:</span>
                  <a
                    href="mailto:gauravgkhaire@gmail.com"
                    className="text-[#55edab] hover:underline text-xs sm:text-sm"
                  >
                    gauravgkhaire@gmail.com
                  </a>
                </p>
                <p className={`${themeStyles.ownerDetailText} flex`}>
                  <span className="text-[#00F0FF] min-w-[100px]">Address:</span>
                  Chandwad, Nashik, Maharashtra - 423104
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div
            className={`${themeStyles.formBg} backdrop-blur-md border ${themeStyles.borderColor} rounded-2xl p-2 md:p-8`}
          >
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Name and Phone Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="text"
                            className={`${themeStyles.inputBg} border ${themeStyles.inputBorder} ${themeStyles.inputText} rounded-lg py-6 px-4 ${themeStyles.focusBorder} font-montserrat ${themeStyles.inputPlaceholder}`}
                            placeholder="Full Name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            className={`${themeStyles.inputBg} border ${themeStyles.inputBorder} ${themeStyles.inputText} rounded-lg py-6 px-4 ${themeStyles.focusBorder} font-montserrat ${themeStyles.inputPlaceholder}`}
                            placeholder="Phone Number"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Subject and Email Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="text"
                            className={`${themeStyles.inputBg} border ${themeStyles.inputBorder} ${themeStyles.inputText} rounded-lg py-6 px-4 ${themeStyles.focusBorder} font-montserrat ${themeStyles.inputPlaceholder}`}
                            placeholder="Subject"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="email"
                            className={`${themeStyles.inputBg} border ${themeStyles.inputBorder} ${themeStyles.inputText} rounded-lg py-6 px-4 ${themeStyles.focusBorder} font-montserrat ${themeStyles.inputPlaceholder}`}
                            placeholder="Enter email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Budget and Address Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="text"
                            className={`${themeStyles.inputBg} border ${themeStyles.inputBorder} ${themeStyles.inputText} rounded-lg py-6 px-4 ${themeStyles.focusBorder} font-montserrat ${themeStyles.inputPlaceholder}`}
                            placeholder="Enter address"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Message Field */}
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          rows={6}
                          className={`${themeStyles.inputBg} border ${themeStyles.inputBorder} ${themeStyles.inputText} rounded-lg py-4 px-4 ${themeStyles.focusBorder} font-montserrat ${themeStyles.inputPlaceholder}`}
                          placeholder="Your Message"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <div className="pt-4">
                  {isSubmitting ? (
                    <Button
                      type="submit"
                      disabled
                      className="w-full py-6 bg-gradient-to-r from-[#00F0FF] to-[#55edab] text-white font-bold text-lg rounded-lg opacity-70 cursor-not-allowed"
                    >
                      Submitting...
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="w-full py-6 bg-gradient-to-r from-[#00F0FF] to-[#55edab] text-white font-bold text-lg rounded-lg hover:from-[#00F0FF]/90 hover:to-[#55edab]/90 transition-all duration-300 shadow-lg shadow-[#00F0FF]/20"
                    >
                      Send Message
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
