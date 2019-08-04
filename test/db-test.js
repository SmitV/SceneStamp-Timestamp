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


	beforeEach(() => {
		sqlQuery = null;
		sandbox = sinon.createSandbox()

		fakeBaton = {
			methods: [],
			addMethod: function(method) {
				this.methods.push(method)
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
				expect(sqlQuery).to.equal('INSERT INTO `series` (series_id,series_name) VALUES(?,?)');
				expect(sqlValues).to.deep.equal([values.series_id, values.series_name])
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
				expect(sqlQuery).to.equal('INSERT INTO `episode` (episode_id,episode_name,series_id) VALUES(?,?,?)');
				expect(sqlValues).to.deep.equal([values.episode_id, values.episode_name, values.series_id])
			})
		})

	})

	describe('timestamp ', function() {
		it('get all timestamp category data', function() {
			dbActions.getAllTimestampCategory(fakeBaton, {}, function() {
				expect(sqlQuery.trim()).to.equal("SELECT * FROM `timestamp_category`");
			})
		})

		it('get all timestamp category data filted category ', function() {
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

			var values = [
				[1,2]
			]

			dbActions.insertTimestampCategory(fakeBaton, values, () => {
				expect(sqlQuery).to.equal('INSERT INTO `timestamp_category` (timestamp_id,category_id) VALUES ?');
				expect(sqlValues).to.deep.equal([values])
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

			var values = [
				[1,2], [3,4], [5,6]
			]

			dbActions.insertTimestampCharacter(fakeBaton, values, () => {
				expect(sqlQuery).to.equal('INSERT INTO `timestamp_characters` (timestamp_id,character_id) VALUES ?');
				expect(sqlValues).to.deep.equal([values])
			})
		})

		it('remove timestamp character ', function() {
			dbActions.removeTimestampCharacter(fakeBaton, [1], function() {
				expect(sqlQuery.trim()).to.equal("DELETE FROM `timestamp_characters` WHERE timestamp_id = 1");
			})

		})
	})

})