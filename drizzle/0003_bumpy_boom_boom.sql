CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`total` integer NOT NULL,
	`unavailable` integer DEFAULT 0 NOT NULL,
	`price` integer,
	`version` integer DEFAULT 0 NOT NULL
);
