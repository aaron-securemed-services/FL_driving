# Sunshine Driving School — Florida Driving Game

A browser game that teaches new drivers Florida's rules of the road and the hands-on skills
needed for the Florida road test. It runs in Chrome, Firefox and Safari with a keyboard or a
game controller. No install, no build step, no network access needed once the files are served.

> This is a study aid, not an official FLHSMV product. Always study the official
> *Florida Driver License Handbook* before your test.

## Two modes, 23 lessons

**Top View — Rules of the Road** (driving and road rules)

1. First drive: lanes, 30 mph limit, stop signs, signaling 100 ft before a turn
2. Traffic signals and right turn on red
3. Four-way stops and right-of-way (first to stop, yield to the right)
4. Left turns: yielding to oncoming traffic
5. Roundabouts
6. School zones and stopped school buses
7. Railroad crossings (stop 15–50 ft from the rails)
8. Emergency vehicles and the Move Over law
9. Passing and no-passing zones
10. Highway: merging, 70 mph, keep right, exiting
11. Storm: rain, headlights and wipers, dark and flashing signals
12. Work zones, flaggers and passing bicyclists (3 ft)

**First Person — Behind the Wheel** (cockpit view with three working mirrors)

1. Cockpit check: seat belt, mirrors, blind spots, pulling away from the curb
2. Speed control, smooth stops and the road-test quick stop
3. Mirrors and blind spots (lane changes with shoulder checks)
4. Pedestrians and crosswalks (child chasing a ball, white-cane pedestrian, turning)
5. Following distance (3–4 second rule, sudden stop)
6. Straight-in parking and backing out
7. Backing up 50 ft in a straight line
8. Three-point turn
9. Parallel parking (within 12 inches of the curb)
10. Parking on a hill (which way to turn the wheels)
11. Night driving (headlights, high beams, when to dim)

Every lesson starts with the Florida rules it covers, coaches the student while driving, and
scores the drive out of 100. Violations (speeding, rolling stops, no signal, failing to yield,
unsafe lane changes, tailgating and so on) are explained on screen and listed at the end.
70 points pass; stars are saved in the browser.

Automatic or manual transmission can be chosen on the main menu.

## Running it

**Online (easiest):** once GitHub Pages is turned on for this repository, the game is at
<https://aaron-securemed-services.github.io/FL_driving/>. Students only need the link.

**Install it like an app:** open that link, then
- Safari on a Mac: **File → Add to Dock**.
- Chrome or Edge: click the install icon at the right of the address bar (or menu → **Install**).

The game then has its own icon and window and keeps working without an internet connection.

**On a Mac:** double-click `Start Game.command`. A small Terminal window opens, and the game
opens in your browser. Leave that window open while you play; close it to stop.

- The first time, macOS may say the file is from an unidentified developer. Right-click the
  file, choose **Open**, then **Open** again. You only need to do this once.
- For a desktop shortcut, right-click `Start Game.command`, choose **Make Alias**, and drag
  the alias to your Desktop. Keep the original file inside the game folder.

**Anywhere else:** the game uses JavaScript modules, so it must be served over HTTP (opening
`index.html` straight from disk will not work in most browsers).

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Any static host works as well (GitHub Pages, Netlify, a
school web server): upload the folder as-is.

## Controls

| Action | Keyboard | Controller |
| --- | --- | --- |
| Gas / brake | W / S or ↑ / ↓ | RT / LT |
| Steer | A / D or ← / → | Left stick |
| Turn signals | Q / E | LB / RB |
| Gear up / down (P-R-N-D) | F / R | A / B |
| Headlights (off, low, high) | L | Y |
| Wipers | K | D-pad ↑ |
| Seat belt | B | D-pad ↓ |
| Hazard lights | X | D-pad ← |
| Parking brake | Space | D-pad → |
| Look left / right / behind | Z / C / V (hold) | Right stick |
| Horn | H | X |
| Pause | Esc or P | Start |

The controller column uses Xbox names. PlayStation and Switch controllers work the same way by
button position (PlayStation: R2 / L2, L1 / R1, ✕ / ○, △, □, Options; Switch: ZR / ZL, L / R,
B / A, X, Y, +). On-screen prompts default to PlayStation names, switch automatically when a
recognised controller is connected, and can be set by hand with the **Controller** button on
the main menu.

**Touchscreen (phones and iPads):** hold the device sideways. Steer with the pad on the left,
use the BRAKE and GAS pedals on the right, and tap the dashboard for turn signals, gears,
lights, wipers, seat belt, parking brake and hazards. In first person, press and hold a mirror
to look that way. The touch controls appear on first touch and hide when a key is pressed.

Menus work with the mouse, arrow keys + Enter, or the controller D-pad + confirm button.

## Version history

The current version is shown at the bottom of the main menu.

- **1.3.0** — Touchscreen controls for phones and iPads.
- **1.2.0** — Can be hosted on GitHub Pages and installed as an app; plays offline once installed.
- **1.1.0** — PlayStation, Xbox and Switch controller prompts (PlayStation by default, automatic
  detection, manual choice on the main menu).
- **1.0.0** — First release: 23 lessons in two modes, keyboard and controller support,
  double-click launcher for macOS.

## Planned lessons

Not built yet:

- Drawbridges (signals, gates and where to stop)
- Sharing the road with motorcycles
- Large-truck blind zones ("no-zones")

## Project layout

- `index.html`, `css/style.css` — page, menus and HUD
- `manifest.webmanifest`, `sw.js`, `icons/` — make the hosted game installable and playable offline
- `js/main.js` — render loop, cameras, mirrors, menus
- `js/world.js` — scene, sky, lighting, roads, signs, signals, scenery
- `js/actors.js` — cars, pedestrians, traffic AI, the player's car physics
- `js/game.js` — the rules engine and scoring, plus the lesson-building API
- `js/lessons.js` — all 23 lessons
- `js/input.js`, `js/audio.js` — keyboard/gamepad input and sound
- `js/lib/three.module.min.js` — three.js r170 (MIT licence, see `js/lib/THREE-LICENSE`)
