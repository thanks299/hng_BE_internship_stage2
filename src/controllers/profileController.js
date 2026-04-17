import { v7 as uuidv7 } from 'uuid';
import Profile from '../models/profile.js';
import { fetchGenderData, fetchAgeData, fetchNationalityData, determineAgeGroup } from '../services/externalApiService.js';
import { validateName } from '../utils/validators.js';

export async function createProfile(req, res) {
  try {
    const { name } = req.body;
    
    // Validate name
    const validation = validateName(name);
    if (!validation.valid) {
      return res.status(400).json({
        status: 'error',
        message: validation.message
      });
    }
    
    const trimmedName = validation.name;

    // Check if profile already exists
    const existingProfile = await Profile.findByName(trimmedName);
    if (existingProfile) {
      return res.status(200).json({
        status: 'success',
        message: 'Profile already exists',
        data: existingProfile
      });
    }

    // Fetch data from external APIs
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
    const createdAt = new Date().toISOString();
    const profileId = uuidv7();

    const profileData = {
      id: profileId,
      name: trimmedName.toLowerCase(),
      gender: genderData.gender,
      gender_probability: genderData.probability,
      sample_size: genderData.count,
      age: ageData.age,
      age_group: ageGroup,
      country_id: nationalityData.country_id,
      country_probability: nationalityData.probability,
      created_at: createdAt
    };

    const newProfile = await Profile.create(profileData);

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
}


export async function getProfile(req, res) {
  try {
    const { id } = req.params;
    const profile = await Profile.findById(id);

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
}

export async function getAllProfiles(req, res) {
  try {
    const { gender, country_id, age_group } = req.query;
    const filters = {};

    if (gender) filters.gender = gender;
    if (country_id) filters.country_id = country_id;
    if (age_group) filters.age_group = age_group;

    const profiles = await Profile.findAll(filters);

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
}

export async function deleteProfile(req, res) {
  try {
    const { id } = req.params;
    const deleted = await Profile.delete(id);

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
}