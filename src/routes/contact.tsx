import { createFileRoute, Link } from "@tanstack/react-router";
import { ContentPage, ContentSection } from "@/client/components/bajihears/ContentPage";
import { OPERATOR_NAME, PRIVACY_EMAIL, SITE_URL, SUPPORT_EMAIL } from "@/shared/constants/site";

const DESCRIPTION =
  "How to reach the people behind BajiHears: general questions, reporting a post, privacy requests and takedown requests.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact | BajiHears" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Contact | BajiHears" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/contact` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/contact` }],
  }),
  component: ContactPage,
});

function Email({ address }: { address: string }) {
  return (
    <a href={`mailto:${address}`} className="font-semibold text-primary underline">
      {address}
    </a>
  );
}

function ContactPage() {
  return (
    <ContentPage
      title="Contact BajiHears"
      intro={
        <p>
          {OPERATOR_NAME
            ? `BajiHears is run by ${OPERATOR_NAME}. `
            : "BajiHears is an independently run project. "}
          Email is the best way to reach us.
        </p>
      }
    >
      <ContentSection title="General questions and feedback">
        <p>
          For questions about how BajiHears works, bug reports or suggestions, write to{" "}
          <Email address={SUPPORT_EMAIL} />.
        </p>
      </ContentSection>
      <ContentSection title="Reporting a post">
        <p>
          The fastest way is the Report option in a post&apos;s menu, which sends it straight to
          moderation. If a post names you or someone you know, or you can&apos;t use the menu, email{" "}
          <Email address={SUPPORT_EMAIL} /> with the post&apos;s text or link and what is wrong with
          it. Our <Link to="/guidelines" className="text-primary underline">community guidelines</Link>{" "}
          explain what we remove.
        </p>
      </ContentSection>
      <ContentSection title="Privacy and data requests">
        <p>
          To ask about the data we hold or to request deletion, write to{" "}
          <Email address={PRIVACY_EMAIL} />. Our{" "}
          <Link to="/privacy" className="text-primary underline">Privacy Policy</Link> explains what
          is stored and for how long.
        </p>
      </ContentSection>
      <ContentSection title="If you need support right now">
        <p>
          We can&apos;t provide crisis support by email. If you or someone else is in danger or
          struggling, please see our <Link to="/help" className="text-primary underline">help page</Link>{" "}
          for services that can respond straight away.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
