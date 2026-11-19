/** Website-user zod schemas (client+server safe). Strict: rejects unknown fields. */
import { z } from "zod";

/**
 * Code verification carries the account details again: the password is set
 * only here, by whoever holds the emailed code, so a second registration of
 * the same pending email can never choose the final password.
 */
export const userVerifySchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name.").max(80, "Name must be at most 80 characters."),
    email: z.string().trim().toLowerCase().min(3).max(254).email("Enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password must be at most 128 characters."),
    otp: z.string().trim().regex(/^[0-9]{6,8}$/, "Enter the 6-8 digit code."),
  })
  .strict();

export type UserVerifyInput = z.infer<typeof userVerifySchema>;

const otpField = z.string().trim().regex(/^[0-9]{6,8}$/, "Enter the 6-8 digit code.");

/** Adding a password to an existing Google account. Same shape as reset; never carries a role or name. */
export const userSetupPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().min(3).max(254).email("Enter a valid email address."),
    otp: otpField,
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password must be at most 128 characters."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .strict()
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type UserSetupPasswordInput = z.infer<typeof userSetupPasswordSchema>;
