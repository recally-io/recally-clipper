# Recally Clipper

[![Build Status](https://github.com/recally-io/recally-clipper/workflows/CI/badge.svg)](https://github.com/recally-io/recally-clipper/actions)
[![Version](https://img.shields.io/github/v/release/recally-io/recally-clipper)](https://github.com/recally-io/recally-clipper/releases)

A browser extension that seamlessly integrates with [Recally](https://recally.io) to help you save and organize web content. Built with modern technologies including WXT and shadcn/ui.

## Features

- 🚀 Quick web page clipping
  - Save entire pages
  - Auto-extract main content
  - Preserve formatting and styles
- 💾 Seamless Recally Integration
  - One-click save to your Recally account
  - Automatic sync across devices
  - Smart tag suggestions
- 🎨 Modern User Experience
  - Clean and intuitive interface
  - Dark/light mode support
  - Keyboard shortcuts
- 🌐 Cross-browser Support
  - Chrome & Chromium-based browsers
  - Firefox
  - Safari (manual installation)

## Screenshots

<img src="./docs/images/firefox-chrome.png" width="600" alt="Firefox/Chrome" />
<img src="./docs/images/safari-mac.png" width="600" alt="Safari Mac" />

<img src="./docs/images/popup-page.png" width="400" alt="Popup Page" />
<img src="./docs/images/options-page.png" width="400" alt="Options Page" />

## Installation

### Chrome/Firefox
1. [Chrome Web Store](https://chrome.google.com/webstore/detail/heblpkdddipfjdpdgikoledoecohoepp)
2. [Firefox Add-ons](https://addons.mozilla.org/addon/recally-clipper/)

### Safari

Currently, the extension is not available on the Safari Extension Gallery. You can install it manually by following these steps:
- Clone the repository `https://github.com/recally-io/recally-clipper.git`
- Build for safari `bun run build:safari`
- Run the extension in Safari by following the instructions [here](https://developer.apple.com/documentation/safariservices/safari_app_extensions/building_a_safari_app_extension)

## Development

### Prerequisites
- [bun](https://bun.sh/) (v1.0.0 or higher)
- Node.js (v18 or higher)

### Setup
```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Run tests
bun test

# Lint code
bun run lint
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Support

For support, please:
1. Open an issue on GitHub
2. Contact support@recally.io

## License

MIT License - see the [LICENSE](LICENSE) file for details
