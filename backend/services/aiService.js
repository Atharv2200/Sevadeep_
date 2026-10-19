/**
 * AI Service using Ollama (Free Local LLM)
 *
 * This service provides AI capabilities using Ollama, which runs LLMs locally
 * on your machine. No API keys needed, no costs, and data stays private.
 *
 * Setup:
 * 1. Install Ollama: https://ollama.com/download
 * 2. Pull a model: ollama pull llama3
 * 3. Start Ollama server (it runs automatically after installation)
 * 4. Set OLLAMA_BASE_URL in .env (default: http://localhost:11434)
 */

const fetch = require('node-fetch');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3';

/**
 * Generate an activity description using AI
 * @param {Object} activityData - Activity details (category, location, time, etc.)
 * @returns {Promise<string>} - Generated description
 */
async function generateActivityDescription(activityData) {
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
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response?.trim() || '';
  } catch (error) {
    console.error('Error generating activity description:', error);
    throw new Error('Failed to generate description. Make sure Ollama is running.');
  }
}

/**
 * Generate a donor impact report using AI
 * @param {Object} impactData - Donation and completion data
 * @returns {Promise<string>} - Generated impact report
 */
async function generateDonorImpactReport(impactData) {
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
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response?.trim() || '';
  } catch (error) {
    console.error('Error generating donor impact report:', error);
    throw new Error('Failed to generate impact report. Make sure Ollama is running.');
  }
}

/**
 * Generate a social media caption for volunteer photos
 * @param {Object} photoData - Activity and volunteer details
 * @returns {Promise<string>} - Generated caption
 */
async function generateSocialMediaCaption(photoData) {
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
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response?.trim() || '';
  } catch (error) {
    console.error('Error generating social media caption:', error);
    throw new Error('Failed to generate caption. Make sure Ollama is running.');
  }
}

/**
 * Check if Ollama is available
 * @returns {Promise<boolean>}
 */
async function checkOllamaAvailability() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
  checkOllamaAvailability,
};
