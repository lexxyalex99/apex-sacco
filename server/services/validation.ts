import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(3, "Full Name must contain at least 3 characters.").max(100),
  email: z.string().email("Invalid corporate or personal email address layout."),
  phone: z.string().regex(/^\+254\s?\d{3}\s?\d{3}\s?\d{3}$|^\d{10}$/, "Phone must follow modern format like (+254 7XX XXX XXX or 07XX XXX XXX)"),
  nationalId: z.string().min(7, "National Identity number should contain between 7 to 10 digits.").max(12),
  password: z.string().min(6, "Security password must have at least 6 characters.")
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(5, "Password is too short")
});

export const otpVerifySchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z.string().length(6, "Security system verification OTP code must contain exactly 6 characters")
});

export const resetPasswordRequestSchema = z.object({
  email: z.string().email("Invalid account email format")
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "STK token is expired or altered"),
  newPassword: z.string().min(6, "Complexity failed. Security upgrade demands minimum 6 characters.")
});

export const savingsDepositSchema = z.object({
  memberId: z.string().min(3),
  amount: z.number().positive("Financial deposit value should be a positive amount value."),
  paymentMethod: z.enum(['M-Pesa', 'Bank Transfer', 'Cash', 'Card']),
  phoneNumber: z.string().optional(),
  description: z.string().max(200).optional()
});

export const savingsWithdrawalSchema = z.object({
  memberId: z.string().min(3),
  amount: z.number().positive("Withdrawal minimum demands a positive amount validation."),
  paymentMethod: z.enum(['M-Pesa', 'Bank Transfer', 'Cash', 'Card']),
  description: z.string().max(200).optional()
});

export const loanApplicationSchema = z.object({
  memberId: z.string().min(3),
  amount: z.number().positive("Loan credit financing values should be a valid positive amount."),
  tenureMonths: z.number().int().min(1, "Installment timeline must be between 1 and 36 months").max(36),
  purpose: z.string().min(10, "Detailed justification application reason demands minimum 10 characters.").max(500),
  guarantors: z.array(z.string()).min(1, "A credit security contract requires at least 1 verified guarantor.")
});

export function formatZodError(error: any): string {
  if (error) {
    if (Array.isArray(error.issues) && error.issues.length > 0) {
      return error.issues[0].message;
    }
    if (Array.isArray(error.errors) && error.errors.length > 0) {
      return error.errors[0].message;
    }
    if (typeof error.message === 'string') {
      return error.message;
    }
  }
  return "Invalid validation schema parameters.";
}

