/*
 * contentscript.js
 */

import Agent from './libs/Agent';

/**
 * Agent.
 */
window.Agent = new Agent(window, chrome);
