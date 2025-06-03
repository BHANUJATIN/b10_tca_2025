const axios = require('axios');
const APOLLO_API_KEY = process.env.APOLLO_API_KEY;

async function fetchPeopleFromApollo({ company_domain, job_title }) {
  const response = await axios.post(
    'https://api.apollo.io/api/v1/mixed_people/search',
    {
      q_organization_domains_list: [company_domain],
      person_titles: [job_title],
      per_page: 100
    },
    {
      headers: {
        'x-api-key': APOLLO_API_KEY,
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        'accept': 'application/json'
      }
    }
  );
  console.log({
    company_domain,
    job_title
  });

  console.log(response.data)
  return response.data.people || [];
}

module.exports = fetchPeopleFromApollo;
