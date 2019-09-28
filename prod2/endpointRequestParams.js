var MAIN_VALIDATION = {

  newSeries: {
    series_name: {
      type: 'string'
    }
  },
  getEpisodeData: {
    series_ids: {
      type: "number",
      multiple: true,
      optional: true
    },
    youtube_link: {
      type: 'string',
      optional: true
    }
  },
  newEpisode: {
    episode_name: {
      type: "string"
    },
    series_id: {
      type: "number",
      optional: true
    },
    air_date: {
      type: "number",
      optional: true
    },
    youtube_link: {
      type: 'string',
      optional: true
    }
  },
  getCharacterData: {
    character_name: {
      type: "string",
      optional: true
    }
  },
  newCharacter: {
    character_name: {
      type: "string"
    }
  },
  getCategoryData: {
    category_name :{
      type: "string",
      optional: true
    }
  },
  newCategory: {
    category_name: {
      type: 'string'
    }
  },
  getTimestampData: {
    episode_ids: {
      type: "number",
      optional: true,
      multiple: true
    },
    character_ids: {
      type: "number",
      optional: true,
      multiple: true
    },
    category_ids: {
      type: "number",
      optional: true,
      multiple: true
    }
  },
  newTimestamp: {
    start_time: {
      type: 'number'
    },
    episode_id: {
      type: 'number'
    },
  },
  updateTimestamp: {
    timestamp_id: {
      type: 'number'
    },
    character_ids: {
      type: "number",
      optional: true,
      multiple: true
    },
    category_ids: {
      type: "number",
      optional: true,
      multiple: true
    },
    clearCharacters: {
      type: 'boolean',
      optional: true
    },
    clearCategories: {
      type: 'boolean',
      optional: true
    }
  },
  getCompilationData: {
    timestamp_ids: {
      type: 'number',
      optional: true,
      multiple: true
    },
    compilation_ids: {
      type: 'number',
      optional: true,
      multiple: true
    }
  },
  newCompilation: {
    compilation_name: {
      type: 'string'
    },
    timestamps: {
      type: 'timestamp',
      multiple: true
    }
  },
  createUser: {
    username: {
      type: 'string'
    },
    email: {
      type: 'string'
    },
    password: {
      type: 'string'
    }
  },
  login: {
    username: {
      type: 'string',
      optional: true
    },
    email: {
      type: 'string',
      optional: true
    },
    password: {
      type: 'string'
    }
  }
}

var CUSTOM_OBJECTS = {
  timestamp: {
    timestamp_id: "number",
    duration: "number",
    start_time: "number",
  }
}

module.exports = {
  MAIN_VALIDATION: MAIN_VALIDATION,
  CUSTOM_OBJECTS: CUSTOM_OBJECTS
}