#!/usr/bin/env bash

#  SNIPPETS CONFIGURATION
# -----------------------------------------------------

set -e;

# DEPLOYMENT
# -----------------------------------------------------

# the IP address of the server where the build will be deployed to
DEPLOYMENT_HOST="[SERVER]";
# user used to deploy the application
DEPLOYMENT_USER="[USER]";
# directory where the bundle will be uploaded to
UPLOADS_DIR="/home/${DEPLOYMENT_USER}/uploads/";
# directory where the app is running
APP_DIR="/var/www/[DIRECTORY]/";
# temporary directory for deployment
APP_TMP_DIR="/var/www/[DIRECTORY]/tmp/";
# directory to store old builds
BUNDLES_DIR="/var/www/[DIRECTORY]/builds/";
