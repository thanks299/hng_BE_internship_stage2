import request from 'supertest';
import express from 'express';
import cors from 'cors';
import profileRoutes from '../src/routes/profiles.js';

// Create a mock database for testing
let mockProfiles = new Map();

// Mock the database module
jest.mock('../src/db/database.js', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(true),
  getDb: jest.fn().mockReturnValue({
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
    exec: jest.fn()
  })
}));

// Mock the Profile model
jest.mock('../src/models/Profile.js', () => {
  return {
    __esModule: true,
    default: {
      create: jest.fn(async (profileData) => {
        mockProfiles.set(profileData.id, profileData);
        return profileData;
      }),
      findByName: jest.fn(async (name) => {
        for (let profile of mockProfiles.values()) {
          if (profile.name === name) return profile;
        }
        return null;
      }),
      findById: jest.fn(async (id) => {
        return mockProfiles.get(id) || null;
      }),
      findAll: jest.fn(async (filters) => {
        let profiles = Array.from(mockProfiles.values());
        
        if (filters.gender) {
          profiles = profiles.filter(p => p.gender?.toLowerCase() === filters.gender.toLowerCase());
        }
        if (filters.country_id) {
          profiles = profiles.filter(p => p.country_id?.toLowerCase() === filters.country_id.toLowerCase());
        }
        if (filters.age_group) {
          profiles = profiles.filter(p => p.age_group?.toLowerCase() === filters.age_group.toLowerCase());
        }
        
        return profiles.map(p => ({
          id: p.id,
          name: p.name,
          gender: p.gender,
          age: p.age,
          age_group: p.age_group,
          country_id: p.country_id
        }));
      }),
      delete: jest.fn(async (id) => {
        if (mockProfiles.has(id)) {
          mockProfiles.delete(id);
          return true;
        }
        return false;
      })
    }
  };
});

// Mock external API service
jest.mock('../src/services/externalApiService.js', () => ({
  fetchGenderData: jest.fn().mockResolvedValue({
    gender: 'male',
    probability: 0.99,
    count: 1234
  }),
  fetchAgeData: jest.fn().mockResolvedValue({
    age: 25
  }),
  fetchNationalityData: jest.fn().mockResolvedValue({
    country_id: 'NG',
    probability: 0.85
  }),
  determineAgeGroup: jest.fn((age) => {
    if (age <= 12) return 'child';
    if (age <= 19) return 'teenager';
    if (age <= 59) return 'adult';
    return 'senior';
  })
}));

// Create test app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', profileRoutes);

describe('Profile API Tests', () => {
  beforeEach(() => {
    // Clear mock profiles before each test
    mockProfiles.clear();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('POST /api/profiles', () => {
    it('should create a new profile with valid name', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .send({ name: 'emmanuel' });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('emmanuel');
      expect(response.body.data).toHaveProperty('gender');
      expect(response.body.data).toHaveProperty('age');
      expect(response.body.data).toHaveProperty('age_group');
      expect(response.body.data).toHaveProperty('country_id');
    });

    it('should return existing profile when same name is submitted again', async () => {
      // First creation
      await request(app)
        .post('/api/profiles')
        .send({ name: 'john' });

      // Second attempt
      const response = await request(app)
        .post('/api/profiles')
        .send({ name: 'john' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Profile already exists');
    });

    it('should return 400 for empty name', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Missing or empty name');
    });

    it('should return 400 for missing name', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Missing or empty name');
    });
  });

  describe('GET /api/profiles/:id', () => {
    it('should return profile by id', async () => {
      // Create a profile first
      const createResponse = await request(app)
        .post('/api/profiles')
        .send({ name: 'sarah' });
      
      const profileId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/profiles/${profileId}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe(profileId);
    });

    it('should return 404 for non-existent id', async () => {
      const response = await request(app)
        .get('/api/profiles/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Profile not found');
    });
  });

  describe('GET /api/profiles', () => {
    beforeEach(async () => {
      // Create multiple profiles for testing
      await request(app).post('/api/profiles').send({ name: 'alice' });
      await request(app).post('/api/profiles').send({ name: 'bob' });
      await request(app).post('/api/profiles').send({ name: 'charlie' });
    });

    it('should return all profiles', async () => {
      const response = await request(app)
        .get('/api/profiles');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.count).toBeGreaterThan(0);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by gender', async () => {
      const response = await request(app)
        .get('/api/profiles?gender=male');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle case-insensitive filtering', async () => {
      const response = await request(app)
        .get('/api/profiles?gender=MALE');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });

  describe('DELETE /api/profiles/:id', () => {
    it('should delete existing profile', async () => {
      // Create a profile
      const createResponse = await request(app)
        .post('/api/profiles')
        .send({ name: 'todelete' });
      
      const profileId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/profiles/${profileId}`);

      expect(response.status).toBe(204);
    });

    it('should return 404 when deleting non-existent profile', async () => {
      const response = await request(app)
        .delete('/api/profiles/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Profile not found');
    });
  });
});