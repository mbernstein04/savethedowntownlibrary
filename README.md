# Save the Downtown Library

Source for **savethedowntownlibrary.org** — a civic accountability site documenting the Reinert administration's exploration of relocating the Duluth Public Library Main Branch.

## What's here

```
.
├── index.html              ← the whole site (one file — styles + markup + JS)
├── netlify.toml            ← Netlify build + function config
├── netlify/
│   └── functions/
│       └── count.js        ← serverless function: returns live signature count
└── README.md
```

## Deploy checklist

### 1. GitHub
- Create a new repo (public is fine — preferred for a civic site)
- Push these four files (`index.html`, `netlify.toml`, `netlify/functions/count.js`, this README)

### 2. Netlify — connect the repo
- app.netlify.com → **Add new site → Import an existing project → GitHub**
- Pick the repo
- Build settings: leave everything blank (no build step). Publish directory: `.`
- Deploy

Within 30 seconds the site is live at a `*.netlify.app` URL.

### 3. Netlify — confirm the form was detected
- Once Netlify has deployed the page for the first time, it parses `index.html` and registers the `petition` form automatically.
- Go to **Site configuration → Forms** — you should see `petition` listed.
- If it's not there: make sure `index.html` is at the repo root (not inside a subfolder), and that the form tag still has `data-netlify="true"` and `name="petition"`.

### 4. Submit one test signature
- Visit the live site and sign the petition yourself using a test email.
- Go back to **Site → Forms → petition** — you should see the submission appear, along with the **form ID** (visible in the URL of the form's detail page, or click the form and check "Form settings"). Copy that ID.

### 5. Create a Netlify personal access token
- app.netlify.com/user/applications#personal-access-tokens
- **New access token** → description: "savethedowntownlibrary count reader"
- Copy the token immediately (you only see it once).

### 6. Add environment variables
- **Site configuration → Environment variables → Add a variable**
  - `NETLIFY_API_TOKEN` = the token from step 5
  - `NETLIFY_FORM_ID` = the form ID from step 4
- **Trigger a redeploy** (Deploys tab → Trigger deploy → Deploy site). Env vars only take effect after redeploy.

### 7. Turn on form notifications
- **Site → Forms → Form notifications → Add notification → Email notification**
- Enter the address where you want every new signature emailed.
- Optionally add **Outgoing webhook** if you want them posted to Slack, Discord, or another service later.

### 8. Custom domain
- **Site configuration → Domain management → Add custom domain** → `savethedowntownlibrary.org`
- Netlify will show DNS records to add. At your registrar (Cloudflare Registrar if you're following the OPOV pattern):
  - Keep Cloudflare nameservers
  - Add the records Netlify shows you (CNAME for `www`, A/ALIAS for root)
- After DNS propagation, **HTTPS → Verify DNS** → **Provision certificate** (free, automatic)
- Set `savethedowntownlibrary.org` as primary; redirect `www` to it.

### 9. Test the live site
- Sign the petition from a clean browser
- Within a few seconds the counter should increment (optimistic UI)
- Within ~30 seconds, the count from `/.netlify/functions/count` should refresh and confirm the number
- Check the browser console — no errors should appear
- Check the Forms page in Netlify — your submission should be listed

## Counter behavior

- The site counts **verified** submissions only (Netlify's built-in spam filter handles the rest).
- The honeypot `bot-field` blocks most automated spam.
- If a submission gets marked as spam by Netlify's filter, it won't count. You can review and manually verify spam submissions from the Forms dashboard if needed.
- The counter refreshes every 60 seconds for users who keep the tab open.
- On submit, the counter increments locally immediately (optimistic UI), then re-syncs from the server a few seconds later.

## Updating the goal

In `index.html`, search for `const GOAL = 500` — update the number and redeploy. Bump it as you approach the current target so the progress bar stays motivating.

## Maintenance

- **Counter stuck at 0?** Environment variables probably weren't set, or the redeploy after setting them didn't happen. Redeploy manually.
- **Counter shows wrong number?** Check that NETLIFY_FORM_ID matches the correct form (there's only one form on this site, but if you add more later, the function will only count submissions to the form whose ID matches).
- **Submissions getting filtered as spam?** Review them in the Forms dashboard. If legitimate signatures are being caught, you can whitelist or manually verify them; if spam is getting through, the honeypot should catch most — consider adding hCaptcha via Netlify's form settings.

## Related

- [Our Park, Our Vote](https://ourparkourvote.org/) — sibling civic accountability project
