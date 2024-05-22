#!/usr/bin/env bash

. ./.snippets.sh;

echo "-> Building

- Generating a new meteor bundle...
";

meteor build --server-only --architecture os.linux.x86_64 ./.build/

echo "
-> Meteor bundle ./.build/backend.tar.gz created!

Copying newly created bundle onto ${DEPLOYMENT_HOST} as ${DEPLOYMENT_USER}
";

scp ./.build/backend.tar.gz ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST}:${UPLOADS_DIR}

echo "
-> Successfully transferred files to server

Remotely installing application...
"

ssh ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST} bash <<- EOF
    mkdir -p ${APP_TMP_DIR}
    mkdir -p ${UPLOADS_DIR}
    mkdir -p ${APP_DIR}/bundle
    mkdir -p ${APP_TMP_DIR}/bundle
    mkdir -p ${BUNDLES_DIR}

    cd ${APP_TMP_DIR}
    mv ${UPLOADS_DIR}backend.tar.gz .
    tar xzf backend.tar.gz
    cd ./bundle/programs/server
    npm install --only=prod
    cd ${APP_DIR}
    rm -rf bundle
    mv ${APP_TMP_DIR}bundle ${APP_DIR}bundle
    mv ${APP_TMP_DIR}backend.tar.gz ${BUNDLES_DIR}
    passenger-config restart-app /var/www/newsapp/
EOF

echo "Finished build and install"
sleep 15  # Waits 15 seconds.
exit;
