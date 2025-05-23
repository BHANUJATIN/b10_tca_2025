const axios = require('axios');
const LEADMAGIC_API_KEY = process.env.LEADMAGIC_API_KEY;

async function fetchPeopleFromLeadmagic({ company_domain, job_title }) {
  const response = await axios.post(
    'https://api.leadmagic.io/role-finder',
    {
      company_domain,
      job_title
    },
    {
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'X-API-Key': `${LEADMAGIC_API_KEY}`
      }
    }
  );
  console.log({
      company_domain,
      job_title
    });
  
console.log(response.data)
  return [response.data] || [];
}

module.exports = fetchPeopleFromLeadmagic;
