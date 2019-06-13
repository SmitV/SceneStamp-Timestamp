var db = require('./db_connector');

module.exports = {

	//remove the res and just return the data
	getAllSeriesData(final_callback){
		var t = this;
		var method = "getAllSeriesData";
		var callback = function(err, data){
			if(err) {
				t._generateError(final_callback, method, err);
				return
			}
			final_callback(data);
		}
		db.getAllSeriesData(callback)
	},
	insertNewSeries(req,final_callback){
		var t = this;
		var method = "insertNewSeries";
		var callback = function(err, data){
			if(err){
				t._generateError(final_callback,method, err);
				return
			}
			final_callback(data);
		}
		if(req.query.series_name == undefined ){
			this._generateError(final_callback,method, "Invalid param series_name");
		}else{
			t.getAllSeriesData(function(data){
				var id = t._generateId(5);
				if(data.map(function(series){return series.series_name.toLowerCase()}).includes(req.query.series_name.toLowerCase())){
					t._generateError(final_callback,method, "Series with same name exists");
					return
				}
				while(data.map(function(series){return series.series_id}).includes(id)){
					id = t._generateId(5);
				}
				db.insertSeriesData(id,req.query.series_name,callback);
			});
			
		}
	},
	_generateId(length){
		return (Math.pow(10, length-1)) + Math.floor( + Math.random() * 9 * Math.pow(10 , (length-1)));
	},
	_generateError(final_callback, method, err){
		console.log("an error is called")
		final_callback({"method":method, "error":err})
	}
}