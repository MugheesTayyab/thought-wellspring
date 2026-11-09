import { createFileRoute, Link } from "@tanstack/react-router";
import { ContentPage, ContentSection } from "@/client/components/bajihears/ContentPage";
import { SITE_URL } from "@/shared/constants/site";

const DESCRIPTION =
  "If you are struggling, BajiHears can't replace real support. Find free, confidential helplines and what to do in an emergency.";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Get Help | BajiHears" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Get Help | BajiHears" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/help` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/help` }],
  }),
  component: HelpPage,
});

function External({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-primary underline"
    >
      {children}
    </a>
  );
}

function HelpPage() {
  return (
    <ContentPage
      title="If you're struggling"
      intro={
        <p>
          BajiHears is a place to write things down. It is not a crisis service, and nobody here is
          watching the Wall in real time. If what you are carrying feels too heavy, please talk to
          someone who can actually respond.
        </p>
      }
    >
      <ContentSection title="If you are in immediate danger">
        <p>
          Call your local emergency number now, or go to your nearest emergency department. If you
          are worried about someone else who is in danger, do the same on their behalf.
        </p>
      </ContentSection>
      <ContentSection title="Free, confidential helplines">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Anywhere in the world:</strong>{" "}
            <External href="https://findahelpline.com/">Find A Helpline</External> lists free phone,
            text and chat services by country and topic, including Pakistan and India.
          </li>
          <li>
            <strong>United States:</strong> call or text 988, the{" "}
            <External href="https://988lifeline.org/">988 Suicide &amp; Crisis Lifeline</External>,
            available 24 hours a day.
          </li>
          <li>
            <strong>United Kingdom and Ireland:</strong> call{" "}
            <External href="https://www.samaritans.org/how-we-can-help/contact-samaritan/">
              Samaritans
            </External>{" "}
            free on 116 123, day or night.
          </li>
        </ul>
      </ContentSection>
      <ContentSection title="If a post worries you">
        <p>
          If something on the Wall makes you think someone may be at risk, use Report in the
          post&apos;s menu so it reaches moderation. Posts are anonymous, so we usually can&apos;t
          identify or contact the person who wrote them. A kind reply can still matter, but it is
          never a replacement for professional help.
        </p>
      </ContentSection>
      <ContentSection title="What we do with these posts">
        <p>
          Our <Link to="/guidelines" className="text-primary underline">community guidelines</Link>{" "}
          allow people to write honestly about hard feelings. They don&apos;t allow anything that
          encourages, glorifies or gives instructions for self-harm or suicide, and we remove that
          when we find it.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
