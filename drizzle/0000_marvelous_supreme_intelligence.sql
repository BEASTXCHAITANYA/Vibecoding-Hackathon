CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"charter_json" jsonb,
	"last_published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"topic" text NOT NULL,
	"source_url" text NOT NULL,
	"source" text NOT NULL,
	"score" integer NOT NULL,
	"verdict" text NOT NULL,
	"reason" text NOT NULL,
	"seen_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"text" text NOT NULL,
	"rationale" text NOT NULL,
	"sources" text[] NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticks" (
	"id" serial PRIMARY KEY NOT NULL,
	"ran_at" timestamp DEFAULT now() NOT NULL,
	"action" text NOT NULL,
	"note" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidates_agent_id_seen_at_idx" ON "candidates" USING btree ("agent_id","seen_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "posts_agent_id_created_at_idx" ON "posts" USING btree ("agent_id","created_at" DESC NULLS LAST);