CREATE TABLE `roasts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` text NOT NULL,
	`provider` text DEFAULT 'gemini' NOT NULL,
	`model` text NOT NULL,
	`input_type` text NOT NULL,
	`input_text` text,
	`input_image_uri` text,
	`audience` text NOT NULL,
	`burn_level` integer NOT NULL,
	`roast_text` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`is_favorite` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roasts_request_id_uq` ON `roasts` (`request_id`);--> statement-breakpoint
CREATE INDEX `roasts_created_at_idx` ON `roasts` (`created_at`);--> statement-breakpoint
CREATE INDEX `roasts_status_created_at_idx` ON `roasts` (`status`,`created_at`);