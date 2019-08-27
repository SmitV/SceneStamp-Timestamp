var db = require('./database_actions.js')
var actions = require('./actions.js')


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

	login(baton, req, callback) {

	},

	authValidate(baton, req, suc_callback) {
		baton.addMethod('authValidate')

		validateHeaders = (callback) => {
			var params = {
				username: req.get('username'),
				auth_token: req.get('auth_token'),
			}
			if(req.get('testMode') !== 'true') suc_callback()
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
			if(userData.length !== 1){
				baton.setError({
					username: params.username,
					auth_token: params.auth_token,
					public_message: 'Invalid username'
				})
				actions._generateError(baton)
			}
			else if(userData[0].auth_token !== params.auth_token){
				baton.setError({
					username: params.username,
					auth_token: params.auth_token,
					userData: JSON.stringify(userData[0]),
					public_message: 'Invalid auth token'
				})
				actions._generateError(baton)
			}else{
				callback()
			}
		}

		this._getUserData(baton, params,(userData)=>{
			checkUser(params, userData, callback)
		} )
	},
	_getUserData(baton, params, callback){
		db.getUserData(baton, params, (userData) => {
			actions._handleDBCall(baton, userData, false /*multiple*/ , callback)
		})
	}
}