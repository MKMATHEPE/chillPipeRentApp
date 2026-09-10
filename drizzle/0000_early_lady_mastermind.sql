CREATE TABLE `bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reference` text NOT NULL,
	`customer_name` text NOT NULL,
	`phone` text NOT NULL,
	`rental_date` text NOT NULL,
	`location` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`order_json` text NOT NULL,
	`rental_total` integer NOT NULL,
	`deposit` integer NOT NULL,
	`delivery_fee` integer,
	`status` text DEFAULT 'awaiting_review' NOT NULL,
	`payment_method` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_reference_unique` ON `bookings` (`reference`);