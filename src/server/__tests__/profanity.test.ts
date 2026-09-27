import { describe, it, expect } from "vitest";
import { detectProfanity } from "../../shared/lib/profanity";

describe("Profanity & Bad Words Guard Verification", () => {
  it("blocks English F-words in various forms", () => {
    expect(detectProfanity("What the fuck is going on").hasProfanity).toBe(true);
    expect(detectProfanity("This is so fucking stupid").hasProfanity).toBe(true);
    expect(detectProfanity("Go f*ck yourself").hasProfanity).toBe(true);
    expect(detectProfanity("f u c k this").hasProfanity).toBe(true);
    expect(detectProfanity("stfu right now").hasProfanity).toBe(true);
  });

  it("blocks English S-words", () => {
    expect(detectProfanity("This is complete shit").hasProfanity).toBe(true);
    expect(detectProfanity("Stop talking bullshit").hasProfanity).toBe(true);
    expect(detectProfanity("holy sh*t").hasProfanity).toBe(true);
    expect(detectProfanity("s h i t happens").hasProfanity).toBe(true);
  });

  it("blocks B-words, A-words, and slurs", () => {
    expect(detectProfanity("She is such a bitch").hasProfanity).toBe(true);
    expect(detectProfanity("He is a complete asshole").hasProfanity).toBe(true);
    expect(detectProfanity("You dumbass").hasProfanity).toBe(true);
    expect(detectProfanity("What a bastard").hasProfanity).toBe(true);
  });

  it("blocks Roman Urdu vulgarities", () => {
    expect(detectProfanity("Yeh kya bhenchod harkat hai").hasProfanity).toBe(true);
    expect(detectProfanity("Woh ek number ka chutiya hai").hasProfanity).toBe(true);
    expect(detectProfanity("Kutte ke bache madarchod").hasProfanity).toBe(true);
    expect(detectProfanity("Tu gandu hai").hasProfanity).toBe(true);
    expect(detectProfanity("Bada harami nikla").hasProfanity).toBe(true);
  });

  it("does NOT false-positive on legitimate clean words", () => {
    expect(detectProfanity("I had a great class today").hasProfanity).toBe(false);
    expect(detectProfanity("He passed his driving exam").hasProfanity).toBe(false);
    expect(detectProfanity("Looking for an assistant").hasProfanity).toBe(false);
    expect(detectProfanity("We should show more compassion").hasProfanity).toBe(false);
    expect(detectProfanity("Sitting on the grass watching clouds").hasProfanity).toBe(false);
    expect(detectProfanity("My shift starts at 9am").hasProfanity).toBe(false);
    expect(detectProfanity("The glass shattered on the floor").hasProfanity).toBe(false);
    expect(detectProfanity("She wore a shiny shirt").hasProfanity).toBe(false);
  });
});
