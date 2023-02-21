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
  const dummyList = 'dummy for migration';
  await addPlayListToDB(dummyList);
  for (var playList of $playLists) {
    const appSongs = await getAllSongFromPlayList(playList);
    for (var song of appSongs) {
      await updateDuration(playList, song);
    }
  }
  await deletePlayListFromDB(dummyList);
}

async function migrateToV2_2() {
  const currentAppVersion = localStorage.getItem('applicationVersion');
  const isVersionMatched = APP_VERSION === currentAppVersion;
  if (!isVersionMatched) {
    await addDurationToSchema();
    localStorage.setItem('applicationVersion', APP_VERSION);
  }
}
