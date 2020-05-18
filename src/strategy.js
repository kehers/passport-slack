const util = require('util')
const OAuth2Strategy = require('passport-oauth2')
const InternalOAuthError = require('passport-oauth2').InternalOAuthError

/**
 * `Strategy` constructor.
 *
 * Slack OAuth v2 Authentication Passport Strategy
 *
 * Options:
 *   - `clientID`         your Slack application's Client ID
 *   - `clientSecret`     your Slack application's Client Secret
 *   - `callbackURL`      URL to which Slack will redirect the user after authorization grant
 *   - `userProfileURL`   URL to retrieve user profile from
 *   — `skipUserProfile`  To retrieve user profile or not
 *
 * Examples:
 *
 *     passport.use(new SlackStrategy({
 *         clientID: '123-456-789',
 *         clientSecret: 'shhh-its-a-secret'
 *         callbackURL: 'https://www.example.net/auth/callback',
 *         userProfileURL: 'https://slack.com/api/users.info'
 *       },
 *       function(accessToken, response, profile, cb) {
 *         User.findOrCreate(..., function (err, user) {
 *           cb(err, user);
 *         });
 *       }
 *     ));
 *
 * @constructor
 * @param {object} options
 * @param {function} verify
 * @access public
 */
function Strategy (options, verify) {
  options = options || {}
  options.authorizationURL = options.authorizationURL || 'https://slack.com/oauth/v2/authorize'
  options.tokenURL = options.tokenURL || 'https://slack.com/api/oauth.v2.access'
  options.scopeSeparator = options.scopeSeparator || ','
  options.customHeaders = options.customHeaders || {}

  const slackAuthOptions = {
    passReqToCallback: options.passReqToCallback,
    verify
  }
  options.passReqToCallback = true
  OAuth2Strategy.call(this, options, wrapVerify(slackAuthOptions))
  this.name = 'slack'
  this._userProfileURL = options.userProfileURL || 'https://slack.com/api/users.identity'
  this._oauth2.useAuthorizationHeaderforGET(true)

  // If user token, access token will be empty.
  // Need to swap with token in authed_user and set profile
  const self = this
  const _oauth2GetOAuthAccessToken = this._oauth2.getOAuthAccessToken
  this._oauth2.getOAuthAccessToken = function (code, params, callback) {
    _oauth2GetOAuthAccessToken.call(self._oauth2, code, params, function (err, accessToken, refreshToken, params) {
      if (err) { return callback(err) }
      if (!accessToken) {
        // Could be user token and not bot token
        // Set to the user tokens
        if (params && params.authed_user && params.authed_user.access_token) {
          accessToken = params.authed_user.access_token
        } else {
          return callback(new Error('No access token returned'))
        }
      }

      self._oauth2.profile = params.authed_user
      callback(null, accessToken, refreshToken, params)
    })
  }
}

// Inherit from `OAuth2Strategy`.
util.inherits(Strategy, OAuth2Strategy)

// Add extra parameters like user_scope
Strategy.prototype.authorizationParams = function (options) {
  let extras = {}
  if (options.extra_params) {
    extras = options.extra_params
  }
  if (options.user_scope) {
    extras.user_scope = options.user_scope.join(',')
  }

  return extras
}

/**
 * Retrieve user profile from Slack
 *
 * @param {string} accessToken
 * @param {function} done
 * @access protected
 */
Strategy.prototype.userProfile = function (accessToken, done) {
  if (!this._oauth2.profile) {
    return done(new Error('Failed to fetch user profile'))
  }
  const profile = this._oauth2.profile
  const url = `${this._userProfileURL}?user=${profile.id}`
  this._oauth2.get(url, profile.access_token, function (err, body, res) {
    var json

    if (err) {
      if (err.data) {
        try {
          json = JSON.parse(err.data)
        } catch (_) {}
      }

      if (json && json.message) {
        return done(new Error(json.message))
      }
      return done(new InternalOAuthError('Failed to fetch user profile', err))
    }

    try {
      json = JSON.parse(body)
    } catch (e) {
      return done(new Error('Failed to parse user profile'))
    }

    if (!json.ok) {
      // Error
      return done(new Error(json.error))
    }

    done(null, json)
  })
}

/**
 * Verify Wrapper
 *
 * Adapts the verify callback that the super class expects to the verify callback API this
 * strategy presents to the user.
 * @param {Object} slackAuthOptions
 * @param {boolean} slackAuthOptions.passReqToCallback
 * @param {SlackStrategy~verifyCallback} slackAuthOptions.verify
 * @return {function} oauth2VerifyCallbackWithRequest
 * @access private
 */
function wrapVerify (slackAuthOptions) {
  return function _verify (req, accessToken, refreshToken, params, profile, verified) {
    if (!slackAuthOptions.passReqToCallback) {
      slackAuthOptions.verify(
        accessToken,
        params,
        profile,
        verified
      )
    } else {
      slackAuthOptions.verify(
        req,
        accessToken,
        params,
        profile,
        verified
      )
    }
  }
}

// Expose constructor.
module.exports = Strategy
