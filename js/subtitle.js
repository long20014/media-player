var $currentSubtitle;
var $currentSubtitleLine;
var SECOND_OF_HOUR = 3600;
var SECOND_OF_MINUTE = 60;
var $subtitleSetting = {
  font: 'serif',
  fontSize: '24',
  fontColor: 'white',
};

function createSubtitle(text) {
  var subtitle = text;
  var pattern = /(\d+)\n([\d:,]+)\s+-{2}\>\s+([\d:,]+)\n([\s\S]*?(?=\n{2}|$))/g;
  var result = [];

  if (typeof text != 'string') throw 'Sorry, Parser accept string only.';
  if (subtitle === null) return subtitle;

  var parse = subtitle.replace(/\r\n|\r|\n/g, '\n');
  var matches;

  while ((matches = pattern.exec(parse)) != null) {
    result.push({
      line: matches[1],
      start: convertTime(matches[2]),
      end: convertTime(matches[3]),
      text: matches[4],
    });
  }

  return result;
}

function convertTime(timeString) {
  var timeParts = timeString.split(':');
  var hour = +timeParts[0];
  var minute = +timeParts[1];
  var second = +timeParts[2].replace(/\,/g, '.');
  return (hour * SECOND_OF_HOUR + minute * SECOND_OF_MINUTE + second).toFixed(3);
}

function getCurrentSubtitleLine(currentSubtitle, currentTime) {
  if (currentSubtitle && currentSubtitle.length > 0) {
    return currentSubtitle.find((line) => isSubtitleLineValid(line, currentTime));
  }
  return null;
}

function setCurrentSubtitle() {
  if ($currentSong && $currentSong.type === 'video') $currentSubtitle = $currentSong.subtitle;
  else $currentSubtitle = null;
}

function setLine(line, text) {
  line.style.font = $subtitleSetting.font;
  line.classList.add('subtitle-line');
  line.style.fontSize = $subtitleSetting.fontSize + 'px';
  line.style.color = $subtitleSetting.fontColor;
  line.innerHTML = text;
}

function drawSubtitle() {
  var firstLine = document.createElement('div');
  setLine(firstLine, $currentSubtitleLine.text);
  $domElement.subtitleWrapper.appendChild(firstLine);
}

function cleanSubtitle() {
  if ($domElement.subtitleWrapper.childNodes.length > 0) {
    $domElement.subtitleWrapper.childNodes.forEach((line) => $domElement.subtitleWrapper.removeChild(line));
  }
}

function addSubtitle() {
  $domElement.subtitleUpload.click();
}

function initUploadSubtitleFile() {
  $domElement.subtitleUpload.onchange = function (e) {
    var file = this.files[0];
    var fileNameSplitted = file.name.split('.');
    var fileExtension = fileNameSplitted[fileNameSplitted.length - 1];
    if (fileExtension !== 'srt') {
      alert('Please use an .srt file');
    } else if (!$currentSong) {
      alert('Please choose a media before adding subtitle');
    } else if ($currentSong.type !== 'video') {
      alert('You can only add subtitle for a videop');
    } else {
      const reader = new FileReader();
      reader.readAsText(file, 'UTF-8');
      reader.onload = function (evt) {
        $currentSong['subtitle'] = createSubtitle(evt.target.result);
        setCurrentSubtitle();
      };
      reader.onerror = function (evt) {
        alert('Failed to read files');
      };
    }
    e.target.value = '';
  };
}

function isSubtitleLineValid(line, currentTime) {
  return +line.start < +currentTime && +line.end > +currentTime;
}

function isSubtitleEnded() {
  return $currentSubtitle && +$currentSubtitle[$currentSubtitle.length - 1].end < +$media.currentTime;
}

function changeFontSize(value) {
  $subtitleSetting.fontSize = value;
}

function checkAndDrawSubtitle() {
  if (!isSubtitleEnded()) {
    if (
      !$currentSubtitleLine ||
      ($currentSubtitleLine && !isSubtitleLineValid($currentSubtitleLine, $media.currentTime))
    ) {
      $currentSubtitleLine = getCurrentSubtitleLine($currentSubtitle, $media.currentTime);
      if ($domElement.subtitleWrapper.childNodes.length > 0) cleanSubtitle();
      if ($currentSubtitleLine) drawSubtitle();
      else cleanSubtitle();
    }
  } else cleanSubtitle();
}

function subtitleEnableToggle() {
  if ($appSetting.isSubtitleEnable) {
    $appSetting.isSubtitleEnable = false;
    getElement('subtitle-enable-tooltip').textContent = 'Turn on subtitle';
    $domElement.subtitleEnableCheckbox.checked = false;
  } else {
    $appSetting.isSubtitleEnable = true;
    getElement('subtitle-enable-tooltip').textContent = 'Turn off subtitle';
    $domElement.subtitleEnableCheckbox.checked = true;
  }
}
