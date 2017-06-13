/*
 * contentscript.js
 */

import Agent from './libs/Agent';

/**
 * LinkBlanker agent.
 */
window.Agent = new Agent(window, chrome);
