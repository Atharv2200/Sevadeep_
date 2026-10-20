/**
 * AI Service using Groq API (Free Tier Available)
 *
 * This service provides AI capabilities using Groq's fast inference API.
 * Groq offers free tier with generous limits and very fast response times.
 *
 * Setup:
 * 1. Sign up at https://groq.com/
 * 2. Get your API key from https://console.groq.com/keys
 * 3. Add GROQ_API_KEY to backend/.env
 * 4. Optionally set GROQ_MODEL (default: llama3-70b-8192)
 *
 * Available models (as of 2024):
 * - llama3-70b-8192 (recommended, free tier)
 * - llama3-8b-8192 (faster, smaller)
 * - mixtral-8x7b-32768
 * - gemma-7b-it
 */

const fetch = require('node-fetch');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama3-70b-8192';

if (!GROQ_API_KEY) {
  console.warn('WARNING: GROQ_API_KEY not set in environment variables. AI features will not work.');
}

/**
 * Generate an activity description using AI
 * @param {Object} activityData - Activity details (category, location, time, etc.)
 * @returns {Promise<string>} - Generated description
 */
async function generateActivityDescription(activityData) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured. Please add it to your .env file.');
  }

  const prompt = `Generate a compelling 200-300 word description for a volunteer activity.

Activity details:
- Category: ${activityData.category}
- Location: ${activityData.locationName}
- Date: ${new Date(activityData.startsAt).toLocaleDateString()}
- Time: ${new Date(activityData.startsAt).toLocaleTimeString()} to ${new Date(activityData.endsAt).toLocaleTimeString()}

The description should:
- Be inspiring and motivating
- Explain the impact volunteers will make
- Be suitable for a NGO website
- Be written in a professional yet warm tone

Return only the description, no other text.`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Groq API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('Error generating activity description:', error);
    throw new Error('Failed to generate description. Please check your GROQ_API_KEY.');
  }
}

/**
 * Generate a donor impact report using AI
 * @param {Object} impactData - Donation and completion data
 * @returns {Promise<string>} - Generated impact report
 */
async function generateDonorImpactReport(impactData) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured. Please add it to your .env file.');
  }

  const { donation, activities, completions, totalHours, totalCompletions } = impactData;

  const prompt = `Generate a personalized impact report for a donor.

Donation information:
- Amount: $${donation.amount}
- Status: ${donation.status}

Impact achieved:
- ${totalCompletions} volunteer completions
- ${totalHours.toFixed(1)} total volunteer hours
- ${activities.length} activities supported

Sample completion details:
${completions.slice(0, 3).map((c) => `- ${c.volunteer.name} completed ${c.activity.title} (${c.creditHours} hours)`).join('\n')}

The report should:
- Be warm and appreciative
- Highlight the tangible impact of their donation
- Show how their money helped people
- Be 150-250 words
- Be written in a professional yet personal tone

Return only the report, no other text.`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Groq API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('Error generating donor impact report:', error);
    throw new Error('Failed to generate impact report. Please check your GROQ_API_KEY.');
  }
}

/**
 * Generate a social media caption for volunteer photos
 * @param {Object} photoData - Activity and volunteer details
 * @returns {Promise<string>} - Generated caption
 */
async function generateSocialMediaCaption(photoData) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured. Please add it to your .env file.');
  }

  const prompt = `Generate a social media caption for a volunteer activity photo.

Activity details:
- Activity: ${photoData.activityTitle}
- Category: ${photoData.category}
- Volunteer's description: ${photoData.description}

The caption should:
- Be engaging and shareable
- Include relevant hashtags
- Be 100-150 characters
- Highlight the positive impact

Return only the caption with hashtags, no other text.`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Groq API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('Error generating social media caption:', error);
    throw new Error('Failed to generate caption. Please check your GROQ_API_KEY.');
  }
}

/**
 * Check if Groq API is available
 * @returns {Promise<boolean>}
 */
async function checkGroqAvailability() {
  if (!GROQ_API_KEY) return false;

  try {
    const response = await fetch(`${GROQ_API_URL.replace('chat/completions', 'models')}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

module.exports = {
  generateActivityDescription,
  generateDonorImpactReport,
  generateSocialMediaCaption,
  checkGroqAvailability,
};
