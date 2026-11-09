# AdSense: what is left for you to do

The code went live on 2026-11-09. These steps need you, because they are your writing,
your accounts, or your decision. Six starter drafts are in `drafts/guides/`, and the
outreach messages are in `SOFT_LAUNCH_PLAN.md`.

## Done: seed posts removed

On 2026-11-09, 159 pre-launch posts (150 from the old seed import, 9 early test posts) were
moved to status `rejected`, so the Wall now has 32 posts: 30 labelled fiction and 2 others.
The ids and the SQL to undo it are in `artifacts/seed-posts-unpublished-2026-11-09.json`.
That file is not in git, so keep a copy if you might want to restore them. Do not add
invented posts back. Until each theme has 10 posts, its page stays out of Google.

## 1. Write the guides (this decides approval)

Aim for 20-30 articles of 800-1,500 words. Copy `src/content/guides/_template.md`,
rename it, write, and delete the `draft: true` line to publish. The Guides link and
page appear automatically once the first article is live.

Write them yourself, under your real name, from your own experience. Do not mass-produce
them with AI: Google treats that as scaled content abuse, and it is the most common way
sites like this get rejected or closed later. Cite sources for anything about mental
health, and do not give medical advice.

Starting ideas. Keep the ones you have something real to say about:

- Why I built BajiHears
- What people write when nobody knows it's them
- How to write an unsent letter, and what to do with it afterwards
- Why saying something anonymously can feel easier than telling a friend
- The difference between venting and processing
- How to reply kindly to a stranger's hard thought
- Things people in desi families rarely say out loud
- The apology you never got: writing about it without sending it
- Journaling when you hate journaling
- Writing about grief for someone you can't talk to any more
- Homesickness after moving to a new city
- Saying no to a rishta, and what nobody tells you
- What 280 characters teaches you about what you really mean
- How to tell if a thought is safe to post: names, details, and privacy
- When writing isn't enough: how to ask for real help
- What the most-loved posts on the Wall have in common (use real numbers)
- What a month of moderating an anonymous wall taught me

The five theme introductions in `src/shared/constants/collections.ts` are drafts.
Rewrite them in your own voice.

## 2. Get real posts

Aim for 100 or more real, reviewed posts through a small soft launch. Each theme page
stays out of Google until it has 10 posts, then joins the sitemap automatically.

## 3. Accounts and settings

- **Publisher name:** set `OPERATOR_NAME` in `src/shared/constants/site.ts` to the name
  you want shown on About and Contact.
- **CAPTCHA:** create a Turnstile widget at dash.cloudflare.com for `bajihears.app`. Set
  `VITE_TURNSTILE_SITE_KEY` for the build and `TURNSTILE_SECRET_KEY` as a Worker secret.
  Set both together: the secret alone rejects every post.
- **www:** add a DNS record and a redirect for `www.bajihears.app` to `bajihears.app`.
- **Search Console:** resubmit `https://bajihears.app/sitemap.xml`, and use URL Inspection on
  `/` and a guide to confirm real text appears.

## 4. Apply

Add `bajihears.app` in AdSense. Choose the meta tag option to verify the site: the tag is
already on every page. Do not apply before steps 1 and 2 are done.

## 5. After approval, in this order

1. In AdSense, publish a Google-certified consent message for the EEA, UK and Switzerland
   (Privacy & messaging).
2. Create a display ad unit and put its id in `ADSENSE.guideSlot` in
   `src/shared/constants/site.ts`.
3. Set `ADSENSE.adsEnabled` to `true`. This opens the security policy to Google's ad hosts,
   shows ads on guide articles, and changes the Privacy Policy wording to say ads are live.
4. Deploy, open a guide, and check the browser console for security policy errors. The ad
   host list could not be tested without an approved account, so fix any blocked host here.

Leave Auto ads off. They would place ads on the Wall beside posts nobody has reviewed.
