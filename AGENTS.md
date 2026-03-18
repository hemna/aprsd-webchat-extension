# aprsd-webchat-extension Development Guidelines

Last updated: 2026-03-13

## Overview

A web-based chat extension for [APRSD](https://github.com/hemna/aprsd) that provides a browser UI for APRS messaging. Built as a Flask/SocketIO backend with a jQuery/Bootstrap single-page frontend.

## Tech Stack

### Backend
- **Python 3.11+** (`.python-version` = 3.11, supports 3.12)
- **Flask** + **Flask-SocketIO** for HTTP/WebSocket serving
- **oslo.config** for configuration management
- **Jinja2** templating (single `index.html` template)
- **haversine** for distance calculations
- Package manager: **uv** (used via tox)

### Frontend (all vendored in `static/upstream/`)
- **jQuery 3.7.1** + jQuery UI 1.12.1 + jQuery Timeago 1.6.7
- **Bootstrap 5.3.8** (CSS + JS bundle)
- **Socket.IO Client 4.1.2**
- **Fomantic UI 2.9.0** (semantic.min.js)
- **Google Material Symbols Rounded** (self-hosted woff2 font)
- Client-side storage: **localStorage** (theme, tour, GPS, messages, APRSThursday state), **sessionStorage** (ephemeral message cache)

### Custom JS Modules
`main.js`, `gps.js`, `symbol-picker.js`, `send-message.js`, `tabs.js`, `theme.js`, `tour.js`, `aprs-thursday.js`

### Custom CSS
`chat.css`, `index.css`, `tabs.css`, `tour.css`

## Project Structure

```text
aprsd_webchat_extension/              # Main Python package
├── __init__.py                       # Version from importlib.metadata
├── extension.py                      # APRSD extension entry point
├── utils.py                          # Logging, version check
├── cmds/
│   └── webchat.py                    # Flask app, SocketIO handlers, packet processing
├── conf/
│   ├── main.py                       # Config options (BoolOpt, StrOpt, IntOpt, FloatOpt)
│   └── opts.py                       # oslo.config opts discovery
└── web/
    └── chat/
        ├── templates/
        │   └── index.html            # Single-page Jinja2 template
        └── static/
            ├── css/                   # Custom stylesheets
            ├── js/                    # Custom JavaScript modules
            ├── images/               # APRS symbol sprites, SVG icons
            └── upstream/             # Vendored third-party libs
tests/
├── fake.py                           # Test fixtures, fake packets, stub plugins
└── test_aprsd_webchat_extension.py   # unittest-based tests (pytest runner)
specs/                                # Feature specifications
.opencode/plans/                      # Design/implementation plans
```

## Commands

```bash
# Run tests
uv run pytest tests

# Run tests via tox (all envs)
make test
# or directly:
tox -p all

# Lint
uv run ruff check aprsd_webchat_extension tests

# Format
uv run ruff format aprsd_webchat_extension tests

# Type check
tox -e type-check

# Build
make build

# Setup dev environment
make dev

# Build docs
make docs
```

## Code Style

- **Python**: ruff for linting and formatting (line length 88, isort compatible)
- **JavaScript**: ES6 with `var` declarations (legacy convention in this codebase), jQuery patterns
- **HTML escaping**: All user/external data embedded in HTML strings MUST use `escapeHtml()` for text content or `escapeHtmlAttribute()` for attributes (defined in `send-message.js`). CodeQL enforces this.
- **Pre-commit hooks**: trailing whitespace, end-of-file fixer, ruff lint/format

## Testing

- Framework: **pytest** running **unittest.TestCase** classes
- 2 pre-existing failures (`test_process_ack_packet`, `test_process_our_message_packet`) due to missing `aprs_network.password` config — not related to webchat extension code
- Run: `uv run pytest tests`

## CI

- **CodeQL** analysis runs on PRs (JavaScript/TypeScript + Python)
- CodeQL specifically flags DOM XSS patterns (unescaped data in `.html()`, `.append()`, `.replaceWith()`)
- `tox.ini` has `[gh-actions]` mapping for Python 3.11/3.12

## Key Patterns

### Configuration
Config options are defined in `conf/main.py` using oslo.config `BoolOpt`/`StrOpt`/`IntOpt`/`FloatOpt`. Access pattern: `CONF.aprsd_webchat_extension.<option_name>`.

### SocketIO Events
Backend emits/receives via Flask-SocketIO in `cmds/webchat.py`. Frontend connects via Socket.IO client and uses `socket.emit()`/`socket.on()` in JS modules.

### Tab System
Chat uses Bootstrap 5 Tab API for multi-callsign conversations. Tabs are created dynamically. Always use `bootstrap.Tab` API for activation — never manually add `show active` classes.

### Feature Gating
Optional features (e.g., APRSThursday) use `BoolOpt` in config with default `False`, backend gating in `webchat.py`, conditional Jinja2 `{% if %}` blocks in `index.html`, and `typeof` guards in JS.

## Context-Mode Preferences

When using OpenCode with context-mode tools available, prefer them over raw Bash for commands that produce large output:

- **Use `ctx_execute` or `ctx_batch_execute`** instead of Bash for: `git log`, `git diff`, `pytest`, `ruff check`, `tox`, and any command likely to exceed 20 lines of output
- **Use `ctx_fetch_and_index`** instead of `webfetch` for fetching documentation or web content
- **Use `ctx_execute_file`** instead of `Read`/`cat` for: log files, large data files, or any file where you need to extract specific information rather than read the entire content
- **Use `ctx_index` + `ctx_search`** for indexing and searching through large documentation or skill content
- Reserve **Bash** for: file mutations (`git commit`, `git push`, `mkdir`, `mv`), short commands with predictable small output, and interactive/stateful operations

## Recent Features

- **003-aprs-thursday**: APRSThursday net support with ANSRVR HOTG group chat, subscription management, quick message templates, inline location fetching, dedicated tab UI, opt-in config. Also includes: GPS panel converted to modal, tour tooltip fixes, ack spinner, light theme contrast improvements, mobile responsive improvements, button visibility fixes.
- **002-raw-aprs-toggle**: Raw APRS packet display toggle
- **001-aprs-symbol-picker**: APRS symbol picker for GPS beacons

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
