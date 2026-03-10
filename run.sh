#!/usr/bin/env sh
flatpak run org.flatpak.Builder --install --user --force-clean _build build-aux/io.github.flattool.Brim.json \
&& flatpak run io.github.flattool.Brim//master
