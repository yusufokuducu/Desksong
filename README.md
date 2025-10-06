# 🎵 Desksong - Modern Music Player with Real-Time Effects

A sleek, modern music player built with Electron, featuring real-time audio effects and a stunning AMOLED-optimized glassmorphism UI.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)

## ✨ Features

### 🎛️ Real-Time Audio Effects
- **Speed Control**: 0.25x to 2x playback speed without affecting pitch
- **Pitch Shift**: -12 to +12 semitones without changing speed
- **Reverb**: Adjustable room ambience (0-100%)
- **Bass Boost**: Enhance low frequencies (0-100%)
- **Built-in Compressor**: Professional audio dynamics

### 🎨 Design
- **AMOLED Black Theme**: True black background for OLED displays
- **Minimal UI**: Clean, distraction-free interface
- **Glassmorphism Elements**: Modern transparent effects
- **Compact Vertical Layout**: Space-efficient design

### 🎵 Audio Support
- **Formats**: MP3, WAV, OGG, FLAC
- **Playlist Management**: Add, remove, reorder tracks
- **Drag & Drop**: Easy file importing
- **Export**: Save processed audio with effects

### 🎚️ Presets
- Default
- Concert Hall
- Studio
- Radio
- Nightcore
- Slowed + Reverb
- Custom presets support

## 🚀 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup
```bash
# Clone the repository
git clone https://github.com/yusufokuducu/Desksong.git

# Navigate to project directory
cd Desksong

# Install dependencies
npm install

# Build the project
npm run build

# Start the application
npm start
```

## 🛠️ Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run dist
```

## 🎮 Controls

### Keyboard Shortcuts
- `Space`: Play/Pause
- `Ctrl + ←`: Previous track
- `Ctrl + →`: Next track

### Audio Effects
- Adjust effects in real-time using the sliders
- Effects work independently without interfering with each other
- All changes are applied smoothly without audio artifacts

## 🏗️ Built With

- **Electron** - Cross-platform desktop framework
- **TypeScript** - Type-safe JavaScript
- **Web Audio API** - Real-time audio processing
- **Tone.js** - Advanced audio effects
- **SoundTouch.js** - Pitch and tempo manipulation

## 📦 Project Structure

```
Desksong/
├── src/              # TypeScript source files
│   ├── main.ts       # Electron main process
│   └── preload.ts    # Preload script
├── renderer/         # Frontend files
│   ├── index.html    # Main HTML
│   ├── styles.css    # AMOLED theme styles
│   └── js/          # JavaScript modules
│       ├── audio-engine.js
│       ├── playlist-manager.js
│       ├── ui-controller.js
│       └── app.js
├── dist/            # Compiled JavaScript
└── package.json     # Project configuration
```

## 🎯 Performance Features

- **Throttled Controls**: Smooth slider interactions
- **Optimized Rendering**: RequestAnimationFrame for UI updates
- **Independent Effects**: Speed and pitch work separately
- **Memory Management**: Proper cleanup of audio nodes
- **Parallel File Loading**: Fast playlist importing

## 🔒 Security

- Context isolation enabled
- Secure IPC communication
- No node integration in renderer
- Sandboxed processes

## 📝 License

This project is licensed under the MIT License.

## 👤 Author

**Yusuf Okuducu**
- GitHub: [@yusufokuducu](https://github.com/yusufokuducu)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

## ⭐ Show your support

Give a ⭐️ if you like this project!

---

*Built with ❤️ using Electron and Web Audio API*