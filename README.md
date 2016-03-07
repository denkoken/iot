# Denko-IOT  #

### Testing Environments ###
* Ubuntu 14.04, Node.js 5.5.0, npm 3.3.12

### Settings ###
edit `config/default.json` and `config/log.json`

### Setup and Run ###

#### Web Server (and Local Node) ####
```
cd server
npm install
npm start
```

#### Remote Node ####
```
cd remote_node
npm install
sudo npm start  # sudo is needed for serial.
```

#### TODO ####
* Usable admin page.
* Adaptive frame event on client.
* Camera image rotation and arbitrary ratio.
* Use config for some settings.
* Say command (or some tts) on io\_node
* Chat application.
* Encryption (express and socket.io).
