/**
 * APRS Symbol Picker Module
 *
 * Provides a visual symbol picker dialog for selecting APRS beacon symbols.
 * Symbols are displayed from sprite sheets and persisted to localStorage.
 *
 * @module symbol-picker
 */

// ============================================================================
// Constants
// ============================================================================

/** localStorage key for persisted symbol selection */
var SYMBOL_STORAGE_KEY = 'aprsd-webchat-beacon-symbol';

/** Default symbol when none is selected (car) */
var DEFAULT_SYMBOL = {
    table: '/',
    symbol: '>',
    description: 'Car'
};

/** Symbol picker state */
var symbolPickerState = {
    isOpen: false,
    activeTable: '/',
    selectedSymbol: null
};

// ============================================================================
// APRS Symbol Tables
// ============================================================================

/**
 * Primary APRS symbol table (table character: '/')
 * Maps ASCII characters (33-126) to symbol descriptions
 */
var PRIMARY_SYMBOLS = {
    '!': { description: 'Police Station' },
    '"': { description: 'Reserved' },
    '#': { description: 'Digi' },
    '$': { description: 'Phone' },
    '%': { description: 'DX Cluster' },
    '&': { description: 'HF Gateway' },
    "'": { description: 'Small Aircraft' },
    '(': { description: 'Mobile Satellite Station' },
    ')': { description: 'Wheelchair' },
    '*': { description: 'Snowmobile' },
    '+': { description: 'Red Cross' },
    ',': { description: 'Boy Scouts' },
    '-': { description: 'House QTH' },
    '.': { description: 'X' },
    '/': { description: 'Red Dot' },
    '0': { description: 'Circle (0)' },
    '1': { description: 'Circle (1)' },
    '2': { description: 'Circle (2)' },
    '3': { description: 'Circle (3)' },
    '4': { description: 'Circle (4)' },
    '5': { description: 'Circle (5)' },
    '6': { description: 'Circle (6)' },
    '7': { description: 'Circle (7)' },
    '8': { description: 'Circle (8)' },
    '9': { description: 'Circle (9)' },
    ':': { description: 'Fire' },
    ';': { description: 'Campground' },
    '<': { description: 'Motorcycle' },
    '=': { description: 'Railroad Engine' },
    '>': { description: 'Car' },
    '?': { description: 'File Server' },
    '@': { description: 'Hurricane/Tropical Storm' },
    'A': { description: 'Aid Station' },
    'B': { description: 'BBS' },
    'C': { description: 'Canoe' },
    'D': { description: 'Reserved' },
    'E': { description: 'Eyeball' },
    'F': { description: 'Farm Vehicle' },
    'G': { description: 'Grid Square' },
    'H': { description: 'Hotel' },
    'I': { description: 'TCP/IP' },
    'J': { description: 'Reserved' },
    'K': { description: 'School' },
    'L': { description: 'PC User' },
    'M': { description: 'Mac Apple' },
    'N': { description: 'NTS Station' },
    'O': { description: 'Balloon' },
    'P': { description: 'Police' },
    'Q': { description: 'Reserved' },
    'R': { description: 'Recreational Vehicle' },
    'S': { description: 'Shuttle' },
    'T': { description: 'SSTV' },
    'U': { description: 'Bus' },
    'V': { description: 'ATV' },
    'W': { description: 'National Weather Service' },
    'X': { description: 'Helicopter' },
    'Y': { description: 'Yacht/Sailboat' },
    'Z': { description: 'WinAPRS' },
    '[': { description: 'Jogger' },
    '\\': { description: 'Triangle' },
    ']': { description: 'PBBS' },
    '^': { description: 'Large Aircraft' },
    '_': { description: 'Weather Station' },
    '`': { description: 'Dish Antenna' },
    'a': { description: 'Ambulance' },
    'b': { description: 'Bicycle' },
    'c': { description: 'Incident Command Post' },
    'd': { description: 'Fire Dept' },
    'e': { description: 'Horse' },
    'f': { description: 'Fire Truck' },
    'g': { description: 'Glider' },
    'h': { description: 'Hospital' },
    'i': { description: 'IOTA' },
    'j': { description: 'Jeep' },
    'k': { description: 'Truck' },
    'l': { description: 'Laptop' },
    'm': { description: 'Mic-E Repeater' },
    'n': { description: 'Node' },
    'o': { description: 'EOC' },
    'p': { description: 'Rover (Dog)' },
    'q': { description: 'Grid Square' },
    'r': { description: 'Repeater' },
    's': { description: 'Ship (Power Boat)' },
    't': { description: 'Truck Stop' },
    'u': { description: 'Truck (18 Wheeler)' },
    'v': { description: 'Van' },
    'w': { description: 'Water Station' },
    'x': { description: 'xAPRS' },
    'y': { description: 'Yagi' },
    'z': { description: 'Shelter' },
    '{': { description: 'Reserved' },
    '|': { description: 'Reserved' },
    '}': { description: 'Reserved' },
    '~': { description: 'Reserved' }
};

/**
 * Alternate APRS symbol table (table character: '\')
 * These symbols support alphanumeric overlays
 */
var ALTERNATE_SYMBOLS = {
    '!': { description: 'Emergency' },
    '"': { description: 'Reserved' },
    '#': { description: 'Numbered Star' },
    '$': { description: 'Bank' },
    '%': { description: 'Reserved' },
    '&': { description: 'Numbered Diamond' },
    "'": { description: 'Crash Site' },
    '(': { description: 'Cloudy' },
    ')': { description: 'Firenet MEO' },
    '*': { description: 'Snow' },
    '+': { description: 'Church' },
    ',': { description: 'Girl Scouts' },
    '-': { description: 'House (HF)' },
    '.': { description: 'Ambiguous' },
    '/': { description: 'Reserved' },
    '0': { description: 'Numbered Circle' },
    '1': { description: 'Reserved' },
    '2': { description: 'Reserved' },
    '3': { description: 'Reserved' },
    '4': { description: 'Reserved' },
    '5': { description: 'Reserved' },
    '6': { description: 'Reserved' },
    '7': { description: 'Reserved' },
    '8': { description: '802.11' },
    '9': { description: 'Gas Station' },
    ':': { description: 'Hail' },
    ';': { description: 'Park/Picnic' },
    '<': { description: 'Advisory' },
    '=': { description: 'Reserved' },
    '>': { description: 'Car (Overlay)' },
    '?': { description: 'Info Kiosk' },
    '@': { description: 'Hurricane' },
    'A': { description: 'Numbered Box' },
    'B': { description: 'Blowing Snow' },
    'C': { description: 'Coast Guard' },
    'D': { description: 'Drizzle' },
    'E': { description: 'Smoke' },
    'F': { description: 'Freezing Rain' },
    'G': { description: 'Snow Shower' },
    'H': { description: 'Haze' },
    'I': { description: 'Rain Shower' },
    'J': { description: 'Lightning' },
    'K': { description: 'Kenwood' },
    'L': { description: 'Lighthouse' },
    'M': { description: 'Reserved' },
    'N': { description: 'Navigation Buoy' },
    'O': { description: 'Rocket' },
    'P': { description: 'Parking' },
    'Q': { description: 'Earthquake' },
    'R': { description: 'Restaurant' },
    'S': { description: 'Satellite' },
    'T': { description: 'Thunderstorm' },
    'U': { description: 'Sunny' },
    'V': { description: 'VORTAC' },
    'W': { description: 'NWS Site' },
    'X': { description: 'Pharmacy' },
    'Y': { description: 'Reserved' },
    'Z': { description: 'Reserved' },
    '[': { description: 'Wall Cloud' },
    '\\': { description: 'Reserved' },
    ']': { description: 'Reserved' },
    '^': { description: 'Aircraft (Overlay)' },
    '_': { description: 'WX Station (Blue)' },
    '`': { description: 'Rain' },
    'a': { description: 'ARRL/ARES' },
    'b': { description: 'Blowing Dust' },
    'c': { description: 'Civil Defense' },
    'd': { description: 'DX Spot' },
    'e': { description: 'Sleet' },
    'f': { description: 'Funnel Cloud' },
    'g': { description: 'Gale Flags' },
    'h': { description: 'Ham Store' },
    'i': { description: 'Indoor POI' },
    'j': { description: 'Work Zone' },
    'k': { description: 'SUV/ATV' },
    'l': { description: 'Area Locations' },
    'm': { description: 'Milepost' },
    'n': { description: 'Numbered Triangle' },
    'o': { description: 'Small Circle' },
    'p': { description: 'Partly Cloudy' },
    'q': { description: 'Reserved' },
    'r': { description: 'Restroom' },
    's': { description: 'Ship (Overlay)' },
    't': { description: 'Tornado' },
    'u': { description: 'Truck (Overlay)' },
    'v': { description: 'Van (Overlay)' },
    'w': { description: 'Flooding' },
    'x': { description: 'Reserved' },
    'y': { description: 'Skywarn' },
    'z': { description: 'Shelter (Overlay)' },
    '{': { description: 'Fog' },
    '|': { description: 'Reserved' },
    '}': { description: 'Reserved' },
    '~': { description: 'Reserved' }
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate sprite sheet position for a symbol
 * @param {string} symbolCode - Single character symbol code (ASCII 33-126)
 * @returns {Object} - {row, col} position in sprite sheet
 */
function getSymbolSpritePosition(symbolCode) {
    var charCode = symbolCode.charCodeAt(0);
    var offset = charCode - 33;
    return {
        row: offset % 16,
        col: Math.floor(offset / 16)
    };
}

/**
 * Validate a symbol selection
 * @param {string} table - Table character ('/' or '\')
 * @param {string} symbol - Symbol code character (ASCII 33-126)
 * @returns {boolean} - True if valid
 */
function isValidSymbol(table, symbol) {
    // Table must be '/' or '\'
    if (table !== '/' && table !== '\\') return false;

    // Symbol must be single character
    if (!symbol || symbol.length !== 1) return false;

    // Symbol must be ASCII 33-126
    var code = symbol.charCodeAt(0);
    if (code < 33 || code > 126) return false;

    return true;
}

/**
 * Get description for a symbol
 * @param {string} table - Table character ('/' or '\')
 * @param {string} symbol - Symbol code character
 * @returns {string} - Human-readable description or 'Unknown'
 */
function getSymbolDescription(table, symbol) {
    var symbolTable = table === '/' ? PRIMARY_SYMBOLS : ALTERNATE_SYMBOLS;
    var entry = symbolTable[symbol];
    return entry ? entry.description : 'Unknown';
}

// ============================================================================
// localStorage Functions
// ============================================================================

/**
 * Save symbol selection to localStorage
 * @param {string} table - Table character
 * @param {string} symbol - Symbol code character
 * @param {string} description - Symbol description
 */
function saveSymbolSelection(table, symbol, description) {
    try {
        var data = {
            table: table,
            symbol: symbol,
            description: description
        };
        localStorage.setItem(SYMBOL_STORAGE_KEY, JSON.stringify(data));
        console.log('Symbol selection saved:', data);
    } catch (e) {
        console.error('Failed to save symbol selection:', e);
    }
}

/**
 * Load symbol selection from localStorage
 * @returns {Object|null} - Parsed selection or null if invalid/missing
 */
function loadSymbolSelection() {
    try {
        var stored = localStorage.getItem(SYMBOL_STORAGE_KEY);
        if (!stored) return null;

        var data = JSON.parse(stored);
        if (!isValidSymbol(data.table, data.symbol)) {
            console.warn('Invalid symbol data in localStorage, clearing');
            localStorage.removeItem(SYMBOL_STORAGE_KEY);
            return null;
        }

        return data;
    } catch (e) {
        console.error('Failed to parse symbol data:', e);
        localStorage.removeItem(SYMBOL_STORAGE_KEY);
        return null;
    }
}

/**
 * Get currently selected symbol (from storage or default)
 * @returns {Object} - Symbol selection {table, symbol, description}
 */
function getSelectedSymbol() {
    var saved = loadSymbolSelection();
    if (saved) {
        return saved;
    }
    return DEFAULT_SYMBOL;
}

/**
 * Get the two-character symbol string for transmission
 * @returns {string} - Two-character symbol (table + code), e.g., "/>"
 */
function getSelectedSymbolString() {
    var selected = getSelectedSymbol();
    return selected.table + selected.symbol;
}

// ============================================================================
// UI Functions
// ============================================================================

/**
 * Update the beacon button to show the currently selected symbol
 */
function updateBeaconButtonSymbol() {
    var selected = getSelectedSymbol();
    var pos = getSymbolSpritePosition(selected.symbol);
    var spriteIndex = selected.table === '/' ? 0 : 1;

    // Update the symbol icon on the beacon button
    // Using 48x48 sprite sheet scaled to 24px display (scale factor 0.5)
    var $symbolIcon = $('#beacon-symbol-icon');
    if ($symbolIcon.length) {
        var x = pos.row * -24;  // 48 * 0.5 = 24
        var y = pos.col * -24;
        $symbolIcon.css({
            'background-image': 'url(/static/images/aprs-symbols-48-' + spriteIndex + '.png)',
            'background-position': x + 'px ' + y + 'px'
        });
        console.log('Updated beacon symbol icon:', selected.symbol, 'pos:', x, y);
    }

    // Update tooltip on the symbol icon itself (not the button, which gps.js manages)
    var tooltipText = selected.description + ' (' + selected.table + selected.symbol + ')';
    $('#beacon-symbol-icon').attr('title', tooltipText);
    $('#beacon-symbol-icon').attr('aria-label', tooltipText);

    // Update state
    symbolPickerState.selectedSymbol = selected;
}

/**
 * Render the symbol grid for a given table
 * @param {string} table - Table character ('/' or '\')
 */
function renderSymbolGrid(table) {
    var $grid = $('#symbol-picker-grid');
    $grid.empty();

    var symbolTable = table === '/' ? PRIMARY_SYMBOLS : ALTERNATE_SYMBOLS;
    var spriteIndex = table === '/' ? 0 : 1;
    var selected = getSelectedSymbol();

    // Generate all symbols from ASCII 33 to 126
    for (var i = 33; i <= 126; i++) {
        var char = String.fromCharCode(i);
        var entry = symbolTable[char] || { description: 'Symbol ' + char };
        var pos = getSymbolSpritePosition(char);

        // Using 48x48 sprite sheet (768x288) scaled to 36px display
        // Scale factor: 36/48 = 0.75
        // Position = original position * scale factor
        var x = pos.row * -36;  // 48 * 0.75 = 36
        var y = pos.col * -36;

        var isSelected = (table === selected.table && char === selected.symbol);
        var selectedClass = isSelected ? ' symbol-cell-selected' : '';

        var $cell = $('<button>', {
            'type': 'button',
            'class': 'symbol-cell' + selectedClass,
            'data-table': table,
            'data-symbol': char,
            'data-description': entry.description,
            'title': table + char + ' - ' + entry.description,
            'aria-label': entry.description + ' (' + table + char + ')',
            'aria-pressed': isSelected ? 'true' : 'false'
        });

        var $icon = $('<div>', {
            'class': 'symbol-icon'
        }).css({
            'background-image': 'url(/static/images/aprs-symbols-48-' + spriteIndex + '.png)',
            'background-position': x + 'px ' + y + 'px'
        });

        $cell.append($icon);
        $grid.append($cell);
    }

    symbolPickerState.activeTable = table;
}

/**
 * Open the symbol picker dialog
 */
function openSymbolPicker() {
    var selected = getSelectedSymbol();
    symbolPickerState.activeTable = selected.table;

    // Set active tab
    $('#symbol-tab-primary').toggleClass('active', selected.table === '/');
    $('#symbol-tab-alternate').toggleClass('active', selected.table === '\\');

    // Render the grid for current table
    renderSymbolGrid(selected.table);

    // Show the modal
    var modal = new bootstrap.Modal(document.getElementById('symbolPickerModal'));
    modal.show();
    symbolPickerState.isOpen = true;
}

/**
 * Close the symbol picker dialog
 */
function closeSymbolPicker() {
    var modalEl = document.getElementById('symbolPickerModal');
    var modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) {
        modal.hide();
    }
    symbolPickerState.isOpen = false;
}

/**
 * Handle symbol selection
 * @param {string} table - Table character
 * @param {string} symbol - Symbol code character
 * @param {string} description - Symbol description
 */
function onSymbolSelect(table, symbol, description) {
    console.log('Symbol selected:', table + symbol, '-', description);

    // Save to localStorage
    saveSymbolSelection(table, symbol, description);

    // Update the beacon button
    updateBeaconButtonSymbol();

    // Close the picker
    closeSymbolPicker();

    // Show toast notification
    $.toast({
        heading: 'Symbol Changed',
        text: 'Beacon symbol set to ' + description + ' (' + table + symbol + ')',
        loader: true,
        loaderBg: '#9EC600',
        position: 'top-center',
        hideAfter: 2000
    });
}

/**
 * Switch between primary and alternate symbol tables
 * @param {string} table - Table character ('/' or '\')
 */
function switchSymbolTable(table) {
    if (symbolPickerState.activeTable === table) return;

    $('#symbol-tab-primary').toggleClass('active', table === '/');
    $('#symbol-tab-alternate').toggleClass('active', table === '\\');

    renderSymbolGrid(table);
}

// ============================================================================
// Initialization
// ============================================================================

/** Flag to prevent duplicate initialization */
var symbolPickerInitialized = false;

/**
 * Initialize the symbol picker
 * Should be called after DOM is ready
 */
function init_symbol_picker() {
    // Prevent duplicate initialization
    if (symbolPickerInitialized) {
        console.log('Symbol picker already initialized, skipping');
        return;
    }

    console.log('Initializing symbol picker...');

    // Load saved symbol and update button
    updateBeaconButtonSymbol();

    // Click handler for symbol cells
    $(document).on('click', '.symbol-cell', function() {
        var table = $(this).data('table');
        var symbol = $(this).data('symbol');
        var description = $(this).data('description');
        onSymbolSelect(table, symbol, description);
    });

    // Click handler to open picker from beacon button symbol
    $(document).on('click', '#beacon-symbol-icon', function(e) {
        e.stopPropagation();
        openSymbolPicker();
    });

    // Keyboard handler for beacon symbol icon (Enter/Space to open picker)
    $(document).on('keydown', '#beacon-symbol-icon', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            openSymbolPicker();
        }
    });

    // Tab switching
    $(document).on('click', '#symbol-tab-primary', function() {
        switchSymbolTable('/');
    });

    $(document).on('click', '#symbol-tab-alternate', function() {
        switchSymbolTable('\\');
    });

    // Keyboard support - Escape to close
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape' && symbolPickerState.isOpen) {
            closeSymbolPicker();
        }
    });

    // Hover effect for tooltip
    $(document).on('mouseenter', '.symbol-cell', function() {
        var table = $(this).data('table');
        var symbol = $(this).data('symbol');
        var description = $(this).data('description');
        $('#symbol-picker-info').text(table + symbol + ' - ' + description);
    });

    $(document).on('mouseleave', '.symbol-cell', function() {
        $('#symbol-picker-info').text('Hover over a symbol to see details');
    });

    symbolPickerInitialized = true;
    console.log('Symbol picker initialized');
}

// Make functions available globally
window.getSelectedSymbol = getSelectedSymbol;
window.getSelectedSymbolString = getSelectedSymbolString;
window.openSymbolPicker = openSymbolPicker;
window.init_symbol_picker = init_symbol_picker;
window.updateBeaconButtonSymbol = updateBeaconButtonSymbol;
