# Brim
## Flattool template default readme blurb

PUT PROJECT SPECIFIC ITEMS DETAILS HERE

## Code of Conduct
- The Brim project follows the [GNOME Code of Conduct](https://conduct.gnome.org/). See `CODE_OF_CONDUCT.md` for more information.

## Contributing
### Compiling from Source

Make sure `flatpak` and `git` are installed, then run the following to build from the repo:
```bash
# Clone this repo and enter it
git clone https://github.com/flattool/brim.git
cd brim

# Initialize submodules
git submodule update --init --recursive

# Install build dependencies
flatpak install org.flatpak.Builder org.gnome.Sdk//49 org.gnome.Platform//49 org.freedesktop.Sdk.Extension.typescript//25.08 org.freedesktop.Sdk.Extension.node22//25.08 -y

# Build, install, and run
./run.sh
```

### Formatting
Brim uses [ESLint](https://eslint.org/) plugins for code formatting. An NPM package file is provided for easy installation.
- Install using `npm install` in the project root directory
