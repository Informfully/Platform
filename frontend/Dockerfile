FROM node:16.13.0-alpine

# host local ip address
ENV REACT_NATIVE_PACKAGER_HOSTNAME=192.168.0.12

ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0

EXPOSE 19000
EXPOSE 19001
EXPOSE 19002

WORKDIR '/app'

COPY package.json .
COPY app.json .
RUN npm install --global expo-cli
RUN npm install --legacy-peer-deps
COPY . .

CMD ["expo", "start"]
