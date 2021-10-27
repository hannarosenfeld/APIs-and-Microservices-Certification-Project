// server.js
// where your node app starts
// init project
var express = require('express');
var app = express();
var port = process.env.PORT || 3000
var mongodb = require('mongodb')
var mongoose = require('mongoose')
var bodyParser = require('body-parser')
var shortid = require('shortid')
var dotenv = require('dotenv')
dotenv.config()
// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
var cors = require('cors');
app.use(cors({optionsSuccessStatus: 200}));  // some legacy browsers choke on 204
// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
    res.sendFile(__dirname + '/views/index.html');
});


// connect to db for url shortener Project
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})




/////// Time Stamp Project

// When users request timestamp in the url path, respond with corresponsing file
app.get("/timestamp", function (req, res) {
    res.sendFile(__dirname + '/views/timestamp.html');
});

app.get("/api", function(req, res){
    var now = new Date()
    res.json({
        "unix": now.getTime(),
        "utc": now.toUTCString()
    })
})

// the API endpoint is GET [project_url]/api/timestamp/:data_string?
app.get("/api/:date_string", function(req, res) {
    let dateString = req.params.date_string
    if (parseInt(dateString) > 10000) {
        let unixTime = new Date(parseInt(dateString))
        res.json({
            "unix": unixTime.getTime(),
            "utc": unixTime.toUTCString()
        })
    }

    let passedInValue = new Date(dateString)

    passedInValue == "Invalid Date"
                      ? res.json({ "error" : "Invalid Date" })
                      : res.json({
                          "unix": passedInValue.getTime(),
                          "utc": passedInValue.toUTCString()
                      })
})




////// Request Header Parser Project

//link to requestHeaderParser page
app.get("/requestHeaderParser", function (req, res) {
    res.sendFile(__dirname + '/views/requestHeaderParser.html');
});


app.get("/api/whoami", function(req, res){
    res.json({
        "ipaddress": req.connection.remoteAddress,
        "language": req.headers["accept-language"],
        "software": req.headers["user-agent"],
    })
})




/////// URL Shortener Project

//Build a schema and model to surore saved URLS
var ShortURL= mongoose.model('ShortURL', new mongoose.Schema({
    short_url: String,
    original_url: String,
    suffix: String
}))

var jsonParser = bodyParser.json()

//parse app
app.use(bodyParser.urlencoded({ extended: false }))
// parse app.json
app.use(bodyParser.json())
// When users request urlShortener in url path, respond with corresponsing file
app.get("/urlShortener", function (req, res) {
    res.sendFile(__dirname + '/views/urlShortener.html');
});

app.post("/api/shorturl", function(req, res) {
    let suffix = shortid.generate()
    let requested_url = req.body.url
    let newShortURL = suffix
    
    let newURL = new ShortURL({
        short_url: __dirname + "/api/shorturl/" +suffix,
        original_url: requested_url,
        suffix: suffix
    })

    newURL.save(function(err, doc){
        if (err) return console.error(err)
        console.log("success")
    })
    res.json({
        "saved": true,
        "short_url" : newURL.short_url,
        "original_url": newURL.original_url,
        "suffix": newURL.suffix
    })
})


app.get("/api/shorturl/:suffix", function(req,res) {
    let generatedSuffix = req.params.suffix
    ShortURL.find({suffix: generatedSuffix}).then(function(foundUrls){
        let urlForRedirect = foundUrls[0]
        res.redirect(urlForRedirect.original_url)
    })
})


////// General Settings for all Projects

// listen for requests :)
var listener = app.listen(port, function () {
    console.log('Your app is listening on port ' + listener.address().port);
});


// your first API endpoint... 
//app.get("/api/hello", function (req, res) {
//    console.log({greeting: 'hello API'})
//    res.json({greeting: 'hello API'});
//});

