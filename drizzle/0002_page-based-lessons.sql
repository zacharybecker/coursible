CREATE TABLE "generation_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"error" text,
	"content_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_completions" (
	"course_id" text NOT NULL,
	"page_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"outcome" text NOT NULL,
	"xp_awarded" integer NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "page_completions_course_id_page_id_pk" PRIMARY KEY("course_id","page_id")
);
--> statement-breakpoint
ALTER TABLE "course_content" ADD COLUMN "schema_version" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "course_content" ADD COLUMN "concepts" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_content_id_course_content_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."course_content"("content_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_completions" ADD CONSTRAINT "page_completions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generation_jobs_user_id_idx" ON "generation_jobs" USING btree ("user_id");