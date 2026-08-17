CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('order.awaiting_payment', 'order.paid', 'order.expiring', 'event.published', 'event.starting_soon', 'quota.low', 'quota.empty', 'event.expiring', 'event.ended', 'wallet.expiring', 'retention.warning', 'member.invited');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"user_id" uuid NOT NULL,
	"account_id" uuid,
	"type" "notification_type" NOT NULL,
	"title" varchar(120) NOT NULL,
	"body" text,
	"link_url" varchar(200),
	"channel" "notification_channel"[] NOT NULL,
	"meta" jsonb,
	"read_at" timestamp with time zone,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "notifications_account_type_idx" ON "notifications" USING btree ("account_id","type");