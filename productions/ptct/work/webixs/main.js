
let songs = [
		"songs/adagio for softsynths.ixs",
		"songs/andes.ixs",
		"songs/archon (vectorworld ii).ixs",
		"songs/caribbean.ixs",
		"songs/cave.ixs",
		"songs/christmasbells.ixs",
		"songs/city bells.ixs",
		"songs/coral reef.ixs",
		"songs/fly my love.. fly away!.ixs",
		"songs/hexagon 0.ixs",
		"songs/hexagon 2.ixs",
		"songs/inverse cinematics.ixs",
		"songs/iron dimension.ixs",
		"songs/ixalance theme.ixs",
		"songs/join the network!.ixs",
		"songs/movement of the gods.ixs",
		"songs/shortcut goes aruba.ixs",
		"songs/shortrance.ixs",
		"songs/the next e.ixs",
		"songs/the second message.ixs",
		"songs/the x-whales.ixs",
		"songs/vectorworld.ixs",
		"songs/vixen - heineken.ixs",
		"songs/world of noise.ixs"
	];


class IxsPlaylistWidget extends PlaylistPlayerWidget {
	constructor(containerId, songs, onNewTrackCallback, enableSeek, enableSpeedTweak, doParseUrl, doOnDropFile, currentTrack, defaultOptions)
	{
		super(containerId, songs, onNewTrackCallback, enableSeek, enableSpeedTweak, doParseUrl, doOnDropFile, currentTrack, defaultOptions, 500);
	}

	_getInfoLine(info)
	{
		// song has successfully been loaded and meta data can be accessed
		// unfortunately there is not much meta available within the songs

		let p = document.getElementById("songInfo");
		let s = info.songSize;
		let st = "";
		if (s >= 1000)
		{
			st += ( s / 1000 | 0) + "'" + String(s % 1000).padStart(3, '0');
		}
		else
		{
			st += s;
		}

		return "'" + info.title + "' by Crystal Score (" + st + " bytes)";
	}
};


class IxsOscilloscopesWidget extends OscilloscopesWidget {
	constructor(divId, tracer, backend)
	{
		super(divId, tracer, backend, 512, 80);

		this._qualityMode = true;
	}

	genToggle(label, labelClass, id, checked)
	{
		return "<label class=\"" + labelClass + "\"><label class=\"checkbox bounce\">" +
				"	<input type=\"checkbox\" id=\""+id+"\"" + (checked ? " checked" : "") + ">" +
				"	<svg viewBox=\"0 0 21 21\"><polyline points=\"5 10.75 8.5 14.25 16 6\"></polyline></svg>" +
				"</label><text>" + label + "</text></label> ";
	}

	genLabel(label, labelClass)
	{
		return "<label class=\"" + labelClass + "\"><label class=\"checkbox bounce\"></label><text>" + label + "</text></label> ";
	}

	_generateHTML(display, n)
	{
		let div = document.getElementById(this._divId);
		div.innerHTML =
			"<div class=\"voiceContainer\"><canvas id=\"" + this._genCanvId(0) + "\" ></canvas>" + this.genLabel("L", "voiceToggle") + "</div>" +
			"<div class=\"voiceContainer\"><canvas id=\"" + this._genCanvId(1) + "\" ></canvas>" + this.genLabel("R", "voiceToggle") + "</div>" +
			"<span id=\"time\">00:00:000</span><div class=\"zoomContainer\">" + this.genToggle("HQ", "syncToggle", "quality", true) +
			this.genToggle("sync", "syncToggle", "oscope", true) +
			"<label><span class=\"material-icons\">&#59648;</span> <div id=\"zoom\" class=\"slider zoom\"></label></div>";

		$("#zoom").slider({
				orientation: "horizontal",
				range: "min",
				min: 1,
				max: 5,
				value: 5,
				animate: 200,
				slide: function( event, ui ) {
							display.setZoom(parseInt(ui.value));
						}.bind(this)
			});
		$( "#zoom" ).on( "slidestop", function( event, ui ) {
											display.setZoom(parseInt(ui.value));
										}.bind(this) );

		let oscope = document.getElementById("oscope");
		oscope.onchange = function(e) { display.toggleMode(); };

		let quality = document.getElementById("quality");
		quality.onchange = function(e) { display.toggleQuality();  };
	}

	_getTime()
	{
		let millis = (this._backend.getCurrentPlaytime() * 1000) | 0;
		let secs = (millis / 1000) | 0;
		millis = millis - secs * 1000;
		let min = secs/60 | 0 ;
		secs = (secs - min * 60) | 0;

		return String(min).padStart(2, '0')+":"+String(secs).padStart(2, '0')+":"+String(millis).padStart(3, '0');
	}

	_redraw()
	{
		$('#time').text('' + this._getTime());	// hack

		super._redraw();
	}

	toggleQuality()
	{
		this._qualityMode = this._qualityMode ? 0 : 1;
		this._backend.setQuality(this._qualityMode);
	}
};


class StatusWidget {
	constructor(divId)
	{
		this.divId = divId;
	}

	clear()
	{
		let div = document.getElementById(this.divId);
		div.innerHTML = '';
	}

	append(msg)
	{
		let div = document.getElementById(this.divId);
		div.innerHTML += msg.replace(/ /g, "&nbsp;") + "<br>";
	}
};


class Main {
	constructor()
	{
		this._backend;
		this._playerWidget;
		this._scopesWidget;
	}

	_setupSliderHoverState()
	{
		// hack: add "highlight while dragging" feature for all sliders on the page
		// (this should rather be setup locally upon creation of the sliders..)

		let slider= $(".slider a.ui-slider-handle");
		slider.hover(function() {
				$(this).prev().toggleClass('hilite');
			});
		slider.mousedown(function() {
				$(this).prev().addClass('dragging');
				$("*").mouseup(function() {
					$(slider).prev().removeClass('dragging');
				});
			});
	}

	_doOnTrackEnd()
	{
		this._playerWidget.playNextSong();
	}

	doOnTrackReadyToPlay(){
		this._scopesWidget.onSongChanged();
	}

	run()
	{
		this._tracer = new ChannelStreamer();
		this._tracer.setZoom(5);

		let statusWidget = new StatusWidget("logContainer");
		// note: with WASM this may not be immediately ready
		this._backend = new IXSBackendAdapter(statusWidget.append.bind(statusWidget));


		ScriptNodePlayer.initialize(this._backend, this._doOnTrackEnd.bind(this), [], false, this._tracer)
		.then((msg) => {

			// constructor requires funtional backend
			this._scopesWidget = new IxsOscilloscopesWidget("scopesContainer", this._tracer, this._backend);


			let optionsParser = function(someSong) {
									statusWidget.clear();

									let isLocal = someSong.startsWith("/tmp/") || someSong.startsWith("songs/");
									someSong = isLocal ? someSong : window.location.protocol + "//ftp.modland.com/pub/modules/" + someSong;

									return [someSong, {}];
								};

			this._playerWidget = new IxsPlaylistWidget("playerContainer", songs, this.doOnTrackReadyToPlay.bind(this),
															false, true, optionsParser, 0, -1, {});

			this._setupSliderHoverState();

			this._playerWidget.playNextSong();
		});
	}
}
