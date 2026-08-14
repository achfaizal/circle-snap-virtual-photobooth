CREATE TYPE "public"."event_category_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."package_allocation_mode" AS ENUM('single_event', 'flexible');--> statement-breakpoint
CREATE TYPE "public"."package_audience" AS ENUM('personal', 'vendor', 'both');--> statement-breakpoint
CREATE TYPE "public"."package_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."package_template_scope" AS ENUM('all', 'selected');--> statement-breakpoint
CREATE TABLE "event_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"code" varchar(32) NOT NULL,
	"name" varchar(60) NOT NULL,
	"description" varchar(140),
	"icon" varchar(40),
	"default_greeting" text,
	"default_brand_label" varchar(40),
	"sort_order" integer NOT NULL,
	"status" "event_category_status" DEFAULT 'active' NOT NULL,
	CONSTRAINT "event_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"code" varchar(32) NOT NULL,
	"name" varchar(80) NOT NULL,
	"tagline" varchar(140),
	"audience" "package_audience" NOT NULL,
	"allocation_mode" "package_allocation_mode" NOT NULL,
	"strips" integer NOT NULL,
	"min_strips" integer,
	"price_idr" bigint NOT NULL,
	"active_days" integer DEFAULT 7 NOT NULL,
	"max_events" integer,
	"max_voice_seconds" integer DEFAULT 15 NOT NULL,
	"allow_custom_frame" boolean DEFAULT true NOT NULL,
	"allow_gallery" boolean DEFAULT true NOT NULL,
	"allow_video_card" boolean DEFAULT true NOT NULL,
	"max_operators" integer,
	"template_scope" "package_template_scope" DEFAULT 'all' NOT NULL,
	"template_ids" uuid[],
	"wallet_valid_months" integer DEFAULT 12 NOT NULL,
	"is_topup" boolean DEFAULT false NOT NULL,
	"sort_order" integer NOT NULL,
	"status" "package_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "packages_code_unique" UNIQUE("code"),
	CONSTRAINT "packages_strips_check" CHECK ("packages"."strips" >= 1),
	CONSTRAINT "packages_price_idr_check" CHECK ("packages"."price_idr" >= 0),
	CONSTRAINT "packages_min_strips_check" CHECK ("packages"."min_strips" IS NULL OR "packages"."min_strips" >= 1),
	CONSTRAINT "packages_active_days_check" CHECK ("packages"."active_days" BETWEEN 1 AND 90),
	CONSTRAINT "packages_max_voice_seconds_check" CHECK ("packages"."max_voice_seconds" BETWEEN 0 AND 60),
	CONSTRAINT "packages_p04_personal_single_event_check" CHECK ("packages"."audience" <> 'personal' OR ("packages"."allocation_mode" = 'single_event' AND "packages"."max_events" = 1))
);
