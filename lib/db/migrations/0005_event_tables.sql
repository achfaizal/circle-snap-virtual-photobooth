CREATE TYPE "public"."event_frame_source" AS ENUM('template', 'custom');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'live', 'ended', 'expired', 'suspended', 'archived');--> statement-breakpoint
CREATE TABLE "event_frames" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"event_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"frame_id" uuid NOT NULL,
	"source" "event_frame_source" NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_variable_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"event_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"variable_key" varchar(40) NOT NULL,
	"value_text" text,
	"value_asset_id" uuid
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"account_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"template_id" uuid,
	"template_version" integer,
	"template_snapshot" jsonb,
	"internal_name" varchar(120) NOT NULL,
	"slug" varchar(40) NOT NULL,
	"display_names" varchar(120),
	"date_display" varchar(60),
	"venue" varchar(160),
	"hashtag" varchar(60),
	"greeting" text,
	"starts_at" timestamp with time zone,
	"timezone" varchar(40) DEFAULT 'Asia/Jakarta' NOT NULL,
	"active_days" integer NOT NULL,
	"expires_at" timestamp with time zone,
	"extended_count" integer DEFAULT 0 NOT NULL,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"session_config" jsonb NOT NULL,
	"gallery_enabled" boolean DEFAULT true NOT NULL,
	"gallery_public" boolean DEFAULT false NOT NULL,
	"guest_name_required" boolean DEFAULT true NOT NULL,
	"operator_can_end" boolean DEFAULT false NOT NULL,
	"cached_quota" integer DEFAULT 0 NOT NULL,
	"cached_consumed" integer DEFAULT 0 NOT NULL,
	"retention_until" timestamp with time zone,
	"suspended_reason" text,
	CONSTRAINT "events_slug_unique" UNIQUE("slug"),
	CONSTRAINT "events_extended_count_check" CHECK ("events"."extended_count" BETWEEN 0 AND 2)
);
--> statement-breakpoint
ALTER TABLE "event_frames" ADD CONSTRAINT "event_frames_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_frames" ADD CONSTRAINT "event_frames_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_frames" ADD CONSTRAINT "event_frames_frame_id_frames_id_fk" FOREIGN KEY ("frame_id") REFERENCES "public"."frames"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_variable_values" ADD CONSTRAINT "event_variable_values_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_variable_values" ADD CONSTRAINT "event_variable_values_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_variable_values" ADD CONSTRAINT "event_variable_values_value_asset_id_assets_id_fk" FOREIGN KEY ("value_asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_category_id_event_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."event_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_frames_event_frame_uq" ON "event_frames" USING btree ("event_id","frame_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_variable_values_event_key_uq" ON "event_variable_values" USING btree ("event_id","variable_key");--> statement-breakpoint
CREATE INDEX "events_account_status_idx" ON "events" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "events_starts_at_idx" ON "events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "events_expires_at_idx" ON "events" USING btree ("expires_at");