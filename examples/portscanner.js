/**
* Spotify WebHelper + Port Scanner
* @see https://github.com/loretoparisi/node-spotify-webhelper
* @author Loreto Parisi (loretoparisi at gmail dot com)
*/
(function() {

  var SpotifyWebHelper = require('../index');
  var spotifyClient = new SpotifyWebHelper(); // init with default port
  spotifyClient.scanPorts({
    lowPort : 3000,
    highPort : 5000,
    timeout : 300
  }
  , function(error, ports) {
      if(!error)
        return console.log( JSON.stringify(ports,null,2) );
      else return console.error(error);
  });

}).call(this);
