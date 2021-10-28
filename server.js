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
})
app.get("/api/whoami", function(req, res){
    res.json({
        "ipaddress": req.connection.remoteAddress,
        "language": req.headers["accept-language"],
        "software": req.headers["user-agent"],
    })
})
////URL SHORTENER
app.get("/urlShortener", function (req, res) {
    res.sendFile(__dirname + '/views/urlShortener.html');
});
let urlSchema = new mongoose.Schema({
    original : {type: String, required: true},
    short: Number
})
let Url = mongoose.model('Url', urlSchema)
let responseObject = {}
app.post(
    '/api/shorturl',
    bodyParser.urlencoded({ extended: false }),
    (request, response) => {
    let inputUrl = request.body['url']
    let urlRegex = new RegExp(/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi)
    if(!inputUrl.match(urlRegex)){
        response.json({error: 'invalid url'})
        return
    }
    const httpRegex = /^(http|https)(:\/\/)/;
    if (!httpRegex.test(inputUrl)) {
        return response.json({ error: 'invalid url' })
    }
    responseObject['original_url'] = inputUrl
    let inputShort = 1
    Url.findOne({})
       .sort({short: 'desc'})
       .exec((error, result) => {
           if(!error && result != undefined){
               inputShort = result.short + 1
           }
           if(!error){
               Url.findOneAndUpdate(
                   {original: inputUrl},
                   {original: inputUrl, short: inputShort},
                   {new: true, upsert: true },
                   (error, savedUrl)=> {
                       if(!error){
                           responseObject['short_url'] = savedUrl.short
                           response.json(responseObject)
                       }
                   }
               )
           }
       })
})
app.get('/api/shorturl/:input', (request, response) => {
    let input = request.params.input
    Url.findOne({short: input}, (error, result) => {
        if(!error && result != undefined){
            response.redirect(result.original)
        }else{
            response.json('URL not Found')
        }
    })
})



//// Exercise Tracker
app.get("/exerciseTracker",
        (req, res) => {
            res.sendFile(__dirname + '/views/exerciseTracker.html')
        }
)

let exerciseSessionSchema = new mongoose.Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: String
})

let userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  log: [exerciseSessionSchema]
})

let Session = mongoose.model('Session', exerciseSessionSchema)
let User = mongoose.model('User', userSchema)

app.post('/api/users', bodyParser.urlencoded({ extended: false }), (request, response) => {
  let newUser = new User({username: request.body.username})
  newUser.save((error, savedUser) => {
    if(!error){
      let responseObject = {}
      responseObject['username'] = savedUser.username
      responseObject['_id'] = savedUser.id
      response.json(responseObject)
    }
  })
})

app.get('/api/exercise/users', (request, response) => {
  User.find({}, (error, arrayOfUsers) => {
    if(!error){
      response.json(arrayOfUsers)
    }
  })
  
})

app.post('/api/users/:_id/exercises', bodyParser.urlencoded({ extended: false }) , (request, response) => {
  let newSession = new Session({
    description: request.body.description,
    duration: parseInt(request.body.duration),
    date: request.body.date
  })
  if(newSession.date === ''){
    newSession.date = new Date().toISOString().substring(0, 10)
  }
  User.findByIdAndUpdate(
    request.body.userId,
    {$push : {log: newSession}},
    {new: true},
    (error, updatedUser)=> {
      if(!error){
        let responseObject = {}
        responseObject['_id'] = updatedUser.id
        responseObject['username'] = updatedUser.username
        responseObject['date'] = new Date(newSession.date).toDateString()
        responseObject['description'] = newSession.description
        responseObject['duration'] = newSession.duration
        response.json(responseObject)
      }
    }
  )
})

app.get('/api/users/:_id/logs', (request, response) => {
    User.findById(request.query.userId, (error, result) => {
    if(!error){
      let responseObject = result
      if(request.query.from || request.query.to){
        let fromDate = new Date(0)
        let toDate = new Date()
        if(request.query.from){
          fromDate = new Date(request.query.from)
        }
        if(request.query.to){
          toDate = new Date(request.query.to)
        }
        fromDate = fromDate.getTime()
        toDate = toDate.getTime()
        responseObject.log = responseObject.log.filter((session) => {
          let sessionDate = new Date(session.date).getTime()
          return sessionDate >= fromDate && sessionDate <= toDate
        })
      }
      if(request.query.limit){
        responseObject.log = responseObject.log.slice(0, request.query.limit)
      }
      responseObject = responseObject.toJSON()
      responseObject['count'] = result.log.length
      response.json(responseObject)
    }
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

