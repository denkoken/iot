# Node.js Interactive Observing T  #

### Testing Environments ###
* Ubuntu 14.04, Node.js 5.5.0, npm 3.3.12

### Settings ###
edit `config/default.json` and `config/log.json`

### Setup and Run ###

#### Web Server ####
```
cd server
npm install
npm start
```

#### Camera Node ####
```
cd camera_node
npm install
sudo npm start  # sudo is needed for serial.
```
