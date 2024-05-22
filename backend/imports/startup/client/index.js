/**
 * This is the main entry point for all client-side code that must be
 * loaded during the startup of the application.
 *
 * Meteor differentiates between code that is loaded and executed during
 * the startup of the application and code that is imported and therewith
 * made accessible to some part of the application (server or client).
 *
 * Meteor follows a special load order with special directories.
 * One such directory is the 'startup' directory (in fact, any directory
 * called 'startup'). Code inside this directory is loaded during startup.
 * Another special directory is the 'client' directory (again, actually
 * every directory called 'client'). Code inside this directory is only
 * accessible on the client.
 *
 * For a more detailed description on this please consult the meteor docs
 * https://guide.meteor.com/structure.html#special-directories
 *
 * NOTICE: this file is imported in /client/main.js
 *
 */
import './router';
