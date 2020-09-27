
const GROUP_COMMON_NO_SYNC = 1;
const GROUP_COMMON_SYNC = 2;

var currentWindowId;
browser.windows.getCurrent().then((window) => {
  currentWindowId = window.id;
});

var startFunction = function startFunction(localData, syncData){
  console.log(localData);
  console.log(syncData);

  // Current window info

  if(localData.supportedWindowId == currentWindowId){
    document.getElementById("js-currentWindowInfo").innerHTML += "Tabs are synchronysed in this window. " + '<a id="js-currentWindowInfo-unsync">Disable</a>';
    document.getElementById("js-currentWindowInfo").onmousedown = () => {
      browser.storage.local.set({supportedWindowId: -1}).then(() => {
        alert("The tabs of this window are now not synchronysed into groups and cloud");
        window.location.href = window.location.pathname + window.location.search + window.location.hash;
      }, (error) => { console.log(error); });
    };
  }else{
    document.getElementById("js-currentWindowInfo").innerHTML += "Tabs are not synchronysed to this window. " + '<a id="js-currentWindowInfo-sync">Enable</a>'
    document.getElementById("js-currentWindowInfo").onmousedown = () => {
      var r = confirm("All the tabs of this window will be replaced by the groups tabs.");
      if(r == true){
        browser.storage.local.set({supportedWindowId: currentWindowId}).then(() => {
          window.location.href = window.location.pathname + window.location.search + window.location.hash;
          browser.runtime.getBackgroundPage().then((page) => {
            page.restoreSession();
          });
        }, (error) => { console.log(error); }); 
      }
    };
  }

  // Shared groups | COUNTERS

  document.getElementById("js-shared-non-sync-tabs").innerHTML += ' (' + Object.keys(localData.sharedNonSyncTabs).length + ' tabs)';
  document.getElementById('js-shared-non-sync-tabs-div').setAttribute('title', listTabs(localData.sharedNonSyncTabs));

  document.getElementById("js-shared-sync-tabs").innerHTML += ' (' + Object.keys(syncData.sharedSyncTabs).length + ' tabs)';
  document.getElementById('js-shared-sync-tabs-div').setAttribute('title', listTabs(syncData.sharedSyncTabs));

  // Custom groups | COUNTERS

  Object.keys(syncData.groupsTabs).forEach(function(group){
    var tabs = syncData.groupsTabs[group];
    document.getElementById("js-groups-tab").innerHTML += 
      '<div id="js-group-' + group + '-div" class="group-div ' + ((group == localData.currentGroup) ? 'active' : '') + '">' +
        '<p id="js-group-' + group + '">Group ' + group + " (" + Object.keys(tabs).length + ' tabs)</p>' +
        '<i class="fas fa-arrow-right"></i>' +
      '</div>';
    document.getElementById('js-group-' + group + '').setAttribute('title', listTabs(tabs));
  });

  // Actions buttons

  browser.runtime.getBackgroundPage().then((page) => {
    browser.tabs.query({active: true, windowId: currentWindowId}).then((currentTabs) => {
      var currentTab = currentTabs[0];
      page.searchSavedTab(localData.currentGroup, currentTab.index, (savedTabData) => {
        if(currentWindowId == localData.supportedWindowId){
          if(savedTabData.group === GROUP_COMMON_SYNC){

            document.getElementById("js-tab-actions-common").setAttribute('class', 'active');
            document.getElementById("js-tab-actions-sync").setAttribute('class', 'noactive');

            document.getElementById("js-tab-actions-common").onmousedown = () => { // From Common Sync to Group
              showLoader();

              page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
                var targetIndex = sharedNonSyncLength + sharedSyncLength - 1;

                browser.tabs.update(currentTab.id, {pinned: false}).then(() => {
                  browser.tabs.move([currentTab.id], {index: targetIndex}).then(() => {
                    editListsSizes(page, localData, syncData, 0, -1);
                  });
                });

              });
            };
            document.getElementById("js-tab-actions-sync").onmousedown = () => { // From Common Sync to Common no Sync
              showLoader();

              page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
                var targetIndex = sharedNonSyncLength;

                browser.tabs.update(currentTab.id, {pinned: true}).then(() => {
                  browser.tabs.move([currentTab.id], {index: targetIndex}).then(() => {
                    editListsSizes(page, localData, syncData, 1, -1);
                  });
                });

              });
            };

          }else if(savedTabData.group === GROUP_COMMON_NO_SYNC){

            document.getElementById("js-tab-actions-common").setAttribute('class', 'active');
            document.getElementById("js-tab-actions-sync").setAttribute('class', 'active');

            document.getElementById("js-tab-actions-common").onmousedown = () => { // From Common no Sync to Group
              showLoader();

              page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
                var targetIndex = sharedNonSyncLength + sharedSyncLength - 1;

                browser.tabs.update(currentTab.id, {pinned: false}).then(() => {
                  browser.tabs.move([currentTab.id], {index: targetIndex}).then(() => {
                    editListsSizes(page, localData, syncData, -1, 0);
                  });
                });

              });
            };

            document.getElementById("js-tab-actions-sync").onmousedown = () => { // From Common no Sync to Common Sync
              showLoader();

              page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
                var targetIndex = sharedNonSyncLength - 1;

                browser.tabs.update(currentTab.id, {pinned: true}).then(() => {
                  browser.tabs.move([currentTab.id], {index: targetIndex}).then(() => {
                    editListsSizes(page, localData, syncData, -1, 1);
                  });
                });

              });
            };

          }else{
            document.getElementById("js-tab-actions-common").setAttribute('class', 'noactive');
            document.getElementById("js-tab-actions-sync").setAttribute('class', 'noactive');

            document.getElementById("js-tab-actions-common").onmousedown = () => { // From group to Common Sync
              showLoader();
              page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
                var targetIndex = sharedNonSyncLength + sharedSyncLength;

                browser.tabs.update(currentTab.id, {pinned: true}).then(() => {
                  browser.tabs.move([currentTab.id], {index: targetIndex}).then(() => {
                  editListsSizes(page, localData, syncData, 0, 1);
                  });
                });

              });
            };
            
            document.getElementById("js-tab-actions-sync").onmousedown = () => { // From Group to Common no sync
              showLoader();
              page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
                var targetIndex = sharedNonSyncLength;

                browser.tabs.update(currentTab.id, {pinned: true}).then(() => {
                  browser.tabs.move([currentTab.id], {index: targetIndex}).then(() => {
                    editListsSizes(page, localData, syncData, 1, 0);
                  });
                });

              });
            };
          }
        }else{
          document.getElementById("js-tab-actions-common").setAttribute('style', 'display: none;');
          document.getElementById("js-tab-actions-sync").setAttribute('style', 'display: none;');
          document.getElementById("js-tab-actions-moveall").setAttribute('style', 'display: inline-block;');
        }

        document.getElementById("js-tab-actions-move").onmousedown = () => {

        };

      });
    });
  });

  hideLoader();

}

browser.storage.sync.get().then((syncData) => {
  browser.storage.local.get().then((localData) => {
    startFunction(localData, syncData);
  });
});

function editListsSizes(page, localData, syncData, sharedNonSync, sharedSync){
  var sharedSyncTabs = syncData.sharedSyncTabs;
  var sharedSyncLength = Object.keys(sharedSyncTabs).length;
  var sharedNonSyncTabs = localData.sharedNonSyncTabs;
  var sharedNonSyncLength = Object.keys(sharedNonSyncTabs).length;

  if(sharedNonSync != 0){
    if(sharedNonSync < 0){
      delete sharedNonSyncTabs[(sharedNonSyncLength-1)+''];
    }else{
      sharedNonSyncTabs[sharedNonSyncLength+''] = {};
    }
    browser.storage.local.set({sharedNonSyncTabs}).then(() => {
      page.forceUpdateAllSavedTabs(() => {

        if(sharedSync != 0){
          if(sharedSync < 0){
            delete sharedSyncTabs[(sharedSyncLength-1)+''];
          }else{
            sharedSyncTabs[sharedSyncLength+''] = {};
          }
          browser.storage.sync.set({sharedSyncTabs}).then(() => {
          page.forceUpdateAllSavedTabs(() => {
              reload();
            });
          });
        }else reload();

      });
    });
  }else if(sharedSync != 0){

    if(sharedSync < 0){
      delete sharedSyncTabs[(sharedSyncLength-1)+''];
    }else{
      sharedSyncTabs[sharedSyncLength+''] = {};
    }
    browser.storage.sync.set({sharedSyncTabs}).then(() => {
    page.forceUpdateAllSavedTabs(() => {
        reload();
      });
    });

  }
}

function hideLoader(){
  document.getElementById("js-page-loader").setAttribute('style', 'display: none;');
}
function showLoader(){
  document.getElementById("js-page-loader").setAttribute('style', 'display: absolute;');
}
function reload(){
  window.location.href = window.location.pathname + window.location.search + window.location.hash;
}

function listTabs(tabs){
  var tabsText = "";
  Object.keys(tabs).forEach((tabIndex) => {tabsText += tabIndex + " - " + tabs[tabIndex].title + "\n"});
  if(tabsText == "") tabsText = "Empty";
  return tabsText;
}