/**
 * Tour/Onboarding Overlay
 * Provides an educational walkthrough of the UI components
 */

(function() {
    'use strict';

    const TOUR_STORAGE_KEY = 'aprsd-webchat-tour-completed';
    const TOUR_STEPS = [
        {
            id: 'beacon-symbol',
            selector: '#btn_symbol_picker',
            title: 'Beacon Symbol',
            description: 'Click this icon to change your APRS beacon symbol. Choose from cars, houses, bikes, and many more. Your selection is saved for future sessions.',
            position: 'bottom',
            offset: { x: 0, y: 10 },
            spotlightShape: 'rectangle',
            spotlightBorderRadius: 6,
            beforeShow: function() {
                // Ensure GPS modal is closed at the start of the tour
                var gpsModalEl = document.getElementById('gpsModal');
                if (gpsModalEl) {
                    var gpsModal = bootstrap.Modal.getInstance(gpsModalEl);
                    if (gpsModal) gpsModal.hide();
                }
            }
        },
        {
            id: 'gps-button',
            selector: '.btn-gps',
            title: 'GPS & Beaconing',
            description: 'View your GPS coordinates and configure beaconing settings. Click to open the GPS panel.',
            position: 'bottom',
            offset: { x: 0, y: 10 }
        },
        {
            id: 'theme-toggle',
            selector: '#theme-toggle',
            title: 'Theme Toggle',
            description: 'Switch between light and dark themes. Your preference is saved automatically.',
            position: 'bottom',
            offset: { x: 0, y: 10 }
        },
        {
            id: 'gps-info',
            selector: '#gps_info_box',
            title: 'GPS Information',
            description: 'Shows your current GPS coordinates, altitude, speed, and course. This information is used when sending beacons.',
            position: 'bottom',
            offset: { x: 0, y: 10 },
            spotlightShape: 'rectangle',
            spotlightBorderRadius: 8,
            beforeShow: function() {
                // Open the GPS modal to show the GPS info inside it
                var gpsModalEl = document.getElementById('gpsModal');
                if (gpsModalEl) {
                    var gpsModal = bootstrap.Modal.getOrCreateInstance(gpsModalEl);
                    gpsModal.show();
                }
            }
        },
        {
            id: 'beaconing-mode',
            selector: '#beaconing_setting',
            title: 'Beaconing Mode',
            description: 'Drag the slider to control how beacons are sent: Disabled, Manual (send on demand), Interval (automatic every N seconds), or Smart (based on movement).',
            position: 'bottom',
            offset: { x: 0, y: 10 },
            spotlightShape: 'rectangle'
        },
        {
            id: 'send-beacon',
            selector: '#send_beacon_quick',
            title: 'Quick Beacon Button',
            description: 'Click this button to manually send a GPS beacon with your current position and selected symbol. This helps other stations know where you are.',
            position: 'bottom',
            offset: { x: 0, y: 10 },
            spotlightShape: 'rectangle',
            spotlightBorderRadius: 6,
            additionalSelectors: ['#send_beacon'],
            beforeShow: function() {
                // Ensure GPS modal is open so #send_beacon additional spotlight is visible
                var gpsModalEl = document.getElementById('gpsModal');
                if (gpsModalEl) {
                    var gpsModal = bootstrap.Modal.getOrCreateInstance(gpsModalEl);
                    gpsModal.show();
                }
            }
        },
        {
            id: 'save-beacon-settings',
            selector: '#save_beacon_settings',
            title: 'Save Beacon Settings',
            description: 'Save your beaconing mode and interval settings to the server.',
            position: 'top',
            offset: { x: 0, y: -10 },
            spotlightShape: 'rectangle',
            spotlightBorderRadius: 6,
            beforeShow: function() {
                // Ensure GPS modal is open (for when navigating backwards from step 7)
                var gpsModalEl = document.getElementById('gpsModal');
                if (gpsModalEl) {
                    var gpsModal = bootstrap.Modal.getOrCreateInstance(gpsModalEl);
                    gpsModal.show();
                }
            }
        },
        {
            id: 'add-tab',
            selector: '#add-tab-button',
            title: 'Add New Conversation',
            description: 'Click the + tab to start a new conversation. Enter a valid ham radio callsign (e.g., K1ABC) and press Enter.',
            position: 'bottom',
            offset: { x: 0, y: 10 },
            mobileSelector: '#mobileAddChat',
            mobileTitle: 'Add New Conversation',
            mobileDescription: 'Tap the + button to start a new conversation. Enter a valid ham radio callsign (e.g., K1ABC) and press Enter.',
            beforeShow: function() {
                // Close the GPS modal when moving to conversation steps
                var gpsModalEl = document.getElementById('gpsModal');
                if (gpsModalEl) {
                    var gpsModal = bootstrap.Modal.getInstance(gpsModalEl);
                    if (gpsModal) gpsModal.hide();
                }
            }
        },
        {
            id: 'callsign-tabs',
            selector: '.modern-tabs .nav-link:not(#add-tab-button)',
            title: 'Conversation Tabs',
            description: 'Each tab represents a conversation with a callsign. Click a tab to switch conversations. The path selector remembers your choice per callsign.',
            position: 'bottom',
            offset: { x: 0, y: 10 },
            spotlightShape: 'rectangle',
            spotlightBorderRadius: 6,
            mobileSelector: '#mobileChatDropdown',
            mobileTitle: 'Conversations',
            mobileDescription: 'Use this dropdown to switch between conversations. Each callsign you message gets its own entry.',
            optional: true // Only show if tabs exist (desktop) or dropdown has entries (mobile)
        },
        {
            id: 'get-location',
            selector: '#get_location_button',
            title: 'Locate',
            description: 'Request the last known APRS position for the selected callsign. Distance, direction, and last update time appear next to the button. Available only when a callsign tab is selected.',
            position: 'bottom',
            offset: { x: 0, y: 10 },
            optional: true // Only show when at least one callsign tab exists (button is in info bar)
        },
        {
            id: 'connection-status',
            selector: '#radio_icon_svg',
            title: 'Packet Activity Indicator',
            description: 'This indicator shows APRS packet activity. Green means a packet was received, red means a packet was transmitted.',
            position: 'bottom',
            offset: { x: 0, y: 10 }
        },
        {
            id: 'message-input',
            selector: '#message',
            title: 'Message Input',
            description: 'Type your message here. Messages are limited to 67 characters. The send button enables when you have text and a callsign selected.',
            position: 'top',
            offset: { x: 0, y: -10 },
            spotlightShape: 'rectangle',
            spotlightBorderRadius: 6
        },
        {
            id: 'path-selector',
            selector: '#pkt_path',
            title: 'Message Path',
            description: 'Select the APRS path for your message. Common paths include WIDE1-1, WIDE2-1, ARISS, and GATE. Your choice is remembered per callsign.',
            position: 'top',
            offset: { x: 0, y: -10 },
            spotlightShape: 'rectangle',
            spotlightBorderRadius: 6
        },
        {
            id: 'send-button',
            selector: '#send_msg',
            title: 'Send Message',
            description: 'Click to send your message. The button is disabled until you have entered text and selected a callsign tab.',
            position: 'top',
            offset: { x: 0, y: -10 },
            spotlightShape: 'rectangle',
            spotlightBorderRadius: 6
        }
    ];

    let currentStep = 0;
    let stepGeneration = 0; // Incremented each showStep call to cancel stale timers
    let tourRunning = false; // Guard against multiple startTour calls
    let tooltipClickHandler = null; // Store handler reference for proper removal
    let overlay = null;
    let spotlight = null;
    let additionalSpotlights = []; // Array to hold additional spotlight elements
    let tooltip = null;
    let skipButton = null;

    /**
     * Check if tour has been completed
     */
    function isTourCompleted() {
        return localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
    }

    /**
     * Mark tour as completed
     */
    function markTourCompleted() {
        localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    }

    /**
     * Create the overlay elements
     */
    function createOverlay() {
        // Main overlay - transparent, no darkening
        overlay = document.createElement('div');
        overlay.className = 'tour-overlay';
        overlay.id = 'tour-overlay';
        // Ensure overlay is transparent
        overlay.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100% !important; height: 100% !important; z-index: 99998 !important; background: transparent !important; margin: 0 !important; padding: 0 !important; pointer-events: none !important;';

        // Spotlight
        spotlight = document.createElement('div');
        spotlight.className = 'tour-spotlight';
        spotlight.id = 'tour-spotlight';
        // Initial hidden state
        spotlight.style.position = 'fixed';
        spotlight.style.display = 'none';
        spotlight.style.visibility = 'hidden';
        spotlight.style.opacity = '0';

        // Tooltip
        tooltip = document.createElement('div');
        tooltip.className = 'tour-tooltip';
        tooltip.id = 'tour-tooltip';

        // Skip button - will be added to tooltip footer instead
        skipButton = document.createElement('button');
        skipButton.className = 'tour-skip';
        skipButton.id = 'tour-skip';
        skipButton.textContent = 'Skip Tour';
        skipButton.type = 'button';
        skipButton.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            skipTour();
            return false;
        };

        // Add spotlight and tooltip to overlay
        overlay.appendChild(spotlight);
        overlay.appendChild(tooltip);

        // Append overlay to body
        document.body.appendChild(overlay);

        // Skip button will be added to tooltip footer, not here
    }

    /**
     * Get element position and dimensions
     */
    function getElementRect(element) {
        const rect = element.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        return {
            top: rect.top + scrollY,
            left: rect.left + scrollX,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom + scrollY,
            right: rect.right + scrollX
        };
    }

    /**
     * Update spotlight to highlight current element
     */
    function updateSpotlight(element, step) {
        if (!element || !spotlight) {
            return;
        }

        // Use getBoundingClientRect for viewport-relative positioning
        // Since overlay is fixed, we need viewport coordinates
        const rect = element.getBoundingClientRect();
        const padding = 8;

        // Check if this step should use rectangular spotlight
        const useRectangle = step && step.spotlightShape === 'rectangle';

        if (useRectangle) {
            // Rectangular spotlight that fits the element
            const borderRadius = step.spotlightBorderRadius || 8;
            spotlight.style.cssText = `
                position: fixed !important;
                top: ${rect.top - padding}px !important;
                left: ${rect.left - padding}px !important;
                width: ${rect.width + (padding * 2)}px !important;
                height: ${rect.height + (padding * 2)}px !important;
                border-radius: ${borderRadius}px !important;
                border: 4px solid #ef4444 !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                z-index: 2147483646 !important;
                background: transparent !important;
                box-shadow: 0 0 0 4px #ef4444, 0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.5) !important;
                pointer-events: none !important;
                margin: 0 !important;
                padding: 0 !important;
                transform: translateZ(0) !important;
                will-change: transform !important;
            `;
        } else {
            // Circular spotlight (default behavior)
            // Calculate dimensions for a circle that encompasses the element
            // Use the larger dimension (width or height) plus extra padding for visibility
            // For very large elements (like input boxes), cap the circle size
            const elementSize = Math.max(rect.width, rect.height);
            const minCircleSize = 60; // Minimum circle size for visibility
            const maxCircleSize = step && step.spotlightSize ? step.spotlightSize : 120; // Allow override per step
            const calculatedSize = elementSize + (padding * 4);
            const circleSize = Math.min(maxCircleSize, Math.max(minCircleSize, calculatedSize));
            const centerX = rect.left + (rect.width / 2);
            const centerY = rect.top + (rect.height / 2);

            // Position spotlight to create a red circle around the element
            // Overlay is fixed, so use viewport coordinates directly
            // Use maximum z-index to ensure it's above everything, including headers
            // Set z-index to be just below tooltip (2147483647) but above all page content
            spotlight.style.cssText = `
                position: fixed !important;
                top: ${centerY - (circleSize / 2)}px !important;
                left: ${centerX - (circleSize / 2)}px !important;
                width: ${circleSize}px !important;
                height: ${circleSize}px !important;
                border-radius: 50% !important;
                border: 4px solid #ef4444 !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                z-index: 2147483646 !important;
                background: transparent !important;
                box-shadow: 0 0 0 4px #ef4444, 0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.5) !important;
                pointer-events: none !important;
                margin: 0 !important;
                padding: 0 !important;
                transform: translateZ(0) !important;
                will-change: transform !important;
            `;
        }

        // Also ensure overlay has high z-index
        if (overlay) {
            overlay.style.zIndex = '2147483645';
        }

        // Ensure the element is visible, but keep its z-index lower than spotlight
        // The spotlight should be above the element, not the element above the spotlight
        const originalZIndex = element.style.zIndex || window.getComputedStyle(element).zIndex || '';
        const originalPosition = window.getComputedStyle(element).position;

        // Set element z-index to be visible but below spotlight
        // Spotlight is at 2147483646, so element can be lower
        element.style.zIndex = '2147483645';
        if (originalPosition === 'static') {
            element.style.position = 'relative';
        }
        element.setAttribute('data-tour-original-z-index', originalZIndex);
        element.setAttribute('data-tour-original-position', originalPosition);

        // Also ensure parent containers don't clip the element and are below spotlight
        let parent = element.parentElement;
        let depth = 0;
        while (parent && depth < 5) {
            const parentZIndex = window.getComputedStyle(parent).zIndex;
            const parentZIndexNum = parentZIndex && parentZIndex !== 'auto' ? parseInt(parentZIndex) : 0;
            // Only adjust if parent z-index is lower than what we need
            if (parentZIndexNum < 2147483645) {
                const origParentZ = parent.style.zIndex || '';
                parent.style.zIndex = '2147483645';
                parent.setAttribute('data-tour-original-z-index', origParentZ);
            }
            parent = parent.parentElement;
            depth++;
        }
    }

    /**
     * Clear all additional spotlights
     */
    function clearAdditionalSpotlights() {
        additionalSpotlights.forEach(s => {
            if (s && s.parentNode) {
                s.parentNode.removeChild(s);
            }
        });
        additionalSpotlights = [];
    }

    /**
     * Create and update additional spotlights for a step
     */
    function updateAdditionalSpotlights(step) {
        // Clear any existing additional spotlights
        clearAdditionalSpotlights();

        if (!step.additionalSelectors || !Array.isArray(step.additionalSelectors)) {
            return;
        }

        step.additionalSelectors.forEach((selector, index) => {
            const element = document.querySelector(selector);
            if (!element || !overlay) return;

            // Create a new spotlight element
            const additionalSpotlight = document.createElement('div');
            additionalSpotlight.className = 'tour-spotlight tour-spotlight-additional';
            additionalSpotlight.id = `tour-spotlight-additional-${index}`;

            // Get element position
            const rect = element.getBoundingClientRect();
            const padding = 8;

            // Use step settings for shape
            const useRectangle = step.spotlightShape === 'rectangle';
            const borderRadius = step.spotlightBorderRadius || 8;

            if (useRectangle) {
                additionalSpotlight.style.cssText = `
                    position: fixed !important;
                    top: ${rect.top - padding}px !important;
                    left: ${rect.left - padding}px !important;
                    width: ${rect.width + (padding * 2)}px !important;
                    height: ${rect.height + (padding * 2)}px !important;
                    border-radius: ${borderRadius}px !important;
                    border: 4px solid #ef4444 !important;
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    z-index: 2147483646 !important;
                    background: transparent !important;
                    box-shadow: 0 0 0 4px #ef4444, 0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.5) !important;
                    pointer-events: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    transform: translateZ(0) !important;
                    will-change: transform !important;
                `;
            } else {
                const elementSize = Math.max(rect.width, rect.height);
                const minCircleSize = 60;
                const maxCircleSize = step.spotlightSize || 120;
                const calculatedSize = elementSize + (padding * 4);
                const circleSize = Math.min(maxCircleSize, Math.max(minCircleSize, calculatedSize));
                const centerX = rect.left + (rect.width / 2);
                const centerY = rect.top + (rect.height / 2);

                additionalSpotlight.style.cssText = `
                    position: fixed !important;
                    top: ${centerY - (circleSize / 2)}px !important;
                    left: ${centerX - (circleSize / 2)}px !important;
                    width: ${circleSize}px !important;
                    height: ${circleSize}px !important;
                    border-radius: 50% !important;
                    border: 4px solid #ef4444 !important;
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    z-index: 2147483646 !important;
                    background: transparent !important;
                    box-shadow: 0 0 0 4px #ef4444, 0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.5) !important;
                    pointer-events: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    transform: translateZ(0) !important;
                    will-change: transform !important;
                `;
            }

            overlay.appendChild(additionalSpotlight);
            additionalSpotlights.push(additionalSpotlight);

            // Set z-index for additional element
            element.style.zIndex = '2147483645';
            const originalPosition = window.getComputedStyle(element).position;
            if (originalPosition === 'static') {
                element.style.position = 'relative';
            }
        });
    }

    /**
     * Update tooltip position and content
     */
    function updateTooltip(step, element) {
        if (!element || !tooltip) {
            return;
        }

        // Use getBoundingClientRect for viewport-relative positioning
        const elementRect = element.getBoundingClientRect();
        const offset = step.offset || { x: 0, y: 0 };
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = 16;

        // Clear existing content
        tooltip.innerHTML = '';

        // Create content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'tour-tooltip-content';
        contentWrapper.style.padding = '5px';

        // Create title
        const titleDiv = document.createElement('div');
        titleDiv.className = 'tour-tooltip-title';
        const titleIcon = document.createElement('span');
        titleIcon.className = 'material-symbols-rounded';
        titleIcon.textContent = 'info';
        titleDiv.appendChild(titleIcon);
        titleDiv.appendChild(document.createTextNode(step.title));
        contentWrapper.appendChild(titleDiv);

        // Create description
        const descDiv = document.createElement('div');
        descDiv.className = 'tour-tooltip-description';
        descDiv.textContent = step.description;
        contentWrapper.appendChild(descDiv);

        // Create footer
        const footerDiv = document.createElement('div');
        footerDiv.className = 'tour-tooltip-footer';

        // Create buttons container
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'tour-buttons';

        // Add skip button to the buttons container (first, on the left)
        // Create a fresh skip button for this step
        const skipBtn = document.createElement('button');
        skipBtn.className = 'btn btn-sm btn-secondary tour-skip';
        skipBtn.id = 'tour-skip';
        skipBtn.textContent = 'Skip Tour';
        skipBtn.type = 'button';
        skipBtn.style.cssText = 'pointer-events: all !important; cursor: pointer !important; padding: 0.125rem 0.5rem !important; font-size: 0.8125rem !important; line-height: 1.2 !important; min-height: auto !important; height: auto !important;';

        // Create a named handler function
        const skipButtonClickHandler = function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            try {
                skipTour();
            } catch (error) {
                console.error('Error in skipTour():', error);
            }
            return false;
        };

        // Attach multiple event handlers for maximum reliability
        skipBtn.addEventListener('click', skipButtonClickHandler, true); // Capture phase
        skipBtn.addEventListener('click', skipButtonClickHandler, false); // Bubble phase
        skipBtn.onclick = skipButtonClickHandler; // Direct onclick
        skipBtn.onmousedown = function(e) {
            e.preventDefault();
            skipButtonClickHandler(e);
            return false;
        };

        buttonsDiv.appendChild(skipBtn);

        // Create Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-sm btn-secondary tour-button';
        prevBtn.id = 'tour-prev';
        prevBtn.textContent = 'Previous';
        prevBtn.type = 'button'; // Prevent form submission if inside a form
        prevBtn.style.cssText = 'pointer-events: all !important; cursor: pointer !important; padding: 0.125rem 0.5rem !important; font-size: 0.8125rem !important; line-height: 1.2 !important; min-height: auto !important; height: auto !important;';

        if (currentStep === 0) {
            prevBtn.disabled = true;
        }

        // Create a named handler function so we can verify it's attached
        const prevButtonClickHandler = function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            try {
                previousStep();
            } catch (error) {
                console.error('Error in previousStep():', error);
            }
            return false;
        };

        // Attach multiple event handlers (only if not disabled)
        if (!prevBtn.disabled) {
            prevBtn.addEventListener('click', prevButtonClickHandler, true); // Capture phase
            prevBtn.addEventListener('click', prevButtonClickHandler, false); // Bubble phase
            prevBtn.onclick = prevButtonClickHandler; // Direct onclick
            prevBtn.onmousedown = function(e) {
                e.preventDefault();
                prevButtonClickHandler(e);
                return false;
            };
        }

        buttonsDiv.appendChild(prevBtn);

        // Create Next/Finish button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-sm btn-primary tour-button';
        nextBtn.id = 'tour-next';
        nextBtn.textContent = currentStep === getVisibleSteps().length - 1 ? 'Finish' : 'Next';
        nextBtn.type = 'button'; // Prevent form submission if inside a form
        nextBtn.style.cssText = 'pointer-events: all !important; cursor: pointer !important; padding: 0.125rem 0.5rem !important; font-size: 0.8125rem !important; line-height: 1.2 !important; min-height: auto !important; height: auto !important;';

        // Create a named handler function so we can verify it's attached
        const nextButtonClickHandler = function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            try {
                nextStep();
            } catch (error) {
                console.error('Error in nextStep():', error);
            }
            return false;
        };

        // Attach multiple event handlers
        nextBtn.addEventListener('click', nextButtonClickHandler, true); // Capture phase
        nextBtn.addEventListener('click', nextButtonClickHandler, false); // Bubble phase
        nextBtn.onclick = nextButtonClickHandler; // Direct onclick
        nextBtn.onmousedown = function(e) {
            e.preventDefault();
            nextButtonClickHandler(e);
            return false;
        };

        buttonsDiv.appendChild(nextBtn);

        // Create progress text and add it AFTER the buttons (to the right)
        const progressSpan = document.createElement('span');
        progressSpan.className = 'tour-progress';
        progressSpan.textContent = `${currentStep + 1} of ${getVisibleSteps().length}`;
        progressSpan.style.marginLeft = 'var(--spacing-md)';
        progressSpan.style.paddingLeft = 'var(--spacing-md)';
        buttonsDiv.appendChild(progressSpan);

        footerDiv.appendChild(buttonsDiv);
        contentWrapper.appendChild(footerDiv);
        tooltip.appendChild(contentWrapper);

        // Set data attribute for arrow positioning
        tooltip.setAttribute('data-position', step.position || 'bottom');

        // Make tooltip temporarily visible to get dimensions
        // Use fixed positioning for measurement to match final rendering
        tooltip.style.visibility = 'hidden';
        tooltip.style.display = 'block';
        tooltip.style.position = 'fixed';
        tooltip.style.top = '0';
        tooltip.style.left = '0';
        // Clear any stale inline width constraints from previous steps
        // (tour.css !important rules handle max-width/min-width)
        tooltip.style.removeProperty('max-width');
        tooltip.style.removeProperty('min-width');

        // Force a reflow to ensure dimensions are calculated
        void tooltip.offsetWidth;

        const tooltipRect = tooltip.getBoundingClientRect();
        let top, left;

        // Position based on step.position
        // Use elementRect (already calculated above) for accurate positioning relative to viewport
        var gap = 16; // gap between element and tooltip

        function calcPosition(pos) {
            var t, l;
            if (pos === 'top') {
                t = elementRect.top - tooltipRect.height - gap + offset.y;
                l = elementRect.left + (elementRect.width / 2) - (tooltipRect.width / 2) + offset.x;
            } else if (pos === 'left') {
                t = elementRect.top + (elementRect.height / 2) - (tooltipRect.height / 2) + offset.y;
                l = elementRect.left - tooltipRect.width - gap + offset.x;
            } else if (pos === 'right') {
                t = elementRect.top + (elementRect.height / 2) - (tooltipRect.height / 2) + offset.y;
                l = elementRect.right + gap + offset.x;
            } else { // bottom
                t = elementRect.bottom + gap + offset.y;
                l = elementRect.left + (elementRect.width / 2) - (tooltipRect.width / 2) + offset.x;
            }
            // Clamp horizontal
            if (l < margin) l = margin;
            if (l + tooltipRect.width > viewportWidth - margin) {
                l = viewportWidth - tooltipRect.width - margin;
            }
            return { top: t, left: l };
        }

        function overlapsElement(t, l) {
            var tRight = l + tooltipRect.width;
            var tBottom = t + tooltipRect.height;
            return !(l >= elementRect.right || tRight <= elementRect.left ||
                     t >= elementRect.bottom || tBottom <= elementRect.top);
        }

        var preferred = step.position || 'bottom';
        var fallbackOrder = { top: ['bottom', 'left', 'right'], bottom: ['top', 'left', 'right'],
                              left: ['right', 'bottom', 'top'], right: ['left', 'bottom', 'top'] };
        var pos = calcPosition(preferred);
        top = pos.top;
        left = pos.left;

        // If preferred position overlaps the element, try fallbacks
        if (overlapsElement(top, left)) {
            var fallbacks = fallbackOrder[preferred] || ['bottom'];
            for (var fi = 0; fi < fallbacks.length; fi++) {
                var altPos = calcPosition(fallbacks[fi]);
                if (!overlapsElement(altPos.top, altPos.left)) {
                    top = altPos.top;
                    left = altPos.left;
                    tooltip.setAttribute('data-position', fallbacks[fi]);
                    break;
                }
            }
        }

        // Account for header height when positioning near top
        const header = document.querySelector('.wc-header');
        const headerHeight = header ? header.getBoundingClientRect().height : 0;
        const minTop = Math.max(margin, headerHeight + margin);

        if (top < minTop) top = minTop;
        if (top + tooltipRect.height > viewportHeight - margin) {
            top = viewportHeight - tooltipRect.height - margin;
        }

        // Get computed CSS variable values
        const computedStyle = getComputedStyle(document.documentElement);
        const bgPrimary = computedStyle.getPropertyValue('--bg-primary').trim() || '#ffffff';
        const primaryColor = computedStyle.getPropertyValue('--primary-color').trim() || '#2563eb';

        // Use fixed positioning with viewport coordinates
        tooltip.style.top = top + 'px';
        tooltip.style.left = left + 'px';
        tooltip.style.visibility = 'visible';
        tooltip.style.display = 'block';
        tooltip.style.position = 'fixed';
        tooltip.style.zIndex = '2147483647';
        tooltip.style.background = bgPrimary;
        tooltip.style.border = '2px solid #22c55e';
        tooltip.style.borderRadius = '16px';
        tooltip.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.2)';
        tooltip.style.padding = '0';
        tooltip.style.margin = '0';
        tooltip.style.overflow = 'hidden';
        // min-width/max-width handled by tour.css with !important

        // Ensure no inline opacity is set - CSS will handle it via .active class
        if (tooltip.style.opacity !== '') {
            tooltip.style.removeProperty('opacity');
        }

        // Event listeners are already attached during button creation (programmatic)
        // Keep event delegation as backup
        if (tooltipClickHandler) {
            tooltip.removeEventListener('click', tooltipClickHandler, true);
        }
        tooltip.addEventListener('click', tooltipClickHandler, true); // Use capture phase for better reliability
    }

    /**
     * Handle clicks within the tooltip (event delegation)
     */
    function handleTooltipClick(e) {
        const target = e.target;

        // Check if the click is on a button or inside a button
        let nextBtn = null;
        let prevBtn = null;

        if (target.id === 'tour-next') {
            nextBtn = target;
        } else if (target.closest && target.closest('#tour-next')) {
            nextBtn = target.closest('#tour-next');
        }

        if (target.id === 'tour-prev') {
            prevBtn = target;
        } else if (target.closest && target.closest('#tour-prev')) {
            prevBtn = target.closest('#tour-prev');
        }

        if (nextBtn) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            nextStep();
            return false;
        } else if (prevBtn && !prevBtn.hasAttribute('disabled') && prevBtn.disabled !== true) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            previousStep();
            return false;
        }
    }

    // Create and store the handler function
    tooltipClickHandler = handleTooltipClick;

    /**
     * Resolve the effective selector, title, and description for a step.
     * If the primary element is hidden and a mobileSelector exists, use the mobile variant.
     */
    function resolveStep(step) {
        var element = document.querySelector(step.selector);
        var isVisible = element && element.offsetParent !== null;

        if (!isVisible && step.mobileSelector) {
            var mobileEl = document.querySelector(step.mobileSelector);
            if (mobileEl && mobileEl.offsetParent !== null) {
                return {
                    selector: step.mobileSelector,
                    title: step.mobileTitle || step.title,
                    description: step.mobileDescription || step.description,
                    isMobile: true
                };
            }
        }
        return {
            selector: step.selector,
            title: step.title,
            description: step.description,
            isMobile: false
        };
    }

    /**
     * Get visible steps (filter out optional steps if elements don't exist)
     */
    function getVisibleSteps() {
        return TOUR_STEPS.filter(step => {
            var resolved = resolveStep(step);
            var element = document.querySelector(resolved.selector);
            if (step.optional) {
                return element && element.offsetParent !== null;
            }
            return true;
        });
    }

    /**
     * Show current step
     */
    function showStep(stepIndex) {
        const visibleSteps = getVisibleSteps();

        if (stepIndex < 0 || stepIndex >= visibleSteps.length) {
            endTour();
            return;
        }

        // Increment generation to invalidate any pending timers from previous steps
        const thisGeneration = ++stepGeneration;

        currentStep = stepIndex;
        const step = visibleSteps[currentStep];

        // Resolve mobile fallback if needed
        const resolved = resolveStep(step);
        const activeSelector = resolved.selector;
        const activeTitle = resolved.title;
        const activeDescription = resolved.description;

        const element = document.querySelector(activeSelector);

        if (!element) {
            // Try to find element one more time after a short delay
            setTimeout(() => {
                if (stepGeneration !== thisGeneration) return;
                const retryElement = document.querySelector(activeSelector);
                if (!retryElement) {
                    // Skip this step if element doesn't exist
                    if (stepIndex < visibleSteps.length - 1) {
                        showStep(stepIndex + 1);
                    } else {
                        endTour();
                    }
                } else {
                    // Element found, continue with this step
                    showStep(stepIndex);
                }
            }, 100);
            return;
        }

        // Create an effective step with resolved title/description for tooltip rendering
        const effectiveStep = Object.assign({}, step, {
            title: activeTitle,
            description: activeDescription
        });

        // Call beforeShow hook if defined
        if (step.beforeShow && typeof step.beforeShow === 'function') {
            step.beforeShow();
        }

        // Show overlay first (before scrolling)
        if (overlay) {
            overlay.classList.add('active');
        }

        // Ensure spotlight exists and is in DOM
        if (!spotlight || !document.body.contains(spotlight)) {
            if (spotlight && spotlight.parentNode) {
                spotlight.parentNode.removeChild(spotlight);
            }
            // Recreate spotlight if needed
            if (overlay) {
                spotlight = document.createElement('div');
                spotlight.className = 'tour-spotlight';
                spotlight.id = 'tour-spotlight';
                overlay.appendChild(spotlight);
            }
        }

        // Update spotlight IMMEDIATELY (before scrolling) so it's visible right away
        updateSpotlight(element, effectiveStep);

        // Update additional spotlights if defined
        updateAdditionalSpotlights(effectiveStep);

        // Explicitly ensure spotlight is visible immediately with multiple attempts
        if (spotlight) {
            spotlight.style.display = 'block';
            spotlight.style.visibility = 'visible';
            spotlight.style.opacity = '1';
            spotlight.style.zIndex = '2147483646';

            // Force a reflow to ensure styles are applied
            void spotlight.offsetWidth;

            // Double-check visibility after reflow
            setTimeout(() => {
                if (stepGeneration !== thisGeneration) return;
                if (spotlight) {
                    spotlight.style.display = 'block';
                    spotlight.style.visibility = 'visible';
                    spotlight.style.opacity = '1';
                }
            }, 0);
        }

        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

        // Wait for scroll to complete, then update positions and show tooltip
        setTimeout(() => {
            // If user navigated to a different step, abandon this callback
            if (stepGeneration !== thisGeneration) return;

            // Update spotlight position again after scroll (element may have moved)
            updateSpotlight(element, effectiveStep);

            // Update additional spotlights after scroll
            updateAdditionalSpotlights(effectiveStep);

            // Force a reflow to ensure spotlight is rendered
            void spotlight.offsetWidth;

            // Explicitly ensure spotlight is still visible
            if (spotlight) {
                spotlight.style.display = 'block';
                spotlight.style.visibility = 'visible';
                spotlight.style.opacity = '1';
            }

            // Update tooltip position (skip button is now inside tooltip)
            updateTooltip(effectiveStep, element);

            // Show tooltip
            if (tooltip) {
                tooltip.classList.add('active');
            }
        }, 300);
    }

    /**
     * Reset element z-index and position
     */
    function resetElementZIndex(element) {
        if (!element) return;
        const originalZIndex = element.getAttribute('data-tour-original-z-index');
        const originalPosition = element.getAttribute('data-tour-original-position');

        if (originalZIndex !== null && originalZIndex !== '') {
            element.style.zIndex = originalZIndex;
        } else {
            element.style.zIndex = '';
        }
        element.removeAttribute('data-tour-original-z-index');

        if (originalPosition !== null && originalPosition !== 'static') {
            element.style.position = originalPosition;
        } else if (originalPosition === 'static') {
            element.style.position = '';
        }
        element.removeAttribute('data-tour-original-position');

        // Reset parent z-index if it was modified
        let parent = element.parentElement;
        let depth = 0;
        while (parent && depth < 5) {
            if (parent.hasAttribute('data-tour-original-z-index')) {
                const origParentZ = parent.getAttribute('data-tour-original-z-index');
                if (origParentZ !== null && origParentZ !== '') {
                    parent.style.zIndex = origParentZ;
                } else {
                    parent.style.zIndex = '';
                }
                parent.removeAttribute('data-tour-original-z-index');
            }
            parent = parent.parentElement;
            depth++;
        }
    }

    /**
     * Next step
     */
    function nextStep() {
        const visibleSteps = getVisibleSteps();

        if (currentStep < visibleSteps.length - 1) {
            // Reset z-index of previous element
            const prevStep = visibleSteps[currentStep];
            const prevElement = document.querySelector(prevStep.selector);
            if (prevElement) {
                resetElementZIndex(prevElement);
            }

            // Hide tooltip
            if (tooltip) {
                tooltip.classList.remove('active');
            }

            // Move to next step
            const nextStepIndex = currentStep + 1;
            setTimeout(() => {
                showStep(nextStepIndex);
            }, 200);
        } else {
            // Reset z-index before ending
            const lastStep = visibleSteps[currentStep];
            const lastElement = document.querySelector(lastStep.selector);
            if (lastElement) {
                resetElementZIndex(lastElement);
            }
            endTour();
        }
    }

    /**
     * Previous step
     */
    function previousStep() {
        const visibleSteps = getVisibleSteps();

        if (currentStep > 0) {
            // Reset z-index of current element
            const currentStepObj = visibleSteps[currentStep];
            const currentElement = document.querySelector(currentStepObj.selector);
            if (currentElement) {
                resetElementZIndex(currentElement);
            }

            // Hide tooltip
            if (tooltip) {
                tooltip.classList.remove('active');
            }

            // Find the previous step that has an element (don't skip steps when going backward)
            let prevStepIndex = currentStep - 1;
            let foundValidStep = false;

            // Go backward until we find a step with an element
            while (prevStepIndex >= 0 && !foundValidStep) {
                const prevStep = visibleSteps[prevStepIndex];
                const prevElement = document.querySelector(prevStep.selector);
                if (prevElement) {
                    foundValidStep = true;
                } else {
                    prevStepIndex--;
                }
            }

            if (foundValidStep && prevStepIndex >= 0) {
                setTimeout(() => {
                    showStep(prevStepIndex);
                }, 200);
            }
        }
    }

    /**
     * Skip tour
     */
    function skipTour() {
        markTourCompleted();
        endTour();
    }

    /**
     * End tour
     */
    function endTour() {
        // Reset z-index of all highlighted elements FIRST, before hiding anything
        const visibleSteps = getVisibleSteps();
        visibleSteps.forEach(step => {
            const element = document.querySelector(step.selector);
            if (element) {
                resetElementZIndex(element);
            }
            // Also reset additional selector elements
            if (step.additionalSelectors) {
                step.additionalSelectors.forEach(selector => {
                    const additionalElement = document.querySelector(selector);
                    if (additionalElement) {
                        resetElementZIndex(additionalElement);
                    }
                });
            }
        });

        // Hide spotlight immediately
        if (spotlight) {
            spotlight.style.display = 'none';
            spotlight.style.visibility = 'hidden';
            spotlight.style.opacity = '0';
        }

        // Clear additional spotlights
        clearAdditionalSpotlights();

        if (overlay) {
            overlay.classList.remove('active');
            if (tooltip) {
                tooltip.classList.remove('active');
            }
            setTimeout(() => {
                if (overlay && overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300);
        }

        // Skip button is now inside tooltip, so it will be removed with overlay
        skipButton = null;

        tourRunning = false;
        markTourCompleted();
    }

    /**
     * Start tour
     * @param {boolean} force - If true, start even if tour was completed
     */
    function startTour(force) {
        // Check if tour is completed (unless forced)
        if (!force && isTourCompleted()) {
            return;
        }

        // Prevent re-entry if tour is already running
        if (tourRunning && !force) {
            return;
        }
        tourRunning = true;

        // Clean up any existing overlay first
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
            overlay = null;
            spotlight = null;
            tooltip = null;
        }

        // Clean up skip button separately
        if (skipButton && skipButton.parentNode) {
            skipButton.parentNode.removeChild(skipButton);
            skipButton = null;
        }

        // Reset current step
        currentStep = 0;
        stepGeneration++; // Cancel any stale timers from a previous tour run

        createOverlay();

        // Wait a moment for overlay to be added to DOM
        setTimeout(function() {
            showStep(0);
        }, 100);
    }

    /**
     * Wait for required elements to exist
     */
    function waitForElements(callback, maxAttempts = 30) {
        let attempts = 0;
        let callbackFired = false;
        const requiredSelectors = ['#theme-toggle', '.btn-gps', '#btn_symbol_picker', '#message', '#pkt_path', '#send_msg'];

        function checkElements() {
            if (callbackFired) return;
            attempts++;
            const allRequiredExist = requiredSelectors.every(selector => {
                const element = document.querySelector(selector);
                return element && element.offsetParent !== null;
            });

            if (allRequiredExist || attempts >= maxAttempts) {
                callbackFired = true;
                callback();
            } else {
                setTimeout(checkElements, 200);
            }
        }

        checkElements();
    }

    /**
     * Initialize tour on page load
     */
    function initTour() {
        // Wait for DOM to be ready and elements to exist
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                waitForElements(startTour);
            });
        } else {
            waitForElements(startTour);
        }
    }

    // Export for external use
    window.aprsdTour = {
        start: function() {
            // Force start even if completed
            localStorage.removeItem(TOUR_STORAGE_KEY);
            startTour(true);
        },
        skip: skipTour,
        reset: function() {
            localStorage.removeItem(TOUR_STORAGE_KEY);
            startTour(true);
        }
    };

    // Auto-start on page load
    initTour();
})();
