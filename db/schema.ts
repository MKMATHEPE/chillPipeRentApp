import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const adminSessions = sqliteTable('admin_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull(),
  accessToken: text('access_token').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
export const adminLoginLimits = sqliteTable('admin_login_limits', {
  bucket: text('bucket').primaryKey(),
  attempts: integer('attempts').notNull(),
  expiresAt: integer('expires_at').notNull(),
});

export const bookings=sqliteTable('bookings',{
  id:integer('id').primaryKey({autoIncrement:true}),
  reference:text('reference').notNull().unique(),
  customerName:text('customer_name').notNull(),
  phone:text('phone').notNull(),
  rentalDate:text('rental_date').notNull(),
  location:text('location').notNull(),
  notes:text('notes').notNull().default(''),
  orderJson:text('order_json').notNull(),
  rentalTotal:integer('rental_total').notNull(),
  deposit:integer('deposit').notNull(),
  deliveryFee:integer('delivery_fee'),
  status:text('status').notNull().default('awaiting_review'),
  paymentMethod:text('payment_method'),
  createdAt:integer('created_at').notNull(),
  updatedAt:integer('updated_at').notNull(),
});
