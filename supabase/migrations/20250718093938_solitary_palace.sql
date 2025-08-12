/*
  # Create recipes table

  1. New Tables
    - `recipes`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `description` (text, not null)
      - `image` (text)
      - `category` (text, not null)
      - `ingredients` (jsonb, array of strings)
      - `directions` (jsonb, array of strings)
      - `prep_time` (text)
      - `difficulty` (text)
      - `is_favorite` (boolean, default false)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `recipes` table
    - Add policies for public access (since this is a personal recipe app)
*/

CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  image text DEFAULT '',
  category text NOT NULL,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  directions jsonb NOT NULL DEFAULT '[]'::jsonb,
  prep_time text DEFAULT '',
  difficulty text DEFAULT '',
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (personal recipe app)
CREATE POLICY "Allow public read access on recipes"
  ON recipes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access on recipes"
  ON recipes
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access on recipes"
  ON recipes
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access on recipes"
  ON recipes
  FOR DELETE
  TO public
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();