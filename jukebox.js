/* utility functions */

var inherit = (function () {
	function Tmp() {}
	var tmp = new Tmp();
	if (tmp.__proto__ === Tmp.prototype) {
		return function inherit(child, parent) {
			child.prototype.__proto__ = parent.prototype;
		};
	} else {
		return function inherit(child, parent) {
			Tmp.prototype = parent.prototype;
			var newPrototype = new Tmp();
			var oldPrototype = child.prototype;
			for (var prop in childPrototype) {
				newPrototype[prop] = oldPrototype[prop];
			}
			child.prototype = newPrototype;
		};
	}
})();

// weighted random.
function select(weights /*:Array*/, rand /*:number 0..1*/) {
	var weight, i,
		total = 0,
		l = weights.length;
	
	if (l === 1 || l === 0) {
		return 0;
	}
	
	for (i = 0; i < l; i++) {
		weight = weights[i];
		if (weight > 0) {
			total += weight;
		}
	}
	
	if (rand == null) {
		rand = Math.random();
	}
	
	if (total) {
		var pick = total * rand;
		for (i = 0; i < l; i++) {
			weight = weights[i];
			if (pick < weight) {
				return i;
			} else if (weight > 0) {
				pick -= weight;
			}
		}
	}
	
	// default to total random
	return ~~(rand * l);
}

if (!Date.now) { // ES5
	Date.now = function now() {
		return new Date().valueOf();
	};
}

function Random(seed) {
	this._seed = isNaN(seed) ? Date.now() : parseInt(seed, 10);
}
Random.prototype = {
	_seed: 0,
	next: function next() {
		this._seed = (1103515245 * this._seed + 12345) % 4294967296;
		return this;
	},
	getFloat: function getFloat() {
		return this._seed / 4294967296;
	},
	getSeed: function getSeed() {
		return this._seed;
	}
};

/* JSONP */

function JSONP(url, cb, context) {
	var cbName = "$jsonp_callback_" + Math.random().toString(36).substr(2);
	url = url.replace("%s", cbName);
	window[cbName] = function (response) {
		delete window[cbName];
		cb.call(context, response);
	};
	var script = document.createElement("script");
	script.type = "text/javascript";
	script.src = url;
	document.documentElement.firstChild.appendChild(script);
}

/* Jukebox */

function Jukebox() {
	SharedObject.call(this);
	
	var self = this;
	var tracks = [];
	var numTracks = 0;
	var now = 0;
	//var currentTrack;
	//var lastPlayTime = Date.now();
	var tracksObj;
	this.set("tracks", new SharedObject);
	var randSeed;// = +Math.random().toString(10).substr(2) % (1<<30);
	
	//var distance = 1; // minimum allowable distance between two tracks
	function getNextTracks(n) {
		if (!numTracks || !n) {
			return [];
		}

		// get popularity and age of each track.
		var tracksStuff = new Array(numTracks);
		var trackWeights = new Array(numTracks);
		for (var j = 0; j < numTracks; j++) {
			var track = tracks[j];
			tracksStuff[j] = {
				popularity: track.getPopularity() || .00000001,
				age: now - track.lastPlay
			};
		}

		//debugger;
		//console.log(randSeed)
		//console.log(tracksStuff)
		var rand = new Random(randSeed);
		var nextTracks = new Array(n);
		var i = 0;
		while (1) {
			// get weight of each track
			for (j = 0; j < numTracks; j++) {
				var trackStuff = tracksStuff[j];
				var age = trackStuff.age; // time since last play
				var pop = trackStuff.popularity;
				var weight = pop * age;
				//Math.max(0, age - distance);
				trackWeights[j] = weight;
			}
			//console.log(tracksStuff.map(function(s){return s.age;}));
			
			// pick the track
			var r = rand.next().getFloat();
			var nextTrackId = select(trackWeights, r) || 0;
			nextTracks[i] = tracks[nextTrackId];
			
			if (++i >= n) {
				break;
			}
			
			// simulate the future by incrementing the age of every track
			// except the one which was selected, whose age is reset to zero.
			for (j = 0; j < numTracks; j++) {
				tracksStuff[j].age++;
			}
			tracksStuff[nextTrackId].age = 0;
		}
		return nextTracks;
	}
	
	// notify observers that the order of tracks might have changed.
	var listId = 0;
	function refreshLists() {
		self.set("trackLists", listId++);
	}
	
	this.getTrackList = function getTrackList(name) {
		switch (name) {
		case "nextup":
			return getNextTracks(10);
		case "justadded":
			return tracks.slice().sort(function (a, b) {
				return b.dateAdded - a.dateAdded;
			});
		case "popular":
			return tracks.slice().sort(function (a, b) {
				return b.getPopularity() - a.getPopularity();
			});
		case "all":
		default:
			return tracks;
		}
	};
	
	this.advanceTrack = function advanceTrack() {
		var track = getNextTracks(1)[0];
		now++;
		track.set({
			"lastPlayTime": new Date(),
			"lastPlay": now
		});
		self.set({
			"currentTrack": track,
			"now": now,
			"randSeed": new Random(randSeed).next().getSeed()
		});
	};
	
	function onTrackUpdate() {
		refreshLists();
	}
	
	function tracksHandler(key, value, prevValue) {
		if (value instanceof Track) {
			// Add a track
			tracks.push(value);
			numTracks++;
			refreshLists();
			//value.bind(onTrackUpdate);
		}
		if (prevValue instanceof Track) {
			// Remove a track.
			tracks.splice(tracks.indexOf(value), 1);
			numTracks--;
			refreshLists();
			//prevValue.unbind(onTrackUpdate);
		}
	}
	
	this.bind({
		"tracks": function (value, prevValue) {
			if (value instanceof SharedObject) {
				tracksObj = value;
				value.bind(tracksHandler);
			}
			if (prevValue instanceof SharedObject) {
				prevValue.unbind(tracksHandler);
			}
		},
		"randSeed": function (seed) {
			randSeed = seed;
			refreshLists();
		},
		/*"currentTrack": function (track) {
			currentTrack = track;
		},*/
		"now": function setNow(n) {
			now = ~~n;
		}
	});
	
	
	// public methods
	
	/*this.removeTrack = function removeTrack(track) {
		if (!(track.id in tracksById)) {
			return;
		}
		delete tracksById[track.id];
		tracks.splice(tracks.indexOf(track), 1);
		refreshLists();
	};*/
	
	var r = Math.random;
	function generateId() {
		//Math.random().toString(36).substr(2)
		return String.fromCharCode(65536 * r(), 65536 * r());
	}
	
	this.addTrack = function addTrack(track) {
		tracksObj.set(generateId(), track);
		if (tracks.length == 1) {
			self.advanceTrack();
		}
	};
	
	this.searchYouTube = function searchYouTube(query, resultsCb) {
		var url = "http://gdata.youtube.com/feeds/api/videos?" +
			"alt=jsonc&start-index=1&max-results=11&v=2&callback=%s&q=" +
			encodeURIComponent(query);
		JSONP(url, function getYouTubeSearchResults(resp) {
			var items = (resp && resp.data && resp.data.items) || [];
			var tracks = items.map(function getYouTubeTrack(item) {
				var track = new Track();
				track.set({
					"type": Track.YOUTUBE,
					"srcId": item.id,
					"title": item.title,
					"thumbnailUrl": item.thumbnail.sqDefault
				});
				return track;
			});
			resultsCb(tracks);
		});
	};
	
	refreshLists();
	
}
Jukebox.prototype = new SharedObject();


function Track() {
	SharedObject.call(this);
}
Track.YOUTUBE = "yt";
Track.prototype = (function () {
	this.constructor = Track;
	
	this.id = "";
	this.title = "";
	this.srcId = ""; // video id, for youtube
	this.thumbnailUrl = "";
	this.lastPlay = 0; // important
	this.dateAdded /*:Date*/ = null;
	this.userAddedBy /*:Participant*/ = null;
	this.totalPlays = 0;
	this.totalVotesByUser /*:object*/ = null;
	this.totalAbsoluteVoteSum = 0; // sum of absolute values of each user's vote
	this.totalVoteSum = 0; // sum of each user's vote
	this.currentVotesByUser /*:object*/ = null;
	this.currentVoteSum = 0; // sum of current votes, + and -
	
	this.getPopularity = function getPopularity() {
		return 1;
		return (this.totalUpvotes) /
			(this.totalUpvotes + this.totalDownvotes) *
			Math.exp(this.currentVoteSum);
	};
	
	this.bind({
		"lastPlay": function (n) {
			this.lastPlay = ~~n;
		}/*,
		"lastPlayTime": function (time) {
		
		}*/
	});
	
	return this;
}).call(new SharedObject);
