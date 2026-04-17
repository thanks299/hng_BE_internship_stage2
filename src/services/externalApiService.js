import axios from 'axios';

const API_BASE_URLS = {
  genderize: 'https://api.genderize.io',
  agify: 'https://api.agify.io',
  nationalize: 'https://api.nationalize.io'
};

export async function fetchGenderData(name) {
  try {
    const response = await axios.get(`${API_BASE_URLS.genderize}?name=${encodeURIComponent(name)}`);
    const data = response.data;
    
    if (!data.gender || data.count === 0) {
      throw new Error('Genderize returned an invalid response');
    }
    
    return {
      gender: data.gender,
      probability: data.probability,
      count: data.count
    };
  } catch (error) {
    if (error.message === 'Genderize returned an invalid response') {
      throw error;
    }
    throw new Error('Genderize returned an invalid response');
  }
}

export async function fetchAgeData(name) {
  try {
    const response = await axios.get(`${API_BASE_URLS.agify}?name=${encodeURIComponent(name)}`);
    const data = response.data;
    
    if (!data.age) {
      throw new Error('Agify returned an invalid response');
    }
    
    return {
      age: data.age
    };
  } catch (error) {
    if (error.message === 'Agify returned an invalid response') {
      throw error;
    }
    throw new Error('Agify returned an invalid response');
  }
}

export async function fetchNationalityData(name) {
  try {
    const response = await axios.get(`${API_BASE_URLS.nationalize}?name=${encodeURIComponent(name)}`);
    const data = response.data;
    
    if (!data.country || data.country.length === 0) {
      throw new Error('Nationalize returned an invalid response');
    }
    
    const topCountry = data.country.reduce((max, country) => 
      country.probability > max.probability ? country : max, data.country[0]);
    
    return {
      country_id: topCountry.country_id,
      probability: topCountry.probability
    };
  } catch (error) {
    if (error.message === 'Nationalize returned an invalid response') {
      throw error;
    }
    throw new Error('Nationalize returned an invalid response');
  }
}

export function determineAgeGroup(age) {
  if (age <= 12) return 'child';
  if (age <= 19) return 'teenager';
  if (age <= 59) return 'adult';
  return 'senior';
}