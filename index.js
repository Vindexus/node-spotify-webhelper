// This is a port foor node.js of this great article's code:
// http://cgbystrom.com/articles/deconstructing-spotifys-builtin-http-server/
// modified by Loreto Parisi (loretoparisi at gmail dot com) 2016-06-01
// @see https://github.com/loretoparisi/node-spotify-webhelper

/**
* Spotify WebHelper + Port Scanner
* @see https://github.com/loretoparisi/node-spotify-webhelper
* @author Loreto Parisi (loretoparisi at gmail dot com)
*/
(function() {

var request = require('request')
var qs = require('querystring')
var util = require('util');
var path = require('path');
var child_process = require('child_process');
var portscanner  = require('./portscanner');

// global variables, used when running on windows
var wintools;
var spotifyWebHelperWinProcRegex;

// Default port that Spotify Web Helper binds to.
var DEFAULT_PORT = 4370;
var DEFAULT_RETURN_ON = ['login', 'logout', 'play', 'pause', 'error', 'ap']
var DEFAULT_RETURN_AFTER = 1
var ORIGIN_HEADER = { 'Origin': 'https://open.spotify.com' }

/**
 * Promise.All
 * @param items Array of objects
 * @param block Function block(item,index,resolve,reject)
 * @param done Function Success block
 * @param fail Function Failure block
 * @example

    promiseAll(["a","b","c"],
    function(item,index,resolve,reject) {
      MyApp.call(item,function(result) {
        resolve(result);
      },
      function( error ) { reject(error); }):
    },
    function(result) { // aggregated results

    },function(error) { // error

    })

  * @author Loreto Parisi (loretoparisi at gmail dot com)
 */
function promiseAll(items, block, done, fail) {
  var promises = [], index=0;
  items.forEach(function(item) {
    promises.push( function(item,i) {
        return new Promise(function(resolve, reject) {
          if(block) block.apply(this,[item,index,resolve,reject]);
        });
      }(item,++index))
  });
  Promise.all(promises).then(function AcceptHandler(results) {
    if(done) done( results );
  }, function ErrorHandler(error) {
    if(fail) fail( error );
  });
} //promiseAll

function getJson(url, params, headers, cb) {
    if (params instanceof Function) {
        cb = params;
        params = null;
        headers = null;
    }

    if (headers instanceof Function) {
        cb = headers;
        headers = null;
    }

    headers = headers || {}
    cb = cb || function () { };
    if (params)
        url += '?' + qs.stringify(params)

    // rejectUnauthorized:false should be ok here since we are working with localhost
    // this fixes the UNABLE_TO_VERIFY_LEAF_SIGNATURE error
    request({ 'url': url, 'headers': headers, 'rejectUnauthorized' : false}, function (err, req, body) {
        if (err) {
            return cb(err);
        }

        var parsedBody;
        try {
            parsedBody = JSON.parse(body);
        }
        catch (e) {
            return cb(e);
        }

        return cb(null, parsedBody);
    });
}//getJson

var ASCII_LOWER_CASE = "abcdefghijklmnopqrstuvwxyz";
// http://stackoverflow.com/questions/1349404/generate-a-string-of-5-random-characters-in-javascript
function generateRandomString(length) {
    var text = "";

    for( var i=0; i < 10; i++ )
        text += ASCII_LOWER_CASE.charAt(Math.floor(Math.random() * ASCII_LOWER_CASE.length));

    return text;
}//generateRandomString

function generateRandomLocalHostName() {
    // Generate a random hostname under the .spotilocal.com domain
    return generateRandomString(10) + '.spotilocal.com'
}//generateRandomLocalHostName

function getOauthToken(cb) {
    return getJson('http://open.spotify.com/token', function (err, res) {
        if (err) {
            return cb(err);
        }

        return cb(null, res['t']);
    });
}//getOauthToken

function isSpotifyWebHelperRunning(cb) {
  cb = cb || function () { };
  // not doing anything for non windows, for now
  if (process.platform != 'win32')  {
    return cb(null, true);
  }

  wintools = wintools || require('wintools');
  wintools.ps(function (err, lst) {
    if (err) {
      return cb(err);
    }

    spotifyWebHelperWinProcRegex = spotifyWebHelperWinProcRegex || new RegExp('spotifywebhelper.exe', 'i');

    for (var k in lst) {
      if (spotifyWebHelperWinProcRegex.test(lst[k].desc)) {
        return cb(null, true);
      }
      spotifyWebHelperWinProcRegex.lastIndex = 0;
    };
    cb(null, false);
  });
}//isSpotifyWebHelperRunning

function getWindowsSpotifyWebHelperPath() {
  if (!process.env.USERPROFILE) {
    return null;
  }

  return path.join(process.env.USERPROFILE, 'AppData\\Roaming\\Spotify\\Data\\SpotifyWebHelper.exe');
}//getWindowsSpotifyWebHelperPath

function launchSpotifyWebhelperIfNeeded(cb) {
  cb = cb || function () { };
  // not doing anything for non windows, for now
  if (process.platform != 'win32') {
    return cb(null, true);
  }

  isSpotifyWebHelperRunning(function (err, res) {
    if (err) {
      return cb(err);
    }

    if (res) {
      return cb(null, res);
    }

    var exePath = getWindowsSpotifyWebHelperPath();

    if (!exePath) {
      return cb(new Error('Failed to retreive SpotifyWebHelper exe path'));
    }

    var child = child_process.spawn(exePath, { detached: true, stdio: 'ignore' });
    child.unref();

    return cb(null, true);
  });

}//launchSpotifyWebhelperIfNeeded


/**
 * Spotify Web Helper Main module class
 * @param opts Object module options
 */
function SpotifyWebHelper(opts) {

    opts = opts || {};
    var localPort = opts.port || DEFAULT_PORT;
    var autoDectect = opts.autoDectect || false;

    function generateSpotifyUrl(url,port) {
      port = port || localPort;
      var url=util.format("https://%s:%d%s", generateRandomLocalHostName(), port, url)
      return url;
    }//generateSpotifyUrl

    function getVersion(cb,port) {
      var url = generateSpotifyUrl('/service/version.json',port);
      return getJson(url, { 'service': 'remote' }, ORIGIN_HEADER, cb)
    }//getVersion

    function getCsrfToken(cb,port) {
      // Requires Origin header to be set to generate the CSRF token.
      var url = generateSpotifyUrl('/simplecsrf/token.json',port);
      return getJson(url, null, ORIGIN_HEADER, function (err, res) {
          if (err) {
              return cb(err);
          }
          return cb(null, res['token']);
      });
    }//getCsrfToken

    /**
     * Scan client open ports
     * @param options Object

      {
        lowPort := integer lower port number defaults 3000
        highPort := integer higer port number defaults 5000
        open := bool true to filter open ports only
        timeout := int milliseconds for socket timeout
      }

     * @param cb function Callback (error,results)
     * @author Loreto Parisi (loretoparisi at gmail dot com)
     */
    function scanClientOpenPorts(opt,cb) {
      var self=this;

      var lowPort = opt.lowPort || 3000;
      var highPort = opt.highPort || 5000;
      var timeout = opt.timeout || 300;
      var options = {
          host : generateRandomLocalHostName(),
          timeout : timeout || 300, // socket timeout in msec
          all : true
      };
      portscanner.findAPortInUse(lowPort, highPort, options, function(error, ports) {
        if(!error) {
          // test ports and wait for a response
          promiseAll( ports
            , function(item,index,resolve,reject) { // item block
              getVersion(function (err, res) {
                if (err) {
                  return resolve( { error : err , port : item } );
                }
                try {
                  var jsonResponse=JSON.parse( JSON.stringify(res) );
                  if( jsonResponse.client_version && jsonResponse.version ) { // spotify local protocol
                    return resolve( { port : item } );
                  }
                  else { // bad protocol
                      return resolve( { error : new Error('bad protocol response'), port : item } );
                  }
                } catch(ex) { // bad protocol
                  return resolve( { error : new Error('bad protocol response') , port : item } );
                }
              }, item);
            }
          , function(ports) { // all done
            // filtering out ports with errors not supporting spotify local protocol
            var openPorts = ports.filter(function(p,index) {
                return (typeof(p.error)=='undefined')
            });
            return cb(null,openPorts);
          }
          , function(error) { // error
            return cb(error);
          });
        }
        else {
            cb(error);
        }
      })
    }//scanPorts
    this.isInitialized = false;
    this.init = function (cb) {
        var self = this;
        cb = cb || function () { };
        if (self.isInitialized) {
            return cb();
        }
        if(autoDectect) {
          // auto scan first open port
          // using a default port interval
          scanClientOpenPorts({
            lowPort : 3000,
            highPort : 5000,
            timeout : 300
          }, function(error,ports) {
            if( !error && ports && ports.length>0) {
              var localPort=ports[0].port;
              console.log("spotify listening on port %d", localPort);
              launchSpotifyWebhelperIfNeeded(function (err, res) {
                if (err) {
                  return cb(err);
                }
                if (!res) {
                  return cb(new Error('SpotifyWebHelper not running, failed to start it'));
                }
                getOauthToken(function (err, oauthToken) {
                    if (err) {
                        return cb(err);
                    }
                    self.oauthToken = oauthToken;
                    getCsrfToken(function (err, csrfToken) {
                        if (err) {
                            return cb(err);
                        }

                        self.csrfToken = csrfToken;
                        self.isInitialized = true;
                        return cb();
                    }, localPort);
                });
              });
            }
            else return cb(err);
          })
        }
        else { // launch on default port
          launchSpotifyWebhelperIfNeeded(function (err, res) {
            if (err) {
              return cb(err);
            }
            if (!res) {
              return cb(new Error('SpotifyWebHelper not running, failed to start it'));
            }
            getOauthToken(function (err, oauthToken) {
                if (err) {
                    return cb(err);
                }
                self.oauthToken = oauthToken;
                getCsrfToken(function (err, csrfToken) {
                    if (err) {
                        return cb(err);
                    }

                    self.csrfToken = csrfToken;
                    self.isInitialized = true;
                    return cb();
                });
            });
          });
        }
      }//init
    function spotifyJsonRequest(self, spotifyRelativeUrl, additionalParams, cb) {
      cb = cb || function () { };
      additionalParams = additionalParams || {};

      self.init(function (err) {
        if (err) {
          return cb(err);
        }

        params = {
          'oauth': self.oauthToken,
          'csrf': self.csrfToken,
        }

        for (var key in additionalParams) {
          params[key] = additionalParams[key];
        }

        var url = generateSpotifyUrl(spotifyRelativeUrl);
        getJson(url, params, ORIGIN_HEADER, cb);
      });
    }//spotifyJsonRequest

    /******************
     * Public API
     ******************/

    /**
     * Get Player Status
     */
    this.getStatus = function (returnAfter, returnOn, cb) {

        if (returnAfter instanceof Function) {
            cb = returnAfter;
            returnAfter = null;
            returnOn = null;
        }

        if (returnOn instanceof Function) {
            cb = returnOn;
            returnOn = null;
        }

        returnOn = returnOn || DEFAULT_RETURN_ON;
        returnAfter = returnAfter || DEFAULT_RETURN_AFTER;

        cb = cb || function() {};

        params = {
          'returnafter': returnAfter,
          'returnon': returnOn.join(',')
        }

        spotifyJsonRequest(this, '/remote/status.json', params, cb);
    }//getStatus

    /**
     * Pause the player
     */
    this.pause = function (cb) {
      cb = cb || function() {};

      params = {
        'pause' : true
      }

      spotifyJsonRequest(this, '/remote/pause.json', params, cb);
    }//pause

    /**
     * Revert pause state to previous state: play | stopped
     */
    this.unpause = function (cb) {
      cb = cb || function () { };

      params = {
        'pause': false
      }

      spotifyJsonRequest(this, '/remote/pause.json', params, cb);
    }//unpause

    /**
     * Play a track by Spotify Track uri
     */
    this.play = function (spotifyUri, cb) {
      cb = cb || function () { };

      params = {
        'uri': spotifyUri,
        'context': spotifyUri
     }

      spotifyJsonRequest(this, '/remote/play.json', params, cb);
    }//play

    /**
     * Get Spotify local protocol's host name
     */
    this.getLocalHostname = function() {
      return generateRandomLocalHostName();
    }//getLocalHostname

    /**
     * Scan available ports
     * @param options Object

      {
        lowPort := integer lower port number defaults 3000
        highPort := integer higer port number defaults 5000
        open := bool true to filter open ports only
        timeout := int milliseconds for socket timeout
      }

     * @param cb function Callback (error,results)
     * @author Loreto Parisi (loretoparisi at gmail dot com)
     */
    this.scanPorts = function(options, cb) {
      scanClientOpenPorts(options, cb);
    }//scanPorts
}//SpotifyWebHelper

module.exports = SpotifyWebHelper;

}).call(this);
