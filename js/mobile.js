/*------ -control- ------*/
function loopToggleMobile() {
	if (media.loop) {
		startLoopAllMobile();     
	} else if (isLoopAll) {
    stopLoopAllMobile()
  } else {    
		startLoopMobile();
	}
}

function startLoopAllMobile() {
  media.loop = false;    
  isLoopAll = true;
  getElement("loop-button-tooltip-mobile").textContent = "Stop loop all";  
  domElement.loopToggleButtonMobile.firstChild.classList.remove('fa-redo-alt')    
  domElement.loopToggleButtonMobile.firstChild.classList.add('fa-retweet') 
}

function stopLoopAllMobile() {    
  isLoopAll = false; 
  getElement("loop-button-tooltip-mobile").textContent = "Start loop"; 
  domElement.loopToggleButtonMobile.firstChild.classList.remove('fa-retweet')    
  domElement.loopToggleButtonMobile.firstChild.classList.add('fa-redo-alt')     
  domElement.loopToggleButtonMobile.classList.add("text--gray");
}

function startLoopMobile() {    
  media.loop = true;    
  getElement("loop-button-tooltip-mobile").textContent = "Start loop all"; 
  domElement.loopToggleButtonMobile.classList.remove("text--gray");   
}

function showListToggleMobile() {
  var songListPanel = getElement("song-list-panel");
  if (isListShow) {
    isListShow = false;
    songListPanel.style.right = "-120vw";
  } else {
    isListShow = true;
    songListPanel.style.right = "0";
  }
}
