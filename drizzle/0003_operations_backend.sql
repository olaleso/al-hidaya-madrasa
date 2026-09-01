ALTER TABLE `user_credentials` ADD COLUMN `must_change_password` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_fee_accounts_student_term_unique` ON `fee_accounts` (`student_id`,`term`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payments_reference_unique` ON `payments` (`reference`) WHERE `reference` IS NOT NULL AND `reference` <> '';
