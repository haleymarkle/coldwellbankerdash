CREATE TYPE "public"."role" AS ENUM('master_admin', 'high_level_user', 'office_manager', 'agent');--> statement-breakpoint
CREATE TYPE "public"."tool_type" AS ENUM('internal_route', 'external_link');--> statement-breakpoint
CREATE TYPE "public"."training_status" AS ENUM('not_started', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'invited', 'disabled');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text,
	"actor_profile_id" uuid,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"region" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"role" "role" DEFAULT 'agent' NOT NULL,
	"status" "user_status" DEFAULT 'invited' NOT NULL,
	"office_id" uuid,
	"title" text,
	"phone" text,
	"avatar_url" text,
	"invited_at" timestamp with time zone,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_office_access" (
	"tool_id" uuid NOT NULL,
	"office_id" uuid NOT NULL,
	CONSTRAINT "tool_office_access_tool_id_office_id_pk" PRIMARY KEY("tool_id","office_id")
);
--> statement-breakpoint
CREATE TABLE "tool_role_access" (
	"tool_id" uuid NOT NULL,
	"role" "role" NOT NULL,
	CONSTRAINT "tool_role_access_tool_id_role_pk" PRIMARY KEY("tool_id","role")
);
--> statement-breakpoint
CREATE TABLE "tool_user_override" (
	"tool_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"allow" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tool_user_override_tool_id_profile_id_pk" PRIMARY KEY("tool_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"icon" text,
	"type" "tool_type" DEFAULT 'internal_route' NOT NULL,
	"url" text NOT NULL,
	"category" text DEFAULT 'General' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"training_id" uuid NOT NULL,
	"status" "training_status" DEFAULT 'not_started' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"score" integer
);
--> statement-breakpoint
CREATE TABLE "trainings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"content" text,
	"url" text,
	"category" text DEFAULT 'General' NOT NULL,
	"required_for_roles" "role"[],
	"estimated_minutes" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_profile_id_profiles_id_fk" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_office_access" ADD CONSTRAINT "tool_office_access_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_office_access" ADD CONSTRAINT "tool_office_access_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_role_access" ADD CONSTRAINT "tool_role_access_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_user_override" ADD CONSTRAINT "tool_user_override_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_user_override" ADD CONSTRAINT "tool_user_override_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_training_id_trainings_id_fk" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "offices_region_idx" ON "offices" USING btree ("region");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_id_uq" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "profiles_office_idx" ON "profiles" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX "profiles_role_idx" ON "profiles" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "tools_slug_uq" ON "tools" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tools_category_idx" ON "tools" USING btree ("category");--> statement-breakpoint
CREATE INDEX "tools_active_idx" ON "tools" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "training_assign_uq" ON "training_assignments" USING btree ("profile_id","training_id");--> statement-breakpoint
CREATE INDEX "training_assign_profile_idx" ON "training_assignments" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "training_assign_status_idx" ON "training_assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trainings_category_idx" ON "trainings" USING btree ("category");