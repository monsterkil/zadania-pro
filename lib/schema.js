const { pgTable, uuid, varchar, text, boolean, decimal, timestamp, integer, pgEnum } = require("drizzle-orm/pg-core");

const taskStatusEnum = pgEnum("task_status", ["new", "in_progress", "done"]);
const quoteStatusEnum = pgEnum("quote_status", ["pending", "accepted", "rejected", "not_required"]);
const roleEnum = pgEnum("user_role", ["admin", "admin2", "collaborator", "client"]);

const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("new").notNull(),
  requiresQuote: boolean("requires_quote").default(true).notNull(),
  quoteAmount: decimal("quote_amount", { precision: 10, scale: 2 }),
  quoteStatus: quoteStatusEnum("quote_status").default("pending").notNull(),
  deadline: timestamp("deadline"),
  createdBy: roleEnum("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

const taskFiles = pgTable("task_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  authorRole: roleEnum("author_role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

module.exports = {
  taskStatusEnum,
  quoteStatusEnum,
  roleEnum,
  tasks,
  taskFiles,
  comments,
};
