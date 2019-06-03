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
			res.end(JSON.stringify(testing_action.getCharacterDataFromSeries(req.query.series_id)));
		},
		function(req, res){
			res.send('Production not ready, set testing = true');
		}),
	new Endpoint(
		'/getEpisodeDataFromSeries',
		function(req, res){
			res.end(JSON.stringify(testing_action.getEpisodesFromSeries(req.query.series_id)));
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


var server = app.listen(8081, function () {
   var host = server.address().address
   var port = process.env.PORT || server.address().port
   
   console.log("Scene Stamp Server Running @ http://%s:%s", host, port)
})
