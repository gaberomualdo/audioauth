const audioAuthAPIBaseURL = 'http://localhost:1451/';

const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const { json } = require('body-parser');
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
  const { audioAuthAudioURL } = req.body;
  if (audioAuthAudioURL) {
    try {
      const audioAuthResp = await fetch(audioAuthAPIBaseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioURL: audioAuthAudioURL,
          verifyWith: {
            songExplicit: true,
          },
        }),
      });

      return res.json(await audioAuthResp.json());
    } catch (err) {}
    return res.json({ error: 'Internal error occurred.' });
  } else {
    return res.status(400).json({ error: "Missing required parameter 'audioAuthAudioURL'." });
  }
});
const PORT = process.env.PORT || 1453;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
