function $(id) { return document.getElementById(id); }
	
//unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
Function.prototype.debounce = function debouncer(threshold, execAsap) {
	var func = this, timeout;
	return function debounced() {
		var obj = this, args = arguments;
		function delayed() {
			if (!execAsap) {
				func.apply(obj, args);
			}
			timeout = null; 
		}

		if (timeout) {
			clearTimeout(timeout);
		} else if (execAsap) {
			func.apply(obj, args);
		}
		timeout = setTimeout(delayed, threshold || 100); 
	};
};

/* YouTube Player Controller */

var yt = {
	player: null,
	load: function loadPlayer() {
		$("ytplayer-container").innerHTML = '<aobject id="ytplayer"'+
			' type="application/x-shockwave-flash" data="'+
			'http://www.youtube.com/apiplayer?enablejsapi=1&amp;version=3">'+
			'<param name="quality" value="high" />'+
			'<param name="wmode" value="transparent" />'+
			'<param name="menu" value="false" />'+
			'<param name="allowscriptaccess" value="always" />'+
			'<param name="movie" value="'+
			'http://www.youtube.com/apiplayer?enablejsapi=1&version=3'+
			'" /></object>';
		yt.load = Function.prototype; // lazy function redefinition
	},
	onPlayerReady: function onPlayerReady() {
		yt.player = $("ytplayer");
		// play any queued video
		if (yt._queue) {
			yt.player.loadVideoById(yt._queue[0], yt._queue[1]);
			delete yt._queue;
		}
		if (yt._volume != null) {
			yt.player.setVolume(yt._volume);
			delete yt._volume;
		}
		yt.player.addEventListener("onStateChange", "yt.onPlayerStateChange");
	},
	onPlayerStateChange: function onPlayerStateChange(state) {
		if (state == 0) {
			yt.onTrackEnd();
		}
	},
	onTrackEnd: Function.prototype,
	loadVideoById: function loadVideoById(videoId, startSeconds) {
		if (yt.player) {
			yt.player.loadVideoById(videoId, startSeconds);
		} else {
			yt._queue = arguments;
			yt.load();
		}
	},
	setVolume: function setVolume(vol) {
		if (yt.player) {
			yt.player.setVolume(vol * 100);
		} else {
			yt._volume = vol * 100;
		}
	}
};
// called by youtube player
window["onYouTubePlayerReady"] = yt.onPlayerReady;
window["yt"] = yt;

function Slider(button) {
	SharedObject.call(this);
	var active = false;
	var y = 0, startY;
	var height = 1, value;
	var self = this;
	
	var slider = document.createElement("div");
	slider.className = "slider";
	var track = document.createElement("div");
	track.className = "slider-track";
	slider.appendChild(track);
	var handle = document.createElement("div");
	handle.className = "slider-handle";
	track.appendChild(handle);
	handle.appendChild(document.createTextNode(" "));
	button.parentNode.insertBefore(slider, button);
	
	this.bind("value", function (v) {
		value = Math.max(0, Math.min(1, v)) || 0;
	});
	this.valueOf = function () {
		return value;
	};
	function updateValue() {
		y = (1 - value) * height;
		handle.style.top = y + "px";
	}
	function onMouseMove(e) {
		self.set("value", 1 - (e.pageY - startY) / height, self);
	}
	function onMouseUp(e) {
		window.removeEventListener("mousemove", onMouseMove, false);
		window.removeEventListener("mouseup", onMouseUp, false);
	}
	function onSliderMouseDown(e) {
		window.addEventListener("mousemove", onMouseMove, false);
		window.addEventListener("mouseup", onMouseUp, false);
		if (e.target == handle) {
			startY = e.pageY - y;
		} else {
			y = e.offsetY;
			startY = e.pageY - y;
			onMouseMove(e);
		}
	}
	function onAnywhereClick(e) {
		for (var node = e.target; node; node = node.parentNode) {
			if (node == slider || node == button) { return; }
		}
		hide();
	}
	function onKeyDown(e) {
		switch (e.keyCode) {
			case 38: // up
				self.set("value", value + .1);
			break;
			case 40: // down
				self.set("value", value - .1);
			break;
			case 13: // enter
			case 27: // escape
				hide();
			break;
			default:
				return;
		}
		e.preventDefault();
	}
	function show() {
		active = true;
		slider.className = "slider active";
		slider.style.top = button.offsetTop + button.offsetHeight + "px";
		slider.style.left = button.offsetLeft +
			(button.offsetWidth - slider.offsetWidth) / 2 + "px";
		height = track.clientHeight;
		self.bind("value", updateValue);
		window.addEventListener("mousedown", onAnywhereClick, false);
		window.addEventListener("keydown", onKeyDown, false);
	}
	function hide() {
		active = false;
		slider.className = "slider";
		self.unbind("value", updateValue);
		window.removeEventListener("mousedown", onAnywhereClick, false);
		window.removeEventListener("keydown", onKeyDown, false);
	}
	function onButtonClick(e) {
		active ? hide() : show();
	}
	slider.addEventListener("mousedown", onSliderMouseDown, false);
	button.addEventListener("click", onButtonClick, false);
}
Slider.prototype = new SharedObject();

function Toggle(button) {
	SharedObject.call(this);
	var self = this;
	function toggle() {
		self.set("value", self.get("value") ? "" : "1");
	}
	button.addEventListener("click", toggle, false);
}
Toggle.prototype = new SharedObject();

function JukeboxView(model) {
	var currentTrack;
	var trackListViews = []; // TrackViews in the current list.
	var activeTrackListName = "nextup";
	
	// get dom elements
	var jukeboxElement = $("jukebox");
	var ytPlayerContainer = $("ytplayer-container");
	var currentTrackTitleText = document.createTextNode("");
	$("current-track-title").appendChild(currentTrackTitleText);
	var tabsElement = $("tabs");
	var trackListElement = $("tracks");
	var trackSuggestInput = $("suggest-track");
	var activeTab = $(activeTrackListName);
	var searchResultsContainer = $("search-results-container");
	var searchResultsList = $("search-results-list");
	var searchResultsCloseButton = $("search-results-close");
	var volumeButton = $("volume");
	var videoHideButton = $("video-hide");
	
	// update the track contents of the active list
	var refreshActiveList = function refreshActiveList() {
		var tracks = model.getTrackList(activeTrackListName);
		var numTracks = tracks.length;
		// clear list
		for (var i = 0; i < trackListViews.length; i++) {
			trackListViews[i].remove();
		}
		trackListElement.innerHTML = "";
		// populate list
		for (var i = 0; i < numTracks; i++) {
			var view = trackListViews[i] = new TrackView(tracks[i]);
			trackListElement.appendChild(view._element);
		}
	}.debounce(1);
	
	// stuff
	
	function hideSearchResults() {
		searchResultsContainer.className = "";
	}
	
	function showSearchResults(tracks) {
		searchResultsContainer.className = "visible";
		if (!tracks || !tracks.length) {
			searchResultsList.innerHTML = "No search results.";
			return;
		}
		searchResultsList.innerHTML = "";
		tracks.forEach(function (track) {
			var trackView = new TrackSearchResultView(track, function () {
				model.addTrack(track);
				//hideSearchResults();
			});
			searchResultsList.appendChild(trackView._element);
		});
	}

	function searchForTrack(service, query) {
		if (!query) {
			return hideSearchResults();
		}
		if (service == "youtube") {
			model.searchYouTube(query, showSearchResults);
		}
	}
	
	// connect with dom, set up event handlers and stuff
	
	var storage = new SharedStorage(localStorage);
	var prefs = new SubObject(storage, "jointjukebox-");
	
	prefs.bindObj("volume", new Slider(volumeButton), "value");
	prefs.bind("volume", yt.setVolume);
	
	prefs.bindObj("hideVideo", new Toggle(videoHideButton), "value");
	prefs.bind("hideVideo", function (hide) {
		ytPlayerContainer.className = hide ? "hidden" : "";
		videoHideButton.firstChild.nodeValue = hide ? "Show" : "Hide";
		videoHideButton.setAttribute("title",
			hide ? "Show the video player." : "Hide the video player.");
	});
	
	tabsElement.addEventListener("click", function onTabClick(e) {
		e.preventDefault();
		var thisTab = e.target;
		var name = thisTab.id;
		if (activeTrackListName == name) { return; }
		if (activeTab) {
			activeTab.className = "";
		}
		activeTab = thisTab;
		activeTab.className = "active";
		activeTrackListName = name;
		refreshActiveList();
	}, false);
	
	trackSuggestInput.addEventListener("focus", function onFocus() {
		// erase the "suggest a track" filler text
		this.value = "";
		this.className = "";
		this.removeEventListener("focus", onFocus, false);
	
		trackSuggestInput.addEventListener("keypress", function () {
			searchForTrack("youtube", this.value);
		}.debounce(300), false);
	}, false);
	
	searchResultsCloseButton.addEventListener("click", hideSearchResults, !1);


	yt.onTrackEnd = function () {
		// don't let the user end the track early.
		var start = currentTrack.get("lastPlayTime");
		var expectedEnd = start + yt.player.getDuration() * 1000;
		var earliness = expectedEnd - Date.now();
		if (earliness > 1000) {
			alert("You cannot skip a track that way!");
			setTimeout(model.advanceTrack, earliness);
		} else {
			model.advanceTrack();
		}
	};
	
	var currentTrackHandlers = {
		"lastPlayTime": function play(lastPlayTime) {
			// keep the player synchronized within 10s of the state
			var latency = (Date.now() - lastPlayTime) / 1000;
			var seek = Math.max(0, latency - 10);
			currentTrack.bindOnce("type", function (type) {
				if (type == Track.YOUTUBE) {
					currentTrack.bindOnce("srcId", function (srcId) {
						yt.loadVideoById(srcId, seek);
					});
				}
			});
		},
		"title": function (title) {
			currentTrackTitleText.nodeValue = title;
		}
	}
	
	model.bind({
		"currentTrack": function (track, prevTrack) {
			currentTrack = track;
			if (track) {
				currentTrack.bind(currentTrackHandlers);
				jukeboxElement.className = "playing";
			} else {
				jukeboxElement.className = "";
			}
			if (prevTrack) {
				prevTrack.unbind(currentTrackHandlers);
			}
			refreshActiveList();
		},
		"trackLists": function () {
			refreshActiveList();
		}
	});
	
	/*function (lastPlayTime, type, srcId) {
		// keep the player synchronized within 10s of the state
		var latency = (Date.now() - lastPlayTime) / 1000;
		var seek = Math.max(0, latency - 10);
		if (type == Track.YOUTUBE) {
			yt.loadVideoById(srcId, seek);
		}
	}
	
	model.bind("currentTrack", function (track) {
		track.bind("lastPlayTime", function (lastPlayTime) {
			// keep the player synchronized within 10s of the state
			var latency = (Date.now() - lastPlayTime) / 1000;
			var seek = Math.max(0, latency - 10);
			track.bind("type", function getType(type) {
				if (type == Track.YOUTUBE) {
					track.bind("srcId", function play(srcId) {
						yt.loadVideoById(srcId, seek);
					});
				}
			});
		});
	});*/
}


function TrackView(model) {
	/*if (model._view) {
		return model._view;
	}
	model._view = this;*/
	
	this.model = model;
	this._element = document.createElement("li");
	this._element.className = "track";
	this._titleText = document.createTextNode("");
	this._element.appendChild(this._titleText);
	
	model.bind(this._modelHandlers, this);
		
}
TrackView.prototype = {
	model: null,
	_element: null,
	_titleText: null,
	_thumbnailImg: null,
	_modelHandlers: {
		"title": function (title) {
			this._titleText.nodeValue = title;
		}
	},
	remove: function remove() {
		this.model.unbind(this._modelHandlers, this);
	}
};


function TrackSearchResultView(model, addCb) {
	var element = this._element = document.createElement("div");
	element.className = "track search-result";
	
	this._thumbnailImg = new Image();
	this._thumbnailImg.src = model.get("thumbnailUrl");
	element.appendChild(this._thumbnailImg);
	
	var addBtn = document.createElement("button");
	addBtn.innerHTML = "Suggest";
	addBtn.title = "Add this track";
	addBtn.onclick = addCb;
	element.appendChild(addBtn);
	
	this._titleText = document.createTextNode(model.get("title"));
	element.appendChild(this._titleText);
}
/*TrackSearchResultView.prototype = {
	setType: function (type) {
		
	},
	setSrcId: function (srcId) {
		
	},
	setThumbnailUrl: function (thumbnailUrl) {
		this._thumbnailImg.src = thumbnailUrl;
	}
};*/
//inherit(TrackSearchResultView, TrackView);