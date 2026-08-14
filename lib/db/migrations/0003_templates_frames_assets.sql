CREATE TYPE "public"."asset_kind" AS ENUM('frame', 'cover', 'decor', 'logo', 'avatar', 'strip', 'voice', 'video', 'payment_proof');--> statement-breakpoint
CREATE TYPE "public"."asset_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."frame_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."template_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."template_variable_input_type" AS ENUM('text', 'textarea', 'date', 'time', 'datetime', 'image', 'select', 'toggle');--> statement-breakpoint
CREATE TYPE "public"."template_variable_used_in" AS ENUM('welcome', 'frame', 'video_card', 'share');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"account_id" uuid,
	"kind" "asset_kind" NOT NULL,
	"storage_key" text NOT NULL,
	"mime" varchar(60) NOT NULL,
	"bytes" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"duration_ms" integer,
	"checksum_sha256" varchar(64) NOT NULL,
	"visibility" "asset_visibility" NOT NULL,
	"uploaded_by_user_id" uuid,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "frames" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"account_id" uuid,
	"name" varchar(80) NOT NULL,
	"asset_id" uuid NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"paper" varchar(9) NOT NULL,
	"slots" jsonb NOT NULL,
	"text_layers" jsonb NOT NULL,
	"print_size" varchar(20),
	"slot_count" integer NOT NULL,
	"is_locked" boolean NOT NULL,
	"validation_report" jsonb,
	"status" "frame_status" DEFAULT 'active' NOT NULL,
	CONSTRAINT "frames_slots_min_one_check" CHECK (jsonb_array_length("frames"."slots") >= 1),
	CONSTRAINT "frames_slot_count_matches_slots_check" CHECK ("frames"."slot_count" = jsonb_array_length("frames"."slots"))
);
--> statement-breakpoint
CREATE TABLE "template_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"template_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"is_primary" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_frames" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"template_id" uuid NOT NULL,
	"frame_id" uuid NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"template_id" uuid NOT NULL,
	"key" varchar(40) NOT NULL,
	"label" varchar(80) NOT NULL,
	"help_text" varchar(160),
	"input_type" "template_variable_input_type" NOT NULL,
	"options" jsonb,
	"sample_value" text,
	"default_value" text,
	"is_required" boolean NOT NULL,
	"max_length" integer,
	"used_in" "template_variable_used_in"[] NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"code" varchar(48) NOT NULL,
	"name" varchar(80) NOT NULL,
	"tagline" varchar(140),
	"description" text,
	"folder" varchar(80) NOT NULL,
	"cover_asset_id" uuid NOT NULL,
	"preview_asset_ids" uuid[],
	"brand_label" varchar(40) NOT NULL,
	"theme_colors" jsonb NOT NULL,
	"font_display_id" varchar(40) NOT NULL,
	"theme_effects" jsonb,
	"theme_elements" jsonb,
	"video_card_theme" jsonb NOT NULL,
	"decor_asset_id" uuid,
	"video_bg_asset_id" uuid,
	"sample_data" jsonb NOT NULL,
	"default_session_config" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "template_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"usage_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "templates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frames" ADD CONSTRAINT "frames_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frames" ADD CONSTRAINT "frames_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_categories" ADD CONSTRAINT "template_categories_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_categories" ADD CONSTRAINT "template_categories_category_id_event_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."event_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_frames" ADD CONSTRAINT "template_frames_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_frames" ADD CONSTRAINT "template_frames_frame_id_frames_id_fk" FOREIGN KEY ("frame_id") REFERENCES "public"."frames"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_variables" ADD CONSTRAINT "template_variables_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_cover_asset_id_assets_id_fk" FOREIGN KEY ("cover_asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_decor_asset_id_assets_id_fk" FOREIGN KEY ("decor_asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_video_bg_asset_id_assets_id_fk" FOREIGN KEY ("video_bg_asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "frames_account_status_idx" ON "frames" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "frames_slot_count_idx" ON "frames" USING btree ("slot_count");--> statement-breakpoint
CREATE UNIQUE INDEX "template_variables_template_key_uq" ON "template_variables" USING btree ("template_id","key");