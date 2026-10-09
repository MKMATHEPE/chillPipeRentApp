CREATE TABLE `delivery_quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`address` text NOT NULL,
	`suburb` text NOT NULL,
	`metres` integer NOT NULL,
	`fee` integer NOT NULL,
	`expires_at` integer NOT NULL
);
