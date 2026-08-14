CREATE TYPE "public"."order_status" AS ENUM('draft', 'awaiting_payment', 'paid', 'fulfilled', 'cancelled', 'expired', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('manual_transfer', 'qris', 'va', 'card');--> statement-breakpoint
CREATE TYPE "public"."quota_ledger_entry_type" AS ENUM('purchase', 'allocation', 'deallocation', 'consumption', 'return_on_end', 'forfeit', 'expiry', 'adjustment', 'refund_reversal');--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"number" varchar(20) NOT NULL,
	"account_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"package_snapshot" jsonb NOT NULL,
	"target_event_id" uuid,
	"strips" integer NOT NULL,
	"subtotal_idr" bigint NOT NULL,
	"discount_idr" bigint DEFAULT 0 NOT NULL,
	"voucher_code" varchar(32),
	"total_idr" bigint NOT NULL,
	"status" "order_status" DEFAULT 'draft' NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"payment_ref" varchar(80),
	"proof_asset_id" uuid,
	"paid_at" timestamp with time zone,
	"verified_by_user_id" uuid,
	"expires_at" timestamp with time zone DEFAULT (now() + interval '48 hours') NOT NULL,
	"notes_internal" text,
	CONSTRAINT "orders_number_unique" UNIQUE("number"),
	CONSTRAINT "orders_total_idr_check" CHECK ("orders"."total_idr" >= 0)
);
--> statement-breakpoint
CREATE TABLE "quota_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_id" uuid NOT NULL,
	"event_id" uuid,
	"entry_type" "quota_ledger_entry_type" NOT NULL,
	"strips" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"order_id" uuid,
	"session_id" uuid,
	"actor_user_id" uuid,
	"reason" text,
	"idempotency_key" varchar(64)
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_target_event_id_events_id_fk" FOREIGN KEY ("target_event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_proof_asset_id_assets_id_fk" FOREIGN KEY ("proof_asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_ledger" ADD CONSTRAINT "quota_ledger_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_ledger" ADD CONSTRAINT "quota_ledger_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_ledger" ADD CONSTRAINT "quota_ledger_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_ledger" ADD CONSTRAINT "quota_ledger_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quota_ledger_idempotency_key_uq" ON "quota_ledger" USING btree ("idempotency_key") WHERE "quota_ledger"."idempotency_key" IS NOT NULL;