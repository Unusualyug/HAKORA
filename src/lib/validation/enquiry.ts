import { z } from "zod";

export const enquirySchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(120),
  mobile: z
    .string()
    .trim()
    .regex(
      /^(\+91[- ]?)?[6-9]\d{9}$/,
      "Enter a valid 10-digit Indian mobile number",
    ),
  college: z
    .string()
    .trim()
    .min(2, "Please enter your school / college name")
    .max(200),
  description: z
    .string()
    .trim()
    .min(10, "Please describe your requirement (at least 10 characters)")
    .max(5000),
  serviceCategory: z.string().trim().max(120).optional().or(z.literal("")),
  course: z.string().trim().max(120).optional().or(z.literal("")),
  semester: z.string().trim().max(60).optional().or(z.literal("")),
  quantity: z.string().trim().max(60).optional().or(z.literal("")),
  deadline: z.string().trim().optional().or(z.literal("")),
  needsDelivery: z.enum(["yes", "no"]).default("no"),
  deliveryAddress: z.string().trim().max(500).optional().or(z.literal("")),
  consent: z.literal("on", {
    message: "Please accept the privacy policy to continue",
  }),
  // honeypot — must stay empty
  website: z.string().max(0).optional().or(z.literal("")),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  mobile: z
    .string()
    .trim()
    .regex(/^(\+91[- ]?)?[6-9]\d{9}$/, "Enter a valid mobile number"),
  message: z.string().trim().min(5).max(2000),
  website: z.string().max(0).optional().or(z.literal("")),
});
