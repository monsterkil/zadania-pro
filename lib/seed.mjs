import { sql } from "@vercel/postgres";

async function seed() {
  // Create enums
  await sql`DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('new', 'in_progress', 'done');
  EXCEPTION WHEN duplicate_object THEN null;
  END $$`;

  await sql`DO $$ BEGIN
    CREATE TYPE quote_status AS ENUM ('pending', 'accepted', 'rejected', 'not_required');
  EXCEPTION WHEN duplicate_object THEN null;
  END $$`;

  await sql`DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'collaborator', 'client');
  EXCEPTION WHEN duplicate_object THEN null;
  END $$`;

  // Create tables
  await sql`CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status DEFAULT 'new' NOT NULL,
    requires_quote BOOLEAN DEFAULT true NOT NULL,
    quote_amount DECIMAL(10, 2),
    quote_status quote_status DEFAULT 'pending' NOT NULL,
    deadline TIMESTAMP,
    created_by user_role NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`;

  await sql`CREATE TABLE IF NOT EXISTS task_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`;

  await sql`CREATE TABLE IF NOT EXISTS comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    author_role user_role NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`;

  console.log("✅ Database tables created successfully!");

  // Insert sample data
  const result = await sql`SELECT COUNT(*) as count FROM tasks`;
  if (parseInt(result.rows[0].count) === 0) {
    await sql`INSERT INTO tasks (title, description, status, requires_quote, quote_amount, quote_status, deadline, created_by)
    VALUES 
      ('Nowy design strony głównej', 'Odświeżony design strony głównej z nowym hero section, sekcją produktów i testimonials.', 'new', true, 2500, 'pending', NULL, 'client'),
      ('Poprawka błędu w koszyku', 'Koszyk nie aktualizuje się po dodaniu produktu.', 'new', false, NULL, 'not_required', NULL, 'admin'),
      ('Optymalizacja SEO', 'Meta tagi, schema markup, sitemap, optymalizacja obrazów.', 'in_progress', true, 1800, 'accepted', '2026-02-28', 'collaborator'),
      ('Integracja Przelewy24', 'Podłączenie bramki płatności P24 z obsługą BLIK.', 'in_progress', true, 3200, 'accepted', '2026-03-15', 'admin'),
      ('Newsletter template', 'Szablon newslettera w Mailchimp zgodny z brandingiem.', 'done', true, 800, 'accepted', '2026-02-01', 'client')
    `;
    console.log("✅ Sample tasks inserted!");
  }
}

seed().catch(console.error);
