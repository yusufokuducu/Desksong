# Desksong

A modern Electron-based music player with real-time audio processing and effects.

## Features

- **Real-time Audio Effects**: Speed control (0.25x-2x), pitch shifting (±12 semitones), reverb, delay, chorus, bass boost, and dynamic compression
- **Professional Presets**: Concert Hall, Studio, Radio, Nightcore, Slowed + Reverb, plus custom preset saving
- **Glassmorphism UI**: AMOLED-optimized design with native window controls
- **Drag & Drop**: Multi-file support with MP3, WAV, OGG, and FLAC formats
- **Audio Export**: Export processed audio with applied effects

## Quick Start

```bash
npm install
npm run build
npm start
```

## Development

```bash
npm run dev  # Watch mode with auto-reload
npm run dist # Build distributable packages
```

## Architecture

```
src/           # Electron main process (TypeScript)
renderer/      # Frontend application
  ├── js/      # Modular audio engine, playlist, UI controller
  └── styles.css
dist/          # Compiled TypeScript output
```

## Technical Stack

- **Electron** - Desktop framework with context isolation
- **Web Audio API** - Real-time audio processing
- **Tone.js** - Advanced audio effects chain
- **SoundTouch.js** - Independent pitch/tempo manipulation
- **TypeScript** - Type-safe IPC communication

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `Ctrl + ←` | Previous track |
| `Ctrl + →` | Next track |

## License

MIT © Yusuf Okuducu
