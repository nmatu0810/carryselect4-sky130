#!/usr/bin/env bash

# Resolve project repository root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Native EDA tools from a nix profile, if installed
[ -d "$HOME/.nix-profile/bin" ] && case ":$PATH:" in *":$HOME/.nix-profile/bin:"*) ;; *) export PATH="$HOME/.nix-profile/bin:$PATH";; esac

# PDK configuration
export PDK_ROOT="$HOME/.ciel/ciel/sky130/versions/8afc8346a57fe1ab7934ba5a6056ea8b43078e71"
export PDK="sky130A"

if [ ! -d "$PDK_ROOT/sky130A" ]; then
    echo "ERROR: PDK_ROOT/sky130A not found at $PDK_ROOT/sky130A" >&2
    return 1 2>/dev/null || exit 1
fi

# Liberty file for synthesis / STA
export LIB_TT="$PDK_ROOT/sky130A/libs.ref/sky130_fd_sc_hd/lib/sky130_fd_sc_hd__tt_025C_1v80.lib"
if [ ! -f "$LIB_TT" ]; then
    echo "ERROR: Liberty file LIB_TT not found at $LIB_TT" >&2
    return 1 2>/dev/null || exit 1
fi

# Docker image for LibreLane / OpenLane
if command -v docker >/dev/null 2>&1; then
    IMG=$(docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep -i librelane | head -1 || true)
    if [ -z "$IMG" ]; then
        IMG=$(docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep -i openlane | head -1 || true)
    fi
    export OL_IMAGE="$IMG"
fi

# Flow CLI
if [ -x "$REPO_DIR/.venv/bin/librelane" ]; then
    export FLOW_CLI="$REPO_DIR/.venv/bin/librelane"
elif [ -x "$REPO_DIR/.venv/bin/openlane" ]; then
    export FLOW_CLI="$REPO_DIR/.venv/bin/openlane"
elif [ -n "$FLOW_CLI" ]; then
    export FLOW_CLI="$FLOW_CLI"
else
    export FLOW_CLI="librelane"
fi
