var assert = require('assert');
const expect = require('chai').expect;
var sinon = require('sinon')
var chai = require('chai')
var chaiHttp = require('chai-http');
var nock = require('nock')
var bcrypt = require('bcrypt')
var jwt = require('jsonwebtoken')
var AccessControl = require('accesscontrol')
var winston = require('winston')

var server = require('../index').server

chai.use(chaiHttp);

var logger = require('../prod2/logger').MAIN_LOGGER
var actions = require('../prod2/actions')
var dbActions = require('../prod2/database_actions')
var auth = require('../prod2/auth')
var cred = require('../prod2/credentials')


function assertErrorMessage(res, msg, custom) {
	expect((custom == true ? res.endStatus : res.status)).to.equal(500)
	expect((custom == true ? res.data : res.body)).to.have.property('error_message')
	expect((custom == true ? res.data : res.body).error_message).to.equal(msg)
}

function assertSuccess(res, post) {
	expect(res.status).to.equal((post ? 201 : 200))
}

var TIMEOUT = 100;
var EXTENDED_TIMEOUT = 500;


describe('timestamp server tests', function() {

	function sendRequest(path, params, post, headers) {

		var addHeaders = req => {
			if (headers !== undefined) {
				Object.keys(headers).forEach(head => {
					req.set(head, headers[head])
				})
			}
			return req
		}

		return (post ?
			addHeaders(chai.request(server).post('/' + path).set('content-type', 'application/json')).send(params) :
			addHeaders(chai.request(server).get('/' + path + '?' + Object.keys(params).map(attr => {
				return attr + '=' + params[attr]
			}).join('&'))).send())

	}

	/*  getting data calls
		
		for series/episode/character/category/timestamp

		also test filtering
	*/
	var sandbox;

	var fakeReq;

	var fakeRes;
	var fakeSeriesData;
	var fakeEpisodeData;
	var fakeCharacterData;
	var fakeCategoryData;
	var fakeCompilationData;
	var fakeCompilationTimestampData;



	beforeEach(function() {
		sandbox = sinon.createSandbox()

		fakeRes = {
			data: null,
			endStatus: null,
			status: function(endStatus) {
				this.endStatus = endStatus
				return this
			},
			json: function(data) {
				this.data = data;
			}
		}

		//req body to test the auth 
		//can't use the chai http , since we are not makking a endpoint call and simple calling a function 
		fakeReq = {
			headers: {},
			body: {},
			get(attr) {
				return this.headers[attr]
			}
		}

		fakeSeriesData = [{
			"series_id": 0,
			"series_name": "Test Series 1"
		}, {
			"series_id": 1,
			"series_name": "Test Series 2"
		}]

		fakeEpisodeData = [{
			"episode_id": 1,
			"episode_name": "Test Episode 1",
			"air_date": 1564034876,
			"series_id": 0
		}, {
			"episode_id": 2,
			"episode_name": "Test Episode 2",
			"air_date": 1564038876,
			"series_id": 1
		}, {
			"episode_id": 3,
			"episode_name": "Test Episode 3",
			"air_date": 1569038876
		}, {
			"episode_id": 4,
			"episode_name": "Test Episode 4",
			"youtube_id": 'hvTKfVQWU40'
		}];

		fakeCharacterData = [{
			"character_name": "Character 1",
			"character_id": 1
		}, {
			"character_name": "Character 2",
			"character_id": 2
		}, {
			"character_name": "Character 3",
			"character_id": 3
		}, {
			"character_name": "Character 4",
			"character_id": 4
		}];

		fakeCategoryData = [{
			"category_id": 0,
			"category_name": "Category 0"
		}, {
			"category_id": 1,
			"category_name": "Category 1"
		}, {
			"category_id": 2,
			"category_name": "Category 2"
		}];

		fakeUserData = [{
			user_id: 101,
			username: 'user_1',
			password: 'pass_1',
			email: 'email1@email.com',
			auth_token: 'auth_token_1'
		}, {
			user_id: 102,
			username: 'user_2',
			password: 'pass_2',
			email: 'email2@email.com',
			auth_token: 'auth_token_2'
		}];

		sandbox.stub(auth, 'authValidate').callsFake(function(baton, req, callback) {
			callback()
		})

		sandbox.stub(auth, '_validateRole').callsFake((baton, params, role_id, callback) => {
			callback()
		})


		sandbox.stub(actions, '_generateId').callsFake(function() {
			return 10
		})

	});

	afterEach(function() {
		sandbox.restore()
		nock.cleanAll()
	})


	describe('user', function() {

		var fakeBaton;

		var hashedPassword = 'hashedPassword'


		function sucsPassCompare() {
			sandbox.stub(bcrypt, 'compare').callsFake(function(pass, saved, callback) {
				callback(null, true)
			})
		}

		function failPassCompare() {
			sandbox.stub(bcrypt, 'compare').callsFake(function(pass, saved, callback) {
				callback(null, false)
			})
		}

		function authVerify() {
			sandbox.stub(jwt, 'verify').callsFake(function(token, key, callback) {
				callback(null, token)
			})
		}

		function authVerifyFail() {
			sandbox.stub(jwt, 'verify').callsFake(function(token, key, callback) {
				callback(null, undefined)
			})
		}


		beforeEach(function() {

			auth.authValidate.restore()

			//stub get all series dat for all tests
			sandbox.stub(dbActions, 'getUserData').callsFake(function(baton, data, callback) {
				return callback(fakeUserData.filter(user => {
					return user.username == data.username || user.email == data.email
				}))
			})

			sandbox.stub(bcrypt, 'hash').callsFake(function(pass, salt, callback) {
				callback(null, hashedPassword)
			})

			sandbox.stub(dbActions, 'insertUser').callsFake(function(baton, newUser, callback) {
				fakeUserData.push(newUser)
				callback(fakeUserData)
			})

			sandbox.stub(jwt, 'sign').callsFake(function(payload, privateKey, signingOptions) {
				return {
					payload: payload,
					privateKey: privateKey,
					signingOptions: signingOptions
				}
			})

		})

		describe('create user', function() {

			it('should create user', function(done) {
				var headers = {
					username: 'testUserName',
					email: 'testemail@email.com',
					password: 'testPassword1'
				}
				sendRequest('createUser', {}, /*post=*/ false, headers).end((err, res, body) => {
					assertSuccess(res)
					headers.password = hashedPassword
					headers.user_id = 10
					expect(fakeUserData[fakeUserData.length - 1]).to.deep.equal(headers)
					done()
				})
			})

			it('should throw parameter validation for missing params', function(done) {
				var headers = {
					//missing username
					email: 'testemail@email.com',
					password: 'testPassword1'
				}
				sendRequest('createUser', {}, /*post=*/ false, headers).end((err, res, body) => {
					assertErrorMessage(res, 'Parameter validation error')
					done()
				})
			})

			it('should throw for invalid email format', function(done) {
				var headers = {
					username: 'testUserName',
					email: 'testemail', //invalid email format
					password: 'testPassword1'
				}
				sendRequest('createUser', {}, /*post=*/ false, headers).end((err, res, body) => {
					assertErrorMessage(res, 'Invalid Email Format')
					done()
				})
			})

			it('should throw for invalid password validation', function(done) {
				var headers = {
					username: 'testUserName',
					email: 'testemail@email.com',
					password: 'pass' //invalid password 
				}
				sendRequest('createUser', {}, /*post=*/ false, headers).end((err, res, body) => {
					assertErrorMessage(res, 'Invalid Password,Please fuitfil requirements')
					done()
				})
			})

			it('should throw for existing account with email', function(done) {
				var headers = {
					username: 'testUserName',
					email: fakeUserData[0].email, //existing email
					password: 'testPassword1'
				}
				sendRequest('createUser', {}, /*post=*/ false, headers).end((err, res, body) => {
					assertErrorMessage(res, 'Email Already Registered')
					done()
				})
			})

		})

		describe('login', function() {

			it('should login user with username', function(done) {
				var user = fakeUserData[0]
				var headers = {
					username: user.username,
					password: user.password
				}
				sucsPassCompare();
				sendRequest('login', {}, /*post=*/ false, headers).end((err, res, body) => {
					assertSuccess(res)
					expect(res.body.auth_token.payload).to.deep.equal({
						user_id: user.user_id
					})
					done()
				})
			})


			it('should login user with email', function(done) {
				var user = fakeUserData[0]
				var headers = {
					email: user.email,
					password: user.password
				}
				sucsPassCompare();
				sendRequest('login', {}, /*post=*/ false, headers).end((err, res, body) => {
					assertSuccess(res)
					expect(res.body.auth_token.payload).to.deep.equal({
						user_id: user.user_id
					})
					done()
				})
			})

			it('should login user and set user role', function(done) {
				fakeUserData[0].role = 101
				var user = fakeUserData[0]
				var headers = {
					email: user.email,
					password: user.password
				}
				sucsPassCompare();
				sendRequest('login', {}, /*post=*/ false, headers).end((err, res, body) => {
					assertSuccess(res)
					expect(res.body.auth_token.payload).to.deep.equal({
						user_id: user.user_id,
						user_role: user.role
					})
					done()
				})
			})

			it('should throw for invalid username', function(done) {
				var user = fakeUserData[0]
				var headers = {
					username: 'invalidUsername',
					password: user.password
				}
				sendRequest('login', {}, /*post=*/ false, headers).end((err, res, body) => {
					assertErrorMessage(res, 'Invalid Username')
					done()
				})
			})

			it('should throw for invalid email format', function(done) {
				var user = fakeUserData[0]
				var headers = {
					email: 'invalidEmail',
					password: user.password
				}
				sendRequest('login', {}, /*post=*/ false, headers).end((err, res, body) => {
					assertErrorMessage(res, 'Invalid Email Format')
					done()
				})
			})

			it('should throw for invalid email format', function(done) {
				var user = fakeUserData[0]
				var headers = {
					email: 'invalidEmail@test.com',
					password: user.password
				}
				sendRequest('login', {}, /*post=*/ false, headers).end((err, res, body) => {
					assertErrorMessage(res, 'Invalid Email')
					done()
				})
			})

			it('should throw for invalid password', function(done) {
				var user = fakeUserData[0]
				var headers = {
					username: user.username,
					password: user.password
				}
				failPassCompare();
				sendRequest('login', {}, /*post=*/ false, headers).end((err, res, body) => {
					assertErrorMessage(res, 'Invalid Password')
					done()
				})
			})
		})

		describe('authenticate', function() {

			it('should validate auth token', function(done) {
				fakeReq.headers = {
					auth_token: {
						user_id: 101
					},
					test_mode: true
				}
				authVerify();
				fakeBaton = actions._getBaton('authActionTest', fakeReq.body, fakeRes)
				auth.authValidate(fakeBaton, fakeReq, function() {
					expect(fakeBaton.user_id).to.equal(101)
					done()
				})
			})

			it('should not validate with no test mode', function(done) {
				fakeReq.headers = {
					auth_token: {
						user_id: 101
					},
					//test_mode:true
				}
				authVerify();
				fakeBaton = actions._getBaton('authActionTest', fakeReq.body, fakeRes)
				auth.authValidate(fakeBaton, fakeReq, function() {
					expect(fakeBaton.user_id).to.equal(null)
					done()
				})
			})

			it('should throw for invalid auth token', (done) => {

				fakeReq.headers = {
					auth_token: 'test',
					test_mode: true
				}
				authVerifyFail();
				fakeBaton = actions._getBaton('authActionTest', fakeReq.body, fakeRes)
				auth.authValidate(fakeBaton, fakeReq, () => {})
				setTimeout(() => {
					expect(fakeBaton.err[0].public_message).to.equal('Auth token invalid')
					done()
				}, TIMEOUT)
			})
		})

		describe('actions and roles', function() {

			var action_stub;

			var fakeRoleData = [{
				role_id: 0,
				role_name: 'Admin',
			}, {
				role_id: 1,
				role_name: 'Other',

			}]

			var fakeActionData = [{
				action_id: 101,
				action_name: 'getTimestampData'
			}, {
				action_id: 102,
				action_name: 'getEpisodeData'
			}]

			var fakeRoleActionData = [{
				role_id: 0,
				action_id: 101
			}, {
				role_id: 0,
				action_id: 102
			}, {
				role_id: 1,
				action_id: 101
			}]

			function setupUserWithRole(user, role_id) {
				user.role = role_id
			}

			beforeEach(function() {
				auth._validateRole.restore()

				sandbox.stub(dbActions, 'getAllRoleData').callsFake(function(baton, queryData, callback) {
					callback(fakeRoleData)
				})

				sandbox.stub(dbActions, 'getAllActionData').callsFake(function(baton, queryData, callback) {
					callback(fakeActionData)
				})

				sandbox.stub(dbActions, 'getAllRoleActionData').callsFake(function(baton, queryData, callback) {
					callback(fakeRoleActionData)
				})

				authVerify();
			})

			it('should validate user with permission', (done) => {
				var user = fakeUserData[0]
				setupUserWithRole(user, 0)
				fakeReq.headers = {
					auth_token: {
						user_id: 101,
						user_role: 0
					},
					test_mode: true
				}
				fakeBaton = actions._getBaton('getTimestampData', fakeReq.body, fakeRes)
				auth.authValidate(fakeBaton, fakeReq, function() {
					//means the authentication was sucsessful
					done()
				})
			})

			it('should not validate user with unsufficient action', (done) => {
				var user = fakeUserData[0]
				setupUserWithRole(user, 1) //1 is not admin, doesn't have 'getEpisodeData' action 
				fakeReq.headers = {
					auth_token: {
						user_id: 101,
						user_role: 1
					},
					test_mode: true
				}
				fakeBaton = actions._getBaton('getEpisodeData', fakeReq.body, fakeRes)
				auth.authValidate(fakeBaton, fakeReq, () => {})
				setTimeout(() => {
					expect(fakeBaton.err[0].public_message).to.equal('Permission Denied')
					done()
				}, TIMEOUT)
			})

			it('should not validate user with invalid role_id', (done) => {
				var user = fakeUserData[0]
				setupUserWithRole(user, 1) //1 is not admin, doesn't have 'getEpisodeData' action 
				fakeReq.headers = {
					auth_token: {
						user_id: 101,
						//role_id is missing
					},
					test_mode: true
				}
				fakeBaton = actions._getBaton('getEpisodeData', fakeReq.body, fakeRes)
				auth.authValidate(fakeBaton, fakeReq, () => {})
				setTimeout(() => {
					expect(fakeBaton.err[0].public_message).to.equal('Permission Denied')
					done()
				}, TIMEOUT)
			})

		})

	})

	describe('request validation', function() {

		var fakeBaton;

		beforeEach(() => {
			actions.setActionValidation({
				testAction: {
					attr_1: {
						type: "number"
					},
					attr_2: {
						type: "boolean",
						optional: true
					},
					attr_3: {
						type: "number",
						multiple: true
					}
				}
			})
		})

		afterEach(() => {
			actions.resetActionValidation()
		})

		function createFakeBaton(params) {
			return actions._getBaton('testAction', params, fakeRes)
		}

		it('should validate request params', function(done) {
			var params = {
				attr_1: "101",
				attr_3: "101, 102"
			}
			actions.validateRequest(createFakeBaton(params), params, 'testAction', updated_params => {
				expect(updated_params.attr_1).to.equal(101)
				expect(updated_params.attr_3).to.deep.equal([101, 102])
				done()
			})
		})

		it('should throw non optional error', (done) => {
			var params = {
				attr_2: 'true',
				attr_3: "101, 102"
			}
			var fakeBaton = createFakeBaton(params)
			actions.validateRequest(fakeBaton, params, 'testAction')
			setTimeout(function() {
				assertErrorMessage(fakeRes, 'Parameter validation error', /*custom=*/ true)
				expect(fakeBaton.err[0].error_detail).to.equal('Attibute value missing')
				done()
			}, TIMEOUT)
		})

		it('should throw non multiple error', (done) => {
			var params = {
				attr_1: "101, 102",
				attr_3: "101,102"
			}
			var fakeBaton = createFakeBaton(params)
			actions.validateRequest(fakeBaton, params, 'testAction')
			setTimeout(function() {
				assertErrorMessage(fakeRes, 'Parameter validation error', /*custom=*/ true)
				expect(fakeBaton.err[0].error_detail).to.equal('Single Value is Expected')
				done()
			}, TIMEOUT)
		})

		it('should throw invalid attribute type', (done) => {
			var params = {
				attr_1: "101",
				attr_2: '101',
				attr_3: "101,102"
			}
			var fakeBaton = createFakeBaton(params)
			actions.validateRequest(fakeBaton, params, 'testAction')
			setTimeout(function() {
				assertErrorMessage(fakeRes, 'Parameter validation error', /*custom=*/ true)
				expect(fakeBaton.err[0].error_detail).to.equal('Invalid Attribute Type')
				done()
			}, TIMEOUT)
		})

	})

	describe('series', function() {

		beforeEach(function() {
			//stub get all series dat for all tests
			sandbox.stub(dbActions, 'getAllSeriesData').callsFake(function(baton, callback) {
				return callback(fakeSeriesData)
			})
		})

		it('should return all series data', function(done) {
			sendRequest('getSeriesData', {}).end((err, res, body) => {
				assertSuccess(res)
				expect(res.body).to.deep.equal(fakeSeriesData)
				done()
			})

		})

		it('should create new series', function(done) {


			sandbox.stub(dbActions, 'insertSeries').callsFake(function(baton, newSeries, callback) {
				fakeSeriesData.push(newSeries)
				return callback(fakeSeriesData)
			})

			var series_name = 'InTest Series'
			var params = {
				series_name: series_name
			}

			sendRequest('newSeries', params).end((err, res, body) => {
				assertSuccess(res)
				expect(res.body.length).equal(3)
				expect(res.body[2]).to.deep.equal({
					series_id: 10,
					series_name: series_name
				})
				done()
			})
		})

		it('should throw error when same series data', function(done) {
			var series_name = 'InTest Series'
			fakeSeriesData[0].series_name = series_name

			var params = {
				series_name: series_name
			}

			sendRequest('newSeries', params).end((err, res, body) => {
				assertErrorMessage(res, 'Series Name exists')
				done()
			})
		})
	})

	describe('episode', function() {

		beforeEach(function() {

			//stub get all series dat for all tests
			sandbox.stub(dbActions, 'getAllEpisodeData').callsFake(function(baton, queryData, callback) {
				var result = [...fakeEpisodeData].filter(ep => {
					return (queryData.series_id && queryData.series_id.length > 0 ? queryData.series_id.includes(ep.series_id) : true)
				}).filter(ep => {
					return (queryData.youtube_id && queryData.youtube_id.length > 0 ? queryData.youtube_id.includes(ep.youtube_id) : true)
				})
				return callback(result)
			})
		})


		it('should return all episode data', function(done) {
			sendRequest('getEpisodeData', {}).end((err, res, body) => {
				assertSuccess(res)
				expect(res.body).to.deep.equal(fakeEpisodeData)
				done()
			})
		})

		it('should filter by one series id', function(done) {
			var params = {
				series_ids: '0'
			}

			sendRequest('getEpisodeData', params).end((err, res, body) => {
				assertSuccess(res)
				expect(res.body.length).equal(fakeEpisodeData.filter(ep => {
					return ep.series_id == 0
				}).length)
				done()
			})
		})

		it('should filter by multiple series id', function(done) {
			var params = {
				series_ids: '0,1'
			}

			sendRequest('getEpisodeData', params).end((err, res, body) => {
				assertSuccess(res)
				expect(res.body.length).equal(fakeEpisodeData.filter(ep => {
					return ep.series_id == 0 || ep.series_id == 1
				}).length)
				done()
			})
		})

		it('should filter by youtube id', function(done) {
			var params = {
				youtube_link: 'https://www.youtube.com/watch?v=' + fakeEpisodeData[3].youtube_id
			}

			sendRequest('getEpisodeData', params).end((err, res, body) => {
				assertSuccess(res)
				expect(res.body[0]).to.deep.equal(fakeEpisodeData[3])
				done()
			})
		})

		it('should throw error for invalid youtube ', function(done) {
			var params = {
				youtube_link: 'https://www.youtube.com/wat?v=' + fakeEpisodeData[3].youtube_id
			}

			sendRequest('getEpisodeData', params).end((err, res, body) => {
				assertErrorMessage(res, 'Invalid Youtube Link')
				done()
			})
		})

		it('should throw error for invalid series_ids param', function(done) {

			var params = {
				series_ids: 'text'
			}

			sendRequest('getEpisodeData', params).end((err, res, body) => {
				assertErrorMessage(res, 'Parameter validation error')
				done()
			})
		})

		describe('inserting new episode', function() {

			function createUrl() {
				return cred.VIDEO_SERVER_URL + ':' + cred.VIDEO_SERVER_PORT
			}

			function createPath(params) {
				return '/downloadYoutubeVideo?youtube_link=' + params.youtube_link + '&episode_id=' + 10
			}

			function setupSucsessYoutubeDownload(params) {
				nock(createUrl()).get(createPath(params)).reply(200, {})
			}

			function setupErrorYoutubeDownlod(error, params) {
				nock(createUrl()).get(createPath(params)).reply(500, error)
			}

			function setupTimeoutYoutubeDownload(params) {
				nock(createUrl()).get(createPath(params)).socketDelay(1000).reply(200, {})
			}

			beforeEach(function() {


				sandbox.stub(dbActions, 'getAllSeriesData').callsFake(function(baton, callback) {
					return callback(fakeSeriesData)
				})

				sandbox.stub(dbActions, 'insertEpisode').callsFake(function(baton, episode, callback) {
					fakeEpisodeData.push(episode)
					return callback(episode)
				})

			})

			it('should create new episode', function(done) {
				var episode_data = {
					episode_name: "InTest Episode"
				}

				sendRequest('newEpisode', episode_data).end((err, res, body) => {
					assertSuccess(res)
					expect(res.body).to.deep.equal({
						episode_name: episode_data.episode_name,
						episode_id: 10
					})
					done()
				})

			})

			it('should create new episode with optional series_id', function(done) {
				var episode_data = {
					episode_name: "InTest Episode",
					series_id: '0'
				}

				sendRequest('newEpisode', episode_data).end((err, res, body) => {
					assertSuccess(res)
					expect(res.body).to.deep.equal({
						episode_name: episode_data.episode_name,
						episode_id: 10,
						series_id: 0
					})
					done()
				})
			})

			it('should create new episode with optional youtube link', function(done) {
				var testYoutubeId = 'hIahFRFd5po'
				var episode_data = {
					episode_name: "InTest Episode",
					series_id: '0',
					youtube_link: 'https://www.youtube.com/watch?v=' + testYoutubeId
				}

				setupSucsessYoutubeDownload(episode_data)

				sendRequest('newEpisode', episode_data).end((err, res, body) => {
					assertSuccess(res)
					expect(res.body).to.deep.equal({
						episode_name: episode_data.episode_name,
						episode_id: 10,
						series_id: 0,
						youtube_id: testYoutubeId,
						youtube_link: 'https://www.youtube.com/watch?v=' + testYoutubeId,
						downloadResponse: 'Youtube video download in queue'
					})
					done()
				})
			})

			it('should create new episode with optional youtube link, show error in download response', function(done) {
				var testYoutubeId = 'hIahFRFd5po'
				var episode_data = {
					episode_name: "InTest Episode",
					series_id: '0',
					youtube_link: 'https://www.youtube.com/watch?v=' + testYoutubeId
				}

				var error = {
					error: 'InTest error'
				}
				setupErrorYoutubeDownlod(error, episode_data)

				sendRequest('newEpisode', episode_data).end((err, res, body) => {
					assertSuccess(res)
					expect(res.body).to.deep.equal({
						episode_name: episode_data.episode_name,
						episode_id: 10,
						series_id: 0,
						youtube_id: testYoutubeId,
						youtube_link: 'https://www.youtube.com/watch?v=' + testYoutubeId,
						downloadResponse: error
					})
					done()
				})
			})

			it('should throw for invalid youtube link', function(done) {
				var testYoutubeId = 'jkPkbEqS-Ps'
				var episode_data = {
					episode_name: "InTest Episode",
					series_id: '0',
					youtube_link: 'https://www.youtube.com/=' + testYoutubeId //invalid youtube url
				}

				sendRequest('newEpisode', episode_data).end((err, res, body) => {
					assertErrorMessage(res, 'Invalid Youtube Link')
					done()
				})
			})

			it('should create new episode with optional youtube link, show timeout in download response', function(done) {
				var testYoutubeId = 'jkPkbEqS-Ps'
				var episode_data = {
					episode_name: "InTest Episode",
					series_id: '0',
					youtube_link: 'https://www.youtube.com/watch?v=' + testYoutubeId
				}

				setupTimeoutYoutubeDownload(episode_data)

				sendRequest('newEpisode', episode_data).end((err, res, body) => {
					assertSuccess(res)
					expect(res.body).to.deep.equal({
						episode_name: episode_data.episode_name,
						episode_id: 10,
						series_id: 0,
						youtube_id: testYoutubeId,
						youtube_link: 'https://www.youtube.com/watch?v=' + testYoutubeId,
						downloadResponse: {
							error: 'Timeout while making download youtube call to video server'
						}
					})
					done()
				})
			})

			it('should throw for already registered youtube id', function(done) {
				var testYoutubeId = fakeEpisodeData[3].youtube_id //existing youtube id
				var episode_data = {
					episode_name: "InTest Episode",
					series_id: '0',
					youtube_link: 'https://www.youtube.com/watch?v=' + testYoutubeId
				}
				sendRequest('newEpisode', episode_data).end((err, res, body) => {
					assertErrorMessage(res, 'Youtube Id already Registered')
					done()
				})
			})


			it('should throw error for requiring episode_name', function(done) {

				sendRequest('newEpisode', {}).end((err, res, body) => {
					assertErrorMessage(res, 'Parameter validation error')
					done()
				})
			})

			it('should create throw error for invalid series', function(done) {
				var episode_data = {
					series_id: "3", //not valid series in fakeSeriesData
					episode_name: "InTest Episode"
				}
				sendRequest('newEpisode', episode_data).end((err, res, body) => {
					assertErrorMessage(res, 'Invalid Series Id')
					done()
				})
			})

			it('should create throw error for existing episode name', function(done) {
				var episode_data = {
					episode_name: fakeEpisodeData[0].episode_name
				}
				sendRequest('newEpisode', episode_data).end((err, res, body) => {
					assertErrorMessage(res, 'Episode Name exists')
					done()
				})

			})
		});
	});

	describe('character ', function() {

		beforeEach(function() {
			//stub get all series dat for all tests
			sandbox.stub(dbActions, 'getAllCharacterData').callsFake(function(baton, callback) {
				return callback(fakeCharacterData)
			})
		})


		it('should return all character data', function(done) {
			sendRequest('getCharacterData', {}).end((err, res, body) => {
				assertSuccess(res)
				expect(res.body).to.deep.equal(fakeCharacterData)
				done()
			})
		})


		describe('inserting new character', function() {

			beforeEach(function() {


				sandbox.stub(dbActions, 'getAllSeriesData').callsFake(function(baton, callback) {
					return callback(fakeSeriesData)
				})

				sandbox.stub(dbActions, 'insertCharacter').callsFake(function(baton, values, callback) {
					fakeEpisodeData.push(values)
					return callback(values)
				})
			})

			it('should create new character', function(done) {
				var values = {
					character_name: "Mark",
				}
				sendRequest('newCharacter', values).end((err, res, body) => {
					assertSuccess(res)
					values.character_id = 10;
					expect(res.body).to.deep.equal(values)
					done()
				})
			})

			it('should throw error for requiring character_name', function(done) {
				sendRequest('newCharacter', {}).end((err, res, body) => {
					assertErrorMessage(res, 'Parameter validation error')
					done()
				})

			})

			it('should create throw error for existing character name ', function(done) {
				var values = {
					character_name: fakeCharacterData[0].character_name
				}
				sendRequest('newCharacter', values).end((err, res, body) => {
					assertErrorMessage(res, 'Character Name already exists')
					done()
				})
			})

		})

	});

	describe('category', function() {

		beforeEach(function() {
			//stub get all series dat for all tests
			sandbox.stub(dbActions, 'getAllCategoryData').callsFake(function(baton, callback) {
				return callback(fakeCategoryData)
			})
		})


		it('should return all category data', function(done) {
			sendRequest('getCategoryData', {}).end((err, res, body) => {
				assertSuccess(res)
				expect(res.body).to.deep.equal(fakeCategoryData)
				done()
			})
		})


		describe('inserting new category', function() {

			beforeEach(function() {

				sandbox.stub(dbActions, 'insertCategory').callsFake(function(baton, values, callback) {
					fakeCategoryData.push(values)
					return callback(values)
				})
			})

			it('should create new categoy', function(done) {
				var category_values = {
					category_name: "InTest Category"
				}

				sendRequest('newCategory', category_values).end((err, res, body) => {
					assertSuccess(res)
					category_values.category_id = 10
					expect(res.body).to.deep.equal(category_values)
					done()
				})

			})

			it('should throw error for invalid params', function(done) {
				sendRequest('newCategory', {}).end((err, res, body) => {
					assertErrorMessage(res, 'Parameter validation error')
					done()
				})
			})


			it('should create throw error for existing episode name in same series', function(done) {
				var category_values = {
					category_name: fakeCategoryData[0].category_name
				}
				sendRequest('newCategory', category_values).end((err, res, body) => {
					assertErrorMessage(res, 'Category Name exists')
					done()
				})
			})

		});
	});


	describe('timestamp', function() {

		beforeEach(function() {

			fakeTimestampData = [{
				"timestamp_id": 0,
				"start_time": 0,
				"episode_id": 1
			}, {
				"timestamp_id": 1,
				"start_time": 0,
				"episode_id": 1
			}, {
				"timestamp_id": 3,
				"start_time": 0,
				"episode_id": 2
			}, {
				"timestamp_id": 4,
				"start_time": 0,
				"episode_id": 2
			}];

			fakeTimestampCategoryData = [{
				"timestamp_id": 3,
				"category_id": 0
			}, {
				"timestamp_id": 4,
				"category_id": 0
			}];

			fakeTimestampCharacterData = [{
				"timestamp_id": 1,
				"character_id": 1
			}, {
				"timestamp_id": 4,
				"character_id": 1
			}]

			//stub get all timestamp data for all tests
			sandbox.stub(dbActions, 'getAllTimestampData').callsFake(function(baton, data, callback) {
				var result = [...fakeTimestampData]
				if (data.episode_id && data.episode_id.length > 0) {
					result = result.filter(function(tm) {
						return data.episode_id.includes(tm.episode_id)
					})
				}
				if (data.timestamp_id && data.timestamp_id.length > 0) {
					result = result.filter(function(tm) {
						return data.timestamp_id.includes(tm.timestamp_id)
					})
				}
				callback(result)
			})

			//stub for the category/character for timestamp
			sandbox.stub(dbActions, 'getAllTimestampCategory').callsFake(function(baton, params, callback) {
				var result = [...fakeTimestampCategoryData]
				if (params.timestamp_ids && params.timestamp_ids > 0) {
					result = result.filter(function(tc) {
						return params.timestamp_ids.includes(tc.timestamp_id)
					});
				}
				return callback(result)
			})

			//stub for the category/character for timestamp
			sandbox.stub(dbActions, 'getAllTimestampCharacter').callsFake(function(baton, params, callback) {
				var result = [...fakeTimestampCharacterData]
				if (params.timestamp_ids && params.timestamp_ids > 0) {
					result = result.filter(function(tc) {
						return params.timestamp_ids.includes(tc.timestamp_id)
					});
				}
				return callback(result)
			})
		})

		it('should return all timestamp data', function(done) {

			sendRequest('getTimestampData', {}).end((err, res, body) => {
				assertSuccess(res)
				expect(res.body).to.deep.equal(fakeTimestampData)
				done()
			})
		})

		it('should filter for episode id', function(done) {
			var params = {
				episode_ids: "1"
			}

			sendRequest('getTimestampData', params).end((err, res, body) => {
				assertSuccess(res)
				expect(res.body.length).to.deep.equal(fakeTimestampData.filter(function(ts) {
					return ts.episode_id == 1
				}).length)
				done()
			})
		})

		it('should filter for character id', function(done) {

			var params = {
				character_ids: "1"
			}

			sendRequest('getTimestampData', params).end((err, res, body) => {
				assertSuccess(res)
				expect(res.body.map(function(ts) {
					return ts.timestamp_id
				})).to.deep.equal(fakeTimestampCharacterData.map(function(ts) {
					return ts.timestamp_id
				}))
				done()
			})

		})

		it('should filter for category id', function(done) {
			var params = {
				category_ids: "0"
			}

			sendRequest('getTimestampData', params).end((err, res, body) => {
				assertSuccess(res)
				expect(res.body.map(function(ts) {
					return ts.timestamp_id
				})).to.deep.equal(fakeTimestampCategoryData.map(function(ts) {
					return ts.timestamp_id
				}))
				done()
			})
		})

		it('should filter for character and category id', function(done) {

			var params = {
				character_ids: '1',
				category_ids: "0"
			}

			sendRequest('getTimestampData', params).end((err, res, body) => {
				assertSuccess(res)
				expect(res.body.map(function(ts) {
					return ts.timestamp_id
				})).to.deep.equal([4])
				done()
			})
		})

		it('should throw error for invalid episode id', function(done) {
			var params = {
				episode_ids: "text"
			}

			sendRequest('getTimestampData', params).end((err, res, body) => {
				assertErrorMessage(res, 'Parameter validation error')
				done()
			})
		})

		it('should throw error for invalid character id', function(done) {
			var params = {
				character_ids: "text"
			}

			sendRequest('getTimestampData', params).end((err, res, body) => {
				assertErrorMessage(res, 'Parameter validation error')
				done()
			})
		})

		describe('creating a new timestamp', function() {

			beforeEach(function() {

				//for ensureEpisodeIdExists
				sandbox.stub(dbActions, 'getAllEpisodeData').callsFake(function(baton, queryData, callback) {
					var result = [...fakeEpisodeData].filter(ep => {
						return (queryData.series_id && queryData.series_id.length > 0 ? queryData.series_id.includes(ep.series_id) : true)
					}).filter(ep => {
						return (queryData.youtube_id && queryData.youtube_id.length > 0 ? queryData.youtube_id.includes(ep.youtube_id) : true)
					})
					return callback(result)
				})


				sandbox.stub(dbActions, 'insertTimestamp').callsFake(function(baton, values, callback) {
					fakeTimestampData = fakeTimestampData.concat(values)
					callback(values)
				})
			})

			it('should create new timestamp', function(done) {
				var values = {
					start_time: "100",
					episode_id: "1"
				}

				sendRequest('newTimestamp', values).end((err, res, body) => {
					assertSuccess(res)
					expect(res.body).to.deep.equal({
						start_time: 100,
						episode_id: 1,
						timestamp_id: 10
					})
					done()
				})
			})

			it('should throw error for invalid start time(type)', function(done) {
				var values = {
					start_time: "test",
					episode_id: "1"
				}
				sendRequest('newTimestamp', values).end((err, res, body) => {
					assertErrorMessage(res, 'Parameter validation error')
					done()
				})
			})

			it('should throw error for invalid episode id (type)', function(done) {
				var values = {
					start_time: "100",
					episode_id: "text"
				}
				sendRequest('newTimestamp', values).end((err, res, body) => {
					assertErrorMessage(res, 'Parameter validation error')
					done()
				})
			})

			it('should throw error for invalid episode id', function(done) {
				var values = {
					start_time: "100",
					episode_id: "5"
				}
				sendRequest('newTimestamp', values).end((err, res, body) => {
					assertErrorMessage(res, 'Invalid Episode Id')
					done()
				})
			})

			describe('updating timestamp data', function() {

				beforeEach(function() {

					//ensure character data matches series data
					sandbox.stub(dbActions, 'getAllCharacterData').callsFake(function(baton, callback) {
						return callback(fakeCharacterData)
					})

					//stub get all series dat for all tests
					sandbox.stub(dbActions, 'getAllCategoryData').callsFake(function(baton, callback) {
						return callback(fakeCategoryData)
					})

					sandbox.stub(dbActions, 'removeTimestampCharacter').callsFake(function(baton, values, callback) {
						fakeTimestampCharacterData = fakeTimestampCharacterData.filter(function(ts) {
							return !values.map(function(v) {
								return v[0]
							}).includes(ts.timestamp_id)
						})
						callback(values)
					})

					sandbox.stub(dbActions, 'insertTimestampCharacter').callsFake(function(baton, values, callback) {
						fakeTimestampCharacterData = fakeTimestampCharacterData.filter(function(ts) {
							return !values.map(function(v) {
								return v[0]
							}).includes(ts.timestamp_id)
						})

						values.forEach(function(v) {
							fakeTimestampCharacterData.push(v)
						})
						callback(values)
					})

					sandbox.stub(dbActions, 'removeTimestampCategory').callsFake(function(baton, values, callback) {
						fakeTimestampCategoryData = fakeTimestampCategoryData.filter(function(ts) {
							return !values.map(function(v) {
								return v[0]
							}).includes(ts.timestamp_id)
						})
						callback(values)
					})

					sandbox.stub(dbActions, 'insertTimestampCategory').callsFake(function(baton, values, callback) {
						values.forEach(function(v) {
							fakeTimestampCategoryData.push(v)
						})
						callback(values)
					})

				})

				it('should update timestamp', function(done) {
					var values = {
						timestamp_id: "0",
						character_ids: "1,2",
						category_ids: "0,1"
					}

					sendRequest('updateTimestamp', values).end((err, res, body) => {
						assertSuccess(res)
						expect(res.body.character_ids).to.deep.equal([1, 2])
						expect(res.body.category_ids).to.deep.equal([0, 1])
						expect(fakeTimestampCharacterData[3]).to.deep.equal({
							timestamp_id: 0,
							character_id: 2
						});
						expect(fakeTimestampCategoryData[2]).to.deep.equal({
							timestamp_id: 0,
							category_id: 0
						});
						done()
					})
				})

				it('should throw error for invalid character', function(done) {
					var values = {
						timestamp_id: "0",
						character_ids: "10",
						category_ids: "0,1"
					}
					sendRequest('updateTimestamp', values).end((err, res, body) => {
						assertErrorMessage(res, 'Invalid characters')
						done()
					})
				})

				it('should throw error for invalid category id', function(done) {
					var values = {
						timestamp_id: "0",
						character_ids: "1",
						category_ids: "5"
					}
					sendRequest('updateTimestamp', values).end((err, res, body) => {
						assertErrorMessage(res, 'Invalid categories')
						done()
					})
				})


				it('should throw error for invalid timestamp id', function(done) {
					var values = {
						timestamp_id: "10",
						character_ids: "1",
						category_ids: "0,1"
					}
					sendRequest('updateTimestamp', values).end((err, res, body) => {
						assertErrorMessage(res, 'Invalid Timestamp Id')
						done()
					})
				})
			})

		})
	})

	describe('compilation', function() {

		beforeEach(function() {

			fakeTimestampData = [{
				"timestamp_id": 0,
				"start_time": 0,
				"episode_id": 1
			}, {
				"timestamp_id": 1,
				"start_time": 0,
				"episode_id": 1
			}];

			fakeCompilationData = [{
				"compilation_id": 101,
				"compilation_name": "InTest Compilation 1"
			}, {
				"compilation_id": 102,
				"compilation_name": "InTest Compilation 2"
			}]

			fakeCompilationTimestampData = [{
				"compilation_id": 101,
				"timestamp_id": 0,
				"duration": 10,
				"start_time": 100
			}, {
				"compilation_id": 101,
				"timestamp_id": 1,
				"duration": 30,
				"start_time": 10
			}, {
				"compilation_id": 102,
				"timestamp_id": 2,
				"duration": 30,
				"start_time": 10
			}, {
				"compilation_id": 103,
				"timestamp_id": 0,
				"duration": 30,
				"start_time": 10
			}, {
				"compilation_id": 103,
				"timestamp_id": 2,
				"duration": 30,
				"start_time": 10
			}]

			//stub get all timestamp data for all tests
			//stub get all timestamp data for all tests
			sandbox.stub(dbActions, 'getAllTimestampData').callsFake(function(baton, data, callback) {
				var result = [...fakeTimestampData]
				if (data.episode_id && data.episode_id.length > 0) {
					result = result.filter(function(tm) {
						return data.episode_id.includes(tm.episode_id)
					})
				}
				if (data.timestamp_id && data.timestamp_id.length > 0) {
					result = result.filter(function(tm) {
						return data.timestamp_id.includes(tm.timestamp_id)
					})
				}
				callback(result)
			})

			//stub for the category/character for timestamp
			sandbox.stub(dbActions, 'getAllTimestampCategory').callsFake(function(baton, params, callback) {
				callback([])
			})

			//stub for the category/character for timestamp
			sandbox.stub(dbActions, 'getAllTimestampCharacter').callsFake(function(baton, params, callback) {
				callback([])
			})

			//stub get all compilation data for all tests
			sandbox.stub(dbActions, 'getAllCompilationData').callsFake(function(baton, data, callback) {
				var result = [...fakeCompilationData]
				if (data.compilation_id) {
					result = result.filter(function(ct) {
						return data.compilation_id.includes(ct.compilation_id)
					})
				}
				if (data.timestamp_id) {
					result = result.filter(function(ct) {
						return data.timestamp_id.includes(ct.timestamp_id)
					})
				}
				callback(result)
			})

			sandbox.stub(dbActions, 'insertCompilation').callsFake(function(baton, values, callback) {
				fakeCompilationData.push(values)
				callback(values)
			})

			//stub get all compilation timestamp data for all tests
			sandbox.stub(dbActions, 'getAllCompilationTimestamp').callsFake(function(baton, data, callback) {
				var result = [...fakeCompilationTimestampData]
				if (data.compilation_id) {
					result = result.filter(function(ct) {
						return data.compilation_id.includes(ct.compilation_id)
					})
				}
				if (data.timestamp_id) {
					result = result.filter(function(ct) {
						return data.timestamp_id.includes(ct.timestamp_id)
					})
				}
				callback(result)
			})

			sandbox.stub(dbActions, 'insertCompilationTimestamp').callsFake(function(baton, values, callback) {

				values.forEach(ct => {
					fakeCompilationTimestampData.push(ct)
				})
				callback(values)
			})

		})

		function updateCompilationDataWithTimestamp() {
			fakeCompilationData.forEach((cp) => {
				cp.timestamps = fakeCompilationTimestampData.filter((ct) => {
					return ct.compilation_id = cp.compilation_id
				}).forEach((ct) => {
					delete ct.compilation_id
				})
			})
		}

		function filterByTimestamp(timestamp_ids) {
			var filterCompilationIds = fakeCompilationTimestampData.filter(function(ct) {
				return timestamp_ids.includes(ct.timestamp_id)
			}).map((ct) => {
				return ct.compilation_id
			})
			return fakeCompilationData.filter((cp) => {
				return filterCompilationIds.includes(cp.compilation_id)
			})
		}

		it('should return all compilation data', function(done) {
			sendRequest('getCompilationData', {}).end((err, res, body) => {
				assertSuccess(res)
				expect(res.body).to.deep.equal(fakeCompilationData)
				done()
			})
		})

		it('should filter compilation data by timestamp id', function(done) {
			var values = {
				timestamp_ids: "1"
			}

			sendRequest('getCompilationData', values).end((err, res, body) => {
				assertSuccess(res)
				expect(res.body.map((cp) => {
					return cp.compilation_id
				})).to.deep.equal(fakeCompilationTimestampData.filter((ct) => {
					return ct.timestamp_id == 1
				}).map((ct) => {
					return ct.compilation_id
				}))
				expect(res.body[0].timestamps).to.deep.equal(fakeCompilationTimestampData.filter(ct => {
					return ct.compilation_id == res.body[0].compilation_id
				}))
				done()
			})
		})

		it('should filter compilation data by compilation id', function(done) {
			var values = {
				compilation_ids: "102"
			}
			sendRequest('getCompilationData', values).end((err, res, body) => {
				assertSuccess(res)
				expect(res.body.length).to.equal(1)
				expect(res.body.map((cp) => {
					return cp.compilation_id
				})).to.deep.equal([102])
				expect(res.body[0].timestamps).to.deep.equal(fakeCompilationTimestampData.filter(ct => {
					return ct.compilation_id == res.body[0].compilation_id
				}))
				done()
			})
		})


		describe('insert new compilation ', function() {

			it('should create new compilation', function(done) {
				var values = {
					compilation_name: "InTest Compilation",
					timestamps: [{
						timestamp_id: 1,
						duration: 10,
						start_time: 100
					}, {
						timestamp_id: 1,
						duration: 40,
						start_time: 400
					}]
				}

				sendRequest('newCompilation', values, /*post=*/ true).end((err, res, body) => {
					assertSuccess(res, /*post=*/ true)
					values.compilation_id = 10;
					expect(res.body).to.deep.equal(values)
					done()
				})

			})

			it('should throw for invalid timestamp id', function(done) {
				var values = {
					compilation_name: "InTest Compilation",
					timestamps: [{
						timestamp_id: 100, //iun
						duration: 10,
						start_time: 100
					}, {
						timestamp_id: 1,
						duration: 10,
						start_time: 100
					}]
				}
				sendRequest('newCompilation', values, /*post=*/ true).end((err, res, body) => {
					assertErrorMessage(res, 'Invalid Timestamp Id')
					done()
				})

			})



			it('should throw for missing data in timestamp', function(done) {
				var values = {
					compilation_name: "InTest Compilation",
					timestamps: [{
						timestamp_id: 1,
						duration: 10,
						start_time: 100
					}, {
						//missing timestamp id here
						duration: 10,
						start_time: 100
					}]
				}
				sendRequest('newCompilation', values, /*post=*/ true).end((err, res, body) => {
					assertErrorMessage(res, 'Parameter validation error')
					done()
				})
			})

			it('should throw for empty timestamp', function(done) {
				var values = {
					compilation_name: "InTest Compilation",
				}
				sendRequest('newCompilation', values, /*post=*/ true).end((err, res, body) => {
					assertErrorMessage(res, 'Parameter validation error')
					done()
				})
			})

			//should throw for invalid timesatmp id for filtering

			it('should throw for required param compilation name', function(done) {
				sendRequest('newCompilation', {}, /*post=*/ true).end((err, res, body) => {
					assertErrorMessage(res, 'Parameter validation error')
					done()
				})
			})

			it('should throw for same compilation name', function(done) {
				var values = {
					compilation_name: fakeCompilationData[0].compilation_name,
					timestamps: [{
						timestamp_id: 1,
						duration: 10,
						start_time: 100
					}, {
						timestamp_id: 1,
						duration: 10,
						start_time: 100
					}]

				}
				sendRequest('newCompilation', values, /*post=*/ true).end((err, res, body) => {
					assertErrorMessage(res, 'Compilation name already used')
					done()
				})
			})
		})
		//check that timestamp_id exists

	})


});