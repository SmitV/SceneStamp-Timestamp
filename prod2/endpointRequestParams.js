var MAIN_VALIDATION = {

  post_newSeries: {
    series_name: {
      type: 'string'
    }
  },
  get_allEpisodeData: {
    series_ids: {
      type: "number",
      multiple: true,
      optional: true
    }
  },
  post_newEpisode: {
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
  get_allCharacterData: {
    series_ids: {
      type: "number",
      optional: true,
      multiple: true
    }
  },
  post_newCharacter: {
    character_name: {
      type: "string"
    }
  },
  post_newCategory: {
    category_name: {
      type: 'string'
    }
  },
  get_allTimestampData: {
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
  post_newTimestamp: {
    start_time: {
      type: 'number'
    },
    episode_id: {
      type: 'number'
    },
  },
  post_updateTimestamp: {
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
  get_allCompilationData: {
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
  post_newCompilation: {
    compilation_name: {
      type: 'string'
    },
    timestamps: {
      type: 'timestamp',
      multiple: true
    }
  },
}

var CUSTOM_OBJECTS = {
  timestamp: {
    timestamp_id: "number",
    duration: "number",
    start_time: "number",
  }
}

module.exports = {
  MAIN_VALIDATION : MAIN_VALIDATION,
  CUSTOM_OBJECTS : CUSTOM_OBJECTS
}