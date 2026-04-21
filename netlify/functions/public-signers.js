/**
 * Netlify Function: /.netlify/functions/public-signers
 *
 * Returns petition signers who opted in to have their name shown publicly
 * (checked the "public" checkbox). Paginates through the Netlify Forms API
 * 100 submissions at a time until all are fetched, then filters and sorts
 * by newest first.
 *
 * Env vars (same pattern as count.js):
 *   NETLIFY_API_TOKEN  — personal access token from app.netlify.com/user/applications
 *   NETLIFY_FORM_ID    — the petition form id from Site → Forms
 *   SITE_ID            — auto-injected by Netlify at function runtime
 *
 * Response shape on success:
 *   { count: <number>, signers: [{ name, createdAt }, ...], updatedAt }
 * Response shape on error (still 200 so the page doesn't throw):
 *   { count: null, signers: [], error: "unavailable" }
 */

exports.handler = async function () {
  const token = process.env.NETLIFY_API_TOKEN;
  const formId = process.env.NETLIFY_FORM_ID;
  const siteId = process.env.SITE_ID;

  const ok200 = (bodyObj, cacheSeconds) => ({
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=' + (cacheSeconds || 60) + ', s-maxage=' + (cacheSeconds || 60),
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(bodyObj)
  });

  if (!token || !formId) {
    console.log('public-signers: missing env vars', {
      haveToken: Boolean(token),
      haveFormId: Boolean(formId),
      haveSiteId: Boolean(siteId)
    });
    return ok200({ count: null, signers: [], error: 'unavailable' }, 30);
  }

  // Prefer the site-scoped endpoint when SITE_ID is present (more reliable);
  // fall back to the unscoped form endpoint if not.
  const buildUrl = (page) => siteId
    ? `https://api.netlify.com/api/v1/sites/${siteId}/forms/${formId}/submissions?per_page=100&page=${page}&state=verified`
    : `https://api.netlify.com/api/v1/forms/${formId}/submissions?per_page=100&page=${page}&state=verified`;

  const PER_PAGE = 100;
  const MAX_PAGES = 50; // hard cap ~5000 submissions
  const all = [];

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = buildUrl(page);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log(`public-signers: GET page ${page} → ${res.status}`);

      if (!res.ok) {
        return ok200({ count: null, signers: [], error: 'unavailable' }, 30);
      }

      const batch = await res.json();
      if (!Array.isArray(batch) || batch.length === 0) break;
      all.push(...batch);
      if (batch.length < PER_PAGE) break;
    }

    const publicSigners = all
      .filter((s) => {
        // Netlify surfaces submitted fields on both the top-level submission
        // object and inside `data`. Check both for robustness.
        const flag = (s && s.data && s.data.public) || (s && s.public);
        return flag === 'on' || flag === true || flag === 'true';
      })
      .map((s) => ({
        name: (s.data && s.data.name) || s.name || 'Anonymous',
        createdAt: s.created_at || s.createdAt || null
      }))
      .filter((s) => s.createdAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log(`public-signers: resolved ${publicSigners.length} public of ${all.length} total`);

    return ok200({
      count: publicSigners.length,
      signers: publicSigners,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.log('public-signers: fetch threw', err && err.message);
    return ok200({ count: null, signers: [], error: 'unavailable' }, 30);
  }
};
