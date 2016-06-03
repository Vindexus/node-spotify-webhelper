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
      if(!error) {
          // connect to port
          console.log("PORTS ARE", ports);
          ports.map(function(item,index){

            var openPort = item.port;
            console.log("Connecting to Spotify on port [%d]...", openPort);
            var spotifyClient = new SpotifyWebHelper( { port : openPort });
            spotifyClient.getStatus(function (err, res) {
              console.log("RES-ERR",res,err);
              if (err) {
                console.error(err);
              }
              else if(res) {
                console.info('Currently Playing:',
                  res.track.artist_resource.name, '-',
                  res.track.track_resource.name);
              }
            });
          });
      }
      else {
        console.error(error);
      }
  });

}).call(this);
