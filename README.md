# @kehers/passport-slack

[Passport](http://passportjs.org/) strategy for authenticating with the Slack [OAuth v2](https://api.slack.com/authentication/oauth-v2) API. This lets you use the v2 OAuth endpoints, set granular scopes (both `user_scope` and `scope`) and get user profile.

## Install

```
$ npm install --save passport @kehers/passport-slack
```

## Usage

### Create a Slack App

Create a [Slack App](https://api.slack.com/slack-apps) to get a ****Client ID**** and ****Client Secret****. Ensure you selected the right bot and user scopes for your app’s needs. The Strategy uses `https://slack.com/api/users.identity` to retrieve user’s profile by default and this requires the `identity:basic` user scope. 

### Configure Strategy

Supply your Slack Client ID and Client Secret as options to the strategy. The strategy also requires a `verify` callback, which receives an access
token from the grant, data response from Slack and user profile. The `verify` callback must call `done` providing the value you
want to assign to `req.user` in authenticated requests.

```javascript
passport.use(new SlackStrategy({
  clientID: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  callbackURL: process.env.SLACK_CALLBACK
}, (accessToken, response, profile, done) => {
  // Create your desired user model and then call `done()`
  User.findOrCreate({ user_id: profile.user.id }, function (err, user) {
    return done(err, user)
  })
}))
```

### Authenticate Requests

Use `passport.authenticate()`, specifying the ‘slack’ strategy, to authenticate requests.

For example, as route middleware in an Express application:

```javascript
// Visiting this route when not already authenticated with slack will redirect the user to slack.com
// and ask the user to authorize your application
app.get('/auth', passport.authenticate('slack'))

// The user returns to the your site after the authorization above, and if it was successful
// the next route handler runs, otherwise the user is redirected to chosen failureRedirect.
app.get('/auth/callback',
  passport.authenticate('slack', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/')
  });
```

You can pass in necessary `scope` and `user_scopes` depending on permissions required by your application.

```javascript
app.get('/auth', passport.authenticate('slack', {
  user_scope: ['users:read'],
  scope: ['team:read', 'chat:write', 'chat:write.customize', 'chat:write.public', 'commands', 'channels:read', 'im:history']
}))
```

## Examples

See the [`example` directory](example) for a simple implementation.

