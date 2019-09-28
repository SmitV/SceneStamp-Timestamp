var assert = require('assert');
const expect = require('chai').expect;
var sinon = require('sinon')

var dbActions = require('../prod2/database_actions')
var cred = require('../prod2/credentials')

/*
	Testing the sql queries that are created
*/

describe('db tests', () => {

	var sandbox;

	var sqlQuery;
	var sqlValues;

	var fakeBaton;
	var FAKE_START_TIME = 200;

	function jsonToArray(table, values) {
		var values_array = []
		values.forEach(function(value) {
			var single = []
			Object.keys(dbActions.SCHEME[table]).forEach(function(attr){
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
			start_time: FAKE_START_TIME,
			addMethod: function(method) {
				this.methods.push(method)
			},
			setError(err) {
				this.err.push(err)
			}
		}


		sandbox.stub(dbActions, "_makequery").callsFake((sql, values, table, baton, callback) => {
			sqlQuery = sql
			sqlValues = values
			callback(values)
		})
	})

	afterEach(function() {
		sandbox.restore()
	})

	describe('get correct pool', function(){

		it('should get the general pool',done => {
			var pool = dbActions.getPool('timestamps')
			expect(pool).to.equal(cred.pools.pool )
			done()
		})

		it('should get the user pool',done => {
			var pool = dbActions.getPool('user')
			expect(pool).to.equal(cred.pools.user_pool)
			done()
		})
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

	describe('roles and actions', function() {
		it('get all role data', () => {

			dbActions.getAllRoleData(fakeBaton, null, () => {
				expect(sqlQuery).to.equal('SELECT * FROM `role`');
			})
		})

		it('get all action data', () => {

			dbActions.getAllActionData(fakeBaton,null,  () => {
				expect(sqlQuery).to.equal('SELECT * FROM `action`');
			})
		})
		it('get all role and action data', () => {

			dbActions.getAllRoleActionData(fakeBaton,null, () => {
				expect(sqlQuery).to.equal('SELECT * FROM `role_action`');
			})
		})
	})

	describe('series', function() {
		it('get all series data', () => {

			dbActions.getAllSeriesData(fakeBaton,  () => {
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
				expect(sqlValues).to.deep.equal([jsonToArray('series',[values])])
			})
		})
	})

	describe('character', function() {
		it('should get all character data', () =>{
			dbActions.getAllCharacterData(fakeBaton, {},() => {
				expect(sqlQuery).to.equal('SELECT * FROM `character`');
			})
		})

		it('should filter for character name', () =>{
			var character_name = 'mark'
			dbActions.getAllCharacterData(fakeBaton, {character_name : [character_name]},() => {
				expect(sqlQuery.trim()).to.equal('SELECT * FROM `character` WHERE character_name = \''+character_name+'\'');
			})
		})

		it('should filter for character name (similar)', () =>{
			var character_name = '%mark%'
			dbActions.getAllCharacterData(fakeBaton, {character_name : [character_name]},() => {
				expect(sqlQuery.trim()).to.equal('SELECT * FROM `character` WHERE character_name LIKE \''+character_name+'\'');
			})
		})
	})

	describe('category', function() {
		it('should get all category data', () =>{
			dbActions.getAllCategoryData(fakeBaton, {},() => {
				expect(sqlQuery).to.equal('SELECT * FROM `category`');
			})
		})

		it('should filter for category name', () =>{
			var category_name = 'funny'
			dbActions.getAllCategoryData(fakeBaton, {category_name : [category_name]},() => {
				expect(sqlQuery.trim()).to.equal('SELECT * FROM `category` WHERE category_name = \''+category_name+'\'');
			})
		})

		it('should filter for category name (similar)', () =>{
			var category_name = '%funny%'
			dbActions.getAllCategoryData(fakeBaton, {category_name : [category_name]},() => {
				expect(sqlQuery.trim()).to.equal('SELECT * FROM `category` WHERE category_name LIKE \''+category_name+'\'');
			})
		})
	})

	describe('episode', function() {
		it('should get all episode data no series ids', () => {

			dbActions.getAllEpisodeData(fakeBaton, null,() => {
				expect(sqlQuery).to.equal('SELECT * FROM `episode`');
			})

		})

		it('should get all episode data with series ids', () => {

			var data = {series_id: [1,2]}
			dbActions.getAllEpisodeData(fakeBaton, data,() => {
				expect(sqlQuery.trim()).to.equal("SELECT * FROM `episode` WHERE series_id = 1 OR series_id = 2");
			})

		})

		it('should get all episode data with youtube id', () => {

			var data = {youtube_id: ['testYoutubeid']}

			dbActions.getAllEpisodeData(fakeBaton, data,() => {
				expect(sqlQuery.trim()).to.equal("SELECT * FROM `episode` WHERE youtube_id = '"+data.youtube_id+"'");
			})

		})

		it('insert new episode', () => {

			var values = {
				episode_id: 101,
				episode_name: 'InTest Episode',
				series_id: 1
			}

			dbActions.insertEpisode(fakeBaton, values, () => {
				expect(sqlQuery).to.equal('INSERT INTO `episode` (episode_id,creation_time,episode_name,series_id,air_date,youtube_id) VALUES ?');
				values.air_date = null
				values.youtube_id = null
				values.creation_time = FAKE_START_TIME
				expect(sqlValues).to.deep.equal([jsonToArray('episode',[values])])
			})
		})

		it('insert new episode with youtube id', () => {

			var values = {
				episode_id: 101,
				episode_name: 'InTest Episode',
				series_id: 1,
				youtube_id: 'abc'
			}

			dbActions.insertEpisode(fakeBaton, values, () => {
				expect(sqlQuery).to.equal('INSERT INTO `episode` (episode_id,creation_time,episode_name,series_id,air_date,youtube_id) VALUES ?');
				delete values.youtube_id
				values.air_date = null
				values.youtube_id = 'abc'
				values.creation_time = FAKE_START_TIME
				expect(sqlValues).to.deep.equal([jsonToArray('episode',[values])])
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
				category_id: [1, 2]
			}, function() {
				expect(sqlQuery.trim()).to.equal("SELECT * FROM `timestamp_category` WHERE category_id = 1 OR category_id = 2");
			})
		})

		it('remove timestamp category ', function() {
			dbActions.removeTimestampCategory(fakeBaton, [1], function() {
				expect(sqlQuery.trim()).to.equal("DELETE FROM `timestamp_category` WHERE timestamp_id = 1");
			})

		})

		it('insert timestamp self', () => {
			var values = {
				episode_id: 101,
				start_time: 100,
				timestamp_id: 100
			}

			dbActions.insertTimestamp(fakeBaton, values, () => {
				expect(sqlQuery).to.equal('INSERT INTO `timestamp` (episode_id,creation_time,start_time,timestamp_id,user_id) VALUES ?');
				values.user_id = null
				values.creation_time = FAKE_START_TIME
				expect(sqlValues).to.deep.equal([jsonToArray('timestamp',[values])])
			})
		})

		it('insert timestamp self with user id', () => {
			var values = {
				episode_id: 101,
				start_time: 100,
				timestamp_id: 100
			}

			fakeBaton.user_id = 1001

			dbActions.insertTimestamp(fakeBaton, values, () => {
				expect(sqlQuery).to.equal('INSERT INTO `timestamp` (episode_id,creation_time,start_time,timestamp_id,user_id) VALUES ?');
				values.user_id = fakeBaton.user_id
				values.creation_time = FAKE_START_TIME
				expect(sqlValues).to.deep.equal([jsonToArray('timestamp',[values])])
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
				expect(sqlValues).to.deep.equal([jsonToArray('timestamp_category',values)])
			})
		})

		it('get all timestamp chracter data', function() {
			dbActions.getAllTimestampCharacter(fakeBaton, {}, function() {
				expect(sqlQuery.trim()).to.equal("SELECT * FROM `timestamp_characters`");
			})
		})

		it('get all timestamp category data filted chracter and timestamp ', function() {
			dbActions.getAllTimestampCharacter(fakeBaton, {
				character_id: [1, 2],
				timestamp_id: [1]
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
				expect(sqlValues).to.deep.equal([jsonToArray('timestamp_characters',values)])
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
				compilation_id: [1, 2],
				timestamp_id: [5]
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
				expect(sqlValues).to.deep.equal([jsonToArray('compilation_timestamp',values)])
			})
		})

	})

})