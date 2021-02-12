require("dotenv").config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const speech = require('@google-cloud/speech');
const socketIo = require('socket.io');
const ss = require('socket.io-stream');
const cors = require('cors');
const Sentiment = require('sentiment');

const app = express();
var speechClient, requestSTT, sentiment;

const port = process.env.PORT || process.env.LOCAL_PORT;

const interimResults = false;
const sampleRateHertz = 16000;
const languageCode = 'en-US';
const encoding = 'LINEAR16';

let numConnections = [];

function setupServer() {
    // setup Express
    app.use(cors());
    app.get('/', function(req, res) {
      res.sendFile(path.join(__dirname + '/public/index.html'));
    });
    server = http.createServer(app);
    io = socketIo(server);
    server.listen(port, () => {
        console.log('Running server on port %s', port);
    });

    // Listener, once the client connect to the server socket
    io.on('connect', (client) => {
		numConnections.push(client);
		console.log(numConnections.length + " Clients connected");
        client.emit('server_setup', `Server connected [id=${client.id}]`);

        // when the client sends 'stream-transcribe' events
        // when using audio streaming
        ss(client).on('stream-transcribe', function(stream, data) {
            // get the name of the stream
            const filename = path.basename(data.name);
            // pipe the filename to the stream
            stream.pipe(fs.createWriteStream(filename));
            // make a detectIntStream call
            transcribeAudioStream(stream, function(SSTResult){
				if(SSTResult && SSTResult.results[0] && SSTResult.results[0].alternatives[0]){
					let transcription = SSTResult.results[0].alternatives[0].transcript;
					client.emit('transcriptionText', transcription);
				}
            });
        });
		//pass in an audio 
		client.on('get-sentiment', text => {
			let result = sentiment.analyze(text).comparative;
			client.emit('sentimentValue', result);
		});
		
		client.on('disconnect', () => {
			for(let i = 0; i < numConnections.length; i++){
				if(numConnections[i] == client){
					numConnections.splice(i);
				}
			}
			console.log(numConnections.length + " Clients remaining");
        });
    });
}

/**
 * Setup Cloud STT Integration
 */
function setupSTT(){
   // Creates a client
   speechClient = new speech.SpeechClient();

    // Create the initial request object
    // When streaming, this is the first call you will
    // make, a request without the audio stream
    // which prepares Dialogflow in receiving audio
    // with a certain sampleRateHerz, encoding and languageCode
    // this needs to be in line with the audio settings
    // that are set in the client
    requestSTT = {
      config: {
        sampleRateHertz: sampleRateHertz,
        encoding: encoding,
        languageCode: languageCode
      },
      interimResults: interimResults,
      //enableSpeakerDiarization: true,
      //diarizationSpeakerCount: 2,
      //model: `phone_call`
    }

}

/*
  * STT - Transcribe Speech on Audio Stream
  * @param audio stream
  * @param cb Callback function to execute with results
  */
 async function transcribeAudioStream(audio, cb) { 
	const recognizeStream = speechClient.streamingRecognize(requestSTT)
		.on('data', function(data){
			//console.log(data);
			cb(data);
		})
		.on('error', (e) => {
			console.log(e);
		})
		.on('end', () => {
			//console.log('on end');
		});

	audio.pipe(recognizeStream);
	audio.on('end', function() {
	  //fileWriter.end();
	});
};

function setupSentiment(){
	sentiment = new Sentiment();
}

setupSTT();
setupSentiment();
setupServer();