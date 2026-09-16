import { z } from 'zod';

export const predictionFormSchema = z
  .object({
    title: z.string().optional(),
    instrument: z.string().min(1, 'Please select an instrument'),
    category: z.enum(['CRYPTO', 'FOREX', 'STOCKS', 'INDICES', 'COMMODITIES']),
    direction: z.enum(['LONG', 'SHORT']),
    entryPrice: z.number().positive('Entry price must be positive').optional(),
    buyingZone: z.number().positive('Buying wall must be a positive number'),
    sellingZone: z.number().positive('Selling wall must be a positive number'),
    stopLoss: z.number().positive('Stop loss price must be positive').optional(),
    takeProfit: z.number().positive('Take profit must be positive').optional(),
    takeProfit2: z.number().positive().optional(),
    takeProfit3: z.number().positive().optional(),
    timeframe: z.string().min(1, 'Please select a timeframe'),
    strategy: z.string().optional(),
    analysis: z.string().optional(),
    visibility: z.enum(['PUBLIC', 'SUBSCRIBERS_ONLY', 'EXCLUSIVE']),
    tags: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.buyingZone === data.sellingZone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Buying wall and selling wall cannot be the exact same price.',
        path: ['sellingZone'],
      });
    }
  });

export type PredictionFormValues = z.infer<typeof predictionFormSchema>;

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['USER', 'TRADER']),
});

export type SignupFormValues = z.infer<typeof signupSchema>;

export const profileSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  bio: z.string().max(300, 'Bio cannot exceed 300 characters').optional(),
  twitter: z.string().optional(),
  website: z.string().url('Invalid URL').or(z.literal('')).optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
