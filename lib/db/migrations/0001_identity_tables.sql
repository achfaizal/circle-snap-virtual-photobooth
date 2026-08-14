CREATE TYPE "public"."account_invite_role" AS ENUM('manager', 'operator');--> statement-breakpoint
CREATE TYPE "public"."account_member_role" AS ENUM('owner', 'manager', 'operator');--> statement-breakpoint
CREATE TYPE "public"."account_member_status" AS ENUM('invited', 'active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."account_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('personal', 'vendor');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('super_admin', 'admin', 'support');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TABLE "account_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"account_id" uuid NOT NULL,
	"email" "citext" NOT NULL,
	"role" "account_invite_role" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone DEFAULT (now() + interval '7 days') NOT NULL,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "account_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "account_member_role" NOT NULL,
	"invited_by_user_id" uuid,
	"invited_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"status" "account_member_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"type" "account_type" NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"slug" varchar(60) NOT NULL,
	"business_name" varchar(120),
	"business_city" varchar(80),
	"logo_asset_id" uuid,
	"billing_name" varchar(120),
	"billing_email" "citext",
	"billing_npwp" varchar(25),
	"billing_address" text,
	"cached_wallet_balance" integer DEFAULT 0 NOT NULL,
	"wallet_expires_at" timestamp with time zone,
	"trial_used" boolean DEFAULT false NOT NULL,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"suspended_reason" text,
	CONSTRAINT "accounts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"email" "citext" NOT NULL,
	"email_verified_at" timestamp with time zone,
	"password_hash" text NOT NULL,
	"full_name" varchar(100) NOT NULL,
	"phone_wa" varchar(20) NOT NULL,
	"phone_verified_at" timestamp with time zone,
	"avatar_asset_id" uuid,
	"platform_role" "platform_role",
	"two_factor_secret" text,
	"last_login_at" timestamp with time zone,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "account_invites" ADD CONSTRAINT "account_invites_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_members" ADD CONSTRAINT "account_members_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_members" ADD CONSTRAINT "account_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_members" ADD CONSTRAINT "account_members_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_members_account_user_uq" ON "account_members" USING btree ("account_id","user_id");--> statement-breakpoint
CREATE INDEX "users_phone_wa_idx" ON "users" USING btree ("phone_wa");--> statement-breakpoint
CREATE INDEX "users_platform_role_idx" ON "users" USING btree ("platform_role");