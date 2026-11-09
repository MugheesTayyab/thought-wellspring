# BajiHears soft launch

Goal: about 100 real, reviewed posts from real people over 2-4 weeks. These have to come from your
own accounts, so nothing here has been posted for you.

## Before you share the link

- [ ] Add the Turnstile keys, so bots can't flood the Wall once the link is public.
- [ ] Confirm moderation alerts reach your phone. Post a test thought containing a flagged word,
      check the alert arrives, then reject the post.
- [ ] Check that `/admin/moderation` opens on your phone. Plan to check it at least once a day.
- [ ] Publish at least "Why I built BajiHears", so people know who's behind the site.

## Rules that protect your AdSense application

- Every post must be written by the person who wants to say it. Don't write posts for friends, post
  under a fake identity, or pay for posts.
- Don't use paid-to-click, traffic exchange or bot traffic. Google prohibits them.
- Say you built it. Check each community's self-promotion rules first, and skip any that ban it.
- Start small. A few hundred visitors is plenty, and you can still moderate that alone.

## Who to ask, in order

1. **Week 1: 10-20 people you trust.** Ask for honest feedback as well as a post.
2. **Week 2: your wider circle.** Your Instagram story, WhatsApp status, and university or alumni groups.
3. **Weeks 3-4: communities that allow it.** Reddit and Facebook groups where a founder sharing a
   project is welcome. Only post where the rules allow it.

## Messages you can edit and send

These are drafts, so put them in your own words.

**Friends (WhatsApp)**

> I've been building something and I'd love your honest opinion. BajiHears is a small anonymous
> wall for things you never got to say. No sign-up, and nobody will know it's you. Could you read
> a bit and tell me what feels off? And if something's on your mind, write one line. Only if you
> want to. https://bajihears.app

**Instagram or WhatsApp status**

> Is there something you never got to say to someone? I built a small place to say it anonymously,
> with no sign-up. It's early, so the wall is still quiet. https://bajihears.app

**Reddit or a community group (only where self-promotion is allowed)**

> I built a small anonymous wall where people can write something they never got to say, in 280
> characters. There's no sign-up, follower counts or ads. Right now it's mostly fiction I wrote
> myself, clearly labelled, and only a couple of real posts, so I'm honest that it's quiet. I'd
> like feedback on whether it feels safe and whether you'd use it. https://bajihears.app

The "no ads" line is true today. Remove it once ads are switched on.

## What to watch each day

- New posts in the moderation queue, and any reports.
- Anything naming a real person, which should come down quickly.
- Anything suggesting someone may be at risk. Read the [help page](https://bajihears.app/help) so
  you know what the site tells them.
- Whether people come back and post without being asked. That's the signal that matters most.

## Instagram reels (Baji Slays)

Point reels and your bio at `https://bajihears.app/baji`. To open on one sentence, add a prompt:
`/baji?p=ammi`, `abbu`, `friend`, `ex`, `sorry` or `younger`. Edit them in
`src/shared/constants/reel-prompts.ts`.

- **Which posts you can read out:** only those under **Reel-ready** in `/admin/moderation`. Their
  writers ticked the box, and nobody has reported them. Older posts and the daily winner are not
  covered unless they appear there.
- **Making a card:** press **Make reel card** there. Anyone can make one from a post's menu with
  **Share as image**, so anything from the Wall that isn't on your list still needs its writer's OK.
- **Fiction:** you can use the labelled BajiHears Originals, but say on camera that they're fiction.
- **If someone asks you to stop:** press **Remove from list** and delete any reel that used the post.
  The Terms promise this.

## When you've reached the goal

Each theme page joins Google automatically once it has 10 published posts. When you have the guides
and the posts, go through step 3 onward in `ADSENSE_CONTENT_PLAN.md`.
