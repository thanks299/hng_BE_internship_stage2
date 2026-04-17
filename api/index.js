import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { initializeDatabase, getDb } from '../src/db/database.js';

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Database helper functions
async function findByName(name) {
  const db = getDb();
  const result = await db.query('SELECT * FROM profiles WHERE name = $1', [name.toLowerCase()]);
  return result.rows[0];
}

async function findById(id) {
  const db = getDb();
  const result = await db.query('SELECT * FROM profiles WHERE id = $1', [id]);
  return result.rows[0];
}

async function findAll(filters = {}) {
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

async function deleteProfile(id) {
  const db = getDb();
  const result = await db.query('DELETE FROM profiles WHERE id = $1', [id]);
  return result.rowCount > 0;
}

async function createProfile(profileData) {
  const db = getDb();
  const { id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability, created_at } = profileData;
  
  await db.query(
    `INSERT INTO profiles (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, name.toLowerCase(), gender, gender_probability, sample_size, age, age_group, country_id, country_probability, created_at]
  );
  
  return findById(id);
}

// External API calls
async function fetchGenderData(name) {
  const response = await fetch(`https://api.genderize.io?name=${encodeURIComponent(name)}`);
  const data = await response.json();
  
  if (!data.gender || data.count === 0) {
    throw new Error('Genderize returned an invalid response');
  }
  return {
    gender: data.gender,
    probability: data.probability,
    count: data.count
  };
}

async function fetchAgeData(name) {
  const response = await fetch(`https://api.agify.io?name=${encodeURIComponent(name)}`);
  const data = await response.json();
  
  if (!data.age) {
    throw new Error('Agify returned an invalid response');
  }
  return { age: data.age };
}

async function fetchNationalityData(name) {
  const response = await fetch(`https://api.nationalize.io?name=${encodeURIComponent(name)}`);
  const data = await response.json();
  
  if (!data.country || data.country.length === 0) {
    throw new Error('Nationalize returned an invalid response');
  }
  
  const topCountry = data.country.reduce((max, country) => 
    country.probability > max.probability ? country : max, data.country[0]);
  
  return {
    country_id: topCountry.country_id,
    probability: topCountry.probability
  };
}

function determineAgeGroup(age) {
  if (age <= 12) return 'child';
  if (age <= 19) return 'teenager';
  if (age <= 59) return 'adult';
  return 'senior';
}

// Endpoints

// POST /api/profiles - Create profile
app.post('/api/profiles', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Missing or empty name'
      });
    }

    const trimmedName = name.trim();

    // Check if profile exists
    const existingProfile = await findByName(trimmedName);
    if (existingProfile) {
      return res.status(200).json({
        status: 'success',
        message: 'Profile already exists',
        data: existingProfile
      });
    }

    // Fetch external data
    let genderData, ageData, nationalityData;
    
    try {
      genderData = await fetchGenderData(trimmedName);
    } catch (error) {
      return res.status(502).json({
        status: 'error',
        message: error.message
      });
    }

    try {
      ageData = await fetchAgeData(trimmedName);
    } catch (error) {
      return res.status(502).json({
        status: 'error',
        message: error.message
      });
    }

    try {
      nationalityData = await fetchNationalityData(trimmedName);
    } catch (error) {
      return res.status(502).json({
        status: 'error',
        message: error.message
      });
    }

    const ageGroup = determineAgeGroup(ageData.age);
    const profileData = {
      id: uuidv4(),
      name: trimmedName.toLowerCase(),
      gender: genderData.gender,
      gender_probability: genderData.probability,
      sample_size: genderData.count,
      age: ageData.age,
      age_group: ageGroup,
      country_id: nationalityData.country_id,
      country_probability: nationalityData.probability,
      created_at: new Date().toISOString()
    };

    const newProfile = await createProfile(profileData);

    res.status(201).json({
      status: 'success',
      data: newProfile
    });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// GET /api/profiles - Get all profiles
app.get('/api/profiles', async (req, res) => {
  try {
    const { gender, country_id, age_group } = req.query;
    const filters = {};
    
    if (gender) filters.gender = gender;
    if (country_id) filters.country_id = country_id;
    if (age_group) filters.age_group = age_group;
    
    const profiles = await findAll(filters);
    
    res.status(200).json({
      status: 'success',
      count: profiles.length,
      data: profiles
    });
  } catch (error) {
    console.error('Get all profiles error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// GET /api/profiles/:id - Get single profile
app.get('/api/profiles/:id', async (req, res) => {
  try {
    const profile = await findById(req.params.id);
    
    if (!profile) {
      return res.status(404).json({
        status: 'error',
        message: 'Profile not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: profile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// DELETE /api/profiles/:id - Delete profile
app.delete('/api/profiles/:id', async (req, res) => {
  try {
    const deleted = await deleteProfile(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: 'Profile not found'
      });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Handle OPTIONS for CORS
app.options('/api/profiles', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
});

let dbInitialized = false;

export default async (req, res) => {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
  return app(req, res);
};