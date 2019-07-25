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



describe('timestamp server tests', function() {

	/*  getting data calls
		
		for series/episode/character/category/timestamp

		also test filtering
	*/
	var fakeRes;
	beforeEach(function() {

		fakeRes = {
			data: null,
			json: function(data) {
				this.data = data;
			}
		}
	});


	function getError(res){
		expect(res.data).to.have.property('error_message')
		return res.data
	}

	describe('series', function() {

		//stub get all series dat for all tests
		sinon.stub(dbActions, 'getAllSeriesData').callsFake(function(baton, callback) {
			return callback(fakeSeriesData)
		})

		var fakeSeriesData;

		beforeEach(function() {
			fakeSeriesData = [{
				"series_id": 1,
				"series_name": "Test Series 1"
			}, {
				"series_id": 2,
				"series_name": "Test Series 2"
			}]
		})

		it('should return all series data', function() {
			actions.get_allSeriesData({}, fakeRes)
			expect(fakeRes.data).equal(fakeSeriesData)
		})

		it('should create new series', function() {
			sinon.stub(dbActions, 'insertSeries').callsFake(function(baton, newSeries, callback) {
				fakeSeriesData.push(newSeries)
				return callback(fakeSeriesData)
			})

			var series_name = 'InTest Series'
			actions.post_newSeries({series_name:series_name}, fakeRes)

			expect(fakeRes.data.length).equal(3)
			expect(fakeRes.data[2].series_name).equal(series_name)
		})

		it('should throw error when same series data', function() {
			var series_name = 'InTest Series'
			fakeSeriesData[0].series_name = series_name
			actions.post_newSeries({series_name:series_name}, fakeRes)

			var error = getError(fakeRes)
			expect(error.error_message).to.contain('Series Name exists')
			expect(true).to.be.false()
		})
	})


});