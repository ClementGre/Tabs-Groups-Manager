


var currentWindowId;
browser.windows.getCurrent().then((window) => {
  currentWindowId = window.id;
});

var updateLocalData = function updateLocalData(data){
  if(data.supportedWindowId == currentWindowId){
    document.getElementById("js-currentWindowInfo").innerHTML += "Tabs are synchronysed in this window";
  }else{
    document.getElementById("js-currentWindowInfo").innerHTML += "Tabs are not synchronysed to this window";
  }


  document.getElementById("js-shared-non-sync-tabs").innerHTML += ' (' + Object.keys(data.sharedNonSyncTabs).length + ' tabs)';

}
var updateSyncData = function updateSyncData(data){
  console.log(data);
  Object.keys(data.groupsTabs).forEach(function(group){
    var tabs = data.groupsTabs[group];
    document.getElementById("js-groups-tab").innerHTML += 
      '<div id="js-group-' + group + '-div" class="group-div">' +
        '<p id="js-group-' + group + '">Group ' + group + " (" + Object.keys(tabs).length + ' tabs)</p>' +
        '<i class="fas fa-arrow-right"></i>' +
      '</div>';
  });

  document.getElementById("js-shared-sync-tabs").innerHTML += ' (' + Object.keys(data.sharedSyncTabs).length + ' tabs)';
}

browser.storage.local.get().then(updateLocalData, (error) => { console.log(error); });
browser.storage.sync.get().then(updateSyncData, (error) => { console.log(error); });
