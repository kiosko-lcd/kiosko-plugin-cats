# kiosko-plugin-cats

Your AI agent sessions as cats in a room: what needs you comes forward. From aimonitor.

A plugin for [Kiosko](https://github.com/kiosko-lcd/kiosko), the widget mosaic for small USB LCD panels.

![Cats room](docs/room.png)

## Install

In Kiosko, **Plugins → Install from npm** → `kiosko-plugin-cats`, then restart Kiosko. Or from a terminal:

```sh
npm install --prefix ~/.config/kiosko/plugins kiosko-plugin-cats
```

(macOS: `~/Library/Application Support/Kiosko/plugins`, Windows: `%APPDATA%\Kiosko\plugins`.)

## Requirements

- The `agents/sessions` source from [kiosko-plugin-agents](../kiosko-plugin-agents) (each session is a cat).
- Optional: `weather/current` from [kiosko-plugin-weather](../kiosko-plugin-weather) for the sky in the window.

## Widgets

### Cats room — `cats/room`

Each AI agent session is a cat in a room with the real sky outside: the ones that need you come forward, the ones working sit at their laptops in the back.

![Cats room](docs/room.png)

Uses: `agents/sessions`, `weather/current`.

| Option | Type | Default | |
|---|---|---|---|
| `room` | `rotate` \| `estudio` \| `cocina` \| `cabana` \| `atico` \| `oficina` \| `japonesa` \| `acuario` \| `arcade` \| `ventanal` \| `playa` \| `espacio` \| `antartida` \| `desierto` \| `bosque` | `"rotate"` | Room. Indoors or out, each with its own window, lamp and floor. |
| `rooms` | list | `[]` | Rooms to rotate through. With "A different one every day". Empty: all of them. |
| `projects` | list | `[]` | Projects. Which sessions get a cat. Empty: all. Project, repository or folder names or patterns, comma-separated: * matches anything, a leading ! leaves out (web-app, acme-*, !scratch). |
| `column` | `none` \| `right` \| `left` \| `alternate` | `"none"` | Strip without cats. Keeps a strip of the floor free, like the old card column. "Alternate" swaps sides now and then, against burn-in. |
| `swapSidesMs` | duration (ms) | `3600000` | Swap sides every |

### Gestures

Every now and then one cat does something short and the panel goes back to
rest: it blinks, flicks its tail, yawns, types, juggles, assembles a LEGO set,
walks to its new spot when a session changes… What it does depends on what
its session is doing (the tool it uses, git, the hour, the weather, the
room). They are animations of the tile (`animation` of the Kiosko SDK): a
gesture is asked every 15-40 s at most, at 12 fps, and new data cancels it
(a permission request, for example) and the room is repainted at once. The
screen's *max fps* caps the rate.

Not here yet: the console game (needs the platformer of the agents plugin),
the fireman (the heat tower is another tile), the week's LEGO trophies on the
cabinet and the reactions to RAM, quota and network.

## Interludes

### Quarter-hour duel — `cats/duel`

Two of your sessions fight it out with laser swords in the cats room. The one with fewer uncommitted files wins. With a single session, it fights the bug. Add it in Kiosko → Screens → Interludes.

| Option | Type | Default | |
|---|---|---|---|
| `room` | `rotate` \| `estudio` \| `cocina` \| `cabana` \| `atico` \| `oficina` \| `japonesa` \| `acuario` \| `arcade` \| `ventanal` \| `playa` \| `espacio` \| `antartida` \| `desierto` \| `bosque` | `"rotate"` | Room. Indoors or out, each with its own window, lamp and floor. |
| `rooms` | list | `[]` | Rooms to rotate through. With "A different one every day". Empty: all of them. |
| `projects` | list | `[]` | Projects. Which sessions get a cat. Empty: all. Project, repository or folder names or patterns, comma-separated: * matches anything, a leading ! leaves out (web-app, acme-*, !scratch). |

## Development

```sh
npm install
npm test          # node:test
npm run check     # TypeScript
npm run build     # dist/index.js, what Kiosko loads
```

To try it in a running Kiosko without publishing: `kiosko plugins link .` and restart Kiosko.

Working on Kiosko and its plugins together: clone them side by side
(`kiosko/` and `kiosko-plugins/kiosko-plugin-cats/`) and run `npm install` in
`kiosko/`; its workspaces link every plugin found in `../kiosko-plugins`.

## License

MIT
