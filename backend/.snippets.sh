#!/usr/bin/env bash

#  SNIPPETS CONFIGURATION
# -----------------------------------------------------

set -e;

# DEPLOYMENT
# -----------------------------------------------------

# the IP address of the server where the build will be deployed to
DEPLOYMENT_HOST="urza.ifi.uzh.ch";
# user used to deploy the application
DEPLOYMENT_USER="appuser";
# directory where the bundle will be uploaded to
UPLOADS_DIR="/home/${DEPLOYMENT_USER}/uploads/";
# directory where the app is running
APP_DIR="/var/www/newsapp/";
# temporary directory for deployment
APP_TMP_DIR="/var/www/newsapp/tmp/";
# directory to store old builds
BUNDLES_DIR="/var/www/newsapp/builds/";
