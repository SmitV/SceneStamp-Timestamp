 var express = require('express');
var testing_action = require('./testing_action.js');
var production_action = require('./production/production_actions.js');
var app = express();


var endpoints = [
	{
		url : 'getSeriesData', 
		action : function(req, res){
					production_action.getAllSeriesData(function(data){
						res.json(data);
					});
				}
	},
	{
		url : 'getCharacterDataFromSeries', 
		action : function(req, res){
			production_action.getAllCharacterData(req.query.series_ids,
			function(data){
				res.json(data);
			});
		}
	},
	{
		url : 'getEpisodeDataFromSeries', 
		action : function(req, res){
			production_action.getAllEpisodeData(function(data){
				res.send(data);
			},req.query.series_ids);
		}
	},
	{
		url : 'getCategories', 
		action : function(req, res){
			production_action.getAllCategoryData(function(data){
				res.json(data);
			});
		}
	},
	{
		url : 'getTimestampsFromEpisode', 
		action : function(req, res){
			production_action.getAllTimestampData(function(data){
				res.json(data);
			},req.query.episode_ids);
		}
	},
	{
		url : 'queryForTimestamps', 
		action : function(req, res){
			res.send('Production not ready');
		}
	},
	{
		url : 'newSeries', 
		action : function(req, res){
			production_action.insertNewSeries(req.query.series_name,function(data){
				res.json(data);
			});
		}
	},
	{
		url : 'newEpisode', 
		action : function(req, res){
					production_action.insertNewEpisode(req.query, function(data){
						res.json(data);
					});
				}
	},
	{
		url : 'newTimestamp', 
		action :function(req, res){
			production_action.insertNewTimestamp(req.query.start_time, req.query.episode_id,function(data){
				res.json(data);
			});
		}
	},
	{
		url : 'updateTimestamp', 
		action : function(req, res){
			production_action.updateTimestamp(req.query.timestamp_id, req.query.characters,req.query.categories,function(data){
				res.json(data);
			});
		}
	},
	{
		url : 'newCharacter', 
		action : function(req, res){
			production_action.insertNewCharacter(req.query.character_name, req.query.series_id,function(data){
				res.json(data);
			});
		}
	},
	{
		url : 'newCategory', 
		action : function(req, res){
			production_action.insertNewCategory(req.query.category_name,function(data){
				res.json(data);
			});
		}
	}
];

app.all('*', function(req, res, next) {
     var origin = req.get('origin'); 
     res.header('Access-Control-Allow-Origin', origin);
     res.header("Access-Control-Allow-Headers", "X-Requested-With");
     res.header('Access-Control-Allow-Headers', 'Content-Type');
     next();
});



endpoints.forEach(function(endpoint){
	app.get('/'+ endpoint.url, function(req, res){
		endpoint.action(req,res);
	});
})


var server = app.listen(process.env.PORT || 8081, function () {   
   console.log("Scene Stamp Server Running @ port ",this.address().port )
})
