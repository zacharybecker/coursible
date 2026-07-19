CREATE INDEX "cohorts_content_id_idx" ON "cohorts" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "cohorts_owner_id_idx" ON "cohorts" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "course_content_is_starter_idx" ON "course_content" USING btree ("is_starter");--> statement-breakpoint
CREATE INDEX "courses_cohort_id_idx" ON "courses" USING btree ("cohort_id");