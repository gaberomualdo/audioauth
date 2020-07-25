// function to record audio
// code from most of this function taken from Bryan Jennings on https://medium.com/@bryanjenningz/how-to-record-and-play-audio-in-javascript-faa1b2b3e49b
const recordAudioWithMicrophone = () => {
  return new Promise((resolve) => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
      });

      const start = () => {
        mediaRecorder.start();
      };

      const stop = () => {
        return new Promise((resolve) => {
          mediaRecorder.addEventListener('stop', () => {
            const audioBlob = new Blob(audioChunks);
            const audioURL = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioURL);
            const play = () => {
              audio.play();
            };

            resolve({ audioBlob, audioURL, play });
          });

          mediaRecorder.stop();
        });
      };

      resolve({ start, stop });
    });
  });
};

// variable for to be defined audio recorder (used on click of microphone btn elm)
let audioRecorder = null;

// record audio button onclick
const startRecording = async (e) => {
  // start recording audio
  audioRecorder = await recordAudioWithMicrophone();
  audioRecorder.start();
};

// accept audio button onclick
const stopRecording = async (callback, verifyWith = undefined) => {
  // microphone ended listening, end recording and parse

  // recorded audio obj
  const recordedAudio = await audioRecorder.stop();

  // play audio (for testing purposes)
  // recordedAudio.play();

  // audio blob
  let audioBlob = recordedAudio.audioBlob;

  // read recorded audio into wav file
  const fileReaderObj = new FileReader();
  fileReaderObj.onload = async (e) => {
    const fileContents = base64ArrayBuffer(e.target.result);
    if (byteLength(fileContents) > 375000) {
      return alert('Audio size exceeds 375 kb limit.');
    }
    // send post request to base64-to-file API with file data
    const b64ToFileResponse = await fetch(config['B64FileAPIBaseURL'], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileContents }),
    });

    // get file path and make absolute (by prepending base URL of API)
    let { filePath } = await b64ToFileResponse.json();
    const fileURL = config['B64FileAPIBaseURL'] + filePath;

    // send request to AudioAuth API with audio file path
    const authResponseObj = await fetch(config['authAPIBaseURL'], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audioAuthAudioURL: fileURL, verifyWith }),
    });

    const authResponse = await authResponseObj.json();

    // remove audio file from file API in order to save storage
    await fetch(config['B64FileAPIBaseURL'] + 'remove_file.php?filepath=' + encodeURIComponent(filePath), {
      method: 'GET',
    });

    callback(authResponse);
  };
  fileReaderObj.readAsArrayBuffer(audioBlob);
};
