const express = require('express');
const bodyParser = require('body-parser');
const config = require('config');
const requestP = require('request-promise');
const { match } = require('assert');

const app = express();

app.get('/', (req, res) => res.send('API Running'));

// allow CORS requests
const allowCORSRequests = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

  next();
};

// Init Middleware
app.use(bodyParser.json());
app.use(allowCORSRequests);

// Routes
app.post('/', async (req, res) => {
  const { audioURL, verifyWith } = req.body;

  // audio URL is required
  if (audioURL) {
    const responseFromAPI = await recognizeFromAPI(audioURL);

    if (responseFromAPI.status === 'success') {
      const { songData } = responseFromAPI;
      const songVerifyData = createVerifyWithObj(songData.result.spotify, songData.result.timecode);

      if (verifyWith) {
        try {
          if (verifyObjMatch(verifyWith, songVerifyData)) {
            return res.json({
              status: 'success',
              authorized: true,
              songVerifyData,
            });
          } else {
            return res.json({
              status: 'success',
              authorized: false,
              songVerifyData,
            });
          }
        } catch (err) {
          if (err.message.toLowerCase().includes('type mismatch')) {
            return res.status(400).json({
              status: 'error',
              errorMessage: 'Verify-with object was badly formatted.',
              errorCode: 'bad-verify-with-object',
              errorExplanation:
                'Verify-with object did not match the song-verify-data object. Either the verify-with object included keys which did not exist in the song-verify-data object or value types did not match.',
              songVerifyData,
            });
          } else {
            console.error(err.message);
            return res.status(500).json(INTERNAL_ERROR_RESPONSE);
          }
        }
      } else {
        // if no verifyWith param is included, simply send songVerifyData
        return res.json({
          status: 'success',
          songVerifyData,
        });
      }
    } else {
      if (responseFromAPI.errorCode === 'internal-error') {
        res.status(500);
      }
      return res.json(responseFromAPI);
    }
  } else {
    // audio URL not provided
    return res.status(400).json({
      status: 'error',
      errorMessage: 'Incorrect audio URL or file.',
      errorCode: 'incorrect-audio',
      errorExplanation:
        'The given audio URL is either inaccessible, invalid, does not exist, or the audio file contained at the URL is invalid or corrupt.',
    });
  }
});

const verifyObjMatch = (obj, targetObj) => {
  let objectMatch = true;
  Object.entries(obj).forEach(([key, value]) => {
    const targetValue = targetObj[key];

    // every obj value must be the same type as its target obj equivalent (this also covers cases where a key exists in obj but not in target obj)
    if (typeof value !== typeof targetValue || Array.isArray(value) !== Array.isArray(targetValue)) {
      throw new Error('Type mismatch between object and target object.');
    }

    if (Array.isArray(value)) {
      // in the case of arrays, each element in the array in obj must be present in the array in target obj
      value.forEach((elm) => {
        let elmFound = false;
        targetValue.forEach((targetElm) => {
          if (verifyObjMatch(elm, targetElm)) {
            elmFound = true;
          }
        });
        objectMatch = objectMatch && elmFound;
      });
    } else if (typeof value === 'object') {
      objectMatch = objectMatch && verifyObjMatch(value, targetValue);
    } else {
      objectMatch = objectMatch && value === targetValue;
    }
  });

  return objectMatch;
};

const recognizeFromAPI = async (audioURL) => {
  const audDAPIKey = config.get('audDAPIKey');
  const audDAPIURL = 'https://api.audd.io/';

  const dataForAPIRequest = {
    url: audioURL,
    return: 'spotify',
    api_token: audDAPIKey,
  };

  try {
    const responseFromAPI = JSON.parse(
      await requestP({
        uri: audDAPIURL,
        form: dataForAPIRequest,
        method: 'POST',
      })
    );

    // example response
    /* const responseFromAPI = JSON.parse(
      `{
        "status":"success",
        "result":{
           "artist":"Juice WRLD",
           "title":"Come \u0026 Go (with Marshmello)",
           "album":"Come \u0026 Go (with Marshmello)",
           "release_date":"2020-07-09",
           "label":"Grade A Productions/Interscope Records",
           "timecode":"00:16",
           "song_link":"https://lis.tn/mpvWM",
           "spotify":{
              "album":{
                 "album_type":"album",
                 "artists":[
                    {
                       "external_urls":{
                          "spotify":"https://open.spotify.com/artist/4MCBfE4596Uoi2O4DtmEMz"
                       },
                       "href":"https://api.spotify.com/v1/artists/4MCBfE4596Uoi2O4DtmEMz",
                       "id":"4MCBfE4596Uoi2O4DtmEMz",
                       "name":"Juice WRLD",
                       "type":"artist",
                       "uri":"spotify:artist:4MCBfE4596Uoi2O4DtmEMz"
                    }
                 ],
                 "available_markets":null,
                 "external_urls":{
                    "spotify":"https://open.spotify.com/album/0Zs0b11dQneqR0rfNhbGU4"
                 },
                 "href":"https://api.spotify.com/v1/albums/0Zs0b11dQneqR0rfNhbGU4",
                 "id":"0Zs0b11dQneqR0rfNhbGU4",
                 "images":[
                    {
                       "height":640,
                       "url":"https://i.scdn.co/image/ab67616d0000b2731db3f108ae95900279c0e16f",
                       "width":640
                    },
                    {
                       "height":300,
                       "url":"https://i.scdn.co/image/ab67616d00001e021db3f108ae95900279c0e16f",
                       "width":300
                    },
                    {
                       "height":64,
                       "url":"https://i.scdn.co/image/ab67616d000048511db3f108ae95900279c0e16f",
                       "width":64
                    }
                 ],
                 "name":"Legends Never Die",
                 "release_date":"2020-07-10",
                 "release_date_precision":"day",
                 "total_tracks":21,
                 "type":"album",
                 "uri":"spotify:album:0Zs0b11dQneqR0rfNhbGU4"
              },
              "artists":[
                 {
                    "external_urls":{
                       "spotify":"https://open.spotify.com/artist/4MCBfE4596Uoi2O4DtmEMz"
                    },
                    "href":"https://api.spotify.com/v1/artists/4MCBfE4596Uoi2O4DtmEMz",
                    "id":"4MCBfE4596Uoi2O4DtmEMz",
                    "name":"Juice WRLD",
                    "type":"artist",
                    "uri":"spotify:artist:4MCBfE4596Uoi2O4DtmEMz"
                 },
                 {
                    "external_urls":{
                       "spotify":"https://open.spotify.com/artist/64KEffDW9EtZ1y2vBYgq8T"
                    },
                    "href":"https://api.spotify.com/v1/artists/64KEffDW9EtZ1y2vBYgq8T",
                    "id":"64KEffDW9EtZ1y2vBYgq8T",
                    "name":"Marshmello",
                    "type":"artist",
                    "uri":"spotify:artist:64KEffDW9EtZ1y2vBYgq8T"
                 }
              ],
              "available_markets":null,
              "disc_number":1,
              "duration_ms":205498,
              "explicit":false,
              "external_ids":{
                 "isrc":"USUG12002084"
              },
              "external_urls":{
                 "spotify":"https://open.spotify.com/track/1P7vVbFFOtFH4RYNUPEiK2"
              },
              "href":"https://api.spotify.com/v1/tracks/1P7vVbFFOtFH4RYNUPEiK2",
              "id":"1P7vVbFFOtFH4RYNUPEiK2",
              "is_local":false,
              "name":"Come \u0026 Go (with Marshmello)",
              "popularity":68,
              "preview_url":"",
              "track_number":11,
              "type":"track",
              "uri":"spotify:track:1P7vVbFFOtFH4RYNUPEiK2"
           }
        }
     }`
    ); */

    if (responseFromAPI.status === 'success') {
      // request params (including audio URL) were valid and request worked

      // song humming results are currently not supported
      if (!responseFromAPI.result || responseFromAPI.result.humming) {
        // no song was found for given audio
        return {
          status: 'error',
          errorMessage: 'No song found to match given audio file.',
          errorCode: 'song-not-found',
          errorExplanation:
            'No song was found for the given audio file. The audio file could be too small, have too much background noise, not have a song, or the song is not in the database.',
        };
      }

      if (!responseFromAPI.result.spotify) {
        // song found did not include a Spotify object, and therefore can't be used
        return {
          status: 'error',
          errorMessage: 'Song not found on Spotify.',
          errorCode: 'song-not-on-spotify',
          errorExplanation:
            'The song was recognized but not found on Spotify. This could be an issue with the internal song database. Try a different song.',
        };
      }

      // song was recognized and found on Spotify
      return {
        status: 'success',
        songData: responseFromAPI,
      };
    } else {
      // request failed
      if (responseFromAPI.error.errorCode === 600 || responseFromAPI.error.errorCode === 500) {
        // incorrect audio URL --> errorCode 600 is incorrect audio URL, errorCode 500 is incorrect audio file
        return {
          status: 'error',
          errorMessage: 'Incorrect audio URL or file.',
          errorCode: 'incorrect-audio',
          errorExplanation:
            'The given audio URL is either inaccessible, invalid, does not exist, or the audio file contained at the URL is invalid or corrupt.',
        };
      }

      if (responseFromAPI.error.errorCode === 400) {
        // audio file too large
        return {
          status: 'error',
          errorMessage: 'Audio file too large.',
          errorCode: 'audio-too-large',
          errorExplanation: 'The given audio file is too large. There is a 10mb & 20sec limit on all audio files.',
        };
      }

      console.error('Error occurred with response: ', responseFromAPI);
    }
  } catch (err) {
    console.error('Error occurred with message: ', err.message);
  }

  // either there was an issue requesting the API (catch block) or there was an unhandled error code from requesting the recognition API
  return INTERNAL_ERROR_RESPONSE;
};

const INTERNAL_ERROR_RESPONSE = {
  status: 'error',
  errorMessage: 'Internal error.',
  errorCode: 'internal-error',
  errorExplanation:
    'An internal error occurred. The webmaster will likely take a look at the issue within the next 24 hours. Contact xtrp@xtrp.io for more details.',
};

const createVerifyWithObj = (spotifyObj, matchedAtTimecode) => {
  return pruneUndefinedFromObject({
    albumName: spotifyObj.album.name,
    albumArtists: getSimplifiedArtistList(spotifyObj.album.artists),
    albumType: spotifyObj.album.album_type,
    albumReleaseDate: new Date(spotifyObj.album.release_date).toISOString(),
    albumTrackCount: spotifyObj.album.total_tracks,
    songArtists: getSimplifiedArtistList(spotifyObj.artists),
    songName: spotifyObj.name,
    songDurationMS: spotifyObj.duration_ms,
    songExplicit: spotifyObj.explicit,
    songTrackNumber: spotifyObj.track_number,
    songId: spotifyObj.id,
    matchedAtMS: (() => {
      // matchedAtTimeCode looks like: mm:ss
      // convert mm:ss to milliseconds
      let rVal = 0;
      const splitMatchedAtTimecode = matchedAtTimecode.split(':').map((e) => parseInt(e));
      rVal += 60 * 1000 * splitMatchedAtTimecode[0];
      rVal += 1000 * splitMatchedAtTimecode[1];
      return rVal;
    })(),
  });
};

const getSimplifiedArtistList = (artists) => {
  return artists.map((artist) => {
    return {
      name: artist.name,
      id: artist.id,
    };
  });
};

const pruneUndefinedFromObject = (obj) => {
  let newObj = {};
  Object.entries(obj).forEach(([key, val]) => {
    if (Array.isArray(val)) {
      const newVal = [];
      val.forEach((elm) => {
        const newElm = pruneUndefinedFromObject(elm);
        if (Object.keys(newElm).length > 0) {
          newVal.push(newElm);
        }
      });
      if (newVal.length > 0) {
        newObj[key] = newVal;
      }
    } else if (typeof val === 'object') {
      const newVal = pruneUndefinedFromObject(val);
      if (Object.keys(newVal).length > 0) {
        newObj[key] = newVal;
      }
    } else if (val !== undefined) {
      newObj[key] = val;
    }
  });
  return newObj;
};

const PORT = process.env.PORT || 1451;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
