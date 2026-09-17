CREATE TABLE `profile_sections` (
	`key` text PRIMARY KEY NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`text` text NOT NULL,
	`rationale` text,
	`source_vacancy_id` integer,
	`retired_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`source_vacancy_id`) REFERENCES `vacancies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`layer` text NOT NULL,
	`label` text NOT NULL,
	`url` text,
	`note` text,
	`cadence` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `vacancies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employer` text NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`source` text,
	`source_verified` integer DEFAULT false NOT NULL,
	`found_on` text,
	`assessed_on` text,
	`layer` text DEFAULT 'na' NOT NULL,
	`location` text,
	`commute_minutes` integer,
	`hours` text,
	`contract_type` text DEFAULT 'unknown' NOT NULL,
	`office_days` integer,
	`remote_note` text,
	`salary` text,
	`language_requirement` text,
	`verdict` text DEFAULT 'pending' NOT NULL,
	`verdict_reason` text,
	`fits` text,
	`fits_not` text,
	`doubts` text,
	`status` text DEFAULT 'new' NOT NULL,
	`status_note` text,
	`applied_on` text,
	`closed_on` text,
	`feedback_correct` text,
	`feedback_missed` text,
	`feedback_insight` text,
	`vacancy_text` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
