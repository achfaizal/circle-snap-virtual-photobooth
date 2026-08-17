CREATE TYPE "public"."session_reject_reason" AS ENUM('quota_empty', 'event_closed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('in_progress', 'completed', 'abandoned', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."strip_upload_status" AS ENUM('pending', 'uploaded', 'failed');--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"event_id" uuid NOT NULL,
	"guest_name" varchar(60),
	"frame_id" uuid NOT NULL,
	"device_hint" jsonb,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"status" "session_status" NOT NULL,
	"reject_reason" "session_reject_reason",
	"retake_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strip_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"strip_id" uuid NOT NULL,
	"slot_index" integer NOT NULL,
	"asset_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"session_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"receipt_no" varchar(24) NOT NULL,
	"image_asset_id" uuid,
	"video_asset_id" uuid,
	"variable_snapshot" jsonb NOT NULL,
	"filter_id" varchar(24) NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"hidden_by_user_id" uuid,
	"hidden_reason" varchar(120),
	"guest_delete_token_hash" text,
	"downloaded_count" integer DEFAULT 0 NOT NULL,
	"upload_status" "strip_upload_status" DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"strip_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"duration_ms" integer NOT NULL,
	"transcript" text
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_frame_id_frames_id_fk" FOREIGN KEY ("frame_id") REFERENCES "public"."frames"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strip_photos" ADD CONSTRAINT "strip_photos_strip_id_strips_id_fk" FOREIGN KEY ("strip_id") REFERENCES "public"."strips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strip_photos" ADD CONSTRAINT "strip_photos_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strips" ADD CONSTRAINT "strips_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strips" ADD CONSTRAINT "strips_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strips" ADD CONSTRAINT "strips_image_asset_id_assets_id_fk" FOREIGN KEY ("image_asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strips" ADD CONSTRAINT "strips_video_asset_id_assets_id_fk" FOREIGN KEY ("video_asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strips" ADD CONSTRAINT "strips_hidden_by_user_id_users_id_fk" FOREIGN KEY ("hidden_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_notes" ADD CONSTRAINT "voice_notes_strip_id_strips_id_fk" FOREIGN KEY ("strip_id") REFERENCES "public"."strips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_notes" ADD CONSTRAINT "voice_notes_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_event_idx" ON "sessions" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "strips_event_receipt_uq" ON "strips" USING btree ("event_id","receipt_no");--> statement-breakpoint
CREATE INDEX "strips_event_hidden_idx" ON "strips" USING btree ("event_id","is_hidden");