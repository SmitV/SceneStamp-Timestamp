var db = require('./database_actions.js')
var actions = require('./actions.js')

var passwordValidator = require('password-validator');
var bcrypt = require('bcrypt')

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



	_validateEmail(email) {
		var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return re.test(String(email).toLowerCase());
	},

	login(baton, req, callback) {

	},

	authValidate(baton, req, suc_callback) {
		baton.addMethod('authValidate')

		validateHeaders = (callback) => {
			var params = {
				username: req.get('username'),
				auth_token: req.get('auth_token'),
			}
			if (req.get('testMode') !== 'true') suc_callback()
			else if (params.username == undefined || params.auth_token == undefined) {
				baton.setError({
					username: params.username,
					auth_token: params.auth_token,
					public_message: 'Auth Parameters needed'
				})
				actions._generateError(baton)
			} else {
				callback(params)
			}
		}

		validateHeaders((params) => {
			this._validateWithAuthToken(baton, params, suc_callback)
		})


	},
	_validateWithCredentials(baton, params, callback) {
		baton.addMethod('_validateWithCredentials')
	},
	_validateWithAuthToken(baton, params, callback) {
		baton.addMethod('_validateWithAuthToken')

		function checkUser(params, userData, callback) {
			if (userData.length !== 1) {
				baton.setError({
					username: params.username,
					auth_token: params.auth_token,
					public_message: 'Invalid username'
				})
				actions._generateError(baton)
			} else if (userData[0].auth_token !== params.auth_token) {
				baton.setError({
					username: params.username,
					auth_token: params.auth_token,
					userData: JSON.stringify(userData[0]),
					public_message: 'Invalid auth token'
				})
				actions._generateError(baton)
			} else {
				callback()
			}
		}

		this._getUserData(baton, params, (userData) => {
			checkUser(params, userData, callback)
		})
	},
	_getUserData(baton, params, callback) {
		db.getUserData(baton, params, (userData) => {
			actions._handleDBCall(baton, userData, false /*multiple*/ , callback)
		})
	}
}