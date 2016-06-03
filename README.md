node-spotify-webhelper-portscanner
======================
This package is a fork and a extension of the Node Spotify Web Helper module:
https://github.com/nadavbar/node-spotify-webhelper
It keeps the same interface as described in the docs below and extend it to use a port scanner to detect Spotify open ports that supports Spotify local protocol.

Node.js interface for the Spotify WebHelper API, based on this great article: http://cgbystrom.com/articles/deconstructing-spotifys-builtin-http-server/

The API interacts with the SpotifyWebHelper process via HTTP. For windows, the module checks whether SpotifyWebHelper.exe is running, and try to run it if not.

API:

This module exposes the SpotifyWebHelper object, which exposes  the following methods:

 - **getStatus (cb : function(err, res))** -  get current status information (name of song/artist which is currently playing, etc..)
 - **pause (cb : function(err, res))** - pause currently playing song
 - **unpause (cb : function(err, res))** - unpause currently playing song
 - **play (spotifyurl : string, cb : function(err, res))** - play the given spotify url
 - **Constructor (port : number (optional))** - Creates a new SpotifyWebHelper object,
   default port to communicate with the SpotifyWebHelper is 4370, other port can be specified when creating the object.

Examples - Get Status
```javascript
var SpotifyWebHelper = require('node-spotify-webhelper');
var spotify = new SpotifyWebHelper();

// get the name of the song which is currently playing
spotify.getStatus(function (err, res) {
  if (err) {
    return console.error(err);
  }

  console.info('currently playing:',
    res.track.artist_resource.name, '-',  
    res.track.track_resource.name);
});
```

Examples - Port detection
The following example will detect open ports for Spotify desktop applications.
To detect open ports a forked and modified port scanner node module has been used: https://github.com/baalexander/node-portscanner

Each of those ports respond to the Spotify local protocol and can be used to communicate to Spotify desktop application on the same host.


```javascript
var SpotifyWebHelper = require('node-spotify-webhelper-portscanner');
var spotifyClient = new SpotifyWebHelper(); // init with default port
spotifyClient.scanPorts({
  lowPort : 3000,
  highPort : 5000,
  timeout : 300
}
, function(error, ports) {
    if(!error)
      return console.log( ports );
    else return console.error(error);
});
```

where `lowPort` is the lower port number, `highPort` is the higher port number, `timeout` is the socket timeout for the port in `msec`.

An example of the ouput. A json containing a `port` number and an `error` field if any like:

```json
[
  {
    "port": 4370
  },
  {
    "port": 4371,
    "error" : { "error" : "Error: socket hang up", "code" : "ECONNRESET"}
  }
]
```

Examples - Connect to a specific port
As soon as a port is known to work, the Spotify Web Helper can be instantiated with that port to correctly communicate to Spotify running application on the same host:

```javascript
var SpotifyWebHelper = require('node-spotify-webhelper-portscanner');
console.log("Connecting to Spotify on port [%d]...", openPort);
var spotifyClient = new SpotifyWebHelper( { port : openPort });
spotifyClient.getStatus(function (err, res) {
  if (err) {
    return console.error(err);
  }
  console.info('Currently Playing:',
    res.track.artist_resource.name, '-',
    res.track.track_resource.name);
});
return console.log("Spotify is listening on port [%d]", item);

});
```

See `examples/` folder for more examples and code.
