
<div align="center">
  <img src="media/icons/mimicflow-logo.png" alt="MimicFlow Logo" width="150" />

  <h1>MimicFlow</h1>

  <p><strong>The Digital Mirror for AI Coding – Cinematic History &amp; Process Visualization.</strong></p>

  <a href="https://marketplace.visualstudio.com/items?itemName=devshero.mimicflow" target="_blank">
    <img alt="VS Code Marketplace" src="https://img.shields.io/badge/VS%20Code%20Marketplace-v1.0.0-007ACC?logo=visualstudiocode&amp;logoColor=white" />
  </a>
  <img alt="License" src="https://img.shields.io/badge/License-MIT-brightgreen" />
  <img alt="Downloads" src="https://img.shields.io/badge/Downloads-—-blue" />
  <img alt="Platform" src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey" />
</div>

<p align="center">
	<a href="https://youtu.be/kgT7SL79EHQ" target="_blank" rel="noopener noreferrer">
		<img alt="MimicFlow Demo" src="https://img.youtube.com/vi/kgT7SL79EHQ/hqdefault.jpg" width="100%" />
	</a>
</p>

## 🤔 Why MimicFlow?

Diffs are static. AI edits happen fast. And that creates a trust gap.

MimicFlow turns code changes into a **cinematic preview sandbox** — you can **watch the code being written** before you commit.

## ✨ Key Features (Phase 1 Complete)

- 🕵️‍♂️ **Auto-Capture Watcher:** Records every save automatically.
- ⏳ **Time Machine:** Mines Git history to generate instant previews for existing projects.
- 🎬 **Cinematic Player:** Real-time playback with Ghost Cursor & Typing effects.
- 📺 **Seamless Playlist:** Plays multi-file edits like a continuous movie.
- 🛡️ **Git Isolation:** Zero repository pollution (`.mimicflow` is git-ignored).
- 🗂️ **Smart Dashboard:** Organize by Date, Folder, Commit, or Branch.
- 🤝 **Team Sharing:** Curated export to shared team folders.

## 🚀 Installation & Usage

1. Install **MimicFlow** from the VS Code Marketplace.
2. Open the MimicFlow sidebar (Activity Bar icon) or run: `MimicFlow: Open Dashboard`.
3. Work normally — MimicFlow auto-syncs and captures history.
4. Browse History and play back changes in the cinematic player.

## �️ Development

### Prerequisites

- Node.js 16+ & npm
- VS Code 1.85.0+
- TypeScript knowledge (extension) & React (webview)

### Setup

```bash
git clone https://github.com/DevsHero/mimicFlow.git
cd mimicFlow
npm install
```

### Build & Watch

```bash
# Build both extension and webview once
npm run build

# Watch mode for development (two terminals recommended)
npm run watch
```

### Run in Development

```bash
# Launch VS Code with the extension loaded
code --extensionDevelopmentPath=$PWD
```

Press `F5` inside VS Code to attach the debugger.

### Test Build

```bash
npm run package
```

This generates a `.vsix` file for local testing.

### Project Structure

```
src/
├── extension/          # Main extension code (TypeScript)
│   ├── extension.ts
│   ├── engine/         # Animation & diff engine
│   ├── providers/      # WebView providers
│   ├── services/       # File watching, git mining, etc.
│   ├── storage/        # Ghost file persistence
│   └── utils/
├── webview/            # React frontend
│   ├── player/         # Playback UI
│   ├── dashboard/      # History & search UI
│   └── shared/         # Shared components
└── shared/             # Shared types & constants
```

## 🤝 Contributing

We welcome contributions! To get started:

1. **Open an Issue** for bugs or feature requests.
2. **Fork & Clone** the repo.
3. **Create a branch** (`git checkout -b feature/your-feature`).
4. **Commit & Push** your changes.
5. **Open a Pull Request** with a clear description.

**Have questions?** Reach out:
- Email: [mail@thanon.dev](mailto:mail@thanon.dev)
- GitHub Issues: [Open an issue](https://github.com/DevsHero/mimicFlow/issues)

## �🗺️ Roadmap

- 🎥 **Video Export (Pro):** Render MP4/GIF for content creators.
- 🔌 **Universal Adapters:** Support for other editors.
- 🎓 **Educational Mode:** Pause/explain code changes in real-time.

## 📄 License

MIT

Built with 🪞 & ❤️ by DevsHero 
