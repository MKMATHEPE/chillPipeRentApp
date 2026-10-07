ALTER TABLE `bookings` ADD `version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `paid_at` integer;--> statement-breakpoint
ALTER TABLE `bookings` ADD `completed_at` integer;--> statement-breakpoint
ALTER TABLE `bookings` ADD `decline_reason` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `activity_json` text DEFAULT '[]' NOT NULL;