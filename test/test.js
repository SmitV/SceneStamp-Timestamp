var assert = require('assert');
const expect = require('chai').expect;
var sinon = require('sinon')

var actions = require('../prod2/actions')
var dbActions = require('../prod2/database_actions')

var fakeRes = {
	data: null,
	json: function(data) {
		this.data = data;
	}
}

function assertErrorMessage(res, msg) {
	expect(res.data).to.have.property('error_message')
	expect(res.data.error_message).to.contain(msg)
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

	beforeEach(function() {
		sandbox = sinon.createSandbox()

		//surpress console.log
		sandbox.stub(console, 'log').callsFake(function() {})

		fakeRes = {
			data: null,
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
			assertErrorMessage(fakeRes, 'Invalid value for series_id')
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
				assertErrorMessage(fakeRes, 'Required params not present')

				episode_data = {
					series_id: "0"
				}
				actions.post_newEpisode(episode_data, fakeRes)
				assertErrorMessage(fakeRes, 'Required params not present')
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
			assertErrorMessage(fakeRes, 'Invalid value for series_id')
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
				assertErrorMessage(fakeRes, 'Required params not present')

				values = {
					series_id: "0"
				}
				actions.post_newCharacter(values, fakeRes)
				assertErrorMessage(fakeRes, 'Required params not present')
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
			sandbox.stub(dbActions, 'getAllCategoryData').callsFake(function(baton, series_ids, callback) {
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

			it('chould throw error for invalid params', function() {
				var category_values = {}
				actions.post_newCategory(category_values, fakeRes)
				assertErrorMessage(fakeRes, 'Required params not present')
			})


			it('should create throw error for existing episode name in same series', function() {
				var category_values = {
					category_name: fakeCategoryData[0].category_name
				}
				actions.post_newCategory(category_values, fakeRes)
				assertErrorMessage(fakeRes, 'Category Name exists in series')
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
				assertErrorMessage(fakeRes, 'Invalid value for episode_ids')
				done()
			}, TIMEOUT)
		})

		it('should throw error for invalid character id', function(done) {
			actions.get_allTimestampData({
				category_ids: "0",
				character_ids: 'text'
			}, fakeRes)
			setTimeout(function() {
				assertErrorMessage(fakeRes, 'Invalid value for character_ids')
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
					fakeTimestampData.push(values)
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
					assertErrorMessage(fakeRes, 'Invalid value for start_time')
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
					assertErrorMessage(fakeRes, 'Invalid value for episode_id')
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
							fakeTimestampCharacterData.push({
								'timestamp_id': v[0],
								'character_id': v[1]
							})
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
							fakeTimestampCategoryData.push({
								'timestamp_id': v[0],
								'category_id': v[1]
							})
						})
						callback(values)
					})

				})

				it('should update timestamp', function(done) {
					var values = {
						timestamp_id: "0",
						character_ids: "1,2",
						category_ids:"0,1"
					}
					actions.post_updateTimestamp(values, fakeRes)
					setTimeout(function() {
						expect(fakeRes.data.character_ids).to.deep.equal([1,2])
						expect(fakeRes.data.category_ids).to.deep.equal([0,1])
						done()
					}, TIMEOUT)
				})

				it('should throw error for invalid character', function(done) {
					var values = {
						timestamp_id: "0",
						character_ids: "10",
						category_ids:"0,1"
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
						category_ids:"0,1"
					}
					actions.post_updateTimestamp(values, fakeRes)
					setTimeout(function() {
						assertErrorMessage(fakeRes, 'Invalid characters')
						done()
					}, TIMEOUT)
				})

				//this needs to pass
				/*
				it('should throw error for invalid category id', function(done) {
					var values = {
						timestamp_id: "0",
						character_ids: "1",
						category_ids:"5"
					}
					actions.post_updateTimestamp(values, fakeRes)
					setTimeout(function() {
						assertErrorMessage(fakeRes, 'Invalid categories')
						done()
					}, TIMEOUT)
				})
				*/

				it('should throw error for invalid timestamp id', function(done) {
					var values = {
						timestamp_id: "10",
						character_ids: "1",
						category_ids:"0,1"
					}
					actions.post_updateTimestamp(values, fakeRes)
					setTimeout(function() {
						assertErrorMessage(fakeRes, 'Invalid Timestamp Id')
						done()
					}, TIMEOUT)
				})



				/*
					invalid character
					valid characrer, but different series
					invalid category
					invalid timestamp id
				*/
			})

		})
	})


});