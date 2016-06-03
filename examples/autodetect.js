/**
* Spotify WebHelper + Port Scanner
* @see https://github.com/loretoparisi/node-spotify-webhelper
* @author Loreto Parisi (loretoparisi at gmail dot com)
*/
(function() {

  var SpotifyWebHelper = require('../index');
  var spotifyClient = new SpotifyWebHelper( { autoDectect : true }); // init with default port
  spotifyClient.getStatus(function (err, res) {
    if (err) {
      console.error(err);
    }
    else if(res) {
      console.info('Currently Playing:',
        res.track.artist_resource.name, '-',
        res.track.track_resource.name);
    }
  });

}).call(this);
