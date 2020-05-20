const express = require('express')
const session = require('express-session')
const passport = require('passport')
const SlackStrategy = require('./..').Strategy

// Configure the Slack Strategy
passport.use(new SlackStrategy({
  clientID: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  // skipUserProfile: true,
  userProfileURL: 'https://slack.com/api/users.info',
  callbackURL: process.env.SLACK_CB
}, (accessToken, data, profile, done) => {
  console.log(accessToken, data, profile)
  done(null, data)
}))

const app = express()
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))
app.use(passport.initialize())
app.use(passport.session())

app.get('/', (req, res) => {
  res.send(req.user)
})

// Initiates basic Sign in With Slack flow
app.get('/auth', passport.authenticate('slack', {
  user_scope: ['identity:basic'],
  scope: ['team:read', 'chat:write', 'chat:write.customize', 'chat:write.public', 'commands', 'channels:read', 'im:history', 'users:read']
}))
// Completes the OAuth flow.
app.get('/auth/cb',
  passport.authenticate('slack'), // Failure triggers the default failure handler (401 Unauthorized)
  (req, res) => {
    // Successful authentication redirects home
    res.redirect('/')
  }
)

passport.serializeUser((user, done) => {
  done(null, JSON.stringify(user))
})
passport.deserializeUser((json, done) => {
  done(null, JSON.parse(json))
})

app.listen(3000)
