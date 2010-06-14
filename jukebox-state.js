/*globals wavy */
function JukeboxState(model, state) {
	function tracksStateHandler(key, value, prevValue) {
		var track = TrackState.fromState(value).model;
		//track.set("srcId", key);
		//getTracksModel().set(key, track);
		model.getObject("tracks").set(key, track, this);
	}
	
	state.bind({
		"tracks": function (value, prevValue) {
			if (value instanceof SharedObject) {
				value.bind(tracksStateHandler, this);
			}
			if (prevValue instanceof SharedObject) {
				prevValue.unbind(tracksStateHandler, this);
			}
		},
		"seed": function (seed) {
			model.set("randSeed", parseInt(seed, 36), this);
		},
		"currentTrack": function (obj) {
			var track = TrackState.fromState(obj).model;
			model.set("currentTrack", track, this);
		},
		"now": function (now) {
			model.set("now", now, this);
		}
	}, this);
	
	function tracksModelHandler(key, value, prevValue) {
		var trackState = TrackState.fromModel(value).state;
		state.getObject("tracks").set(key, trackState, this);
		/*state.bindOnce("tracks", function (tracks) {
			tracks.set(key, trackState, this);
		}, this);*/
	}
	
	model.bind({
		/** @param {Number} seed Random number seed. */
		"randSeed": function (seed) {
			state.set("seed", seed.toString(36), this);
		},
		"currentTrack": function (track) {
			state.set("currentTrack", TrackState.fromModel(track).state, this);
		},
		"tracks": function (value, prevValue) {
			if (value instanceof SharedObject) {
				value.bind(tracksModelHandler, this);
			}
			if (prevValue instanceof SharedObject) {
				prevValue.unbind(tracksModelHandler, this);
			}
		},
		"now": function (t) {
			state.set("now", t, this);
		}
		/*"seek": function (seek) {
			state.set("last_play_time", time);
		},
		"play": function (track) {
			state.set("current_track", seed);
		},
		"currentTrack": function (track) {
			state.set("current_track", track);
		},
		"lastPlayTime": function (time) {
			state.set("last_play_time", time);
		},
		"addTrack": function (track) {
			TrackState.fromModel(track).state.set("j", state);
		},
		"removeTrack": function (track) {
			TrackState.fromModel(track).state.set("j", null);
		}*/
	}, this);
}

function TrackState(model, state) {
	this.model = model;
	this.state = state;
	model.state = this;
	state._track = this;
	state.bind(this._stateHandlers, this);
	model.bind(this._modelHandlers, this);
}
/**
 * @param {SharedObject} state A shared state object that should have a track
 * attached to it.
 */
TrackState.fromState = function fromState(state) {
	return state._track || new TrackState(new Track, state);
};
TrackState.fromModel = function fromModel(model) {
	return model.state || new TrackState(model, new SharedObject);
};
TrackState.prototype = {
	state: null,
	model: null,
	currentVotes: null,
	allVotes: null,
	_stateHandlers: {
		"title": function (title) {
			this.model.set("title", title);
		},
		
		"type": function (type) {
			this.model.set("type", type);
		},
		
		"srcId": function (srcId) {
			this.model.set("srcId", srcId);
		},
		
		"thumbnail": function (src) {
			this.model.set("thumbnail", src);
		},
		
		"user": function (user) {
			this.model.set("userAddedBy", user);
		},
		
		"lastPlayTime": function (t) {
			this.model.set("lastPlayTime", new Date(+t));
		},
		
		"lastPlay": function (t) {
			this.model.set("lastPlay", ~~t);
		},
		
		"currentVotes": function (currentVotes, prev) {
			if (currentVotes instanceof SharedObject) {
				this.currentVotes = currentVotes;
				currentVotes.bind(this._onCurrentVotesUpdate, this);
			}
			if (prev instanceof SharedObject) {
				prev.unbind(this._onCurrentVotesUpdate, this);
			}
		},
		
		"allVotes": function (allVotes, prev) {
			if (allVotes instanceof SharedObject) {
				this.allVotes = allVotes;
				currentVotes.bind(this._onAllVotesUpdate, this);
			}
			if (prev instanceof SharedObject) {
				prev.unbind(this._onAllVotesUpdate, this);
			}
		}
	},
	
	_onCurrentVotesUpdate: function (userId, newVote, prevVote) {
		this.model.setCurrentVote(userId, newVote);
		// limit votes to 1, -1, or 0.
		/*
		var newVote2 = newVote > 0 ? 1 : newVote < 0 ? -1 : 0;
		this.votesByUser[userId] = ~~newVote2;
		this.currentVoteSum += newVote2 - oldVote;
		this.renderVotes();
		*/
	},
	
	_onAllVotesUpdate: function (userId, newNumVotes, prevNumVotes) {
		this.model.setAllVote(userId, newNumVotes);
		/*
		this.allVotesByUserId[userId] = ~~newNumVotes;
		this.allVotesSum += newNumVotes - oldNumVotes;
		this.renderVotes();
		*/
	},
	
	_modelHandlers: {
		"title": function (title) {
			this.state.set("title", title);
		},
		
		"type": function (type) {
			this.state.set("type", type);
		},
		
		"srcId": function (srcId) {
			this.state.set("srcId", srcId);
		},
		
		"thumbnail": function (src) {
			this.state.set("thumbnail", src);
		},
		
		"userAddedBy": function (user) {
			this.state.set("user", user);
		},
		
		"lastPlayTime": function (lastPlayTime) {
			this.state.set("lastPlayTime", lastPlayTime.valueOf().toString());
		},
		
		"lastPlay": function (lastPlay) {
			this.state.set("lastPlay", lastPlay);
		},
		
		"currentVotes": function (currentVotes, prev) {
			
		},
		
		"allVotes": function (allVotes, prev) {
			
		}
	}	
};