/* style.css */

/* Global Resets */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent; /* Removes blue tap box on mobile */
}

body, html {
    width: 100%;
    height: 100%;
    background-color: #000;
    overflow: hidden; /* Prevents body scrolling while dragging windows */
    font-family: monospace;
}

/* Background Video Fix */
#master-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    object-fit: cover; /* Ensures it fills the screen perfectly */
    z-index: -1; /* Keeps it behind everything */
    pointer-events: none; /* User cannot interact with/pause the background */
    border: none !important;
    outline: none !important;
}

/* Remove default mobile video UI overlays */
video::-webkit-media-controls {
    display: none !important;
}

/* Main UI Layer */
#ui-layer {
    position: relative;
    width: 100%;
    height: 100%;
    z-index: 10;
}