/**
 * Vercel Serverless Entry Point
 *
 * Vercel expects a default export that is a Node.js http.IncomingMessage handler.
 * Express app satisfies this interface directly.
 */
export { app as default } from '../src/app.js';
