import { getDb } from '../db/database.js';

class Profile {
  static async create(profileData) {
    const db = getDb();
    const { id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability, created_at } = profileData;
    
    await db.query(
      `INSERT INTO profiles (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, name.toLowerCase(), gender, gender_probability, sample_size, age, age_group, country_id, country_probability, created_at]
    );
    
    return this.findById(id);
  }

  static async findByName(name) {
    const db = getDb();
    const result = await db.query(
      'SELECT * FROM profiles WHERE name = $1',
      [name.toLowerCase()]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const db = getDb();
    const result = await db.query('SELECT * FROM profiles WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    const db = getDb();
    let query = 'SELECT id, name, gender, age, age_group, country_id FROM profiles WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.gender) {
      query += ` AND LOWER(gender) = LOWER($${paramIndex})`;
      params.push(filters.gender);
      paramIndex++;
    }
    if (filters.country_id) {
      query += ` AND LOWER(country_id) = LOWER($${paramIndex})`;
      params.push(filters.country_id);
      paramIndex++;
    }
    if (filters.age_group) {
      query += ` AND LOWER(age_group) = LOWER($${paramIndex})`;
      params.push(filters.age_group);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    return result.rows;
  }

  static async delete(id) {
    const db = getDb();
    const result = await db.query('DELETE FROM profiles WHERE id = $1', [id]);
    return result.rowCount > 0;
  }
}

export default Profile;