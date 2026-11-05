import { z } from "zod";
import { t } from "./strings";

const v = t.auth.validation;

/** Password strength 0–4: length ≥ 8, mixed case, number, symbol (+1 bonus for ≥ 12 chars, capped at 4). */
export function passwordScore(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (pw.length >= 12 && s < 4) s++;
  if (pw.length < 8) s = Math.min(s, 1);
  return Math.min(s, 4);
}
export const MIN_PASSWORD_SCORE = 3;

export const emailField = z.string().trim().min(1, v.required).max(255, v.tooLong).email(v.email);
export const nameField = z.string().trim().min(2, v.name).max(100, v.tooLong);
export const phoneField = z
  .string()
  .trim()
  .min(1, v.required)
  .refine((s) => /^(\+27|0)[1-9]\d{8}$/.test(s.replace(/[\s-]/g, "")), v.phone);
export const strongPassword = z
  .string()
  .min(8, v.passwordLength)
  .max(128, v.tooLong)
  .refine((p) => passwordScore(p) >= MIN_PASSWORD_SCORE, v.weakPassword);

const withConfirm = <T extends z.ZodRawShape>(shape: T) =>
  z
    .object({ ...shape, password: strongPassword, confirm: z.string().min(1, v.required) })
    .refine((d) => d.password === d.confirm, { path: ["confirm"], message: v.mismatch });

export const loginSchema = z.object({ email: emailField, password: z.string().min(1, v.required), remember: z.boolean().optional() });
export const forgotSchema = z.object({ email: emailField });
export const resetSchema = withConfirm({});
export const signupSchema = z
  .object({
    name: nameField,
    email: emailField,
    phone: phoneField,
    password: strongPassword,
    confirm: z.string().min(1, v.required),
    terms: z.literal(true, { errorMap: () => ({ message: v.terms }) }),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: v.mismatch });
export const inviteSchema = withConfirm({ name: nameField, phone: phoneField });
export const tenantRegisterSchema = z
  .object({
    phone: phoneField,
    password: strongPassword,
    confirm: z.string().min(1, v.required),
    terms: z.literal(true, { errorMap: () => ({ message: v.terms }) }),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: v.mismatch });
export const otpSchema = z.object({ code: z.string().regex(/^\d{6}$/, v.otp) });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
