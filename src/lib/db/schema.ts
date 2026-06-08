import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["super_admin", "admin", "gerente", "atendente", "operador", "visualizador", "ia"]);
export const conversationStatusEnum = pgEnum("conversation_status", ["ai", "human", "paused", "closed"]);
export const messageRoleEnum = pgEnum("message_role", ["lead", "ai", "human", "system"]);
export const channelEnum = pgEnum("channel", ["whatsapp"]);

const baseAuditColumns = {
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
  is_deleted: boolean("is_deleted").notNull().default(false)
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: roleEnum("role").notNull().default("operador"),
  password_hash: text("password_hash"),
  password_set_at: timestamp("password_set_at", { withTimezone: true }),
  email_verified_at: timestamp("email_verified_at", { withTimezone: true }),
  invite_token_hash: text("invite_token_hash"),
  invite_expires_at: timestamp("invite_expires_at", { withTimezone: true }),
  invited_at: timestamp("invited_at", { withTimezone: true }),
  last_login_at: timestamp("last_login_at", { withTimezone: true }),
  ...baseAuditColumns,
  modified_by: uuid("modified_by").notNull()
});

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    phone: text("phone").notNull().unique(),
    avatar_url: text("avatar_url"),
    origin: text("origin").notNull().default("whatsapp"),
    interest: text("interest"),
    temperature: text("temperature").notNull().default("morno"),
    sentiment: text("sentiment").notNull().default("neutro"),
    pipeline_stage: text("pipeline_stage").notNull().default("novo"),
    last_message_preview: text("last_message_preview"),
    last_interaction_at: timestamp("last_interaction_at", { withTimezone: true }),
    enrollment_closed_at: timestamp("enrollment_closed_at", { withTimezone: true }),
    follow_up_count: integer("follow_up_count").notNull().default(0),
    last_follow_up_at: timestamp("last_follow_up_at", { withTimezone: true }),
    next_follow_up_at: timestamp("next_follow_up_at", { withTimezone: true }),
    follow_up_paused_at: timestamp("follow_up_paused_at", { withTimezone: true }),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    responsible_id: uuid("responsible_id").references(() => users.id, { onDelete: "restrict" }),
    ...baseAuditColumns,
    modified_by: uuid("modified_by").notNull().references(() => users.id, { onDelete: "restrict" })
  },
  (table) => ({
    phoneIdx: index("leads_phone_idx").on(table.phone)
  })
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lead_id: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "restrict" }),
    channel: channelEnum("channel").notNull().default("whatsapp"),
    external_chat_id: text("external_chat_id").notNull(),
    status: conversationStatusEnum("status").notNull().default("ai"),
    assigned_to: uuid("assigned_to").references(() => users.id, { onDelete: "restrict" }),
    ai_paused_reason: text("ai_paused_reason"),
    last_message_at: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    context_summary: text("context_summary"),
    ...baseAuditColumns,
    modified_by: uuid("modified_by").notNull().references(() => users.id, { onDelete: "restrict" })
  },
  (table) => ({
    externalChatIdx: index("conversations_external_chat_idx").on(table.external_chat_id),
    leadIdx: index("conversations_lead_idx").on(table.lead_id)
  })
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversation_id: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "restrict" }),
    external_message_id: text("external_message_id"),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...baseAuditColumns,
    modified_by: uuid("modified_by").notNull().references(() => users.id, { onDelete: "restrict" })
  },
  (table) => ({
    conversationIdx: index("messages_conversation_idx").on(table.conversation_id),
    externalMessageIdx: index("messages_external_message_idx").on(table.external_message_id)
  })
);

export const handoffEvents = pgTable("handoff_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversation_id: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "restrict" }),
  from_status: conversationStatusEnum("from_status").notNull(),
  to_status: conversationStatusEnum("to_status").notNull(),
  reason: text("reason"),
  ...baseAuditColumns,
  modified_by: uuid("modified_by").notNull().references(() => users.id, { onDelete: "restrict" })
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull().default({}),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});
