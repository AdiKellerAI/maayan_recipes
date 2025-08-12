-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  category VARCHAR(100) NOT NULL,
  ingredients JSONB NOT NULL DEFAULT '[]',
  directions JSONB NOT NULL DEFAULT '[]',
  additional_instructions JSONB DEFAULT '{}',
  prep_time VARCHAR(50) DEFAULT '',
  difficulty VARCHAR(50) DEFAULT '',
  is_favorite BOOLEAN DEFAULT false,
  current_step INTEGER DEFAULT 0,
  images JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_recipes_updated_at ON recipes;
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_is_favorite ON recipes(is_favorite);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at);
CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes USING gin(to_tsvector('english', title));

-- Insert some sample data if table is empty
INSERT INTO recipes (title, description, category, ingredients, directions, difficulty, prep_time)
SELECT 
  'עוגת שוקולד ביתית',
  'עוגת שוקולד טעימה ופשוטה להכנה',
  'עוגות',
  '["קמח", "סוכר", "ביצים", "שוקולד", "חלב"]',
  '["מחממים תנור ל-180 מעלות", "מערבבים את כל החומרים", "אופים 25 דקות"]',
  'קל',
  '30 דקות'
WHERE NOT EXISTS (SELECT 1 FROM recipes LIMIT 1);

INSERT INTO recipes (title, description, category, ingredients, directions, difficulty, prep_time)
SELECT 
  'סלט יווני',
  'סלט יווני מסורתי עם גבינת פטה וזיתים',
  'סלטים',
  '["עגבניות", "מלפפונים", "בצל אדום", "גבינת פטה", "זיתים"]',
  '["חותכים את הירקות לקוביות", "מוסיפים גבינת פטה וזיתים", "מתבלים בשמן זית ומלח"]',
  'קל',
  '15 דקות'
WHERE NOT EXISTS (SELECT 1 FROM recipes WHERE title = 'סלט יווני');
