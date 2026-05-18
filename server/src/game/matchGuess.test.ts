import { describe, it, expect } from "vitest";
import { matchGuess } from "./matchGuess";

describe("matchGuess", () => {
  describe("all-green", () => {
    it("returns all green when guess equals target", () => {
      expect(matchGuess("CRANE", "CRANE")).toEqual([
        "green",
        "green",
        "green",
        "green",
        "green",
      ]);
    });

    it("returns all green for lowercase guess matching lowercase target", () => {
      // case normalisation: both inputs lowercased should still match
      expect(matchGuess("crane", "crane")).toEqual([
        "green",
        "green",
        "green",
        "green",
        "green",
      ]);
    });

    it("returns all green for lowercase guess matching UPPERCASE target", () => {
      // case normalisation: both inputs lowercased should still match
      expect(matchGuess("crane", "CRANE")).toEqual([
        "green",
        "green",
        "green",
        "green",
        "green",
      ]);
    });

    it("returns all green when guess is lowercase and target is uppercase", () => {
      // case normalisation: mixed case inputs should still produce correct result
      expect(matchGuess("crane", "CRANE")).toEqual([
        "green",
        "green",
        "green",
        "green",
        "green",
      ]);
    });
  });

  describe("all-grey", () => {
    it("returns all grey when guess shares no letters with target", () => {
      expect(matchGuess("BRICK", "SONGS")).toEqual([
        "grey",
        "grey",
        "grey",
        "grey",
        "grey",
      ]);
    });

    it("returns all grey for another pair with no overlap", () => {
      // no shared characters at all
      expect(matchGuess("QZXWV", "CRANE")).toEqual([
        "grey",
        "grey",
        "grey",
        "grey",
        "grey",
      ]);
    });
  });

  describe("all-yellow", () => {
    it("returns all yellow when every letter is present but none in correct position", () => {
      // CRANE vs ECNAR — each letter present, all shifted
      expect(matchGuess("ECNAR", "CRANE")).toEqual([
        "yellow",
        "yellow",
        "yellow",
        "yellow",
        "yellow",
      ]);
    });
  });

  describe("mixed results", () => {
    it("returns correct mix for the worked example: CRANE vs GROVE", () => {
      // R at index 1 green, E at index 4 green; rest grey
      expect(matchGuess("GROVE", "CRANE")).toEqual([
        "grey",
        "green",
        "grey",
        "grey",
        "green",
      ]);
    });

    it("returns correct mix with green, yellow, and grey", () => {
      // SLATE vs CRANE: A green at index 2 (A=A), S/L not in CRANE → grey,
      // T not in CRANE → grey, E yellow (E in CRANE but at index 4 not index 4... wait)
      // SLATE: S L A T E vs CRANE: C R A N E
      // pos0: S vs C grey, pos1: L vs R grey, pos2: A vs A green,
      // pos3: T vs N grey, pos4: E vs E green
      expect(matchGuess("SLATE", "CRANE")).toEqual([
        "grey",
        "grey",
        "green",
        "grey",
        "green",
      ]);
    });

    it("returns yellow for a letter in target but at a different position", () => {
      // ABCDE vs XAXYZ: A is in target at index 2, guess has A at index 0 → yellow
      expect(matchGuess("ABCDE", "XAXYZ")).toEqual([
        "yellow",
        "grey",
        "grey",
        "grey",
        "grey",
      ]);
    });
  });

  describe("duplicate in guess, single in target", () => {
    it("colours only one guess letter when target has one occurrence: first match wins", () => {
      // SPEED vs DEPOT (D,E,P,O,T): no greens in pass1
      // Pass2: S→no S grey; P→P at target[2] yellow(consume2); E(pos2)→E at target[1] yellow(consume1);
      //   E(pos3)→no unconsumed E grey; D→D at target[0] yellow(consume0)
      expect(matchGuess("SPEED", "DEPOT")).toEqual([
        "grey",
        "yellow",
        "yellow",
        "grey",
        "yellow",
      ]);
    });

    it("second occurrence of a letter in guess is grey when target has only one", () => {
      // AABCD vs XAXYZ: target has one A at index 2
      // Pass1: A≠X, A≠A... wait pos1 A vs A: A(1) vs target A(pos2)? No: target is XAXYZ
      // pos0:A vs X grey, pos1:A vs A green(consume pos1), pos2:B vs X grey,
      // pos3:C vs Y grey, pos4:D vs Z grey
      // Pass2: pos0 A: scan unconsumed target [X,_,X,Y,Z]: pos2=X no, wait target=XAXYZ
      // target[0]=X, target[1]=A(consumed), target[2]=X, target[3]=Y, target[4]=Z
      // pos0 guess A: look for unconsumed A → none remaining → grey
      expect(matchGuess("AABCD", "XAXYZ")).toEqual([
        "grey",
        "green",
        "grey",
        "grey",
        "grey",
      ]);
    });

    it("excess duplicate letters in guess are grey when target letter is already consumed by green", () => {
      // LLAMA vs LLANO: L green at 0, L green at 1, A yellow at 2 (A in LLANO at pos3),
      // M grey (no M), A: pos4 A — target LLANO has A at pos3 (already consumed by yellow above)
      // LLAMA: L L A M A vs LLANO: L L A N O
      // Pass1: L=L green(0), L=L green(1), A=A green(2), M≠N grey, A≠O grey
      // Pass2: pos3 M: no M in target → grey; pos4 A: target consumed at 0,1,2 → scan 3(N),4(O) no A → grey
      expect(matchGuess("LLAMA", "LLANO")).toEqual([
        "green",
        "green",
        "green",
        "grey",
        "grey",
      ]);
    });
  });

  describe("duplicate in target, single in guess", () => {
    it("single letter in guess gets yellow when target has that letter at another position", () => {
      // CRANE vs ERROR: R in guess at pos1; target ERROR has R at pos1(green),pos2,pos3
      // Pass1: C≠E grey, R=R green(1), A≠R grey, N≠O grey, E≠R grey
      // Pass2: pos0 C: no C in ERROR → grey; pos2 A: no A → grey;
      //   pos3 N: no N → grey; pos4 E: target[0]=E unconsumed → yellow
      expect(matchGuess("CRANE", "ERROR")).toEqual([
        "grey",
        "green",
        "grey",
        "grey",
        "yellow",
      ]);
    });

    it("single guess letter matches first unconsumed occurrence in target", () => {
      // ABCDE vs AAXYZ: A at pos0 green(consume target[0]), A at pos1 consumed by green
      // Pass1: A=A green(0,consume0), B≠A grey, C≠X grey, D≠Y grey, E≠Z grey
      // Pass2: pos1 B: target[1]=A(unconsumed) no match, etc → grey
      // pos2 C,pos3 D,pos4 E: no matches
      expect(matchGuess("ABCDE", "AAXYZ")).toEqual([
        "green",
        "grey",
        "grey",
        "grey",
        "grey",
      ]);
    });
  });

  describe("duplicate in both guess and target", () => {
    it("identical words with repeated letters are all green", () => {
      expect(matchGuess("SPEED", "SPEED")).toEqual([
        "green",
        "green",
        "green",
        "green",
        "green",
      ]);
    });

    it("shared duplicate letters produce correct yellow/grey mix", () => {
      // AABBB vs BBAAA
      // Pass1: A≠B, A≠B, B≠A, B≠A, B≠A — no greens
      // Pass2: pos0 A: target[0]=B no, target[1]=B no, target[2]=A yes → yellow, consume 2
      //   pos1 A: target[3]=A → yellow, consume 3
      //   pos2 B: target[0]=B → yellow, consume 0
      //   pos3 B: target[1]=B → yellow, consume 1
      //   pos4 B: no unconsumed B → grey
      expect(matchGuess("AABBB", "BBAAA")).toEqual([
        "yellow",
        "yellow",
        "yellow",
        "yellow",
        "grey",
      ]);
    });
  });

  describe("green takes priority over yellow", () => {
    it("a letter that is green at one position does not also produce yellow", () => {
      // ABCDA vs XBCDA: A at pos4 is green; A at pos0 has no remaining unconsumed A in target
      // XBCDA: target has A only at pos4 (consumed by green)
      // Pass1: A≠X grey, B=B green(1), C=C green(2), D=D green(3), A=A green(4)
      // Pass2: pos0 A: all A in target consumed → grey
      expect(matchGuess("ABCDA", "XBCDA")).toEqual([
        "grey",
        "green",
        "green",
        "green",
        "green",
      ]);
    });

    it("green match at earlier index consumes the target letter before pass-2 scan", () => {
      // AAXYZ vs AABCD: A green at 0, A green at 1; no remaining A for pass2
      // Pass1: A=A green(0), A=A green(1), X≠B grey, Y≠C grey, Z≠D grey
      // Pass2: pos2 X: no X in target → grey; same for Y,Z
      expect(matchGuess("AAXYZ", "AABCD")).toEqual([
        "green",
        "green",
        "grey",
        "grey",
        "grey",
      ]);
    });
  });

  describe("boundary checks", () => {
    it("single matching letter at last position only", () => {
      // XXXXE vs ABCDE: only E at index 4 matches (green)
      expect(matchGuess("XXXXE", "ABCDE")).toEqual([
        "grey",
        "grey",
        "grey",
        "grey",
        "green",
      ]);
    });

    it("single matching letter at first position only", () => {
      // ABCDE vs AXYZW: A green at pos0, rest grey
      expect(matchGuess("ABCDE", "AXYZW")).toEqual([
        "green",
        "grey",
        "grey",
        "grey",
        "grey",
      ]);
    });

    it("all same letter in guess with one occurrence in target produces exactly one coloured tile", () => {
      // AAAAA vs XAXYZ (X,A,X,Y,Z): target A is at index 1
      // Pass1: pos1 A=A green(consume1); rest grey
      // Pass2: all remaining A in guess find no unconsumed A → grey
      expect(matchGuess("AAAAA", "XAXYZ")).toEqual([
        "grey",
        "green",
        "grey",
        "grey",
        "grey",
      ]);
    });

    it("all same letter in guess with multiple occurrences in target", () => {
      // AAAAA vs AAXAA: A green at 0,1(nope:target[1]=A but...
      // AAXAA: target[0]=A, target[1]=A, target[2]=X, target[3]=A, target[4]=A
      // Pass1: pos0 A=A green, pos1 A=A green, pos2 A≠X, pos3 A=A green, pos4 A=A green
      // Pass2: pos2 A: target[2]=X consumed?no but X≠A → grey
      expect(matchGuess("AAAAA", "AAXAA")).toEqual([
        "green",
        "green",
        "grey",
        "green",
        "green",
      ]);
    });
  });
});
