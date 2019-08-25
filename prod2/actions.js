var db = require('./database_actions');
var stub_db = require('./stub_database');
var endpointRequestParams = require('./endpointRequestParams')
var async = require('async');

/**

GENERAL DESIGN

Private functions : start with '_'
Direct API functions : start with 'post' or 'get'
  -All such calls will create and pass the 'baton' to following functions
*/


var ID_LENGTH = {
  'series': 5,
  'episode': 6,
  'character': 7,
  'timestamp': 9,
  'category': 5
}

var ACTION_VALIDATION = endpointRequestParams.MAIN_VALIDATION

module.exports = {

  ACTION_VALIDATION: ACTION_VALIDATION,
  setActionValidation(actionValidation) {
    ACTION_VALIDATION = actionValidation
  },
  resetActionValidation() {
    ACTION_VALIDATION = endpointRequestParams.MAIN_VALIDATION
  },
  //the above is for testing only



  convertParams(baton, params, action, callback) {

    function checkCustom(customObj, obj, callback) {
      var index = 0
      var updated_obj = {}
      Object.keys(customObj).every(attr => {
        if (customObj[attr] == typeof obj[attr]) {
          updated_obj[attr] = obj[attr]
          index++;
          if (index === Object.keys(customObj).length) {
            callback(obj)
            return false
          }
          return true

        } else {
          baton.setError({
            sub_attr: attr
          })
          callback(NaN)
          return false
        }
      })

    }
    var update_params = {}
    var index = 0

    Object.keys(ACTION_VALIDATION[action]).every(attr => {
      if (params[attr] == null || params[attr] == undefined) update_params[attr] = null
      else {
        update_params[attr] = (baton.requestType == 'GET' ? params[attr].split(',') : (Array.isArray(params[attr]) ? params[attr] : [params[attr]])).map(arrayValue => {
          switch (ACTION_VALIDATION[action][attr].type) {
            case 'string':
              return arrayValue
            case 'number':
              return parseInt(arrayValue)
            case 'boolean':
              if (arrayValue !== 'true' && arrayValue !== 'false') {
                return NaN
              }
              return arrayValue === 'true'
            default:
              var value;
              checkCustom(endpointRequestParams.CUSTOM_OBJECTS[ACTION_VALIDATION[action][attr].type], arrayValue, val => {
                value = val;
              })
              return value
          }
        })
      }
      index++;
      if (index === Object.keys(ACTION_VALIDATION[action]).length) {
        callback(update_params)
      } else {
        return true
      }
    })
  },

  validateRequest(baton, params, action, callback) {
    var t = this

    function throwInvalidParam(attr, error_detail, sub_attr) {

      baton.setError({
        error_detail: error_detail,
        action: action,
        attr: attr,
        sub_attr: (sub_attr ? sub_attr : undefined),
        public_message: 'Parameter validation error'
      })
      t._generateError(baton)
    }

    this.convertParams(baton, params, action, updated_params => {
      var index = 0
      Object.keys(ACTION_VALIDATION[action]).every(attr => {
        if (updated_params[attr] === null) {
          if (ACTION_VALIDATION[action][attr].optional !== true) {
            throwInvalidParam(attr, 'Attibute value missing')
            return false
          }
          delete updated_params[attr]
        } else {
          if (updated_params[attr].includes(NaN)) {
            var existing = {};
            if (baton.err[0]) {
              existing = baton.err[0]
              baton.err = []
            }
            throwInvalidParam(attr, 'Invalid Attribute Type', existing.sub_attr)
            return false
          } else if (ACTION_VALIDATION[action][attr].multiple !== true && updated_params[attr].length > 1) {
            throwInvalidParam(attr, 'Single Value is Expected')
            return false
          }
        }
        if (ACTION_VALIDATION[action][attr].multiple !== true && updated_params[attr] !== undefined) updated_params[attr] = updated_params[attr][0]
        index++;
        if (index === Object.keys(ACTION_VALIDATION[action]).length) callback(updated_params)
        else return true
      })
    })
  },
  get_allSeriesData(params, res) {
    var baton = this._getBaton('get_allSeriesData', params, res);
    this.getAllSeriesData(baton, function(data) {
      baton.json(data)
    });
  },
  getAllSeriesData(baton, callback) {
    baton.addMethod('getAllSeriesData');
    var t = this;
    db.getAllSeriesData(baton, function(data) {
      t._handleDBCall(baton, data, false /*multiple*/ , callback)
    })
  },
  post_newSeries(params, res) {
    var t = this;
    var baton = this._getBaton('post_newSeries', params, res);

    this.validateRequest(baton, params, 'post_newSeries', _ => {
      getSeriesData()
    })

    function getSeriesData() {
      t.getAllSeriesData(baton, ensureUniqueSeriesName);
    }

    function ensureUniqueSeriesName(series_data) {
      var passedSeriesName = baton.params.series_name
      series_names = series_data.map(function(ser) {
        return ser.series_name.toLowerCase()
      })
      if (series_names.includes(passedSeriesName.toLowerCase())) {
        baton.setError({
          error: "existing series name",
          series_name: passedSeriesName,
          public_message: 'Series Name exists'
        })
        t._generateError(baton)
        return
      }
      addNewSeries(series_data);
    }

    function addNewSeries(series_data) {
      var id = t._generateId(ID_LENGTH.series, series_data.map(function(series) {
        return series.series_id
      }));
      db.insertSeries(baton, {
        'series_id': id,
        'series_name': baton.params.series_name
      }, function(new_series) {
        t._handleDBCall(baton, new_series, false /*multiple*/ , function(data) {
          baton.json(data)
        })
      })
    }
  },
  get_allEpisodeData(params, res) {
    var t = this;
    var baton = this._getBaton('get_allEpisodeData', params, res);

    this.validateRequest(baton, params, 'get_allEpisodeData', (updated_params) => {
      params = updated_params
      getEpisodeData()
    })

    function getEpisodeData() {
      t.getAllEpisodeData(baton, params.series_ids, function(data) {
        baton.json(data)
      })
    }
  },
  getAllEpisodeData(baton, series_ids, callback) {
    baton.addMethod('getAllEpisodeData');
    var t = this;
    db.getAllEpisodeData(baton, series_ids, function(data) {
      t._handleDBCall(baton, data, false /*multiple*/ , callback)
    })
  },

  get_allCompilationData(params, res) {
    var t = this;
    var baton = this._getBaton('get_allCompilationData', params, res);

    function verifyParams(callback) {
      t.validateRequest(baton, params, 'get_allCompilationData', updated_params => {
        callback(updated_params)
      })
    }

    verifyParams(function(verified_params) {
      t.getAllCompilationData(baton, verified_params, function(data) {
        baton.json(data)
      });
    })
  },

  getAllCompilationData(baton, params, callback) {
    baton.addMethod('getAllCompilationData');
    var t = this;

    function addInTimestampData(compilation_data, compilation_timestamp, callback) {
      callback(compilation_data.map(function(cp) {
        cp.timestamps = compilation_timestamp.filter((ct) => {
          return ct.compilation_id == cp.compilation_id
        })
        return cp
      }))
    }

    function getCompilationData(compilation_ids, callback) {
      db.getAllCompilationData(baton, {
        compilation_ids: (params.timestamp_ids || params.compilation_ids ? compilation_ids : null)
      }, function(data) {
        t._handleDBCall(baton, data, false /*multiple*/ , callback)
      })
    }


    function getCompilationTimestampData(data, callback) {
      db.getAllCompilationTimestamp(baton, {
        timestamp_ids: data.timestamp_ids,
        compilation_ids: data.compilation_ids,
      }, function(data) {
        t._handleDBCall(baton, data, false /*multiple*/ , callback)
      })
    }

    function dataLoader(params, callback) {
      //first get all of the compilation and timestamp data
      //if there is timestamp_ids passed in, should filter 
      getCompilationTimestampData(params, function(compilation_timestamp) {
        //get all of the compilation data
        //if there is timestamp ids provided, only need to get the the compilation ids that are filtered
        getCompilationData((compilation_timestamp.length > 0 ? [...compilation_timestamp.map(function(ct) {
          return ct.compilation_id
        })] : [-1]), function(compilation_data) {
          //after getting all of the compilation ids, we now need to get all of the timestamps connected to those compilation ids
          getCompilationTimestampData({
            compilation_ids: (compilation_data.length > 0 ? compilation_data.map((cp) => {
              return cp.compilation_id
            }) : null)
          }, function(filtered_compilation_timestamp) {
            callback(compilation_data, filtered_compilation_timestamp)
          })
        })
      })
    }

    dataLoader(params, function(compilation_data, compilation_timestamp) {
      addInTimestampData(compilation_data, compilation_timestamp, function(updateCompilationData) {
        callback(updateCompilationData)
      })
    })
  },

  post_newCompilation(params, res) {
    var t = this;
    var baton = this._getBaton('post_newCompilation', params, res);
    baton.requestType = "POST"

    function createCompilationId(params, compilation_data, callback) {
      t.getAllCompilationData(baton, params, function(compilation_data) {
        params.compilation_id = t._generateId(ID_LENGTH.timestamp, compilation_data.map(function(cp) {
          return cp.compilation_id
        }))
        callback(params)
      })
    }

    function ensureRequiredParamsPresent(params, compilation_data, callback) {
      if (compilation_data.map(function(cp) {
          return cp.compilation_name
        }).includes(params.compilation_name)) {
        baton.setError({
          compilation_name: params.compilation_name,
          error: "Compilation name already exists",
          public_message: 'Compilation name already used'
        })
        t._generateError(baton)
        return
      }
      if (params.timestamps && params.timestamps.length == 0) {
        baton.setError({
          timestamps: params.timestamps,
          error: "Timestamps cannot be empty",
          public_message: 'Required params not present'
        })
        t._generateError(baton)
        return
      }
      t.ensure_TimestampIdExists(baton, {

        timestamp_id: [...new Set(params.timestamps.map(timestamp => {
          return timestamp.timestamp_id
        }))]
      }, function() {
        createCompilationId(params, compilation_data, callback)
      })
    }


    function verifyParams(compilation_data, callback) {
      t.validateRequest(baton, params, 'post_newCompilation', (updated_params) => {
        ensureRequiredParamsPresent(updated_params, compilation_data, function() {
          callback(updated_params)
        })
      })
    }

    function insertNewCompilation(params, callback) {
      db.insertCompilation(baton, params, function(data) {
        t._handleDBCall(baton, data, true /*multiple*/ , callback)
      })
    }

    function insertCompilationTimestamps(compilation_id, timestamps, callback) {
      var values = timestamps.map(function(ts) {
        return {
          compilation_id: compilation_id,
          timestamp_id: ts.timestamp_id,
          duration: ts.duration,
          start_time: ts.start_time
        }
      })
      db.insertCompilationTimestamp(baton, values, function(data) {
        t._handleDBCall(baton, data, true /*multiple*/ , callback)
      })
    }

    function insertAllData(params, suc_callback) {
      var tasks = {}
      tasks.compilation = function(callback) {
        insertNewCompilation({
          compilation_id: params.compilation_id,
          compilation_name: params.compilation_name
        }, callback)
      }
      tasks.timestamps = function(callback) {
        insertCompilationTimestamps(params.compilation_id, params.timestamps, callback)
      }

      async.parallel(tasks,
        function(err, results) {
          if (err) {
            baton.setError(err)
            t._generateError(baton);
            return
          } else {
            results.compilation.timestamps = params.timestamps
            suc_callback(results.compilation)
          }
        });
    }

    function dataLoader(callback) {
      t.getAllCompilationData(baton, {}, function(compilation_data) {
        callback(compilation_data)
      })
    }

    //execute
    dataLoader(function(compilation_data) {
      verifyParams(compilation_data, function(params) {
        insertAllData(params, function(compilatin_added) {
          baton.json(compilatin_added)
        })
      });
    })
  },

  post_newEpisode(params, res) {
    var t = this;
    var baton = this._getBaton('post_newEpisode', params, res);

    function ensureEpisodeParamsIsUnique(params, callback) {
      t.getAllEpisodeData(baton, null, function(episode_data) {
        if (episode_data.map(function(ep) {
            return ep.episode_name.toLowerCase()
          }).includes(params.episode_name.toLowerCase())) {
          baton.setError({
            episode_name: params.episode_name,
            error: "Episode Name exists",
            public_message: 'Episode Name exists'
          })
          t._generateError(baton)
          return
        }
        if (params.youtube_id !== undefined && episode_data.find(function(ep) {
            return ep.youtube_id == params.youtube_id
          }) !== undefined) {
          baton.setError({
            youtube_id: params.youtube_id,
            youtube_link: params.youtube_link,
            error: "Episode exists with youtube id",
            public_message: 'Youtube Id already Registered'
          })
          t._generateError(baton)
          return
        }
        //update params to include generated id
        params.episode_id = t._generateId(ID_LENGTH.episode, episode_data.map(function(ep) {
          return ep.episode_id
        }))
        callback()
      })
    }

    function youtubeLinkParser(url) {
      var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
      var match = url.match(regExp);
      if (match && match[7].length == 11) {
        return match[7];
      } else {
        return null
      }
    }

    function ensureRequiredParamsPresent(params, callback) {
      if (params.youtube_link !== null && params.youtube_link !== undefined) {
        var youtubeId = youtubeLinkParser(params.youtube_link)
        if (youtubeId == null) {
          baton.setError({
            youtube_link: params.youtube_link,
            youtube_id: youtubeId,
            error: "Youtube Link is not valid, pattern wise",
            public_message: 'Invalid Youtube Link'
          })
          t._generateError(baton)
          return
        }
        params.youtube_id = youtubeId
      }
      if (params.series_id !== null && params.series_id !== undefined) {
        t.ensure_SeriesIdExists(baton, params, function() {
          ensureEpisodeParamsIsUnique(params, callback)
        })
      } else {
        ensureEpisodeParamsIsUnique(params, callback)
      }
    }

    function insertNewEpisode(params, callback) {
      db.insertEpisode(baton, params, function(data) {
        t._handleDBCall(baton, data, false /*multiple*/ , callback)
      })
    }

    function verifyParams(callback) {
      t.validateRequest(baton, params, 'post_newEpisode', update_params => {
        ensureRequiredParamsPresent(update_params, function() {
          callback(update_params)
        })
      })
    }

    //execute
    verifyParams(function(params) {
      insertNewEpisode(params, function(episode_added) {
        baton.json(episode_added)
      })
    });
  },

  get_allCharacterData(params, res) {
    var t = this;
    var baton = this._getBaton('get_allCharacterData', params, res);

    this.validateRequest(baton, params, 'get_allCharacterData', update_params => {
      getCharacterData()
    })

    function getCharacterData() {
      t.getAllCharacterData(baton, function(data) {
        baton.json(data)
      })
    }
  },

  getAllCharacterData(baton, callback) {
    baton.addMethod('getAllCharacterData');
    var t = this;
    db.getAllCharacterData(baton, function(data) {
      t._handleDBCall(baton, data, false /*multiple*/ , callback)
    })
  },

  post_newCharacter(params, res) {
    var t = this;
    var baton = this._getBaton('post_newCharacter', params, res);

    function ensureCharacterNameIsUnique(params, callback) {
      t.getAllCharacterData(baton, function(character_data) {
        if (character_data.map(function(ch) {
            return ch.character_name.toLowerCase()
          }).includes(params.character_name.toLowerCase())) {
          baton.setError({
            character_name: params.character_name,
            series_id: params.series_id,
            error: "Character Name exists",
            public_message: 'Character Name already exists'
          })
          t._generateError(baton)
          return
        }
        callback()
      })
    }


    function addCharacterId(params, callback) {
      //update params to include generated id
      t.getAllCharacterData(baton, function(character_data) {
        params.character_id = t._generateId(ID_LENGTH.character, character_data.map(function(ch) {
          return ch.character_id
        }))
        callback(params)
      })
    }

    function verifyParams(callback) {
      t.validateRequest(baton, params, 'post_newCharacter', updated_params => {
        ensureCharacterNameIsUnique(params, _ => {
          addCharacterId(updated_params, callback)
        })
      })
    }

    function insertNewCharacter(params, callback) {
      db.insertCharacter(baton, params, function(data) {
        t._handleDBCall(baton, data, false /*multiple*/ , callback)
      })
    }

    //execute
    verifyParams(function(params) {
      insertNewCharacter(params, function(character_added) {
        baton.json(character_added)
      })
    });

  },

  get_allCategoryData(params, res) {
    var t = this;
    var baton = this._getBaton('get_allCategoryData', params, res);

    t.getAllCategoryData(baton, function(data) {
      baton.json(data)
    })
  },

  getAllCategoryData(baton, callback) {
    baton.addMethod('getAllCategoryData');
    var t = this;
    db.getAllCategoryData(baton, function(data) {
      t._handleDBCall(baton, data, false /*multiple*/ , callback)
    })
  },

  post_newCategory(params, res) {
    var t = this;
    var baton = this._getBaton('post_newCategory', params, res);

    function ensureCategoryIsUnique(params, callback) {
      t.getAllCategoryData(baton, function(category_data) {
        if (category_data.map(function(ct) {
            return ct.category_name.toLowerCase()
          }).includes(params.category_name.toLowerCase())) {
          baton.setError({
            category_name: params.category_name,
            error: "Category Name exists",
            public_message: 'Category Name exists'
          })
          t._generateError(baton)
          return
        }
        //update params to include generated id
        params.category_id = t._generateId(ID_LENGTH.category, category_data.map(function(ct) {
          return ct.category_id
        }))
        callback(params)
      })
    }

    function verifyParams(callback) {
      t.validateRequest(baton, params, 'post_newCategory', updated_params => {
        ensureCategoryIsUnique(updated_params, callback)
      })
    }

    function insertNewCategory(params, callback) {
      db.insertCategory(baton, params, function(data) {
        t._handleDBCall(baton, data, false /*multiple*/ , callback)
      })
    }

    //execute
    verifyParams(function(params) {
      insertNewCategory(params, function(character_added) {
        baton.json(character_added)
      })
    });
  },

  get_allTimestampData(params, res) {
    var t = this;
    var baton = this._getBaton('get_allTimestampData', params, res);

    this.validateRequest(baton, params, 'get_allTimestampData', updated_params => {
      getTimestampData(updated_params)
    })

    function getTimestampData(params) {
      t.getAllTimestampData(baton, params, function(data) {
        baton.json(data)
      })
    }
  },

  //get character and categories for timestamps
  getAllTimestampData(baton, params, callback) {
    baton.addMethod('getAllTimestampData');
    var t = this;

    db.getAllTimestampData(baton, params.episode_ids, params.timestamp_ids, function(data) {
      t._handleDBCall(baton, data, false /*multiple*/ , function(timestamp_data) {
        dataLoader(timestamp_data, function(results) {
          if (params.character_ids) {
            timestamp_data = timestamp_data.filter(function(timestamp) {
              return t._intersection(params.character_ids, timestamp.characters).length > 0
            });
          }
          if (params.category_ids) {
            timestamp_data = timestamp_data.filter(function(timestamp) {
              return t._intersection(params.category_ids, timestamp.categories).length > 0
            });
          }
          callback(timestamp_data)
        })
      })
    })


    function dataLoader(timestamp_data, suc_callback) {
      var timestamp_ids = timestamp_data.map(function(timestamp) {
        return timestamp.timestamp_id
      })
      var tasks = {}
      tasks.allCategory = function(callback) {
        db.getAllTimestampCategory(baton, (timestamp_ids.length == 0 ? {} : {
          timestamp_ids: timestamp_ids
        }), function(data) {
          t._handleDBCall(baton, data, true /*multiple*/ , callback)
        })
      }
      tasks.allCharacter = function(callback) {
        db.getAllTimestampCharacter(baton, (timestamp_ids.length == 0 ? {} : {
          timestamp_ids: timestamp_ids
        }), function(data) {
          t._handleDBCall(baton, data, true /*multiple*/ , callback)
        })
      }

      async.parallel(tasks,
        function(err, results) {
          if (err) {
            t._generateError(baton);
            return
          } else {
            suc_callback(timestamp_data.map(function(timestamp) {
              timestamp.characters = results.allCharacter.filter(function(ch) {
                return ch.timestamp_id == timestamp.timestamp_id
              }).map(function(ch) {
                return ch.character_id
              });
              timestamp.categories = results.allCategory.filter(function(ct) {
                return ct.timestamp_id == timestamp.timestamp_id
              }).map(function(ct) {
                return ct.category_id
              });
              return timestamp
            }))
          }
        });
    }

  },

  post_newTimestamp(params, res) {
    var t = this;
    var baton = this._getBaton('post_newTimestamp', params, res);

    function createTimestampId(params, callback) {
      t.getAllTimestampData(baton, {}, function(timestamp_data) {
        params.timestamp_id = t._generateId(ID_LENGTH.timestamp, timestamp_data.map(function(ts) {
          return ts.timestamp_id
        }))
        callback(params)
      })
    }

    function verifyParams(callback) {
      t.validateRequest(baton, params, 'post_newTimestamp', updated_params => {
        createTimestampId(updated_params, updated_params_v2 => {
          t.ensure_EpisodeIdExists(baton, updated_params_v2, function() {
            callback(updated_params_v2)
          })
        })
      })
    }

    function insertNewTimestamp(params, callback) {
      db.insertTimestamp(baton, params, function(data) {
        t._handleDBCall(baton, data, false /*multiple*/ , callback)
      })
    }

    //execute
    verifyParams(function(params) {
      insertNewTimestamp(params, function(new_timestamp_data) {
        baton.json(new_timestamp_data)
      })
    });
  },

  post_updateTimestamp(params, res) {
    var t = this;
    var baton = this._getBaton('post_updateTimestamp', params, res);

    function addCharactersAndCategories(params, suc_callback) {
      var tasks = {}
      if (params.category_ids) {
        tasks.categories = function(callback) {
          var category_values = [];
          params.category_ids.forEach(function(category) {
            category_values.push({
              timestamp_id: params.timestamp_id[0],
              category_id: category
            });
          })
          db.insertTimestampCategory(baton, category_values, function(data) {
            t._handleDBCall(baton, data, true /*multiple*/ , callback)
          })
        }
      }
      if (params.character_ids) {
        tasks.characters = function(callback) {
          var character_values = [];
          params.character_ids.forEach(function(character) {
            character_values.push({
              timestamp_id: params.timestamp_id[0],
              character_id: character
            });
          })
          db.insertTimestampCharacter(baton, character_values, function(data) {
            t._handleDBCall(baton, data, true /*multiple*/ , callback)
          })
        }
      }

      async.parallel(tasks,
        function(err, results) {
          if (err) {
            t._generateError(baton);
            return
          } else {
            suc_callback()
          }
        });
    }

    function removeCharactersAndCategories(params, suc_callback) {
      function createTasks(after_task_created_callback) {
        var tasks = {}
        if (params.category_ids || params.clearCategories) {
          tasks.categories = function(callback) {
            db.removeTimestampCategory(baton, params.timestamp_id, function(data) {
              t._handleDBCall(baton, data, true /*multiple*/ , callback)
            })
          }
        }
        if (params.character_ids || params.clearCharacters) {
          tasks.characters = function(callback) {
            db.removeTimestampCharacter(baton, params.timestamp_id, function(data) {
              t._handleDBCall(baton, data, true /*multiple*/ , callback)
            })
          }
        }
        after_task_created_callback(tasks)
      }

      createTasks(function(tasks) {
        async.parallel(tasks,
          function(err, results) {
            if (err) {
              t._generateError(baton);
              return
            } else {
              suc_callback()
            }
          });
      })
    }

    function ensureCharactersFromSameSeries(characters, timestamp, callback) {
      t.ensure_EpisodeIdExists(baton, {
        episode_id: timestamp.episode_id
      }, function(episode) {
        episode = episode[0]
        t.getAllCharacterData(baton, function(series_characters) {
          if (t._intersection(characters, series_characters.map(function(character) {
              return character.character_id
            })).length !== characters.length) {
            baton.setError({
              character_ids: params.character_ids,
              series_id: episode.series_id,
              timesamp_id: params.timestamp_id,
              error: "Not all characters in series",
              public_message: 'Invalid characters'
            })
          }
          callback()
        })
      })
    }

    function validateCategoryCharacterValues(params, timestamp_data, suc_callback) {
      function createTasks(after_task_created_callback) {
        var tasks = []
        if (params.category_ids) {
          tasks.push(function(callback) {
            t.ensure_CategoryIdsExist(baton, params.category_ids, function(err) {
              if (err) baton.setError(err)
              callback()
            })
          })
        }

        if (params.character_ids) {
          tasks.push(function(callback) {
            t.ensure_CharacterIdsExist(baton, params.character_ids, function(err) {
              if (err) baton.setError(err)
              callback()
            })
          })
        }
        after_task_created_callback(tasks)
      }

      createTasks(function(tasks) {
        async.parallel(tasks,
          function(err) {
            if (baton.err.length > 0) {
              t._generateError(baton);
            } else {
              suc_callback(params)
            }
          });
      })
    }

    function verifyParams(callback) {
      t.validateRequest(baton, params, 'post_updateTimestamp', updated_params => {
        updated_params.timestamp_id = [updated_params.timestamp_id]
        t.ensure_TimestampIdExists(baton, updated_params, function(timestamp_data) {
          validateCategoryCharacterValues(updated_params, timestamp_data, callback)
        })
      })
    }

    verifyParams(function(params) {
      //IF NEEDED, add check for if the characters are in the series
      removeCharactersAndCategories(params, function() {
        addCharactersAndCategories(params, function() {
          baton.json(params)
        })
      })
    })


  },

  ensure_CategoryIdsExist(baton, categories, callback) {
    var t = this;
    t.getAllCategoryData(baton, function(category_data) {
      if (t._intersection(category_data.map(function(cat) {
          return cat.category_id;
        }), categories).length != categories.length) {
        callback({
          category_ids: categories,
          error: "Invalid category ids",
          public_message: 'Invalid categories'
        })
        return
      }
      callback()
    })
  },

  ensure_CharacterIdsExist(baton, characters, callback) {
    var t = this;
    t.getAllCharacterData(baton, function(character_data) {
      if (t._intersection(character_data.map(function(cha) {
          return cha.character_id;
        }), characters).length != characters.length) {
        callback({
          character_ids: characters,
          error: "Invalid character ids",
          public_message: 'Invalid characters'
        })
        return
      }
      callback()
    })
  },

  ensure_SeriesIdExists(baton, params, callback) {
    var t = this;
    baton.addMethod('ensure_SeriesIdExists');
    this.getAllSeriesData(baton, function(series_data) {
      if (!series_data.map(function(ser) {
          return ser.series_id
        }).includes(params.series_id)) {
        baton.setError({
          series_id: params.series_id,
          error: "Series id not registered",
          public_message: 'Invalid Series Id'
        })
        t._generateError(baton)
        return
      }
      callback()
    })
  },

  ensure_EpisodeIdExists(baton, params, callback) {
    var t = this;
    baton.addMethod('ensure_EpisodeIdExists');
    this.getAllEpisodeData(baton, null /*series_id*/ , function(episode_data) {
      if (!episode_data.map(function(ep) {
          return ep.episode_id
        }).includes(params.episode_id)) {
        baton.setError({
          episode_id: params.episode_id,
          error: "Episode id not registered",
          public_message: 'Invalid Episode Id'
        })
        t._generateError(baton)
        return
      }
      callback(episode_data.filter(function(ep) {
        return ep.episode_id == params.episode_id
      }))
    })
  },

  ensure_TimestampIdExists(baton, params, callback) {
    var t = this;
    baton.addMethod('ensure_TimestampIdExists');
    this.getAllTimestampData(baton, {
      timestamp_ids: params.timestamp_id
    }, function(timestamp_data) {
      if (timestamp_data.length !== params.timestamp_id.length) {
        baton.setError({
          timestamp_id: params.timestamp_id,
          error: "Timestamp id not registered",
          public_message: 'Invalid Timestamp Id'
        })
        t._generateError(baton)
        return
      }
      callback(timestamp_data)
    })
  },

  _stringToArray(str, toInt) {
    if (str == undefined) return [undefined]
    str = str.split(',')
    if (toInt) str.map(function(s) {
      return parseInt(s)
    })
    return str
  },
  /**
   * Handles if error occurs from DB Call
   * in case of multiple, callback will be error,results
   */
  _handleDBCall(baton, data, multiple, callback) {
    if (baton.err.length > 0) {
      //the error would have been set on the DB side
      if (multiple) {
        callback(true)
        return
      }
      //the error would have been set on the DB side
      this._generateError(baton)
      return
    }
    if (multiple) {
      callback(null, data)
      return
    }
    callback(data)
  },
  /**
   * Creates the 'baton' object holding all general info for the session functions
   * Original Callback will be stored, and method sequence will be stored, along with error
   * uses 'call-by-sharing' ; like call-by-reference, but only for properties of objects
   */
  _getBaton(method, params, res) {
    var time = new Date();
    return {
      //id to reference detail log
      id: this._generateId(10),
      start_time: time.getTime(),
      err: [],
      //the res for the request
      res: res,
      requestType: "GET",
      params: params,
      sendError: function(data) {
        res.status(500).json(data)
      },
      json: function(data) {
        var end_time = new Date()
        this.duration = end_time.getTime() - this.start_time
        console.log(this.methods[0] + " | " + this.duration)
        res.status((this.requestType == "GET" ? 200 : 201)).json(data)
      },
      //method sequence
      methods: [method],
      addMethod: function(meth) {
        this.methods.push(meth)
      },
      //the error object & public message to display
      setError: function(error) {
        var end_time = new Date()
        this.duration = end_time.getTime() - this.start_time
        this.err.push(error);
      }
    }
  },

  _generateError(baton) {

    var printableBaton = {}
    baton.duration = new Date().getTime() - baton.start_time
    Object.keys(baton).forEach(function(key) {
      if (typeof baton[key] !== 'function') printableBaton[key] = baton[key]
    });
    delete printableBaton.res
    console.log('----------------')
    console.log(printableBaton)
    console.log()
    baton.sendError({
      'id': baton.id,
      'error_message': baton.err.map(function(err) {
        return err.public_message
      }).join('.')
    });
  },
  _generateId(length, ids) {
    var id = (Math.pow(10, length - 1)) + Math.floor(+Math.random() * 9 * Math.pow(10, (length - 1)));
    if (ids) {
      while (ids.includes(id)) {
        id = (Math.pow(10, length - 1)) + Math.floor(+Math.random() * 9 * Math.pow(10, (length - 1)));
      }
    }
    return id;
  },
  /**
   * Returns the intersection of two arrays
   */
  _intersection(a, b) {
    c = [...a.sort()];
    d = [...b.sort()];
    var result = [];
    while (c.length > 0 && d.length > 0) {
      if (c[0] < d[0]) {
        c.shift();
      } else if (c[0] > d[0]) {
        d.shift();
      } else /* they're equal */ {
        result.push(c.shift());
        d.shift();
      }
    }
    return result;
  },

}