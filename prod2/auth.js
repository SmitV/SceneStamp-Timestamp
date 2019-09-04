var db = require('./database_actions.js')
var actions = require('./actions.js')

var passwordValidator = require('password-validator');
var bcrypt = require('bcrypt')
var jwt = require('jsonwebtoken')
var fs = require('fs')

// PRIVATE and PUBLIC key
var privateKEY = fs.readFileSync(__dirname + '/jwt_private.key', 'utf8');
var publicKEY = fs.readFileSync(__dirname + '/jwt_public.key', 'utf8');

//Schema for password validation
var schema = new passwordValidator();

schema
	.is().min(8) // Minimum length 8
	.is().max(100) // Maximum length 100
	.has().uppercase() // Must have uppercase letters
	.has().lowercase() // Must have lowercase letters
	.has().digits() // Must have digits
	.has().not().spaces() // Should not have spaces
	.is().not().oneOf(['Passw0rd', 'Password123']);

var saltCount = 5;

/**
Auth Validation for Requests 

Pre api requests, login must get called
	Will check username and password
	Create and store auth token
	Pass back token 

For all api requests
	Will check username and auth token
	IF good:
		proceed with api call
	bad:
		reject call with auth error, user will need to login again
		(future; keep counter of tries, block login for account if exceed)

*/

module.exports = {

	createUser(baton, req) {

		var createParams = (callback) => {
			callback({
				username: req.get('username'),
				email: req.get('email'),
				password: req.get('password')
			})
		}

		var validateRequest = (params, callback) => {
			actions.validateRequest(baton, params, 'createUser', (update_params) => {
				if (!this._validateEmail(update_params.email)) {
					baton.setError({
						params: update_params,
						email: params.email,
						public_message: 'Invalid Email Format'
					})
					actions._generateError(baton)
					return
				}
				callback(update_params)
			})
		}

		var validateParams = (params, callback) => {
			this._getUserData(baton, params, (userData) => {
				if (userData.find(user => {
						return user.username == params.username
					}) !== undefined) {
					baton.setError({
						params: params,
						username: params.username,
						public_message: 'Username Taken'
					})
					actions._generateError(baton)
					return
				}
				if (userData.find(user => {
						return user.email == params.email
					}) !== undefined) {
					baton.setError({
						params: params,
						username: params.username,
						public_message: 'Email Already Registered'
					})
					actions._generateError(baton)
					return
				}
				var passValidation = schema.validate(params.password, {
					list: true
				})
				if (passValidation.length !== 0) {
					baton.setError({
						params: params,
						details: passValidation.toString(),
						public_message: 'Invalid Password,Please fuitfil requirements'
					})
					actions._generateError(baton)
					return
				}
				callback()
			})
		}

		var createUserWithParams = (params, callback) => {
			//salt and hash password
			bcrypt.hash(params.password, saltCount, (err, hash) => {
				if (err) {
					baton.setError({
						params: params,
						err: err
					})
					actions._generateError(baton)
					return
				}
				params.password = hash
				this._getUserData(baton, {}, user_data => {
					params.user_id = actions._generateId(actions.ID_LENGTH.user, user_data.map(function(user) {
						return user.user_id
					}))
					db.insertUser(baton, params, _ => {
						callback()
					})
				})

			})
		}

		createParams(params => {
			validateRequest(params, (update_params) => {
				validateParams(update_params, () => {
					createUserWithParams(params, _ => {
						baton.json({
							message: 'user created'
						})
					})
				})
			})
		})

	},

	login(baton, req) {

		var createParams = (callback) => {
			callback({
				username: req.get('username'),
				email: req.get('email'),
				password: req.get('password')
			})
		}

		var validateRequest = (params, callback) => {
			actions.validateRequest(baton, params, 'login', (update_params) => {
				if (params.username == undefined && params.email == undefined) {
					baton.setError({
						params: update_params,
						public_message: 'Username/Email Required'
					})
					actions._generateError(baton)
					return
				}
				callback(update_params)
			})
		}

		var validateParams = (params, callback) => {

			var validateUsernameEmail = (callback) => {
				this._getUserData(baton, params, (userData) => {
					if (params.username !== undefined) {
						var user = userData.find(user => {
							return user.username == params.username
						})
						if (user === undefined) {
							baton.setError({
								params: params,
								username: params.username,
								public_message: 'Invalid Username'
							})
							actions._generateError(baton)
							return
						} else {
							callback(user)
						}
					} else {
						if (!this._validateEmail(params.email)) {
							baton.setError({
								email: params.email,
								public_message: 'Invalid Email Format'
							})
							actions._generateError(baton)
							return
						}
						var user = userData.find(user => {
							return user.email == params.email
						})
						if (user === undefined) {
							baton.setError({
								params: params,
								username: params.username,
								public_message: 'Invalid Email'
							})
							actions._generateError(baton)
							return
						} else {
							callback(user)
						}
					}
				})
			}

			var validatePassword = (user, callback) => {
				bcrypt.compare(params.password, user.password, function(err, res) {
					if (res === false) {
						baton.setError({
							params: params,
							username: params.username,
							public_message: 'Invalid Password'
						})
						actions._generateError(baton)
						return
					}
					callback()
				});
			}

			validateUsernameEmail((user) => {
				validatePassword(user, _ => {
					callback(user)
				})
			})
		}

		createParams(params => {
			validateRequest(params, (update_params) => {
				validateParams(update_params, (user) => {
					this._createJwt(user, token => {
						baton.json({
							auth_token: token
						})
					})
				})
			})
		})

	},

	_createJwt(user, callback) {

		console.log('aud')
		console.log(user.username)
		// SIGNING OPTIONS
		var signOptions = {
			issuer: 'SceneStamp',
			subject: 'us@scenestamp.com',
			audience: user.username,
			expiresIn: "12h",
			algorithm: "RS256"
		};

		callback(jwt.sign({
			user_id: user.user_id
		}, privateKEY, signOptions))
	},



	_validateEmail(email) {
		var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return re.test(String(email).toLowerCase());
	},

	authValidate(baton, req, suc_callback) {
		baton.addMethod('authValidate')

		var createParams = (callback) => {
			callback({
				auth_token: req.get('auth_token')
			})
		}

		var validateAuthtoken = (params, callback) => {

			var token = jwt.verify(params.auth_token, publicKEY, function(err, decoded) {
				if (err|| decoded === undefined) {
					baton.setError({
						auth_token: params.auth_token,
						public_message: 'Auth token invalid'
					})
					actions._generateError(baton)
					return
				} else {
					baton.user_id = decoded.user_id
					callback()
				}
			})
		}

		createParams((params) => {
			validateAuthtoken(params, suc_callback)
		})

	},
	_getUserData(baton, params, callback) {
		db.getUserData(baton, params, (userData) => {
			actions._handleDBCall(baton, userData, false /*multiple*/ , callback)
		})
	}
}