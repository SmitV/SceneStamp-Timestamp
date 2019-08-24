var assert = require('assert');
const expect = require('chai').expect;
var sinon = require('sinon')

var dbActions = require('../prod2/database_actions')

/*
	Testing the sql queries that are created
*/

describe('db tests', () => {

	var sandbox;

	var sqlQuery;
	var sqlValues;

	var fakeBaton;

	function jsonToArray(values) {
		var values_array = []
		values.forEach(function(value) {
			var single = []
			Object.keys(value).forEach(function(attr) {
				single.push(value[attr])
			})
			values_array.push(single)
		})
		return values_array
	}


	beforeEach(() => {
		sqlQuery = null;
		sandbox = sinon.createSandbox()

		fakeBaton = {
			methods: [],
			err: [],
			addMethod: function(method) {
				this.methods.push(method)
			},
			setError(err) {
				this.err.push(err)
			}
		}

		sandbox.stub(dbActions, "_makequery").callsFake((sql, values, baton, callback) => {
			sqlQuery = sql
			sqlValues = values
			callback(values)
		})
	})

	afterEach(function() {
		sandbox.restore()
	})

	describe('insert query', function() {

		var originalscheme = dbActions.DB_SCHEME
		beforeEach(function() {

			dbActions.setScheme({
				'test_table': {
					'test_attr1': {
						'type': 'number'
					},
					'test_attr2': {
						'type': 'number',
						'optional': true
					}
				},
			})
		})



		afterEach(function() {
			dbActions.resetScheme()
		})

		it('should make insert multi call', () => {
			var values = [{
				test_attr1: 101,
				test_attr2: 101
			}, {
				test_attr1: 103
			}, {
				test_attr1: 102,
				test_attr2: 102
			}]
			dbActions._insertMultipleQuery('test_table', values, fakeBaton, function() {
				expect(sqlValues).to.deep.equal([
					[
						[101, 101],
						[103, null],
						[102, 102]
					]
				])
			})
		})

		it('should throw error for non optional field', () => {
			var values = {
				test_attr2: 101
			}
			dbActions._insertMultipleQuery('test_table', [values], fakeBaton, function() {
				expect(fakeBaton.err[0].details).to.equal('DB Actions: non-optional value not present')
			})
		})

		it('should throw error for invalid type field', () => {
			var values = [{
				test_attr2: 101,
				test_attr1: 1
			}, {
				test_attr2: 101,
				test_attr1: 'test'
			}]
			dbActions._insertMultipleQuery('test_table', values, fakeBaton, function() {
				expect(fakeBaton.err[0].details).to.equal('DB Actions: type of value not valid')
			})
		})
	})

	describe('series', function() {
		it('get all series data', () => {

			dbActions.getAllSeriesData(fakeBaton, () => {
				expect(sqlQuery).to.equal('SELECT * FROM `series`');
			})
		})

		it('insert new series', () => {

			var values = {
				series_id: 101,
				series_name: 'InTest Series Name'
			}

			dbActions.insertSeries(fakeBaton, values, () => {
				expect(sqlQuery).to.equal('INSERT INTO `series` (series_id,series_name) VALUES ?');
				expect(sqlValues).to.deep.equal([jsonToArray([values])])
			})
		})
	})

	describe('episode', function() {
		it('should get all episode data no series ids', () => {

			dbActions.getAllEpisodeData(fakeBaton, null, () => {
				expect(sqlQuery).to.equal('SELECT * FROM `episode`');
			})

		})

		it('should get all episode data with series ids', () => {

			var series_ids = [1, 2]

			dbActions.getAllEpisodeData(fakeBaton, series_ids, () => {
				expect(sqlQuery.trim()).to.equal("SELECT * FROM `episode` WHERE series_id = 1 OR series_id = 2");
			})

		})

		it('insert new episode', () => {

			var values = {
				episode_id: 101,
				episode_name: 'InTest Episode',
				series_id: 1
			}

			dbActions.insertEpisode(fakeBaton, values, () => {
				expect(sqlQuery).to.equal('INSERT INTO `episode` (episode_id,episode_name,series_id,air_date) VALUES ?');
				values.air_date = null
				expect(sqlValues).to.deep.equal([jsonToArray([values])])
			})
		})

	})

	describe('timestamp ', function() {
		it('get all timestamp category data', function() {
			dbActions.getAllTimestampCategory(fakeBaton, {}, function() {
				expect(sqlQuery.trim()).to.equal("SELECT * FROM `timestamp_category`");
			})
		})

		it('get all timestamp category data filtered category ', function() {
			dbActions.getAllTimestampCategory(fakeBaton, {
				category_ids: [1, 2]
			}, function() {
				expect(sqlQuery.trim()).to.equal("SELECT * FROM `timestamp_category` WHERE category_id = 1 OR category_id = 2");
			})
		})

		it('remove timestamp category ', function() {
			dbActions.removeTimestampCategory(fakeBaton, [1], function() {
				expect(sqlQuery.trim()).to.equal("DELETE FROM `timestamp_category` WHERE timestamp_id = 1");
			})

		})

		it('insert timestamp category', () => {

			var values = [{
				timestamp_id: 1,
				category_id: 3
			}, {
				timestamp_id: 1,
				category_id: 3
			}]


			dbActions.insertTimestampCategory(fakeBaton, values, () => {

				expect(sqlQuery).to.equal('INSERT INTO `timestamp_category` (timestamp_id,category_id) VALUES ?');
				expect(sqlValues).to.deep.equal([jsonToArray(values)])
			})
		})

		it('get all timestamp chracter data', function() {
			dbActions.getAllTimestampCharacter(fakeBaton, {}, function() {
				expect(sqlQuery.trim()).to.equal("SELECT * FROM `timestamp_characters`");
			})
		})

		it('get all timestamp category data filted chracter and timestamp ', function() {
			dbActions.getAllTimestampCharacter(fakeBaton, {
				character_ids: [1, 2],
				timestamp_ids: [1]
			}, function() {
				expect(sqlQuery.trim()).to.equal("SELECT * FROM `timestamp_characters` WHERE timestamp_id = 1  OR character_id = 1 OR character_id = 2");
			})
		})

		it('insert timestamp character', () => {

			var values = [{
				timestamp_id: 1,
				character_id: 2
			}, {
				timestamp_id: 3,
				character_id: 4
			}, {
				timestamp_id: 5,
				character_id: 6
			}]

			dbActions.insertTimestampCharacter(fakeBaton, values, () => {
				expect(sqlQuery).to.equal('INSERT INTO `timestamp_characters` (timestamp_id,character_id) VALUES ?');
				expect(sqlValues).to.deep.equal([jsonToArray(values)])
			})
		})

		it('remove timestamp character ', function() {
			dbActions.removeTimestampCharacter(fakeBaton, [1], function() {
				expect(sqlQuery.trim()).to.equal("DELETE FROM `timestamp_characters` WHERE timestamp_id = 1");
			})

		})
	})

	describe('compilation', function() {

		it('should get all compilation data ', () => {

			dbActions.getAllCompilationData(fakeBaton, {}, () => {
				expect(sqlQuery).to.equal('SELECT * FROM `compilation`');
			})

		})

		it('get all compilation timestamp data', function() {
			dbActions.getAllCompilationTimestamp(fakeBaton, {}, function() {
				expect(sqlQuery.trim()).to.equal("SELECT * FROM `compilation_timestamp`");
			})
		})

		it('get all compilation timestamp data filtered ', function() {
			dbActions.getAllCompilationTimestamp(fakeBaton, {
				compilation_ids: [1, 2],
				timestamp_ids: [5]
			}, function() {
				expect(sqlQuery.trim()).to.equal("SELECT * FROM `compilation_timestamp` WHERE compilation_id = 1 OR compilation_id = 2  OR timestamp_id = 5");
			})
		})

		it('insert compilation timestamp', () => {

			var values = [{
				compilation_id: 1,
				timestamp_id: 2,
				duration: 100,
				start_time: 30
			}]

			dbActions.insertCompilationTimestamp(fakeBaton, values, () => {
				expect(sqlQuery).to.equal('INSERT INTO `compilation_timestamp` (compilation_id,timestamp_id,duration,start_time) VALUES ?');
				expect(sqlValues).to.deep.equal([jsonToArray(values)])
			})
		})

	})

})