import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Dices } from "lucide-react";
import { CornerAvatar } from "@/components/bajihears/CornerAvatar";
import {
  randomSeed,
  readAvatarSeed,
  readHandle,
  stripHandle,
  writeAvatarSeed,
  writeHandle,
} from "@/lib/bajihears";

export const Route = createFileRoute("/corner")({
  head: () => ({
    meta: [
      { title: "Adjust your Corner — BajiHears" },
      {
        name: "description",
        content:
          "Your Public Corner on BajiHears: pick your avatar, set your handle, choose what reaches your inbox.",
      },
      { property: "og:title", content: "Adjust your Corner — BajiHears" },
      {
        property: "og:description",
        content: "Pick your avatar, set your handle, choose what reaches your inbox.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CornerPage,
});

function CornerPage() {
  const [seed, setSeed] = useState("baji");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [notify, setNotify] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSeed(readAvatarSeed() ?? "baji");
    setHandle(readHandle() ?? "");
  }, []);

  const reroll = () => {
    const next = randomSeed();
    setSeed(next);
    writeAvatarSeed(next);
  };

  const save = () => {
    const clean = stripHandle(handle);
    setHandle(clean);
    writeHandle(clean || null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-16 pt-6">
      <Link
        to="/"
        className="text-muted-foreground inline-flex items-center gap-2 text-sm font-semibold"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to The Wall
      </Link>

      <h1 className="font-display mt-5 text-2xl">Adjust your Corner</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        This is yours. Nobody sees more than you let them.
      </p>

      <section className="border-border bg-card mt-6 flex items-center gap-4 rounded-2xl border p-4">
        <CornerAvatar seed={seed} size={64} />
        <div>
          <p className="text-sm font-semibold">Your face here isn&apos;t your face</p>
          <button
            type="button"
            onClick={reroll}
            className="text-primary mt-1 inline-flex items-center gap-2 text-sm font-semibold"
          >
            <Dices className="size-4" aria-hidden />
            Roll a new one
          </button>
        </div>
      </section>

      <section className="border-border bg-card mt-4 space-y-4 rounded-2xl border p-4">
        <label className="block">
          <span className="text-sm font-semibold">Your handle</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="yourname"
            className="border-border bg-secondary/40 mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none"
          />
          <span className="text-muted-foreground mt-1 block text-xs">
            Only shown when you choose to post as yourself.
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="so we can tell you if you win"
            className="border-border bg-secondary/40 mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none"
          />
        </label>

        <button
          type="button"
          onClick={() => setNotify((v) => !v)}
          className="border-border bg-secondary/40 flex w-full items-center justify-between rounded-xl border px-3 py-3 text-sm font-semibold"
        >
          Tell me when my Unsaid is picked
          <span
            className={`h-6 w-11 rounded-full p-1 transition-colors ${notify ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`bg-background block size-4 rounded-full transition-transform ${notify ? "translate-x-5" : ""}`}
            />
          </span>
        </button>

        <button
          type="button"
          onClick={save}
          className="bg-primary text-primary-foreground w-full rounded-xl px-4 py-3 text-sm font-bold"
        >
          {saved ? "Saved." : "Save my Corner"}
        </button>
      </section>

      <button
        type="button"
        className="text-muted-foreground mt-6 w-full text-sm underline"
        onClick={() => {
          writeHandle(null);
          setHandle("");
          setEmail("");
        }}
      >
        Delete my Corner
      </button>
    </main>
  );
}
