import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(150),
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters').max(72)
    .regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a digit'),
  phone: z.string().max(20).optional(),
})

export const addressSchema = z.object({
  fullName: z.string().min(1, 'Required'), phone: z.string().min(7, 'Enter a phone number'),
  line1: z.string().min(1, 'Required'), city: z.string().min(1, 'Required'), state: z.string().min(1, 'Required'),
  postalCode: z.string().regex(/^\d{4,10}$/, 'Enter a valid postal code'),
})

export type LoginForm = z.infer<typeof loginSchema>
export type RegisterForm = z.infer<typeof registerSchema>
export type AddressForm = z.infer<typeof addressSchema>
export { money } from './format'

// ---- admin forms (strings in the form, converted to numbers on submit) ----
const price = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, 'Enter an amount like 499 or 499.50')
export const productSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required').max(64),
  name: z.string().trim().min(1, 'Name is required').max(200),
  brand: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  categoryId: z.string().min(1, 'Choose a category'),
  price,
  discountPrice: price.or(z.literal('')).optional(),
  taxRate: z.string().regex(/^\d{1,3}(\.\d{1,2})?$/, 'Enter a percentage like 18').refine(v => Number(v) <= 100, 'Max 100'),
  active: z.boolean(),
}).refine(v => !v.discountPrice || Number(v.discountPrice) <= Number(v.price), { path: ['discountPrice'], message: 'Cannot exceed the list price' })

export const adjustSchema = z.object({
  delta: z.string().regex(/^-?\d+$/, 'Enter a whole number, e.g. 25 or -3').refine(v => Number(v) !== 0, 'Must not be zero'),
  reason: z.string().trim().min(3, 'Give a short reason').max(255),
})
export const transferSchema = z.object({
  destinationWarehouseId: z.string().min(1, 'Choose a destination'),
  quantity: z.string().regex(/^\d+$/, 'Enter a whole number').refine(v => Number(v) >= 1, 'At least 1'),
  reason: z.string().max(255).optional(),
})
export const warehouseSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(150),
  code: z.string().trim().min(1, 'Code is required').max(20),
  location: z.string().max(150).optional(), address: z.string().max(500).optional(), contactNumber: z.string().max(20).optional(),
  active: z.boolean(),
})
export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120), description: z.string().max(1000).optional(),
  parentId: z.string().optional(), active: z.boolean(),
})
export const profileSchema = z.object({ fullName: z.string().trim().min(1, 'Name is required').max(150), phone: z.string().max(20).optional() })
export const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: z.string().min(8, 'Use at least 8 characters').max(72).regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a digit'),
  confirm: z.string(),
}).refine(v => v.newPassword === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })
export type ProductForm = z.infer<typeof productSchema>
export type AdjustForm = z.infer<typeof adjustSchema>
export type TransferForm = z.infer<typeof transferSchema>
export type WarehouseForm = z.infer<typeof warehouseSchema>
export type CategoryForm = z.infer<typeof categorySchema>
export type ProfileForm = z.infer<typeof profileSchema>
export type PasswordForm = z.infer<typeof passwordSchema>
