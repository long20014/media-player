var PLAYER_FOOTER_HEIGHT = 125;
var PLAYER_HEADER_HEIGHT = 62.5;
var CANVAS_WIDTH = window.innerWidth * 0.85;
var CANVAS_HEIGHT = window.innerHeight - PLAYER_HEADER_HEIGHT - PLAYER_FOOTER_HEIGHT;
var FULL_SCREEN_WIDTH = screen.width;
var FULL_SCREEN_HEIGHT = screen.height;
var KEYCODE_ENTER = 13;
var KEYCODE_ESC = 27;
var FILTER_GAIN_MULTIPLIER = 10 * 2;
var DEFAULT_DB = "MyMediaDB";
var DEFAULT_PLAYLIST = "default play list";
var VOLUME_STEP_COUNT = 100.0;
var PLAYRATE_STEP_COUNT = 40.0;

var screenWidth = CANVAS_WIDTH;
var screenHeight = CANVAS_HEIGHT;
var ctx,
sourceNode,
videoSourceNode,
audioSourceNode,   
audioContext,
analyser;

var indexedDB;
var IDBTransaction;
var dbVersion;
var db;
var playLists = [];
var audio = new Audio();
var video;
var media = audio;
var _processor;
var _equalizer;
var delay;
var bufferSource;
var currentArrayBuffer;
var currentTime;
var currentDelay;
var currentVolume;
var currentPlaybackRate = 1;
var currentPlayList = DEFAULT_PLAYLIST;
var appSongs; 
var currentSong;
var draggedItem;
var isInited = false;
var isLoopAll = false;
var isMute = false;
var isListShow = false;
var isAddNewPlaylistPanelShow = false;
var isOnSelectingPlaylist = false;
var isFullscreen = false;
var isSettingShow = false;
var isSongSettingUsed = true;
var needFilterApply = false;
var canvasRenderLoopTimeout;
var domElement = {};
var appSetting = {
  songListAutoCloseTime: 4000
}
var videoSetting = {
  brightness: 100, //percent
  contrast: 100, // percent
  invert: 0, // percent
  grayscale: 0, // percent
  saturate: 100, // percent
  sepia: 0, // percent
  blur: 0, // px   
  hueRotation: 0, // deg
};
var debounceHideMediaList;

media.controls = false;
media.loop = false;
media.isPlay = false;
media.autoplay = false;
media.preservesPitch = true;

var MyCustomNode = function(){
  this.input = audioContext.createGain();
  var output = audioContext.createGain();

  this.connect = function(target){
   output.connect(target);
 };
};

/*----- -Window Function- -----*/
window.addEventListener("keydown", (e) => {
  if (document.activeElement.type !== "text") {
    if (e.key == "p" || e.key == "P") {
      playToggle();
    } else if (e.key === "k" || e.key === "K") {
      loopAllToggle();
    } else if (e.key === "l" || e.key === "L") {
      loopToggle();
    } else if (e.key === "o" || e.key === "O") {
      stopMedia();
    } else if (e.key === "m" || e.key === "M") {
      muteToggle();
    } else if (e.key === "f" || e.key === "F" ) {
      canvasFullscreenToggle();
    } else if (e.key === "q" || e.key === "Q" ) {
      showListToggle();
    } else if (e.key === "w" || e.key === "W" ) {
      showSettingsToggle();
    } else if (e.keyCode === KEYCODE_ESC) {
      exitFullscreen();
    } else if (e.key === "[") {
      decreaseVolumeOnKeyPress();          
    } else if (e.key === "]" ) {
      increaseVolumeOnKeyPress();            
    } else if (e.key === ";") {
      decreasePlayrateOnKeyPress();
    } else if (e.key === "'" ) {
      increasePlayrateOnKeyPress();            
    }
  }    
});

window.addEventListener(
  "load",
  async function() {    
    await initIndexDB(DEFAULT_DB);
    await addPlayListToDB(DEFAULT_PLAYLIST);
    audioContext = new AudioContext();
    _equalizer = new Equalizer();      
    bufferSource = audioContext.createBufferSource();           
    console.log(audio);
    
    analyser = audioContext.createAnalyser();
    initDOMVars();            
    initPlayListsToSelection();
    enableSettingPanelMove();
    registerAutoHideMediaList();

    document.onwebkitfullscreenchange = function(event) {
      if (document.fullscreenElement === null) {
        exitFullscreen();
      }               
    }

    ctx = domElement.canvas.getContext("2d", { alpha: false });
    initVideo(); 
    initCanvasSize(); 
    audioSourceNode = audioContext.createMediaElementSource(audio);       
    videoSourceNode = audioContext.createMediaElementSource(video);
    sourceNode = audioSourceNode;
    // sourceNode =audioContext.createMediaElementSource(audio);
    _equalizer.setupEqualizer(audioContext)    
    sourceNode.connect(analyser);    
    analyser.connect(audioContext.destination);
    await getSongList();     
    currentVolume = parseFloat(domElement.volumeControl.value) / VOLUME_STEP_COUNT;
    initUploadFileFunction();
    initTooltips();  
    _processor = new Processor();   
          
  },
  false
);

window.addEventListener("click", function() {
  audioContext.resume();     
})

window.addEventListener('resize', function() {
  calculateWindowSizeAfterwindowResize();
  if (document.fullscreenElement === null) {
    canvasEscapeFullScreen();
  }    
})

/*----- -Controller Function- -----*/
function Equalizer() {
  this.switchXFadeGainValue = function() {
    if (currentSong && currentSong.type === "video")
      this.xfadeGain.gain.value = 1;
    else {
      this.xfadeGain.gain.value = 0.25;
    } 
  }
  this.connectFilters = function(audioContext) {
    sourceNode.connect(this._31Hz);
    this._31Hz.connect(this._62Hz); 
    this._62Hz.connect(this._125Hz);        
    this._125Hz.connect(this._250Hz);       
    this._250Hz.connect(this._500Hz);
    this._500Hz.connect(this._1kHz);
    this._1kHz.connect(this._2kHz);
    this._2kHz.connect(this._4kHz);
    this._4kHz.connect(this._8kHz);        
    this._8kHz.connect(this._16kHz);
    this._16kHz.connect(this.xfadeGain);        
    this.xfadeGain.connect(audioContext.destination)
  }
  this.switchMediaSrcNode = function(audioContext) {
    this.switchXFadeGainValue();
    this.connectFilters(audioContext);
  }
  this.setupEqualizer = function(audioContext) {
    this.bandSplit = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]; 
    this.xfadeGain = audioContext.createGain();
    this.switchXFadeGainValue()        

    this._31Hz = audioContext.createBiquadFilter();
    this._31Hz.type = "lowshelf";
    this._31Hz.frequency.value = this.bandSplit[0];
    this._31Hz.Q.value = 0.1;
    this._31Hz.gain.value = 0; 

    this._62Hz = audioContext.createBiquadFilter();
    this._62Hz.type = "peaking";
    this._62Hz.frequency.value = this.bandSplit[1];
    this._62Hz.Q.value = 0.2;
    this._62Hz.gain.value = 0;

    this._125Hz = audioContext.createBiquadFilter();
    this._125Hz.type = "peaking";
    this._125Hz.frequency.value = this.bandSplit[2];
    this._125Hz.Q.value = 0.3;
    this._125Hz.gain.value = 0;

    this._250Hz = audioContext.createBiquadFilter();
    this._250Hz.type = "peaking";
    this._250Hz.frequency.value = this.bandSplit[3];
    this._250Hz.Q.value = 0.4;
    this._250Hz.gain.value = 0;

    this._500Hz = audioContext.createBiquadFilter();
    this._500Hz.type = "peaking";
    this._500Hz.frequency.value = this.bandSplit[4];
    this._500Hz.Q.value = 0.5;
    this._500Hz.gain.value = 0;

    this._1kHz = audioContext.createBiquadFilter();
    this._1kHz.type = "peaking";
    this._1kHz.frequency.value = this.bandSplit[5];
    this._1kHz.Q.value = 0.6;
    this._1kHz.gain.value = 0;

    this._2kHz = audioContext.createBiquadFilter();
    this._2kHz.type = "peaking";
    this._2kHz.frequency.value = this.bandSplit[6];
    this._2kHz.Q.value = 0.6;
    this._2kHz.gain.value = 0;  

    this._4kHz = audioContext.createBiquadFilter();
    this._4kHz.type = "peaking";
    this._4kHz.frequency.value = this.bandSplit[7];
    this._4kHz.Q.value = 0.7;
    this._4kHz.gain.value = 0;  

    this._8kHz = audioContext.createBiquadFilter();
    this._8kHz.type = "peaking";
    this._8kHz.frequency.value = this.bandSplit[8];
    this._8kHz.Q.value = 0.8;
    this._8kHz.gain.value = 0;       

    this._16kHz = audioContext.createBiquadFilter();
    this._16kHz.type = "highshelf";
    this._16kHz.frequency.value = this.bandSplit[9];
    this._16kHz.Q.value = 1;
    this._16kHz.gain.value = 0;        

    this.connectFilters(audioContext)
  }    

  this.set_31HzGain = function (gainValue) {
    this._31Hz.gain.value = gainValue * FILTER_GAIN_MULTIPLIER;
  }

  this.set_62HzGain = function (gainValue) {
    this._62Hz.gain.value = gainValue * FILTER_GAIN_MULTIPLIER;
  }

  this.set_125HzGain = function (gainValue) {
    this._125Hz.gain.value = gainValue * FILTER_GAIN_MULTIPLIER;
  }

  this.set_250HzGain = function (gainValue) {
    this._250Hz.gain.value = gainValue * FILTER_GAIN_MULTIPLIER;
  }

  this.set_500HzGain = function (gainValue) {
    this._500Hz.gain.value = gainValue * FILTER_GAIN_MULTIPLIER;
  }

  this.set_1kHzGain = function (gainValue) {
    this._1kHz.gain.value = gainValue * FILTER_GAIN_MULTIPLIER;
  }

  this.set_2kHzGain = function (gainValue) {
    this._2kHz.gain.value = gainValue * FILTER_GAIN_MULTIPLIER;
  }

  this.set_4kHzGain = function (gainValue) {
    this._4kHz.gain.value = gainValue * FILTER_GAIN_MULTIPLIER;
  }

  this.set_8kHzGain = function (gainValue) {
    this._8kHz.gain.value = gainValue * FILTER_GAIN_MULTIPLIER;
  }

  this.set_16kHzGain = function (gainValue) {
    this._16kHz.gain.value = gainValue * FILTER_GAIN_MULTIPLIER;
  }
}

function changePitch() {
  // var oscillator = audioContext.createOscillator()
  // oscillator.type = 'square';
  // oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // value in hertz
  // oscillator.connect(audioContext.destination);
  // oscillator.start();
}

function changeGain(gainValue, type) {
  var value = parseFloat(gainValue) / 100.0;
  switch(type)
  {
    case '31Hz': _equalizer.set_31HzGain(value); break;
    case '62Hz': _equalizer.set_62HzGain(value); break;
    case '125Hz': _equalizer.set_125HzGain(value); break;
    case '250Hz': _equalizer.set_250HzGain(value); break;
    case '500Hz': _equalizer.set_500HzGain(value); break;
    case '1kHz': _equalizer.set_1kHzGain(value); break;
    case '2kHz': _equalizer.set_2kHzGain(value); break;
    case '4kHz': _equalizer.set_4kHzGain(value); break;
    case '8kHz': _equalizer.set_8kHzGain(value); break;
    case '16kHz': _equalizer.set_16kHzGain(value); break;
  }
}

function resetEqualizer() {
  var value = 0;
  _equalizer.set_31HzGain(value);
  _equalizer.set_62HzGain(value);
  _equalizer.set_125HzGain(value);
  _equalizer.set_250HzGain(value);
  _equalizer.set_500HzGain(value);
  _equalizer.set_1kHzGain(value); 
  _equalizer.set_2kHzGain(value);
  _equalizer.set_4kHzGain(value);
  _equalizer.set_8kHzGain(value);
  _equalizer.set_16kHzGain(value);
  domElement.equalizerControls._31HzControl.value = value;
  domElement.equalizerControls._62HzControl.value = value;
  domElement.equalizerControls._125HzControl.value = value;
  domElement.equalizerControls._250HzControl.value = value;
  domElement.equalizerControls._500HzControl.value = value;
  domElement.equalizerControls._1kHzControl.value = value;
  domElement.equalizerControls._2kHzControl.value = value;
  domElement.equalizerControls._4kHzControl.value = value;
  domElement.equalizerControls._8kHzControl.value = value;
  domElement.equalizerControls._16kHzControl.value = value;
}

function muteToggle() {
  if (!isMute) {
    media.volume = 0.0;
    isMute = true; 
  } else {
    console.log(currentVolume);
    media.volume = currentVolume;
    isMute = false;
  }    
}

function changeDelay(delayValue) {  
  currentDelay = delayValue;
}

function changeVolume(volumeValue) {
  media.volume = parseFloat(volumeValue) / VOLUME_STEP_COUNT;
  currentVolume = media.volume; 
  getElement("volume-tooltip").textContent = "volume: " + volumeValue;
  getElement("volume-tooltip-mobile").textContent = "volume: " + volumeValue;
  if (isMute) {
    isMute = false;
  }
}

function changePlaybackRate(playbackRateValue) {
  media.playbackRate = parseFloat(playbackRateValue) / (PLAYRATE_STEP_COUNT / 2);
  currentPlaybackRate = media.playbackRate;
  getElement("speed-tooltip").textContent = "Speed: " + media.playbackRate;
  getElement("speed-tooltip-mobile").textContent = "Speed: " + media.playbackRate;
}

function changeElapsedTime(timeValue) {
  needFilterApply = true;         
  media.currentTime = timeValue;
}

function startElapsedTimeChange() {
  var isPlaying = media.isPlay;
  media.pause();
  if (isPlaying) {
    // need setTimeout to call this after pause
    // event listener take effect.
    setTimeout(() => {      
      setPlayToTrue();      
    }, 0);
  }
}

function endElapsedTimeChange() {
  if (media.isPlay) {
    media.play();
  }
}

function useMediaSettingToggle() {
  if (isSongSettingUsed) {
    isSongSettingUsed = false;
    getElement("use-media-setting-button-tooltip").textContent = "Turn on setting";
    domElement.useMediaSettingToggleButton.classList.add("text--gray");
  } else {
    isSongSettingUsed = true;
    getElement("use-media-setting-button-tooltip").textContent = "Turn off media setting";
    domElement.useMediaSettingToggleButton.classList.remove("text--gray");
  }
}

function loopAllToggle() {    
  if (isLoopAll) {
    stopLoopAll();
  } else { 
    startLoopAll();
    stopLoop();
  }
}

function loopToggle() {    
  if (media.loop) {
    stopLoop();        
  } else {    
    startLoop();
    stopLoopAll();
  }
}

function startLoopAll() {    
  isLoopAll = true;
  getElement("loop-all-button-tooltip").textContent = "Stop loop all";               
  domElement.loopAllToggleButton.classList.remove("text--gray");
}

function stopLoopAll() {    
  isLoopAll = false; 
  getElement("loop-all-button-tooltip").textContent = "Loop all";     
  domElement.loopAllToggleButton.classList.add("text--gray");
}

function startLoop() {    
  media.loop = true;    
  getElement("loop-button-tooltip").textContent = "Stop Loop"; 
  domElement.loopToggleButton.classList.remove("text--gray");   
}

function stopLoop() {   
  media.loop = false;
  getElement("loop-button-tooltip").textContent = "Loop";   
  domElement.loopToggleButton.classList.add("text--gray");
}

function playToggle(event) {   
  if (!media.isPlay) {
    playMedia();  
  } else {
    pauseMedia();
  }
}

function increaseVolumeOnKeyPress() {
  var newValue = parseInt(currentVolume * VOLUME_STEP_COUNT + 1)
  if (newValue <= VOLUME_STEP_COUNT) {
    domElement.volumeControl.value = newValue;
    changeVolume(newValue);
  } 
}

function decreaseVolumeOnKeyPress() {
  var newValue = parseInt(currentVolume * VOLUME_STEP_COUNT - 1)
  if (newValue >= 0) {
    domElement.volumeControl.value = newValue;
    changeVolume(newValue);
  } 
}

function increasePlayrateOnKeyPress() {
  var newValue = parseInt(currentPlaybackRate * PLAYRATE_STEP_COUNT / 2 + 1);
  if (newValue <= PLAYRATE_STEP_COUNT) {
    domElement.playbackRateControl.value = newValue;
    changePlaybackRate(newValue);
  }
}

function decreasePlayrateOnKeyPress() {
  var newValue = parseInt(currentPlaybackRate * PLAYRATE_STEP_COUNT / 2 - 1);
  if (newValue >= 0) {
    domElement.playbackRateControl.value = newValue;
    changePlaybackRate(newValue);
  }  
}

/*----- -App Function- -----*/
function clearAllSongs() {
  if (appSongs && appSongs.length > 0) {
    for (song of appSongs) {            
      deleteSongFromDisplayList(song.songName);       
    }
    appSongs = [];
    stopMedia();
    unsetMedia();
  }
}

function deleteMedia(song) {
  if (currentSong && currentSong.songName === song.songName) {
    stopMedia();
    unsetMedia();
  }    
  removeSongFromList(song);
  deleteSongFromDisplayList(song.songName);
  deleteSongFromPlayList(currentPlayList, song);
  saveSongsPos();      
}

function deleteAllMedia() {
  var deleteConfirm = confirm("Are you sure to delete all media?");
  if (deleteConfirm) {
    var tempSongsList = [...appSongs]
    for (song of tempSongsList) {
      deleteMedia(song);
    }
  }
}

function unsetMedia() {  
  currentSong = null;
  media.src = "";     
  domElement.duration.innerHTML = "0:00";
  clearCanvas();
  stopFrameLooper();
}

function removeSongFromList(song) {
  appSongs.splice(appSongs.indexOf(song), 1); 
}

function addSongToSongList(song) {
  appSongs.push(song);
}

async function getSongList() {   
  appSongs = await getAllSongFromPlayList(currentPlayList);
  if (appSongs && appSongs.length > 0) {
    loadSongsPos(); 
    for (song of appSongs) {
      addSongToDisplayList(song);
    }
  }  
}

function sortSongsByCreatedDate(songs, order) {
  if (order === "asc") {        
    return songs.sort((song1, song2) => {
      return (new Date(song1.createdDate).getTime() - new Date(song2.createdDate).getTime());
    })
  }
  return songs.sort((song1, song2) => {
    return (new Date(song2.createdDate).getTime() - new Date(song1.createdDate).getTime());
  })
}

function addSongToDisplayList(song) {        
  var data = song.src;               
  var blobUrl = URL.createObjectURL(data);
  var songRow = document.createElement("TR");
  var deleteBtn = document.createElement("BUTTON");    
  var songItem = document.createElement("TD");
  var btnCell = document.createElement("TD");

  songRow.draggable = true; 

  songRow.addEventListener("dragstart", (ev) => {
    draggedItem = songRow;
  })  
  songRow.addEventListener("dragover", (ev) => {
    ev.preventDefault();
  })    
  songRow.addEventListener("drop", (ev) => {             
    songPosSwap(domElement.songTable, draggedItem, songRow);
  })
  songRow.addEventListener("dragend", (ev) => {
    draggedItem = null;
  })

  songItem.width = "100%";
  songItem.classList.add("song-item");   
  songItem.textContent = song.songName;
  songItem.id = song.songName;
  songItem.dataset.src = blobUrl;  
  songItem.addEventListener("click", (event) => {   
    chooseSong(event, song);
    console.log(song);
  })    
  deleteBtn.width = "10%";
  deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';    
  deleteBtn.addEventListener("click", (event) => {
    deleteMedia(song);
  })
  btnCell.appendChild(deleteBtn);
  songRow.appendChild(songItem);
  songRow.appendChild(btnCell);
  domElement.songTable.appendChild(songRow);
}

function switchMediaType() {
  if (media.isPlay) {
    stopMedia();
  }
  stopFrameLooper();
  clearCanvas();
  var isLoop = media.loop;    
  if (currentSong.type === "audio") {
    sourceNode = audioSourceNode;
    _equalizer.switchMediaSrcNode(audioContext)
    media = audio;         
    startFrameLooper();
  } else if (currentSong.type === "video") {
    sourceNode = videoSourceNode;
    _equalizer.switchMediaSrcNode(audioContext)      
    media = video;              
  }
  media.loop = isLoop;
  media.volume = currentVolume;
}

function saveMediaSettings() {
  var saveConfirm = confirm("Are you sure to save media setting ?");
  if (currentSong && saveConfirm) {
    currentSong.settings = {
      volume: currentVolume,
      playbackRate: currentPlaybackRate,
      equalizer: {
        _31Hz: _equalizer._31Hz.gain.value / FILTER_GAIN_MULTIPLIER,
        _62Hz: _equalizer._62Hz.gain.value / FILTER_GAIN_MULTIPLIER,
        _125Hz: _equalizer._125Hz.gain.value / FILTER_GAIN_MULTIPLIER,    
        _250Hz: _equalizer._250Hz.gain.value / FILTER_GAIN_MULTIPLIER,
        _500Hz: _equalizer._500Hz.gain.value / FILTER_GAIN_MULTIPLIER,
        _1kHz: _equalizer._1kHz.gain.value / FILTER_GAIN_MULTIPLIER,
        _2kHz: _equalizer._2kHz.gain.value / FILTER_GAIN_MULTIPLIER,
        _4kHz: _equalizer._4kHz.gain.value / FILTER_GAIN_MULTIPLIER,    
        _8kHz: _equalizer._8kHz.gain.value / FILTER_GAIN_MULTIPLIER,
        _16kHz: _equalizer._16kHz.gain.value / FILTER_GAIN_MULTIPLIER,        
      }
    };
    updateMedia(currentPlayList, currentSong); 
    alert("Successfully save settings.")
  } else {
    alert("Failed to save settings.")
  }   
}

function loadMediaSettings() {
  changeVolume(currentSong.settings.volume * 100);    
  changePlaybackRate(currentSong.settings.playbackRate * 20);    
  _equalizer.set_31HzGain(currentSong.settings.equalizer._31Hz); 
  _equalizer.set_62HzGain(currentSong.settings.equalizer._62Hz); 
  _equalizer.set_125HzGain(currentSong.settings.equalizer._125Hz);
  _equalizer.set_250HzGain(currentSong.settings.equalizer._250Hz);
  _equalizer.set_500HzGain(currentSong.settings.equalizer._500Hz);
  _equalizer.set_1kHzGain(currentSong.settings.equalizer._1kHz);
  _equalizer.set_2kHzGain(currentSong.settings.equalizer._2kHz);
  _equalizer.set_4kHzGain(currentSong.settings.equalizer._4kHz);
  _equalizer.set_8kHzGain(currentSong.settings.equalizer._8kHz);
  _equalizer.set_16kHzGain(currentSong.settings.equalizer._16kHz);
  domElement.volumeControl.value = currentSong.settings.volume * 100;
  domElement.volumeControl.value = currentSong.settings.volume * 100;
  domElement.playbackRateControl.value = currentSong.settings.playbackRate * 20;
  domElement.playbackRateControlMobile.value = currentSong.settings.playbackRate * 20;
  domElement.equalizerControls._31HzControl.value = currentSong.settings.equalizer._31Hz * 100;
  domElement.equalizerControls._62HzControl.value = currentSong.settings.equalizer._62Hz * 100;
  domElement.equalizerControls._125HzControl.value = currentSong.settings.equalizer._125Hz * 100;
  domElement.equalizerControls._250HzControl.value = currentSong.settings.equalizer._250Hz * 100;
  domElement.equalizerControls._500HzControl.value = currentSong.settings.equalizer._500Hz * 100;
  domElement.equalizerControls._1kHzControl.value = currentSong.settings.equalizer._1kHz * 100;
  domElement.equalizerControls._2kHzControl.value = currentSong.settings.equalizer._2kHz * 100;
  domElement.equalizerControls._4kHzControl.value = currentSong.settings.equalizer._4kHz * 100;
  domElement.equalizerControls._8kHzControl.value = currentSong.settings.equalizer._8kHz * 100;
  domElement.equalizerControls._16kHzControl.value = currentSong.settings.equalizer._16kHz * 100;
}    

function chooseSong(event, song) { 
  currentSong = song;     
  document.querySelectorAll(".song-highlight").forEach((elem) => {
    if (elem.classList.contains("song-highlight")) {
      elem.classList.remove("song-highlight");
    }        
  });
  event.target.classList.add("song-highlight"); 
  switchMediaType();     
  loadMediaElapsedTime();                   
  console.log(event)
  currentSong = appSongs.find((target) => target.songName == event.target.textContent);
  if (isSongSettingUsed) {
    loadMediaSettings();
  }    
  media.src = event.target.dataset.src;  
  media.playbackRate = currentPlaybackRate;  
  setDownloadLink(event.target.dataset.src, event.target.textContent); 
}

function deleteSongFromDisplayList(songName) {
  var songItem = getElement(songName)
  var songRow = songItem.parentElement;    
  if (songItem && songRow.parentElement === domElement.songTable) {
    domElement.songTable.removeChild(songRow);
  }
}

function loadMediaElapsedTime() {
  media.onloadedmetadata = function() {                        
    var getDuration = function() {
      return parseInt(media.duration / 60) + ":" + 
      (parseInt(media.duration % 60) > 9 ? parseInt(media.duration % 60) : "0" + parseInt(media.duration % 60))
    }
    var getElapsedTime = function() {
      return parseInt(media.currentTime / 60) + ":" + 
      (parseInt(media.currentTime % 60) > 9 ? parseInt(media.currentTime % 60) : "0" + parseInt(media.currentTime % 60))
    }
    media.ontimeupdate = (() => {                                                 
      domElement.elapsedTime.textContent = getElapsedTime();
      domElement.elapsedTimeBar.value = parseInt(media.currentTime);  
    });
    media.onended = (() => {
      console.log("end");
      clearCanvas();                                
      playNextSong();             
    })
    setElapsedTimeBar(domElement.elapsedTimeBar);
    domElement.duration.innerHTML = getDuration();
  }; 
}

function addPlayListToSelection(playListName) {
  var option = document.createElement("option")
  option.value = playListName;
  option.textContent = playListName;
  domElement.playListSelect.appendChild(option)
}

function initPlayListsToSelection() {
  if (playLists.length > 0) {
    playLists.forEach(playList => addPlayListToSelection(playList));
  }
  else {
    addPlayListToSelection(DEFAULT_PLAYLIST);
  }
  var defaultOption = Array.from(domElement.playListSelect.children).find((child) => child.value === currentPlayList);
  defaultOption.setAttribute("selected", "selected");
}

function openAddPlayListPanel() {    
  domElement.newPlayListPanel.style.opacity = "1";
  domElement.newPlayListPanel.style.visibility = "visible";  
  isAddNewPlaylistPanelShow = true; 
}

function closeAddPlayListPanel() {
  domElement.newPlayListPanel.style.opacity = "0";
  domElement.newPlayListPanel.style.visibility = "hidden";
  domElement.playListInput.value = "";  
  isAddNewPlaylistPanelShow = false;
}

async function addNewPlayList() {  
  var playListName = domElement.playListInput.value;
  if (playListName.length > 3) {
    await addPlayListToDB(playListName);
    playLists.push(playListName);    
    addPlayListToSelection(playListName);    
    closeAddPlayListPanel(); 
  } else {
    alert("Play list name must longer than 3 characters!")
  }     
}

async function removePlayList() {
  var deleteConfirm = confirm("Are you sure to remove playlist: " + currentPlayList + "?");
  if (deleteConfirm) {
    var playListName = currentPlayList;
    if (playListName !== DEFAULT_DB) {
      if (media.isPlay) {
        alert("Please stop or pause media before remove play list!")
      } else {
        var target = Array.from(domElement.playListSelect.children).find((child) => child.value === playListName);
        if (target) {
          var targetIndex = Array.from(domElement.playListSelect.children).indexOf(target);
          domElement.playListSelect.removeChild(domElement.playListSelect.childNodes[targetIndex]); 
          playLists.splice(targetIndex, 1);
          removePlayListFromPosList(playListName);          
          await deletePlayListFromDB(playListName);
          await changePlayList(DEFAULT_PLAYLIST);
          domElement.playListSelect.value = DEFAULT_PLAYLIST;
          closeAddPlayListPanel(); 
        } else {
          alert("Play list does not exists.")
        }  
      }        
    } else {
      alert("Cannot delete default playlist!")
    }
  }    
}

function openTab(evt, tabName) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  getElement(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

/*----- -video settings function-----*/
function changeVideoSetting(value, type) {
  value = +value;
  switch (type) {
    case "brightness":
      videoSetting.brightness = value;
      getElement("brightness-tooltip").textContent = "Brightness: " + videoSetting.brightness + "%";
      break;
    case "contrast":
      videoSetting.contrast = value;
      getElement("contrast-tooltip").textContent = "Contrast: " + videoSetting.contrast + "%";
      break;
    case "invert":
      videoSetting.invert = value;
      getElement("invert-tooltip").textContent = "Invert: " + videoSetting.invert + "%";
      break;
    case "grayscale":
      videoSetting.grayscale = value;
      getElement("grayscale-tooltip").textContent = "Grayscale: " + videoSetting.grayscale + "%";
      break; 
    case "saturate":
      videoSetting.saturate = value;
      getElement("saturate-tooltip").textContent = "Saturate: " + videoSetting.saturate + "%";
      break;
    case "sepia":
      videoSetting.sepia = value;
      getElement("sepia-tooltip").textContent = "Sepia: " + videoSetting.sepia + "%";
      break;
    case "blur":
      videoSetting.blur = value;
      getElement("blur-tooltip").textContent = "Blur: " + videoSetting.blur + "px";
      break;
    case "hue-rotation":
      videoSetting.hueRotation = value;
      getElement("hue-rotation-tooltip").textContent = "Hue rotation: " + videoSetting.hueRotation + "deg";
      break;
    default:
  }
  needFilterApply = true;   
}

/*----- -Media Function- -----*/
function pauseMedia() {
  media.pause();
}

media.onpause = () => {
  setPlayToFalse();
}

media.onplay = () => {
  setPlayToTrue();
}

function playMedia() {
  // changePitch();
  if (media.src !== window.location.href && media.src) {
    media.play();    
    if (currentSong.type === "video") {   
      needFilterApply = true;        
      processVideo();
    }     
    // bufferSource.start(currentTime);   
  } else {
    alert("Please choose a song in song list to play! \nOr add a song to song list if there is no song!");
  }    
}

media.onpause = (() => {
  setPlayToFalse();
})

media.onplay = (() => {
  setPlayToTrue();
})

function stopMedia() {
  media.pause();
  setPlayToFalse();
  media.currentTime = 0;
}

function setPlayToFalse() {
  var playButton = getElement("play");
  playButton.innerHTML = '<i class="fas fa-play"></i>'
  getElement("play-button-tooltip").textContent = "Play";
  media.isPlay = false;    
}

function setPlayToTrue() {
  var playButton = getElement("play");
  playButton.innerHTML = '<i class="fas fa-pause"></i>'
  getElement("play-button-tooltip").textContent = "Pause";
  media.isPlay = true;   
}

function loadCurrentSong(song) {
  getElement(currentSong.src.name).classList.remove("song-highlight");
  currentSong = song;
  switchMediaType();
  media.isPlay = true;
  if (isSongSettingUsed) {
    loadMediaSettings();
  }
  var blobUrl = URL.createObjectURL(currentSong.src);
  setDownloadLink(blobUrl, currentSong.songName)
  getElement(currentSong.src.name).classList.add("song-highlight");
  media.src = blobUrl;
  media.playbackRate = currentPlaybackRate; 
}

function playNextSong() {           
  nextSong = appSongs[appSongs.indexOf(currentSong) + 1]
  if (!nextSong) {
    if (isLoopAll) {
      loadCurrentSong(appSongs[0]);      
    } else {            
      if (media.isPlay) {
        stopMedia();
      }           
    }        
  } else {
    loadCurrentSong(nextSong);
  }    
  if (media.isPlay) {
    _playCurrentSong();
  }    
}

function playPreviousSong() {             
  previousSong = appSongs[appSongs.indexOf(currentSong) - 1]    
  if (!previousSong) {  
    if (media.isPlay) {
      stopMedia();
    }          
  } else {    
    loadCurrentSong(previousSong);        
  }
  if (media.isPlay) {
    _playCurrentSong();
  }    
}

function _playCurrentSong() { 
  playMedia();
  loadMediaElapsedTime();
}

function setElapsedTimeBar(elapsedTimeBar) {    
  elapsedTimeBar.min = 0;
  elapsedTimeBar.max = parseInt(media.duration)
  elapsedTimeBar.value = 0;
}

function setDownloadLink(href, outputFileName) {
  var downloadLink = getElement("download-link");
  downloadLink.href = href;
  downloadLink.download = outputFileName;
}

function initUploadFileFunction() {    
  domElement.filesUpload.onchange = function(){
    function isVideo(file) {
      var fileNameSplitted = file.name.split('.');
      var fileExtension = fileNameSplitted[fileNameSplitted.length - 1];
      var videoExtension = ['mkv'];
      return file.type.includes("video") || videoExtension.includes(fileExtension.toLowerCase());
    }
    var files = this.files;            
    for (file of files) {            
      if (file.type.includes("audio")) {
        // setAudioFileAsArrayBuffer(files[0]);    
        uploadMediaFile(file, "audio");                
      } else if (isVideo(file)) {
        uploadMediaFile(file, "video");
      }                         
    }    
  };   
}

/*----- -Setup Function- -----*/
function uploadMediaFile(file, fileType) {
  var createdDate = new Date();
  var mediaFile = {
    id: file.name + " " + createdDate.getTime(), 
    songName: file.name, 
    src: file,
    createdDate: createdDate, 
    type: fileType,
    settings: {
      volume: 1,
      playbackRate: 1,
      equalizer: {
        _31Hz: 0,
        _62Hz: 0,
        _125Hz: 0,    
        _250Hz: 0,
        _500Hz: 0,
        _1kHz: 0,
        _2kHz: 0,
        _4kHz: 0,    
        _8kHz: 0,
        _16kHz: 0,        
      }
    }
  };            
  addSongToDisplayList(mediaFile);
  addSongToPlayList(currentPlayList, mediaFile);
  addSongToSongList(mediaFile);
  saveSongsPos();
}

function setAudioFileAsArrayBuffer(file) {
  if (file) {
    console.log(file) 
    var fileReader = new FileReader;
    var songUrl = URL.createObjectURL(file);
    fileReader.onload = function(evt){ 
      return new Promise((resolve, reject) => {
        var arrayBuffer = this.result;
        currentArrayBuffer = arrayBuffer;           
        resolve();          
      }).then(() => {
        // setupEcho();
        // setupChangePitch();
      });
    }
    fileReader.readAsArrayBuffer(file);
    console.log(file)            
    // audio.src = songUrl;          
  }       
}

function setupChangePitch() {
  audioContext.decodeAudioData(currentArrayBuffer, function(buffer) {
    var C3 = 130.81;
    var c3d150 = 150 / C3; // 1.1467013225;
    bufferSource.buffer = buffer;
    bufferSource.playbackRate.value = c3d150;
    bufferSource.connect(audioContext.destination);
    bufferSource.start(); 
    console.log(bufferSource.buffer);        
  }); 
}

function setupEcho() {   
  audioContext.decodeAudioData(currentArrayBuffer, function(b) {
    bufferSource.buffer = b;
    console.log(bufferSource.buffer);        
  });    
  var tuna = new Tuna(audioContext);
  //create a new Tuna delay instance
  delay = new tuna.Delay({
    delayTime: currentDelay, //a short delayTime to create a slap-back delay
    feedback: 0.45
  });
  console.log(currentDelay)
  //connect the source to the Tuna delay
  bufferSource.connect(delay);
  //connect delay as a standard web audio node to the audio context destination
  delay.connect(audioContext.destination);
  currentTime = audioContext.currentTime
  isInited = true;  
}

/*----- -DB- -----*/
async function initIndexDB(dbName) {
  var connection = await Dexie.exists(dbName).then(function (exists) {
    db = new Dexie(dbName);
    if (exists) { 
      return db.open();
    }  
  });
  return connection;   

}

function addSongToPlayList(playList, song) {
  if (song && playList) {
    var {id, songName, src, createdDate, type, settings} = song;
    return db.table(playList).put({id, songName, src, createdDate, type, settings});
  }  
}

function updateMedia(playList, song) {
if (song && playList) {
    var {id, settings} = song;
    return db.table(playList).update(id, {settings});
  }  
}

async function getAllSongFromPlayList(playList) {  
  if (playList) {
    var appSongs = await db.table(playList).toArray().then(songs => songs); 
    console.log(appSongs);
    return appSongs;    
  }  
  return [];
}
async function getSongFromDB(playList, songName) {
  if (playList && songName) {
    var song = await db.table(playList).get({songName}, song => song);
    if (song) {
      console.log(song);
      return song;
    }    
  }  
}

function deleteSongFromPlayList(playList, song) {
  if (playList && song) {
    db.table(playList).delete(song.id);  
  }  
}

function getAllPlayLists() {  
  return db._storeNames;
}

async function addPlayListToDB(playList) {
  playLists = getAllPlayLists();
  if (playLists) {    
    if (!playLists.includes(playList)) {
      await createNewSchema(playList, 'id, songName, src, createdDate, type, settings');      
      var initSong = {id: "initSong", songName: "initSong", src: null, createdDate: null, type: "audio", settings: null}
      addSongToPlayList(playList, initSong);
      deleteSongFromPlayList(playList, initSong)
    }  
  }  
}

async function deletePlayListFromDB(playList) {
  if (playList && playList !== DEFAULT_PLAYLIST) {
    await createNewSchema(playList, null);
  }  
}

async function createNewSchema(playList, newSchema) {
  var songs = {};
  playLists.forEach(storeName => {
    songs[storeName] = 'id, songName, src, createdDate, type, settings';
  })  
  songs[playList] = newSchema;
  await db.close();
  db.version(Math.round(db.verno + 1)).stores(songs);  
  await db.open();
}

async function renamePlayListFromDB(playList) {
  await db.close();
  await db.open();
}

async function changePlayList(playListName) {
  if (!media.isPlay) {
    currentPlayList = playListName;    
    clearAllSongs();    
    await getSongList();
  } else {
    domElement.playListSelect.value = currentPlayList;
    alert("Please stop or pause media to change play list!");
  }   
}

function getSongFromNhaccuatui(songUrl) {
  var songKey = "gv8GB8rRmZU6";
  NCTInfo = {ROOT_URL: "https://www.nhaccuatui.com/", mineKey: ""}    
  var data = {type: "playlist", key: songKey, v: new Date().getTime()}
  var xhr = new XMLHttpRequest();
  xhr.open('GET', "http://127.0.0.1:3000", true);    
  xhr.onload = function () {
    // do something to response
    console.log(JSON.parse(xhr.response));
  };
// xhr.send('type=playlist&key=gv8GB8rRmZU6&v=' + new Date().getTime());
  xhr.send();
}

// dry.addEventListener("click", function(e) {
//     if (!isInited) init();
//     if (delay) delay.bypass = true;
// });

// wet.addEventListener("click", function(e) {
//     if (!isInited) init();
//     if (delay) delay.bypass = false;
// });


function songPosSwap(songTable, draggedSongRow, targetSongRow) {
  var draggedSongRowIndex = Array.from(songTable.children).indexOf(draggedSongRow);
  var targetSongRowIndex = Array.from(songTable.children).indexOf(targetSongRow);
  if (draggedSongRowIndex !== targetSongRowIndex) {
    if (draggedSongRowIndex === targetSongRowIndex - 1) {
      songTable.insertBefore(songTable.children[targetSongRowIndex], songTable.children[draggedSongRowIndex]);
    } else {
      songTable.insertBefore(songTable.children[draggedSongRowIndex], songTable.children[targetSongRowIndex]);
    }

    var draggedSongItem = appSongs[draggedSongRowIndex]
    var targetSongItem = appSongs[targetSongRowIndex]

    if (draggedSongRowIndex === targetSongRowIndex - 1) {
      appSongs.splice(targetSongRowIndex, 1);
      appSongs.splice(draggedSongRowIndex, 0, targetSongItem);        
    } else if (draggedSongRowIndex > targetSongRowIndex) {
     appSongs.splice(draggedSongRowIndex, 1);
     appSongs.splice(targetSongRowIndex, 0, draggedSongItem);
    } else {
      appSongs.splice(targetSongRowIndex, 0, draggedSongItem);
      appSongs.splice(draggedSongRowIndex, 1);
    } 
    saveSongsPos();
  }    
} 

function saveSongsPos() {    
  var mediaPosList = localStorage.getItem("mediaPosList");
  var mediaPosObj;

  if (!mediaPosList) {
    mediaPosList = [];
  } else {
    mediaPosList = JSON.parse(mediaPosList);
    mediaPosObj = mediaPosList.find((item) => item.mediaList === currentPlayList)    
  }
  if (!mediaPosObj) {
    mediaPosObj  = {
      mediaList: currentPlayList,
      mediaPosArr: []
    }
    mediaPosList.push(mediaPosObj);
  } else {
    // clean old positions
    mediaPosObj.mediaPosArr = [];
  }
  appSongs.forEach((song) => { mediaPosObj.mediaPosArr.push(song.id)});  
  localStorage.setItem("mediaPosList", JSON.stringify(mediaPosList));
}

function loadSongsPos() {   
  var mediaPosList = localStorage.getItem("mediaPosList");
  if (mediaPosList && appSongs) {
    mediaPosList = JSON.parse(mediaPosList);
    var mediaPosObj = mediaPosList.find((item) => item.mediaList === currentPlayList)
    if (mediaPosObj) {
      var tempAppSongs = [];
      mediaPosObj.mediaPosArr.forEach((pos) => {
        for (var i = 0; i < appSongs.length; i++) {
          if (appSongs[i].id === pos) {
            tempAppSongs.push(appSongs[i])
            appSongs.splice(i, 1);
            break;
          }
        }
      });
      appSongs = tempAppSongs;    
    }        
  }
}

function removePlayListFromPosList(playListName) {
  var mediaPosList = JSON.parse(localStorage.getItem("mediaPosList"));
  var removedList = mediaPosList.find((list) => list.mediaList === playListName);
  mediaPosList.splice(mediaPosList.indexOf(removedList), 1)
  localStorage.setItem("mediaPosList", JSON.stringify(mediaPosList));
}

function exportDB(db) {
  debugger
  exportToJsonString(db, (error, jsonString) => {
    console.log(jsonString)
  })
}

/*----- -Canvas- -----*/
function initCanvasSize() {
  domElement.canvas.width = CANVAS_WIDTH;
  domElement.canvas.height = CANVAS_HEIGHT; 
}

function canvasFullscreenToggle() {    
  if (document.fullscreenElement === null) {
    domElement.player.webkitRequestFullScreen();
    domElement.playerFooter.classList.add("fullscreen");
    domElement.playerHeader.classList.add("fullscreen");
    domElement.playerBody.style.alignItems = "center";
    domElement.canvas.classList.add("canvas__fullscreen");
    isFullscreen = true;
    canvasEnterFullScreen();        
  } else {
    exitFullscreen();       
  }
}

function exitFullscreen() {
  if (isFullscreen) {
    document.exitFullscreen();
    domElement.playerFooter.classList.remove("fullscreen");
    domElement.playerHeader.classList.remove("fullscreen");
    domElement.playerBody.style.alignItems = null;
    domElement.canvas.classList.remove("canvas__fullscreen");
    isFullscreen = false; 
    canvasEscapeFullScreen();
  }    
}

function FrameLooper() {
  window.RequestAnimationFrame =
  window.requestAnimationFrame(FrameLooper) ||
  window.msRequestAnimationFrame(FrameLooper) ||
  window.mozRequestAnimationFrame(FrameLooper) ||
  window.webkitRequestAnimationFrame(FrameLooper);

  var fbc_array = new Uint8Array(analyser.frequencyBinCount);
  var bar_width = 2;
  var bar_count = domElement.canvas.width / bar_width;

  analyser.getByteFrequencyData(fbc_array);

  ctx.clearRect(0, 0, domElement.canvas.width, domElement.canvas.height);
  ctx.fillStyle = "#ffffff";

  for (var i = 0; i < bar_count; i++) {
    var bar_pos = i * bar_width * 2;    
    var bar_height = -(fbc_array[i] / 2) * 2;
    ctx.fillRect(bar_pos, domElement.canvas.height, bar_width, bar_height);
  }
}

function startFrameLooper() {    
  FrameLooper();
}

function stopFrameLooper() {    
  window.cancelAnimationFrame(window.RequestAnimationFrame);
}

function adjustCanvasAndVideoSize(processor) {
  var self = processor;       
  var widthRatio = self.video.videoWidth / screenWidth;
  var heightRatio = self.video.videoHeight / screenHeight;
  var sizeRatio = Math.max(widthRatio, heightRatio);    
  if (sizeRatio !== 0) {
    self.width = self.video.videoWidth / sizeRatio;
    self.height = self.video.videoHeight / sizeRatio;
    domElement.canvas.width = self.video.videoWidth / sizeRatio;
    domElement.canvas.height = self.video.videoHeight / sizeRatio; 
  } else {
    self.width = 0;
    self.height = 0;
    domElement.canvas.width = 0;
    domElement.canvas.height = 0; 
  }            
}

function adjustCanvasFrameLooperSize() {
  if (isFullscreen) {        
    domElement.canvas.height = FULL_SCREEN_HEIGHT - PLAYER_FOOTER_HEIGHT;
  } else {
    domElement.canvas.height = CANVAS_HEIGHT;
  }
}

function adjustCanvasSize() {
  if (currentSong.type === "video") {
    adjustCanvasAndVideoSize(_processor);
    if (!media.isPlay) {
      _processor.computeFrame();
    }
    
  } else {
    adjustCanvasFrameLooperSize();
  } 
}

function stopCanvasRendering() {
  clearTimeout(canvasRenderLoopTimeout);
  canvasRenderLoopTimeout = null;
}

function clearCanvas() {
  initCanvasSize();
  ctx.clearRect(0, 0, domElement.canvas.width, domElement.canvas.height);
}

function canvasEnterFullScreen() {
  screenWidth = FULL_SCREEN_WIDTH;
  screenHeight = FULL_SCREEN_HEIGHT;
  if (currentSong) {
    adjustCanvasSize();  
  }          
}

function canvasEscapeFullScreen() { 
  screenWidth = CANVAS_WIDTH;
  screenHeight = CANVAS_HEIGHT;   
  if (currentSong) {
    adjustCanvasSize();  
  }
}

function calculateWindowSizeAfterwindowResize() {
  CANVAS_WIDTH = window.innerWidth * 0.85;
  CANVAS_HEIGHT = window.innerHeight - PLAYER_HEADER_HEIGHT - PLAYER_FOOTER_HEIGHT;
  FULL_SCREEN_WIDTH = screen.width;
  FULL_SCREEN_HEIGHT = screen.height;
}

/*----- -Video- -----*/
function Processor() { 
  this.doLoad = function () {
    this.video = video;                    
    var self = this;
    this.video.addEventListener('play', function() {                
      adjustCanvasAndVideoSize(self)
      self.timerCallback();
    }, 0);                  
  }

  this.timerCallback = function () {
    if (this.width === 0 || this.height === 0) {
      adjustCanvasAndVideoSize(this);
    }
    if (this.video.paused || this.video.ended) {
      stopCanvasRendering();
      return;
    }
    this.computeFrame();
    var self = this;
    canvasRenderLoopTimeout = setTimeout(function() {
      self.timerCallback();
    }, 33);
  }

  this.computeFrame = function () {
    if (needFilterApply) {
      invokeCanvasBuilder();
      setTimeout(() => needFilterApply = false, 0)      
    }          
    ctx.drawImage(this.video, 0, 0, this.width, this.height);
    // let frame = this.ctx.getImageData(0, 0, this.width, this.height);
    // let l = frame.data.length / 4;

    // for (let i = 0; i < l; i++) {
    //   let r = frame.data[i * 4 + 0];
    //   let g = frame.data[i * 4 + 1];
    //   let b = frame.data[i * 4 + 2];
    //   if (g > 100 && r > 100 && b < 43)
    //     frame.data[i * 4 + 3] = 0;
    // }
    // this.ctx2.putImageData(frame, 0, 0);
    // this.changeVideoBrightness(1.3);
    return;
  }       
};

function CanvasFilterBuilder() {
  this.brightnessPercentValue = 100;
  this.contrastPercentValue = 100;
  this.invertPercentValue = 0;  
  this.grayscalePercentValue = 0;
  this.saturatePercentValue = 100;
  this.sepiaPercentValue = 0;
  this.blurValue = 0;
  this.hueRotateValue = 0;

  this.buildBrightness = function(brightness) {
    this.brightnessPercentValue = limitPercentValue(brightness, 0 , 200);
    return this;
  }

  this.buildContrast = function(contrast) {
    this.contrastPercentValue = limitPercentValue(contrast, 0 , 150);        
    return this;
  }

  this.buildInvert = function(invert) {
    this.invertPercentValue = limitPercentValue(invert, 0 , 100);        
    return this;
  }

  this.buildGrayscale = function(grayscale) {
    this.grayscalePercentValue = limitPercentValue(grayscale, 0 , 100);        
    return this;
  }

  this.buildSaturate = function(saturate) {
    this.saturatePercentValue = limitPercentValue(saturate, 0 , 100);       
    return this;
  }

  this.buildSepia = function(sepia) {
    this.sepiaPercentValue = limitPercentValue(sepia, 0 , 100);        
    return this;
  }

  this.buildBlur = function(value) {
    this.blurValue = value;
    return this;
  }

  this.buildhueRotation = function(deg) {
    this.hueRotateValue = deg;
    return this;
  }

  this.build = function() {
    ctx.filter = 
      "brightness(" + this.brightnessPercentValue + "%) " +
      "contrast(" + this.contrastPercentValue + "%)" +
      "invert(" + this.invertPercentValue + "%) " +        
      "grayscale(" + this.grayscalePercentValue + "%)" + 
      "saturate(" + this.saturatePercentValue + "%)" +
      "sepia(" + this.sepiaPercentValue + "%)" +
      "blur(" + this.blurValue + "px) " +
      "hue-rotate(" + this.hueRotateValue + "deg)";
    return this;
  }
}

function invokeCanvasBuilder() {
  new CanvasFilterBuilder()
      .buildBrightness(videoSetting.brightness)
      .buildContrast(videoSetting.contrast)    
      .buildInvert(videoSetting.invert)
      .buildGrayscale(videoSetting.grayscale)
      .buildBlur(videoSetting.blur)
      .buildhueRotation(videoSetting.hueRotation)
      .buildSaturate(videoSetting.saturate)
      .buildSepia(videoSetting.sepia)    
      .build(); 
}

function processVideo() { 
  _processor.doLoad();
}

function initVideo() {
  video = document.createElement("video");  
  video.addEventListener("play", (event) => {
    setPlayToTrue();
  })
  video.addEventListener("pause", (event) => {
    setPlayToFalse();
  })
  var tracks = video.audioTracks;       
}

/*----- -DOM interact- -----*/
function showSettingsToggle() {
  if (isSettingShow) {
    domElement.settingPanel.style.opacity = "0";
    setTimeout(() => domElement.settingPanel.style.visibility = "hidden", 300);        
    isSettingShow = false;
  } else {
    domElement.settingPanel.style.visibility = "visible";
    domElement.settingPanel.style.opacity = "1";
    isSettingShow = true;    
  }
}

function showListToggle() {  
  if (isListShow) {
    isListShow = false;
    domElement.songListPanel.style.right = "-40vw";
  } else {
    isListShow = true;
    domElement.songListPanel.style.right = "0";
  }
}

function enableSettingPanelMove() {
  var offset = [0, 0];
  var isMouseDown = false;
  var settingPanelHeader = getElement("setting-panel-header");
  settingPanelHeader.addEventListener('mouseup', function() {
    isMouseDown = false;    
  }, true);

  settingPanelHeader.addEventListener('mousemove', function(event) {
    event.preventDefault();
    if (isMouseDown) {
      mousePosition = {
        x: event.clientX,
        y: event.clientY
      };
      domElement.settingPanel.style.left = (mousePosition.x + offset[0]) + 'px';
      domElement.settingPanel.style.top  = (mousePosition.y + offset[1]) + 'px';          
    }
  }, true);
   
  settingPanelHeader.addEventListener('mousedown', function(e) {
    isMouseDown = true;
    offset = [
      domElement.settingPanel.offsetLeft - e.clientX,
      domElement.settingPanel.offsetTop - e.clientY
    ];    
  }, true);
}

/*----- -Utilities- -----*/
function changeSongListAutoCloseTime(value) {
  appSetting.songListAutoCloseTime = value * 1000;
  reregisterAutoHideMediaList();
}

function limitPercentValue(value, lowerLimit, upperLimit) {
  var limitedValue = value; 
  if (limitedValue > upperLimit) {
    limitedValue = upperLimit;
  } else if (limitedValue < lowerLimit) {
    limitedValue = lowerLimit;
  }
  return limitedValue;
}

function registerAutoHideMediaList() {
  if (domElement.songListPanel) {
    debounceHideMediaList = debounce(closeSongListPanel, appSetting.songListAutoCloseTime);
    domElement.songListPanel.addEventListener('mousemove', debounceHideMediaList);
    domElement.playListSelect.addEventListener('focus', () => isOnSelectingPlaylist = true); 
    domElement.playListSelect.addEventListener('focusout', () => isOnSelectingPlaylist = false); 
    domElement.playListSelect.addEventListener('change', () => isOnSelectingPlaylist = false);   
  }
}

function closeSongListPanel() {
  if (isListShow && !isAddNewPlaylistPanelShow && !isOnSelectingPlaylist && !draggedItem) {
    showListToggle();
  } 
}

function reregisterAutoHideMediaList() {
  domElement.songListPanel.removeEventListener('mousemove', debounceHideMediaList);
  debounceHideMediaList = debounce(closeSongListPanel, appSetting.songListAutoCloseTime);
  domElement.songListPanel.addEventListener('mousemove', debounceHideMediaList);
}

function debounce(func, wait, immediate) {
  // 'private' variable for instance
  // The returned function will be able to reference this due to closure.
  // Each call to the returned function will share this common timer.
  var timeout;

  // Calling debounce returns a new anonymous function
  return function() {
    // reference the context and args for the setTimeout function
    var context = this;
    var args = arguments;

    // Should the function be called now? If immediate is true
    //   and not already in a timeout then the answer is: Yes
    var callNow = immediate && !timeout;

    // This is the basic debounce behaviour where you can call this 
    //   function several times, but it will only execute once 
    //   [before or after imposing a delay]. 
    //   Each time the returned function is called, the timer starts over.
    clearTimeout(timeout);

    // Set the new timeout
    timeout = setTimeout(function() {

      // Inside the timeout function, clear the timeout variable
      // which will let the next execution run when in 'immediate' mode
      timeout = null;

      // Check if the function already ran with the immediate flag
      if (!immediate) {
        // Call the original function with apply
        // apply lets you define the 'this' object as well as the arguments 
        //    (both captured before setTimeout)
        func.apply(context, args);
      }
    }, wait);

    // Immediate mode and no wait timer? Execute the function..
    if (callNow) func.apply(context, args);
  }
}

/*----- -DOM- -----*/
function getElement(elemId) {
  return document.getElementById(elemId);
}

function initDOMVars() {
  domElement.loopToggleButton = getElement("loop-toggle");
  domElement.loopToggleButtonMobile = getElement("loop-toggle-mobile");
  domElement.loopAllToggleButton = getElement("loop-all-toggle"); 
  domElement.useMediaSettingToggleButton = getElement("use-media-setting-toggle"); 
  domElement.player = getElement("player");
  domElement.playerBody = getElement("player__body")
  domElement.playerFooter = getElement("player__footer");
  domElement.playerHeader = getElement("player__header");
  domElement.canvas = getElement("canvas");
  domElement.settingPanel = getElement("setting-panel");
  domElement.elapsedTime = getElement("elapsed-time");
  domElement.duration = getElement("duration");                    
  domElement.elapsedTimeBar = getElement("elapsed-time-bar"); 
  domElement.volumeControl = getElement('volume-control'); 
  domElement.volumeControlMobile = getElement('volume-control-mobile');
  domElement.playbackRateControl = getElement('speed-control'); 
  domElement.playbackRateControlMobile = getElement('speed-control-mobile'); 
  domElement.songTable = getElement("song-table");
  domElement.playListSelect = getElement("play-lists");
  domElement.newPlayListPanel = getElement("new-play-list-panel");
  domElement.playListInput = getElement("play-list-name-input");
  domElement.songListPanel = getElement("song-list-panel");
  domElement.filesUpload = getElement("files_upload");  
  domElement.songListAutoCloseTime = getElement("song-list-auto-close-time");
  domElement.equalizerControls = {
    _31HzControl: getElement('_31HzControl'),
    _62HzControl: getElement('_62HzControl'),
    _125HzControl: getElement('_125HzControl'),
    _250HzControl: getElement('_250HzControl'),
    _500HzControl: getElement('_500HzControl'),
    _1kHzControl: getElement('_1kHzControl'),
    _2kHzControl: getElement('_2kHzControl'),
    _4kHzControl: getElement('_4kHzControl'),
    _8kHzControl: getElement('_8kHzControl'),
    _16kHzControl: getElement('_16kHzControl'),
  }
}

function initTooltips() {
  getElement("volume-tooltip").textContent = "Volume: " + audio.volume * 100;
  getElement("speed-tooltip").textContent = "Speed: " + audio.playbackRate;
  getElement("volume-tooltip-mobile").textContent = "Volume: " + audio.volume * 100;
  getElement("speed-tooltip-mobile").textContent = "Speed: " + audio.playbackRate;
  getElement("play-button-tooltip").textContent = "Play";
  getElement("stop-button-tooltip").textContent = "Stop";
  getElement("loop-button-tooltip").textContent = "Start loop";
  getElement("loop-all-button-tooltip").textContent = "Loop all";
  getElement("loop-button-tooltip-mobile").textContent = "Start loop";
  getElement("use-media-setting-button-tooltip").textContent = "Turn off media setting";
  getElement("brightness-tooltip").textContent = "Brightness: " + videoSetting.brightness + "%";
  getElement("contrast-tooltip").textContent = "Contrast: " + videoSetting.contrast + "%";
  getElement("invert-tooltip").textContent = "Invert: " + videoSetting.invert + "%";
  getElement("grayscale-tooltip").textContent = "Grayscale: " + videoSetting.grayscale + "%";
  getElement("saturate-tooltip").textContent = "Saturate: " + videoSetting.saturate + "%";
  getElement("sepia-tooltip").textContent = "Sepia: " + videoSetting.sepia + "%";
  getElement("blur-tooltip").textContent = "Blur: " + videoSetting.blur + "px";
  getElement("hue-rotation-tooltip").textContent = "Hue rotation: " + videoSetting.hueRotation + "deg";
}
