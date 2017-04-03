# Denko Remote Camera  #

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
sudo npm start <mode> # sudo is needed for serial.
                      # and <mode> is defined in `config/default.json`
```

#### TODO ####
- [ ] Usable admin page.
- [x] Adaptive frame event on client.
- [x] Camera image rotation and arbitrary ratio.
- [ ] Use config for some settings.
- [ ] Say command (or some tts) on io\_node
- [ ] Chat application.
- [x] Encryption (express and socket.io).
