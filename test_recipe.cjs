const { Pool } = require('pg');

const pool = new Pool({
  host: '34.132.167.99',
  port: 5432,
  database: 'recipes',
  user: 'postgres',
  password: 'MaayanRecipes2025',
  ssl: { rejectUnauthorized: false }
});

async function createTestRecipe() {
  const client = await pool.connect();
  try {
    console.log('🧪 Creating test recipe with additional sections...');
    
    // Create a test recipe with additional sections
    const testRecipe = await client.query(`
      INSERT INTO recipes (
        title, category, ingredients, directions, additional_sections
      ) VALUES (
        $1, $2, $3, $4, $5
      ) RETURNING id, title
    `, [
      'מתכון בדיקה - עוגת שוקולד עם רוטב',
      'cakes',
      JSON.stringify(['2 כוסות קמח', '1 כוס סוכר', '3 ביצים']),
      JSON.stringify(['לערבב את הקמח והסוכר', 'להוסיף את הביצים', 'לאפות ב-180 מעלות']),
      JSON.stringify({
        'רוטב שוקולד': {
          ingredients: ['1 כוס קרם', '200 גרם שוקולד מריר', '2 כפות סוכר'],
          directions: ['לחמם את הקרם', 'להמיס את השוקולד', 'לערבב עד לקבלת רוטב חלק']
        },
        'קישוט': {
          ingredients: ['פירורי עוגיות', 'אבקת סוכר'],
          directions: ['לפזר פירורי עוגיות', 'לאבק באבקת סוכר']
        }
      })
    ]);
    
    console.log('✅ Test recipe created:', testRecipe.rows[0].title);
    console.log('📋 Recipe ID:', testRecipe.rows[0].id);
    
    // Verify we can retrieve it with the function
    const retrieved = await client.query('SELECT * FROM get_recipe_details($1)', [testRecipe.rows[0].id]);
    
    if (retrieved.rows.length > 0) {
      console.log('✅ Recipe retrieved successfully');
      console.log('📋 Additional sections:', JSON.stringify(retrieved.rows[0].additional_sections, null, 2));
    } else {
      console.log('❌ Failed to retrieve recipe');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

createTestRecipe();
