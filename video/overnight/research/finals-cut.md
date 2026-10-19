# A 90-second cut for the finals (after the deadline)

**Why.** Finalists defend live at WeBank on 22 Nov, and a short film can open the defence or sit in the deck. Several sources say judges skim, and a 90 s version is the usual companion to a long one ([practice.md](practice.md) #10, [academic.md](academic.md) #9).

**How.** Build it entirely from scenes that already exist, so it can't drift from the approved film. Every scene below is an `edit.json` scene. Lengths are this branch's v4.1 preview timings; the owner's voice will shift them a little.

| Order | Scene | Keep | Seconds | Voice |
|---|---|---|---|---|
| 1 | hook | all | 12.0 | m1, m2 |
| 2 | stat | all | 9.0 | m3 |
| 3 | card | all | 7.5 | n1 |
| 4 | what | the contract-rules beat only, from n3 | 7.0 | n3 |
| 5 | use1 | "It pays small amounts on its own." | 8.0 | u1, first sentence only |
| 6 | xray | the settle and the held hash, from x7 | 9.0 | x7 |
| 7 | breakT | all | 3.0 | k1 |
| 8 | money | all | 13.5 | k3, k4, k5 |
| 9 | proof | f1 and f2 only | 12.0 | f1, f2 |
| 10 | close | all | 8.0 | z1 |
| | | | **89** | |

**What's left out, and why that's acceptable.**
- **The X-ray body.** The deck and the defence carry the mechanism.
- **Use it, the watcher, the stolen keys and the HKMA beat.** Judges ask about these in Q&A, so they're better spoken live.
- **The team slide.** The team is in the room.

**How to build it.** Add an `edit-90.json` holding these scenes, with per-scene `vo` subsets and `from` offsets, then add a second composition `Main90` that reads a `timeline-90.json`. `tools/layout.py` takes the edit path as an argument, so this needs no code change there. The score needs its own cues (`cues.py` on the new timeline) and its own `score.py` run, because the music follows the cue names.

**Effort.** About 2 to 3 h, including a storyboard round with the owner.
