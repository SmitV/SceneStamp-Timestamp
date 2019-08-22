var assert = require('assert');
const expect = require('chai').expect;
var sinon = require('sinon')

var actions = require('../prod2/actions')
var dbActions = require('../prod2/database_actions')


function assertErrorMessage(res, msg) {
	expect(res.endStatus).to.equal(500)
	expect(res.data).to.have.property('error_message')
	expect(res.data.error_message).to.equal(msg)
}

var TIMEOUT = 100;
var EXTENDED_TIMEOUT = 500;


describe('timestamp server tests', function() {

	/*  getting data calls
		
		for series/episode/character/category/timestamp

		also test filtering
	*/
	var sandbox;

	var fakeRes;
	var fakeSeriesData;
	var fakeEpisodeData;
	var fakeCompilationData;
	var fakeCompilationTimestampData;

	beforeEach(function() {
		sandbox = sinon.createSandbox()

		//surpress console.log
		sandbox.stub(console, 'log').callsFake(function() {})


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
			"season": 1,
			"episode": 1,
			"air_date": 1564034876,
			"series_id": 0
		}, {
			"episode_id": 2,
			"episode_name": "Test Episode 2",
			"season": 1,
			"episode": 2,
			"air_date": 1564038876,
			"series_id": 0
		}, {
			"episode_id": 3,
			"episode_name": "Test Episode 3",
			"season": 1,
			"episode": 1,
			"air_date": 1569038876,
			"series_id": 1
		}];

		fakeCharacterData = [{
			"series_id": 0,
			"character_name": "Character 1",
			"character_id": 1
		}, {
			"series_id": 0,
			"character_name": "Character 2",
			"character_id": 2
		}, {
			"series_id": 1,
			"character_name": "Character 3",
			"character_id": 3
		}, {
			"series_id": 1,
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

	});

	afterEach(function() {
		sandbox.restore()
	})

	describe('request validation', function(){

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
			actions.validateRequest(createFakeBaton(params), 'testAction', updated_params => {
				expect(updated_params.attr_1).to.equal(101)
				expect(updated_params.attr_3).to.deep.equal([101, 102])
				done()
			})
		})

		it('should throw non optional error', (done) => {
			var params = {
				attr_2:'true',
				attr_3: "101, 102"
			}
			var fakeBaton = createFakeBaton(params)
			actions.validateRequest(fakeBaton, 'testAction')
			setTimeout(function() {
				assertErrorMessage(fakeRes,'Parameter validation error')
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
			actions.validateRequest(fakeBaton, 'testAction')
			setTimeout(function() {
				assertErrorMessage(fakeRes,'Parameter validation error')
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
			actions.validateRequest(fakeBaton, 'testAction')
			setTimeout(function() {
				assertErrorMessage(fakeRes,'Parameter validation error')
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

		it('should return all series data', function() {
			actions.get_allSeriesData({}, fakeRes)
			expect(fakeRes.data).equal(fakeSeriesData)
		})

		it('should create new series', function() {

			sandbox.stub(actions, '_generateId').callsFake(function() {
				return 10
			})

			sandbox.stub(dbActions, 'insertSeries').callsFake(function(baton, newSeries, callback) {
				fakeSeriesData.push(newSeries)
				return callback(fakeSeriesData)
			})

			var series_name = 'InTest Series'
			actions.post_newSeries({
				series_name: series_name
			}, fakeRes)

			expect(fakeRes.data.length).equal(3)
			expect(fakeRes.data[2]).to.deep.equal({
				series_id: 10,
				series_name: series_name
			})
		})

		it('should throw error when same series data', function() {
			var series_name = 'InTest Series'
			fakeSeriesData[0].series_name = series_name
			actions.post_newSeries({
				series_name: series_name
			}, fakeRes)
			assertErrorMessage(fakeRes, 'Series Name exists')
		})
	})

	describe('episode', function() {

		beforeEach(function() {

			//stub get all series dat for all tests
			sandbox.stub(dbActions, 'getAllEpisodeData').callsFake(function(baton, series_ids, callback) {
				if (series_ids && series_ids.length > 0) {
					return callback(fakeEpisodeData.filter(function(ep) {
						return series_ids.includes(ep.series_id)
					}))
				}
				return callback(fakeEpisodeData)
			})
		})


		it('should return all episode data', function() {
			actions.get_allEpisodeData({}, fakeRes)
			expect(fakeRes.data).equal(fakeEpisodeData)
		})

		it('should filter by one series id', function() {
			actions.get_allEpisodeData({
				series_ids: "0"
			}, fakeRes)
			expect(fakeRes.data.length).equal(2)
		})

		it('should filter by multiple series id', function() {
			actions.get_allEpisodeData({
				series_ids: "0,1"
			}, fakeRes)
			expect(fakeRes.data.length).equal(fakeEpisodeData.length)
		})

		it('should throw error for invalid series_ids param', function() {
			actions.get_allEpisodeData({
				series_ids: "text"
			}, fakeRes)
			assertErrorMessage(fakeRes, 'Parameter validation error')
		})

		describe('inserting new episode', function() {

			beforeEach(function() {

				sandbox.stub(actions, '_generateId').callsFake(function() {
					return 10
				})

				sandbox.stub(dbActions, 'getAllSeriesData').callsFake(function(baton, callback) {
					return callback(fakeSeriesData)
				})

				sandbox.stub(dbActions, 'insertEpisode').callsFake(function(baton, episode, callback) {
					fakeEpisodeData.push(episode)
					return callback(episode)
				})
			})

			it('should create new episode', function() {
				var episode_data = {
					series_id: "1",
					episode_name: "InTest Episode"
				}
				actions.post_newEpisode(episode_data, fakeRes)
				expect(fakeRes.data).to.deep.equal({
					series_id: 1,
					episode_name: episode_data.episode_name,
					episode_id: 10
				})
			})

			it('should throw error for requiring series_id & episode_name', function() {
				var episode_data = {
					episode_name: "InTest Episode"
				}
				actions.post_newEpisode(episode_data, fakeRes)
				assertErrorMessage(fakeRes, 'Parameter validation error')

				episode_data = {
					series_id: "0"
				}
				actions.post_newEpisode(episode_data, fakeRes)
				assertErrorMessage(fakeRes, 'Parameter validation error')
			})

			it('should create throw error for invalid series', function() {
				var episode_data = {
					series_id: "3",
					episode_name: "InTest Episode"
				}
				actions.post_newEpisode(episode_data, fakeRes)
				assertErrorMessage(fakeRes, 'Invalid Series Id')
			})

			it('should create throw error for existing episode name in same series', function() {
				var episode_data = {
					series_id: "0",
					episode_name: fakeEpisodeData[0].episode_name
				}
				actions.post_newEpisode(episode_data, fakeRes)
				assertErrorMessage(fakeRes, 'Episode Name exists in series')
			})

			it('should create episode with same name, but in different series', function() {
				var episode_data = {
					series_id: fakeEpisodeData[2].series_id.toString(),
					episode_name: fakeEpisodeData[0].episode_name
				}
				actions.post_newEpisode(episode_data, fakeRes)
				expect(fakeRes.data).to.deep.equal({
					series_id: parseInt(episode_data.series_id),
					episode_name: episode_data.episode_name,
					episode_id: 10
				})
			})

			it('should throw error for episode with same season and episode', function() {
				var episode_data = {
					series_id: fakeEpisodeData[0].series_id.toString(),
					episode_name: "InTest Episode",
					season: fakeEpisodeData[0].season.toString(),
					episode: fakeEpisodeData[0].episode.toString()
				}
				actions.post_newEpisode(episode_data, fakeRes)
				assertErrorMessage(fakeRes, 'Episode with same season and episode in series')
			})

		});
	});

	describe('character ', function() {

		beforeEach(function() {
			//stub get all series dat for all tests
			sandbox.stub(dbActions, 'getAllCharacterData').callsFake(function(baton, series_ids, callback) {
				if (series_ids && series_ids.length > 0) {
					return callback(fakeCharacterData.filter(function(ch) {
						return series_ids.includes(ch.series_id)
					}))
				}
				return callback(fakeCharacterData)
			})
		})


		it('should return all data', function() {
			actions.get_allCharacterData({}, fakeRes)
			expect(fakeRes.data).equal(fakeCharacterData)
		})

		it('should filter by one series id', function() {
			actions.get_allCharacterData({
				series_ids: "0"
			}, fakeRes)
			expect(fakeRes.data.length).equal(2)
		})

		it('should filter by multiple series id', function() {
			actions.get_allCharacterData({
				series_ids: "0,1"
			}, fakeRes)
			expect(fakeRes.data.length).equal(fakeCharacterData.length)
		})

		it('should throw error for invalid series_ids param', function() {
			actions.get_allCharacterData({
				series_ids: "text"
			}, fakeRes)
			assertErrorMessage(fakeRes, 'Parameter validation error')
		})

		describe('inserting new character', function() {

			beforeEach(function() {

				sandbox.stub(actions, '_generateId').callsFake(function() {
					return 10
				})

				sandbox.stub(dbActions, 'getAllSeriesData').callsFake(function(baton, callback) {
					return callback(fakeSeriesData)
				})

				sandbox.stub(dbActions, 'insertCharacter').callsFake(function(baton, values, callback) {
					fakeEpisodeData.push(values)
					return callback(values)
				})
			})

			it('should create new character', function() {
				var values = {
					character_name: "Mark",
					series_id: "0"
				}
				actions.post_newCharacter(values, fakeRes)
				values.character_id = 10;
				values.series_id = parseInt(values.series_id)
				expect(fakeRes.data).to.deep.equal(values)
			})

			it('should throw error for requiring series_id & character_name', function() {
				var values = {
					character_name: "Mark "
				}
				actions.post_newCharacter(values, fakeRes)
				assertErrorMessage(fakeRes, 'Parameter validation error')

				values = {
					series_id: "0"
				}
				actions.post_newCharacter(values, fakeRes)
				assertErrorMessage(fakeRes, 'Parameter validation error')
			})

			it('should create throw error for invalid series', function() {
				var values = {
					character_name: "Mark",
					series_id: "3"
				}
				actions.post_newCharacter(values, fakeRes)
				assertErrorMessage(fakeRes, 'Invalid Series Id')
			})

			it('should create throw error for existing character name in same series', function() {
				var values = {
					character_name: fakeCharacterData[0].character_name,
					series_id: "0"
				}
				actions.post_newCharacter(values, fakeRes)
				assertErrorMessage(fakeRes, 'Character Name exists in series')
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


		it('should return all category data', function() {
			actions.get_allCategoryData({}, fakeRes)
			expect(fakeRes.data).equal(fakeCategoryData)
		})


		describe('inserting new category', function() {

			beforeEach(function() {
				sandbox.stub(actions, '_generateId').callsFake(function() {
					return 10
				})

				sandbox.stub(dbActions, 'insertCategory').callsFake(function(baton, values, callback) {
					fakeCategoryData.push(values)
					return callback(values)
				})
			})

			it('should create new categoy', function() {
				var category_values = {
					category_name: "InTest Category"
				}
				actions.post_newCategory(category_values, fakeRes)
				category_values.category_id = 10
				expect(fakeRes.data).to.deep.equal(category_values)
			})

			it('should throw error for invalid params', function() {
				var category_values = {}
				actions.post_newCategory(category_values, fakeRes)
				assertErrorMessage(fakeRes, 'Parameter validation error')
			})


			it('should create throw error for existing episode name in same series', function() {
				var category_values = {
					category_name: fakeCategoryData[0].category_name
				}
				actions.post_newCategory(category_values, fakeRes)
				assertErrorMessage(fakeRes, 'Category Name exists')
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
			sandbox.stub(dbActions, 'getAllTimestampData').callsFake(function(baton, episode_ids, timestamp_ids, callback) {
				var result = [...fakeTimestampData]
				if (episode_ids && episode_ids.length > 0) {
					result = result.filter(function(tm) {
						return episode_ids.includes(tm.episode_id)
					})
				}
				if (timestamp_ids && timestamp_ids.length > 0) {
					result = result.filter(function(tm) {
						return timestamp_ids.includes(tm.timestamp_id)
					})
				}
				return callback(result)
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
			actions.get_allTimestampData({}, fakeRes)
			//timeout to allow for endpoint to finish 
			setTimeout(function() {
				expect(fakeRes.data).to.deep.equal(fakeTimestampData)
				done()
			}, TIMEOUT)
		})

		it('should filter for episode id', function(done) {
			actions.get_allTimestampData({
				episode_ids: "1"
			}, fakeRes)
			setTimeout(function() {
				expect(fakeRes.data.length).to.deep.equal(fakeTimestampData.filter(function(ts) {
					return ts.episode_id == 1
				}).length)
				done()
			}, TIMEOUT)
		})

		it('should filter for character id', function(done) {
			actions.get_allTimestampData({
				character_ids: "1"
			}, fakeRes)
			setTimeout(function() {
				expect(fakeRes.data.map(function(ts) {
					return ts.timestamp_id
				})).to.deep.equal(fakeTimestampCharacterData.map(function(ts) {
					return ts.timestamp_id
				}))
				done()
			}, TIMEOUT)
		})

		it('should filter for character id', function(done) {
			actions.get_allTimestampData({
				category_ids: "0"
			}, fakeRes)
			setTimeout(function() {
				expect(fakeRes.data.map(function(ts) {
					return ts.timestamp_id
				})).to.deep.equal(fakeTimestampCategoryData.map(function(ts) {
					return ts.timestamp_id
				}))
				done()
			}, TIMEOUT)
		})

		it('should filter for character and category id', function(done) {
			actions.get_allTimestampData({
				character_ids: "1",
				category_ids: '0'
			}, fakeRes)
			setTimeout(function() {
				expect(fakeRes.data.map(function(ts) {
					return ts.timestamp_id
				})).to.deep.equal([4])
				done()
			}, TIMEOUT)
		})

		it('should throw error for invalid episode id', function(done) {
			actions.get_allTimestampData({
				episode_ids: 'text'
			}, fakeRes)
			setTimeout(function() {
				assertErrorMessage(fakeRes, 'Parameter validation error')
				done()
			}, TIMEOUT)
		})

		it('should throw error for invalid character id', function(done) {
			actions.get_allTimestampData({
				category_ids: "0",
				character_ids: 'text'
			}, fakeRes)
			setTimeout(function() {
				assertErrorMessage(fakeRes, 'Parameter validation error')
				done()
			}, TIMEOUT)
		})

		describe('creating a new timestamp', function() {

			beforeEach(function() {
				sandbox.stub(actions, '_generateId').callsFake(function() {
					return 10
				})

				//for ensureEpisodeIdExists
				sandbox.stub(dbActions, 'getAllEpisodeData').callsFake(function(baton, series_ids, callback) {
					if (series_ids && series_ids.length > 0) {
						return callback(fakeEpisodeData.filter(function(ep) {
							return series_ids.includes(ep.series_id)
						}))
					}
					return callback(fakeEpisodeData)
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
				actions.post_newTimestamp(values, fakeRes)
				setTimeout(function() {
					expect(fakeRes.data).to.deep.equal({
						start_time: 100,
						episode_id: 1,
						timestamp_id: 10
					})
					done()
				}, TIMEOUT)
			})

			it('should throw error for invalid start time(type)', function(done) {
				var values = {
					start_time: "test",
					episode_id: "1"
				}
				actions.post_newTimestamp(values, fakeRes)
				setTimeout(function() {
					assertErrorMessage(fakeRes, 'Parameter validation error')
					done()
				}, TIMEOUT)
			})

			it('should throw error for invalid episode id (type)', function(done) {
				var values = {
					start_time: "100",
					episode_id: "text"
				}
				actions.post_newTimestamp(values, fakeRes)
				setTimeout(function() {
					assertErrorMessage(fakeRes, 'Parameter validation error')
					done()
				}, TIMEOUT)
			})

			it('should throw error for invalid episode id', function(done) {
				var values = {
					start_time: "100",
					episode_id: "5"
				}
				actions.post_newTimestamp(values, fakeRes)
				setTimeout(function() {
					assertErrorMessage(fakeRes, 'Invalid Episode Id')
					done()
				}, TIMEOUT)
			})

			describe('updating timestamp data', function() {

				beforeEach(function() {

					//ensure character data matches series data
					sandbox.stub(dbActions, 'getAllCharacterData').callsFake(function(baton, series_ids, callback) {
						if (series_ids && series_ids.length > 0) {
							return callback(fakeCharacterData.filter(function(ch) {
								return series_ids.includes(ch.series_id)
							}))
						}
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
					actions.post_updateTimestamp(values, fakeRes)
					setTimeout(function() {
						expect(fakeRes.data.character_ids).to.deep.equal([1, 2])
						expect(fakeRes.data.category_ids).to.deep.equal([0, 1])
						expect(fakeTimestampCharacterData[3]).to.deep.equal({
							timestamp_id: 0,
							character_id: 2
						});
						expect(fakeTimestampCategoryData[2]).to.deep.equal({
							timestamp_id: 0,
							category_id: 0
						});
						done()
					}, TIMEOUT)
				})

				it('should throw error for invalid character', function(done) {
					var values = {
						timestamp_id: "0",
						character_ids: "10",
						category_ids: "0,1"
					}
					actions.post_updateTimestamp(values, fakeRes)
					setTimeout(function() {
						assertErrorMessage(fakeRes, 'Invalid characters')
						done()
					}, TIMEOUT)
				})

				it('should throw error for valid character in different series', function(done) {
					var values = {
						timestamp_id: "0",
						character_ids: "4",
						category_ids: "0,1"
					}
					actions.post_updateTimestamp(values, fakeRes)
					setTimeout(function() {
						assertErrorMessage(fakeRes, 'Invalid characters')
						done()
					}, TIMEOUT)
				})

				it('should throw error for invalid category id', function(done) {
					var values = {
						timestamp_id: "0",
						character_ids: "1",
						category_ids: "5"
					}
					actions.post_updateTimestamp(values, fakeRes)
					setTimeout(function() {
						assertErrorMessage(fakeRes, 'Invalid categories')
						done()
					}, TIMEOUT)
				})


				it('should throw error for invalid timestamp id', function(done) {
					var values = {
						timestamp_id: "10",
						character_ids: "1",
						category_ids: "0,1"
					}
					actions.post_updateTimestamp(values, fakeRes)
					setTimeout(function() {
						assertErrorMessage(fakeRes, 'Invalid Timestamp Id')
						done()
					}, TIMEOUT)
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
				"timestamp_id": 1,
				"duration": 30,
				"start_time": 10
			}]


			sandbox.stub(actions, '_generateId').callsFake(function() {
				return 10
			})

			//stub get all timestamp data for all tests
			sandbox.stub(dbActions, 'getAllTimestampData').callsFake(function(baton, episode_ids, timestamp_ids, callback) {
				var result = [...fakeTimestampData]
				if (episode_ids && episode_ids.length > 0) {
					result = result.filter(function(tm) {
						return episode_ids.includes(tm.episode_id)
					})
				}
				if (timestamp_ids && timestamp_ids.length > 0) {
					result = result.filter(function(tm) {
						return timestamp_ids.includes(tm.timestamp_id)
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
			sandbox.stub(dbActions, 'getAllCompilationData').callsFake(function(baton, params, callback) {
				var result = [...fakeCompilationData]
				if (params.compilation_ids) {
					result = result.filter(function(ct) {
						return params.compilation_ids.includes(ct.compilation_id)
					})
				}
				if (params.timestamp_ids) {
					result = result.filter(function(ct) {
						return params.timestamp_ids.includes(ct.timestamp_id)
					})
				}
				callback(result)
			})

			sandbox.stub(dbActions, 'insertCompilation').callsFake(function(baton, values, callback) {
				fakeCompilationData.push(values)
				callback(values)
			})

			//stub get all compilation timestamp data for all tests
			sandbox.stub(dbActions, 'getAllCompilationTimestamp').callsFake(function(baton, params, callback) {
				var result = [...fakeCompilationTimestampData]
				if (params.compilation_ids) {
					result = result.filter(function(ct) {
						return params.compilation_ids.includes(ct.compilation_id)
					})
				}
				if (params.timestamp_ids) {
					result = result.filter(function(ct) {
						return params.timestamp_ids.includes(ct.timestamp_id)
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
			actions.get_allCompilationData({}, fakeRes)
			//timeout to allow for endpoint to finish 
			setTimeout(function() {
				updateCompilationDataWithTimestamp();
				expect(fakeRes.data).to.deep.equal(fakeCompilationData)
				done()
			}, TIMEOUT)
		})

		it('should filter compilation data by timestamp id', function(done) {
			var values = {
				timestamp_ids: "1"
			}
			actions.get_allCompilationData(values, fakeRes)
			//timeout to allow for endpoint to finish 
			setTimeout(function() {
				expect(fakeRes.data.map((cp) => {
					return cp.compilation_id
				})).to.deep.equal(fakeCompilationTimestampData.filter((ct) => {
					return ct.timestamp_id == 1
				}).map((ct) => {
					return ct.compilation_id
				}))
				expect(fakeRes.data[0].timestamps).to.deep.equal(fakeCompilationTimestampData.filter(ct => {
					return ct.compilation_id == fakeRes.data[0].compilation_id
				}))
				done()
			}, TIMEOUT)
		})

		it('should filter compilation data by compilation id', function(done) {
			var values = {
				compilation_ids: "102"
			}
			actions.get_allCompilationData(values, fakeRes)
			//timeout to allow for endpoint to finish 
			setTimeout(function() {
				expect(fakeRes.data.length).to.equal(1)
				expect(fakeRes.data.map((cp) => {
					return cp.compilation_id
				})).to.deep.equal([102])
				expect(fakeRes.data[0].timestamps).to.deep.equal(fakeCompilationTimestampData.filter(ct => {
					return ct.compilation_id == fakeRes.data[0].compilation_id
				}))
				done()
			}, TIMEOUT)
		})


		describe('insert new compilation ', function() {

			it('should create new compilation', function() {
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
				actions.post_newCompilation(values, fakeRes)
				values.compilation_id = 10;
				values.timestamps.forEach(ct => {
					ct.compilation_id = 10
				});
				expect(fakeRes.data).to.deep.equal(values)
				values.timestamps.forEach(timestamp => expect(fakeCompilationTimestampData).to.deep.include(timestamp))
			})

			it('should throw for invalid timestamp id', function() {
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
				actions.post_newCompilation(values, fakeRes)
				assertErrorMessage(fakeRes, 'Invalid Timestamp Id')
			})



			it('should throw for missing data in timestamp', function() {
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
				actions.post_newCompilation(values, fakeRes)
				assertErrorMessage(fakeRes, 'Required params not present')
			})

			it('should throw for empty timestamp', function() {
				var values = {
					compilation_name: "InTest Compilation",
				}
				actions.post_newCompilation(values, fakeRes)
				assertErrorMessage(fakeRes, 'Required params not present')
			})

			//should throw for invalid timesatmp id for filtering

			it('should throw for required param compilation name', function() {
				actions.post_newCompilation({}, fakeRes)
				assertErrorMessage(fakeRes, 'Required params not present')
			})

			it('should throw for same compilation name', function() {
				var values = {
					compilation_name: fakeCompilationData[0].compilation_name
				}
				actions.post_newCompilation(values, fakeRes)
				assertErrorMessage(fakeRes, 'Compilation name already used')
			})
		})
		//check that timestamp_id exists

	})


});