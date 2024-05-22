#Instructions for Docker to install the necessary software and dependencies to run the Informfully Backend on a Docker container

#Configuration given from phusion passenger docker, "https://github.com/phusion/passenger-docker"
#Version 2.0.0 still has a Node version 14, which is compatible with the local Meteor Node version 12.
#If you want to generate the Docker image with the latest Node version, you need to make sure that the local
#Meteor Node version is compatible with it (or even better, it is the same)
FROM phusion/passenger-nodejs:2.0.0
#FROM phusion/passenger-nodejs
ENV HOME /root
CMD ["/sbin/my_init"]

#Install necessary tools required in further steps
RUN apt-get update \
&& apt-get install -y wget \
&& apt-get install -y sudo

#Install MongoDB
RUN wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | apt-key add - \
&& echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-4.4.list \
&& apt-get update
RUN apt-get install -y mongodb \
&& sudo apt-get update

#Configuration for packaging the Informfully Backend
WORKDIR '/home/app/'
COPY package.json .
COPY Passengerfile.json .
#RUN npm install --legacy-peer-deps // Uncomment if there is an issue with npm modules
COPY . .

#Install all dependencies of the bundle, similar to manual deployment (it uses the Node/NPM version of the Docker image)
WORKDIR '/home/app/bundle/programs/server'
RUN npm install --only=prod
WORKDIR '/home/app/'

#Make a database directory for MongoDB in the Docker image and change owner permissions for the directory to allow access
RUN sudo mkdir -p /data/db
RUN sudo chown `id -u` /data/db/
#RUN sudo mkdir /log
#RUN sudo chown `id -u` /log
#RUN mongod --dbpath /data/db --logpath /log/mongod.log --fork

#Uncomment if Meteor is required to be downloaded
#RUN apt-get update -y && apt-get upgrade -y
#RUN curl https://install.meteor.com/ | sh

#Start the MongoDB service
CMD ["mongod"]
