
<div align="center">
  <img src="media/icons/mimicflow-logo.png" alt="MimicFlow Logo" width="150" />

  <h1>MimicFlow: The Cinematic Preview for AI Coding</h1>

  <blockquote><strong>Don't just accept the diff. Watch the code be written.</strong></blockquote>

  <a href="https://marketplace.visualstudio.com/items?itemName=devshero.mimicflow" target="_blank">
    <img alt="VS Code Marketplace" src="https://img.shields.io/badge/VS%20Code%20Marketplace-v1.0.0-007ACC?logo=visualstudiocode&amp;logoColor=white" />
  </a>
  <img alt="License" src="https://img.shields.io/badge/License-MIT-brightgreen" />
  <img alt="Downloads" src="https://img.shields.io/badge/Downloads-—-blue" />
  <img alt="Platform" src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey" />
  
  <br/><br/>
  <a href="https://youtu.be/kgT7SL79EHQ" target="_blank" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #FF0000; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">▶ Watch Demo on YouTube</a>
  
  <br/><br/>
  <img src="https://github.com/user-attachments/assets/9b5a2674-38c2-4e01-9040-51501952899e" alt="MimicFlow Demo GIF" width="100%" style="border-radius: 6px; margin-top: 20px; display: block;" />
</div>

## 🎯 The Problem: The Trust Gap

In the era of AI coding agents like **Cursor**, **Cline**, and **Roo Code**, developers often face a trust crisis. Fast-apply edits happen instantly, leaving you staring at static diffs, trying to reverse-engineer the AI's logic.

- Large edits feel opaque and risky
- Reviewing diffs is mentally exhausting
- You miss the reasoning behind each change
- It's hard to learn from the AI's patterns

## 💡 The Solution: MimicFlow

**MimicFlow** bridges this gap by transforming static code changes into a **cinematic, human-like replay**. It acts as a "Digital Mirror," creating a safe sandbox where you can watch a **Ghost Cursor** type out the changes step-by-step before you commit.

### 🌟 Why Developers Love MimicFlow

- **👁️ Observability:** Move beyond black-box edits. See *how* the code was constructed, not just the final result.
- **🧠 Cognitive Ease:** Reduce the mental load of reviewing massive diffs. Watching a replay is natural and intuitive.
- **🛡️ Safety First:** Preview changes in a read-only sandbox. Your source code remains untouched until you click "Keep."
- **🎓 Learn from AI:** Junior developers can watch the AI "pair program" with them, observing patterns and refactoring techniques in real-time.

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
## 📝 Changelog

All notable changes to the "MimicFlow" extension will be documented in this file.

### [1.0.0] - 2024-01-06

- 🎉 **Initial Release:** MimicFlow is live!
- 🎬 **Cinematic Player:** Watch code history with ghost cursor animations.
- 🕵️‍♂️ **Auto-Capture:** Automatically records file saves as history.
- ⏳ **Git Mining:** Generates history from past commits instantly.
- 📺 **Playlist Mode:** Seamless playback for multi-file changes.

## 💬 Feedback & Support

MimicFlow is an open-source project built with ❤️.

If you find a bug or have a feature request, please [open an issue](https://github.com/devshero/mimicflow/issues) on GitHub.

**Enjoying MimicFlow?** Please consider leaving a ⭐ rating on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=devshero.mimicflow)!
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
