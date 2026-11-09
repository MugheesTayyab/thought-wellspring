import { createFileRoute, Link } from "@tanstack/react-router";
import { ContentPage, ContentSection } from "@/client/components/bajihears/ContentPage";
import { SITE_URL, SUPPORT_EMAIL } from "@/shared/constants/site";

const DESCRIPTION =
  "What belongs on BajiHears, what doesn't, and how posts are reviewed and removed. Anonymity is not a licence to hurt people.";

export const Route = createFileRoute("/guidelines")({
  head: () => ({
    meta: [
      { title: "Community Guidelines | BajiHears" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Community Guidelines | BajiHears" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/guidelines` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/guidelines` }],
  }),
  component: GuidelinesPage,
});

function GuidelinesPage() {
  return (
    <ContentPage
      title="Community Guidelines"
      intro={
        <p>
          BajiHears works because people can be honest here without being attacked for it.
          Anonymity protects the person writing. It is not a licence to hurt anyone else. These
          rules apply to every thought and reply, and sit alongside our{" "}
          <Link to="/terms" className="text-primary underline">Terms of Service</Link>.
        </p>
      }
    >
      <ContentSection title="What belongs here">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Things you never got to say, and things you are still working out.</li>
          <li>Honest feelings, including sad, angry or uncomfortable ones.</li>
          <li>Funny stories from your own life, with details changed so nobody is identifiable.</li>
          <li>Kind replies that respond to the thought rather than judge the person.</li>
        </ul>
      </ContentSection>
      <ContentSection title="What we remove">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Identifying people:</strong> names, addresses, phone numbers, workplaces, social
            handles, or anything else that points to a real person.
          </li>
          <li>
            <strong>Harassment and threats:</strong> singling someone out for abuse, intimidation or
            threats of harm.
          </li>
          <li>
            <strong>Hate:</strong> attacking or demeaning people because of race, ethnicity,
            religion, disability, age, nationality, gender, gender identity or sexual orientation.
          </li>
          <li>
            <strong>Self-harm and violence:</strong> encouraging, glorifying or giving instructions
            for self-harm, suicide, eating disorders or violence. You can say you are struggling.
            Please also see our <Link to="/help" className="text-primary underline">help page</Link>.
          </li>
          <li>
            <strong>Sexual content:</strong> anything sexually explicit, and any sexual content at
            all involving minors.
          </li>
          <li>
            <strong>Illegal activity and blackmail:</strong> promoting crime, or using a post to
            extort or expose someone.
          </li>
          <li>
            <strong>Spam and false claims:</strong> advertising, links, scams, and harmful medical
            misinformation.
          </li>
        </ul>
      </ContentSection>
      <ContentSection title="How moderation works">
        <p>
          Every thought and reply passes through automated filters before it appears. Clear
          violations are blocked, and a thought the filters are unsure about is held back from
          public view until a moderator has reviewed it. Readers can report any post from its menu,
          and reports go to a moderator for review.
        </p>
        <p>
          Filters make mistakes and a small team can&apos;t read everything the moment it is posted,
          so reports really do help. If you think we got a decision wrong, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
            {SUPPORT_EMAIL}
          </a>{" "}
          and we will take another look.
        </p>
      </ContentSection>
      <ContentSection title="Fiction on the Wall">
        <p>
          Some posts are written by BajiHears and marked &ldquo;BajiHears Original · Fictional&rdquo;.
          They are made-up scenarios, not real confessions. Everything without that label was
          submitted through the Wall, and we can&apos;t verify whether any reader&apos;s story is
          true.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
