import { z } from "zod";
import { t } from "./strings";
import { PROPERTY_TYPES, UNIT_STATUSES } from "@/mocks/portfolio";
import { isSaPostalCode } from "./portfolio-rules";

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

/* ---------- Properties & units (Phase 4) ---------- */

const pf = t.props.form;
const optText = (max: number) => z.string().trim().max(max, v.tooLong);
const money = (msg: string) => z.string().trim().refine((s) => !s || /^\d{1,9}([.,]\d{1,2})?$/.test(s.replace(/\s/g, "")), msg);

export const propertySchema = z.object({
  name: z.string().trim().min(2, v.required).max(120, v.tooLong),
  type: z.enum(PROPERTY_TYPES),
  description: optText(500),
  yearBuilt: z.string().trim().refine((s) => !s || (/^\d{4}$/.test(s) && +s >= 1850 && +s <= 2030), pf.year),
  address: z.string().trim().min(3, v.required).max(200, v.tooLong),
  suburb: z.string().trim().min(2, v.required).max(80, v.tooLong),
  city: z.string().trim().min(2, v.required).max(80, v.tooLong),
  province: z.string().min(1, v.required),
  postalCode: z.string().trim().refine(isSaPostalCode, pf.postal),
  erf: optText(80),
  amenities: z.array(z.string()),
  municipality: optText(120),
  accountNo: optText(40),
  ratesMonthly: money(pf.ratesErr),
  electricity: z.enum(["prepaid", "conventional"]),
  electricityMeter: optText(40),
  waterMeter: optText(40),
  rulesText: optText(1000),
  pets: z.boolean(),
  smoking: z.boolean(),
  quietFrom: z.string(),
  quietTo: z.string(),
});
export type PropertyFormInput = z.infer<typeof propertySchema>;

const uf = t.units.form;
const num = (min: number, max: number, msg: string) => z.coerce.number({ invalid_type_error: msg }).min(min, msg).max(max, msg);
export const unitSchema = z.object({
  label: z.string().trim().min(1, v.required).max(30, v.tooLong),
  beds: num(0, 20, v.required),
  baths: num(0, 20, v.required),
  sizeM2: num(0, 10000, v.required),
  rent: num(500, 500000, uf.rentRange),
  deposit: num(0, 1000000, v.required),
  status: z.enum(UNIT_STATUSES as [string, ...string[]]),
  features: optText(300),
});
export type UnitFormInput = z.infer<typeof unitSchema>;
