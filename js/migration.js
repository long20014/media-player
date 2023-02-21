async function updateDuration(playList, song) {
  if (song && playList) {
    var { id, type, src } = song;
    var tempMedia = type === 'audio' ? new Audio() : document.createElement('video');
    var blobUrl = URL.createObjectURL(src);
    tempMedia.src = blobUrl;
    var duration;
    tempMedia.onloadedmetadata = function () {
      duration = tempMedia.duration;
      console.log(duration);
      return $db.table(playList).update(id, { duration });
    };
  }
  await sleep(100);
}

async function addDurationToSchema() {
  await updateSchema(CURRENT_SCHEMA);
  for (var playList of $playLists) {
    const appSongs = await getAllSongFromPlayList(playList);
    for (var song of appSongs) {
      await updateDuration(playList, song);
    }
  }
}

async function migrateToV2_2() {
  const currentAppVersion = localStorage.getItem('applicationVersion');
  const isVersionMatched = APP_VERSION === currentAppVersion;
  if (!isVersionMatched) {
    showNotification('info', `We're migrating your db to new version`);
    showLoader();
    await addDurationToSchema();
    hideLoader();
    localStorage.setItem('applicationVersion', APP_VERSION);
    showNotification('info', 'Migration has been successfully done');
  }
}
