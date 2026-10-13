ALTER TABLE `customer_sessions` ADD `refresh_token` text;--> statement-breakpoint
ALTER TABLE `customer_sessions` ADD `access_expires_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_sessions` ADD `refresh_owner` text;--> statement-breakpoint
ALTER TABLE `customer_sessions` ADD `refresh_until` integer DEFAULT 0 NOT NULL;