 var express = require('express');
var testing_action = require('./testing_action.js');
var app = express();

class Endpoint{

	constructor(url, testing_callback, production_callback){
		this.url = url;
		this.testing_callback = testing_callback;
		this.production_callback = production_callback;
	}

	getUrl(){
		return this.url;
	}

	testing(req, res){
		this.testing_callback(req,res);
	}

	production(req,res){
		this.production_callback(req,res);
	}
}

var endpoints = [
	new Endpoint(
		'/getSeriesData',
		function(req, res){
			res.end(JSON.stringify(testing_action.getAllSeries()));
		},
		function(req, res){
			res.send('Production not ready, set testing = true');
		}),
	new Endpoint(
		'/getCharacterDataFromSeries',
		function(req, res){
			res.end(JSON.stringify(testing_action.getCharacterDataFromSeries(true, req.query.series_id)));
		},
		function(req, res){
			res.send('Production not ready, set testing = true');
		}),
	new Endpoint(
		'/getEpisodeDataFromSeries',
		function(req, res){
			res.end(JSON.stringify(testing_action.getEpisodesFromSeries(true, req.query.series_id)));
		},
		function(req, res){
			res.send('Production not ready, set testing = true');
		}),
	new Endpoint(
		'/getCategories',
		function(req, res){
			res.end(JSON.stringify(testing_action.getAllCategories()));
		},
		function(req, res){
			res.send('Production not ready, set testing = true');
		}),
	new Endpoint(
		'/getTimestampsFromEpisode',
		function(req, res){
			res.end(JSON.stringify(testing_action.getTimestampsFromEpisode(true, req.query.episode_id)));
		},
		function(req, res){
			res.send('Production not ready, set testing = true');
		}),
	new Endpoint(
		'/queryForTimestamps',
		function(req, res){
			res.end(JSON.stringify(testing_action.queryForTimestamps(req.query)));
		},
		function(req, res){
			res.send('Production not ready, set testing = true');
		}),
	new Endpoint(
		'/newSeries',
		function(req, res){ 
			res.end(JSON.stringify(testing_action.postNewSeries(req.query.series_name)));
		},
		function(req, res){
			res.send('Production not ready, set testing = true');
		}),
	new Endpoint(
		'/newEpisode',
		function(req, res){ 
			res.end(JSON.stringify(testing_action.postNewEpisode(parseInt(req.query.episode), parseInt(req.query.series_id) , req.query.title)));
		},
		function(req, res){
			res.send('Production not ready, set testing = true');
		}),
	new Endpoint(
		'/newTimestamp',
		function(req, res){ 
			res.end(JSON.stringify(testing_action.postNewTimestamp(req.query)));
		},
		function(req, res){
			res.send('Production not ready, set testing = true');
		}),
	new Endpoint(
		'/newCharacter',
		function(req, res){ 
			res.end(JSON.stringify(testing_action.postNewCharacter((req.query.series_id) , req.query.name)));
		},
		function(req, res){
			res.send('Production not ready, set testing = true');
		})
	];

endpoints.forEach(function(endpoint){
	app.get(endpoint.getUrl(), function(req, res){
		if(req.query.testing === 'true'){
			endpoint.testing(req,res);
		}
		else{
			endpoint.production(req,res);
		}
	});
})


var server = app.listen(process.env.PORT || 8081, function () {   
   console.log("Scene Stamp Server Running @ port ",this.address().port )
})
