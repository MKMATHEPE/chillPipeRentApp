CREATE TABLE `managed_customers` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`full_name` text NOT NULL,
	`phone` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`must_change` integer DEFAULT 1 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `managed_customers_email_unique` ON `managed_customers` (`email`);--> statement-breakpoint
ALTER TABLE `customer_sessions` ADD `managed_revision` integer DEFAULT 0 NOT NULL;