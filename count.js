/**
 * Netlify Function: /.netlify/functions/count
 *
 * Returns the current verified signature count for the "petition" form
 * by calling the Netlify Forms API.
 *
 * Required environment variables (set in Netlify dashboard → Site → Environment):
 *   NETLIFY_API_TOKEN  — Personal access token from app.netlify.com/user/applications
 *   NETLIFY_FORM_ID    — The form ID shown on Site → Forms after first submission
 *
 * Response shape:
 *   { "count": <number>, "updatedAt": <ISO timestamp> }
 *
 * Caching:
 *   We set Cache-Control to 30s so the count endpoint isn't hammered but stays
 *   close enough to real-time that a page refresh shows new signatures quickly.
 */

exports.handler = async function () {
  const token = process.env.NETLIFY_API_TOKEN;
  const formId = process.env.NETLIFY_FORM_ID;

  const respond = (statusCode, bodyObj) => ({
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=30, s-maxage=30',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(bodyObj)
  });

  // If env vars aren't set yet, return 0 so the site still works.
  if (!token || !formId) {
    return respond(200, {
      count: 0,
      updatedAt: new Date().toISOString(),
      note: 'NETLIFY_API_TOKEN and/or NETLIFY_FORM_ID not configured; returning 0.'
    });
  }

  try {
    // Netlify's Forms API paginates at up to 100 submissions per page.
    // Only count verified (non-spam) submissions. We walk pages until empty.
    const PER_PAGE = 100;
    let page = 1;
    let total = 0;

    while (true) {
      const url = `https://api.netlify.com/api/v1/forms/${formId}/submissions?per_page=${PER_PAGE}&page=${page}&state=verified`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const text = await res.text();
        return respond(502, { error: 'Netlify API error', status: res.status, body: text });
      }

      const submissions = await res.json();
      if (!Array.isArray(submissions) || submissions.length === 0) break;

      total += submissions.length;

      // Stop paging if we got fewer than a full page.
      if (submissions.length < PER_PAGE) break;
      page += 1;

      // Safety cap: avoid runaway pagination if something weird happens.
      if (page > 200) break;
    }

    return respond(200, {
      count: total,
      updatedAt: new Date().toISOString()
    });

  } catch (err) {
    return respond(500, {
      error: 'Unhandled error',
      message: err && err.message ? err.message : String(err)
    });
  }
};
