CREATE TABLE `roast_variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`roast_id` integer NOT NULL,
	`variant_index` integer NOT NULL,
	`content` text NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`roast_id`) REFERENCES `roasts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `roast_variants_roast_id_idx` ON `roast_variants` (`roast_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `roast_variants_roast_id_variant_idx_uq` ON `roast_variants` (`roast_id`,`variant_index`);--> statement-breakpoint
DROP INDEX `roasts_status_created_at_idx`;--> statement-breakpoint
ALTER TABLE `roasts` ADD `variant_count` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `roasts` ADD `selected_variant_index` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `roasts` DROP COLUMN `roast_text`;--> statement-breakpoint
ALTER TABLE `roasts` DROP COLUMN `is_favorite`;