// utils/apollo.js
const axios = require('axios');
const APOLLO_API_KEY = process.env.APOLLO_API_KEY;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPeopleFromApollo({ company_domain, job_titles }) {
  const perPage = 100;
  const maxPages = 500;
  const maxPeople = 1000;
  let page = 1;
  let totalPages = 1;
  const allPeople = [];

  try {
    if (!Array.isArray(job_titles) || job_titles.length === 0) {
      throw new Error('job_titles must be a non-empty array');
    }

    while (page <= totalPages && page <= maxPages && allPeople.length < maxPeople) {
      try {
        const response = await axios.post(
          'https://api.apollo.io/api/v1/mixed_people/search',
          {
            q_organization_domains_list: [company_domain],
            person_titles: job_titles,
            per_page: perPage,
            page: page,
            organization_locations: ["USA", "United States"]
          },
          {
            headers: {
              'x-api-key': APOLLO_API_KEY,
              'Cache-Control': 'no-cache',
              'Content-Type': 'application/json',
              'accept': 'application/json'
            },
            timeout: 15000 // timeout for the request
          }
        );

        const data = response.data;

        if (page === 1) {
          totalPages = Math.min(data.pagination?.total_pages || 1, maxPages);
          console.log(`🔍 Found ${totalPages} pages for ${company_domain} - titles: ${job_titles.join(', ')}`);
        }

        const people = data.people || [];
        allPeople.push(...people);
        console.log(`📄 Fetched page ${page} with ${people.length} people`);

        if (allPeople.length >= maxPeople) {
          console.log(`⚠️ Reached ${maxPeople} people limit, stopping early`);
          break;
        }

        page++;
        await wait(500); // delay between requests to avoid rate limiting

      } catch (pageErr) {
        console.error(`⚠️ Failed to fetch page ${page}: ${pageErr.message}`);
        break; // Optional: continue to next page or break depending on your policy
      }
    }

    console.log(`✅ Done fetching ${allPeople.length} people in total`);
    return allPeople;

  } catch (err) {
    console.error('❌ Apollo API fetch error:', err.message);
    return [];
  }
}

module.exports = fetchPeopleFromApollo;
