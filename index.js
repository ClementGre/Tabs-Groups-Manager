
const GROUP_COMMON_NO_SYNC = 1;
const GROUP_COMMON_SYNC = 2;
const GROUP_NORMAL = 0;

var currentWindowId;
browser.windows.getCurrent().then((window) => {
  currentWindowId = window.id;
});

var lastGroup;
var lastGroupType;
var lastIsProtectedGroup;

var currentTab;
var localData = {};
var syncData = {};
setInterval(() => {
  browser.storage.sync.get().then((newSyncData) => {
    if(JSON.stringify(newSyncData) !== JSON.stringify(syncData)) reload();
    else{
      browser.storage.local.get().then((newLocalData) => {
        if(JSON.stringify(newLocalData) !== JSON.stringify(localData)) reload();
      });
    }
    browser.tabs.query({active: true, windowId: currentWindowId}).then((currentTabs) => {
      if(currentTab.id != currentTabs[0].id){
        console.log("reloading because of currentTab has changed");
        reload();
      }
    });
  });

}, 1000);

var updateGroupsListPanel = function updateGroupsListPanel(){
  console.log(localData);
  console.log(syncData);

  // Current window info

  if(localData.supportedWindowId == currentWindowId){
    document.getElementById("js-currentWindowInfo").innerHTML = "Tabs are synchronysed in this window. " + '<a id="js-currentWindowInfo-unsync">Disable</a>';
    document.getElementById("js-currentWindowInfo-unsync").onmousedown = () => {
      browser.storage.local.set({supportedWindowId: -1}).then(() => {
        browser.browserAction.setBadgeText({text: "", windowId: localData.supportedWindowId});
        alert("The tabs of this window are no more synchronysed into groups and cloud");
        window.location.href = window.location.pathname + window.location.search + window.location.hash;
      }, (error) => { console.log(error); });
    };
  }else{
    document.getElementById("js-currentWindowInfo").innerHTML = "Tabs are not synchronysed to this window. " + '<a id="js-currentWindowInfo-sync">Enable</a>'
    document.getElementById("js-currentWindowInfo-sync").onmousedown = () => {
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
  document.getElementById("js-shared-non-sync-tabs-open").innerHTML = 'No Synced Common Tabs<disc> · ' + Object.keys(localData.sharedNonSyncTabs).length + ' tabs</disc>';
  document.getElementById('js-shared-non-sync-tabs-div').setAttribute('title', listTabs(localData.sharedNonSyncTabs));
  document.getElementById('js-shared-non-sync-tabs-show').onmousedown = () => { // OPEN GROUP
    console.log("Opening details page of group No Synced Common");
    updateGroupDetailsPanel("No Synced Common", GROUP_COMMON_NO_SYNC, true);
  }

  document.getElementById("js-shared-sync-tabs-open").innerHTML = 'Synced Common Tabs<disc> · ' + Object.keys(syncData.sharedSyncTabs).length + ' tabs</disc>';
  document.getElementById('js-shared-sync-tabs-div').setAttribute('title', listTabs(syncData.sharedSyncTabs));
  document.getElementById('js-shared-sync-tabs-show').onmousedown = () => { // OPEN GROUP
    console.log("Opening details page of group Synced Common");
    updateGroupDetailsPanel("Synced Common", GROUP_COMMON_SYNC, true);
  }

  // Custom groups | COUNTERS

  document.getElementById("js-groups-tab").innerHTML = '';
  for(let groupName of Object.keys(syncData.groupsTabs)){

    var tabs = syncData.groupsTabs[groupName];
    document.getElementById("js-groups-tab").innerHTML += 
      '<div id="js-group-' + groupName + '-div" class="group-div ' + ((groupName == localData.currentGroup) ? 'active' : '') + '">' +
        '<p id="js-group-' + groupName + '-open">Group ' + groupName + "<disc> · " + Object.keys(tabs).length + ' tabs</disc></p>' +
        '<i id="js-group-' + groupName + '-show" class="fas fa-arrow-right"></i>' +
      '</div>';
    document.getElementById('js-group-' + groupName + '-open').setAttribute('title', listTabs(tabs));

  }
  for(let groupName of Object.keys(syncData.groupsTabs)){
    
    document.getElementById('js-group-' + groupName + '-open').onmousedown = () => { // LOAD GROUP
      loadGroup(groupName);
    }
    document.getElementById('js-group-' + groupName + '-show').onmousedown = () => { // OPEN GROUP
      console.log("Opening details page of group " + groupName);
      updateGroupDetailsPanel(groupName, GROUP_NORMAL, (groupName == "Default"));
    }

  }



  // Create group

  document.getElementById("js-create-group").onmousedown = () => { // CREATE GROUP
    var groupsTabs = syncData.groupsTabs;

    var name = window.prompt("Choose the group name", "New Group");
    while(name != null && name != ''){
      
      if(groupsTabs[name] == undefined){
        groupsTabs[name] = {};
        browser.storage.sync.set({groupsTabs}).then(() => {
          reload();
        });
        return;
      }else{
        alert("This group already exists.");
      }
      name = window.prompt("Choose the group name", name);
    }
    
  }

  // Actions buttons

  browser.runtime.getBackgroundPage().then((page) => {
    page.searchSavedTab(localData.currentGroup, currentTab.index, (savedTabData) => {
      if(currentWindowId == localData.supportedWindowId){
        if(savedTabData.group === GROUP_COMMON_SYNC){

          document.getElementById("js-tab-actions-common").setAttribute('class', 'active');
          document.getElementById("js-tab-actions-sync").setAttribute('class', 'noactive');

          document.getElementById("js-tab-actions-common").onmousedown = () => { // From Common Sync to Group

            page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
              var targetIndex = sharedNonSyncLength + sharedSyncLength - 1;

              page.activateListeners = false;
              browser.tabs.update(currentTab.id, {pinned: false}).then(() => {
                browser.tabs.move([currentTab.id], {index: targetIndex}).then(() => {
                  page.activateListeners = true;
                  editListsSizes(page, localData, syncData, 0, -1);
                }, (error) => { console.log(error); activateListeners = true; });
              }, (error) => { console.log(error); activateListeners = true; });

            });
          };
          document.getElementById("js-tab-actions-sync").onmousedown = () => { // From Common Sync to Common no Sync

            page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
              var targetIndex = sharedNonSyncLength;

              page.activateListeners = false;
              browser.tabs.update(currentTab.id, {pinned: true}).then(() => {
                browser.tabs.move([currentTab.id], {index: targetIndex}).then(() => {
                  page.activateListeners = true;
                  editListsSizes(page, localData, syncData, 1, -1);
                }, (error) => { console.log(error); activateListeners = true; });
              }, (error) => { console.log(error); activateListeners = true; });

            });
          };

        }else if(savedTabData.group === GROUP_COMMON_NO_SYNC){

          document.getElementById("js-tab-actions-common").setAttribute('class', 'active');
          document.getElementById("js-tab-actions-sync").setAttribute('class', 'active');

          document.getElementById("js-tab-actions-common").onmousedown = () => { // From Common no Sync to Group

            page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
              var targetIndex = sharedNonSyncLength + sharedSyncLength - 1;

              page.activateListeners = false;
              browser.tabs.update(currentTab.id, {pinned: false}).then(() => {
                browser.tabs.move([currentTab.id], {index: targetIndex}).then(() => {
                  page.activateListeners = true;
                  editListsSizes(page, localData, syncData, -1, 0);
                }, (error) => { console.log(error); activateListeners = true; });
              }, (error) => { console.log(error); activateListeners = true; });

            });
          };

          document.getElementById("js-tab-actions-sync").onmousedown = () => { // From Common no Sync to Common Sync

            page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
              var targetIndex = sharedNonSyncLength - 1;

              page.activateListeners = false;
              browser.tabs.update(currentTab.id, {pinned: true}).then(() => {
                browser.tabs.move([currentTab.id], {index: targetIndex}).then(() => {
                  page.activateListeners = true;
                  editListsSizes(page, localData, syncData, -1, 1);
                }, (error) => { console.log(error); activateListeners = true; });
              }, (error) => { console.log(error); activateListeners = true; });

            });
          };

        }else{
          document.getElementById("js-tab-actions-common").setAttribute('class', 'noactive');
          document.getElementById("js-tab-actions-sync").setAttribute('class', 'noactive');

          document.getElementById("js-tab-actions-common").onmousedown = () => { // From group to Common Sync
            page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
              var targetIndex = sharedNonSyncLength + sharedSyncLength;

              page.activateListeners = false;
              browser.tabs.update(currentTab.id, {pinned: true}).then(() => {
                browser.tabs.move([currentTab.id], {index: targetIndex}).then(() => {
                  page.activateListeners = true;
                  editListsSizes(page, localData, syncData, 0, 1);
                }, (error) => { console.log(error); activateListeners = true; });
              }, (error) => { console.log(error); activateListeners = true; });

            });
          };
          
          document.getElementById("js-tab-actions-sync").onmousedown = () => { // From Group to Common no sync

            page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
              var targetIndex = sharedNonSyncLength;

              page.activateListeners = false;
              browser.tabs.update(currentTab.id, {pinned: true}).then(() => {
                browser.tabs.move([currentTab.id], {index: targetIndex}).then(() => {
                  page.activateListeners = true;
                  editListsSizes(page, localData, syncData, 1, 0);
                }, (error) => { console.log(error); activateListeners = true; });
              }, (error) => { console.log(error); activateListeners = true; });

            });
          };
        }
      }else{
        document.getElementById("js-tab-actions-common").setAttribute('style', 'display: none;');
        document.getElementById("js-tab-actions-sync").setAttribute('style', 'display: none;');
        document.getElementById("js-tab-actions-moveall").setAttribute('style', 'display: inline-block;');
      }

      document.getElementById("js-tab-actions-move").onmousedown = () => { // Move current tab into a group

      };
      document.getElementById("js-tab-actions-moveall").onmousedown = () => { // Move all tabs into a group

      };
    });
  });
  hideLoader();
}

function updateGroupDetailsPanel(group, groupType, isProtectedGroup){
  console.log(syncData.groupsTabs);

  lastGroup = group;
  lastGroupType = groupType;
  lastIsProtectedGroup = isProtectedGroup;
  
  document.getElementById("js-group-tabs").innerHTML = '';

  if(groupType == GROUP_COMMON_NO_SYNC){
    var groupTabs = localData.sharedNonSyncTabs;
  }else if(groupType == GROUP_COMMON_SYNC){
    var groupTabs = syncData.sharedSyncTabs;
  }else{
    var groupTabs = syncData.groupsTabs[group];
  }
  Object.keys(groupTabs).forEach(function(index){
    var tabData = groupTabs[index];
    document.getElementById("js-group-tabs").innerHTML += 
      '<div id="js-tab-' + index + '-div" class="group-div ' + (tabData.pinned ? 'active' : '') + '">' +
        '<p id="js-tab-' + index + '-open">' + tabData.title + '</p>' +
        '<i id="js-tab-' + index + '-delete" class="fas fa-trash-alt"></i>' +
      '</div>';
  });
  let i = 0;
  Object.keys(groupTabs).forEach(function(index){
    var tabData = groupTabs[index];

    document.getElementById('js-tab-' + index + '-open').setAttribute("title", index + " - " + tabData.url);

    document.getElementById('js-tab-' + index + '-open').onmousedown = () => { // Open tab
      if(groupType == GROUP_COMMON_NO_SYNC){
        browser.tabs.create({url: localData.sharedNonSyncTabs[index].url}).then(() => {
          setTimeout(function() {
            reloadAll(group, groupType, isProtectedGroup);
          }, 1000);
        });
      }else if(groupType == GROUP_COMMON_SYNC){
        browser.tabs.create({url: syncData.sharedSyncTabs[index].url}).then(() => {
          setTimeout(function() {
            reloadAll(group, groupType, isProtectedGroup);
          }, 1000);
        });
      }else{
        browser.tabs.create({url: syncData.groupsTabs[group][index].url}).then(() => {
          setTimeout(function() {
            reloadAll(group, groupType, isProtectedGroup);
          }, 1000);
        });
      }
    }

    if(groupType == GROUP_COMMON_NO_SYNC){
      document.getElementById('js-tab-' + index + '-delete').onmousedown = () => { // Delete tab (common no sync)
        var sharedNonSyncTabs = localData.sharedNonSyncTabs;
        delete sharedNonSyncTabs[index];
        getCloseVars((page, sharedNonSyncLength, sharedSyncLength, groupLength, tabs) => {
          reorganizeAndUpdateGroup(sharedNonSyncTabs, GROUP_COMMON_NO_SYNC, null, null, () => {
            closeTabs([tabs[0].id], sharedNonSyncLength+sharedSyncLength+groupLength, page);
          });
        }, Number(index), 0);
        
      }
    }else if(groupType == GROUP_COMMON_SYNC){
      document.getElementById('js-tab-' + index + '-delete').onmousedown = () => { // Delete tab (common sync)
        var sharedSyncTabs = syncData.sharedSyncTabs;
        delete sharedSyncTabs[index];
        getCloseVars((page, sharedNonSyncLength, sharedSyncLength, groupLength, tabs) => {
          reorganizeAndUpdateGroup(sharedSyncTabs, GROUP_COMMON_SYNC, null, null, () => {
            closeTabs([tabs[0].id], sharedNonSyncLength+sharedSyncLength+groupLength, page);
          });
        }, Number(index), 1);
        
      }
    }else{
      document.getElementById('js-tab-' + index + '-delete').onmousedown = () => { // Delete tab (normal group)
        var groupsTabs = syncData.groupsTabs;
        delete groupsTabs[group][index];
        getCloseVars((page, sharedNonSyncLength, sharedSyncLength, groupLength, tabs) => {
          reorganizeAndUpdateGroup(groupsTabs[group], GROUP_NORMAL, group, groupsTabs, () => {
            closeTabs([tabs[0].id], sharedNonSyncLength+sharedSyncLength+groupLength, page);
          });
        }, Number(index), 2);
        
      }
    }
    
    i++;
  });
  if(i == 0) document.getElementById("js-group-empty-message").setAttribute('style', '');
  else document.getElementById("js-group-empty-message").setAttribute('style', 'display: none;');
  

  // OPEN GROUP

  document.getElementById("js-open-group").setAttribute('style', '');
  if(i == 0 && (localData.supportedWindowId != currentWindowId)){
    document.getElementById("js-open-group").setAttribute('style', 'display: none;');

  }else if(localData.supportedWindowId != currentWindowId){
    document.getElementById("js-open-group-text").innerHTML = "Open all tabs";
    document.getElementById("js-open-group").onmousedown = () => { // Open Group tabs
      if(groupType == GROUP_COMMON_NO_SYNC){
        for(let tabInfo of Object.values(localData.sharedNonSyncTabs)){
          browser.tabs.create({url: tabInfo.url}).then(() => {});
        }
      }else if(groupType == GROUP_COMMON_SYNC){
        for(let tabInfo of Object.values(syncData.sharedSyncTabs)){
          browser.tabs.create({url: tabInfo.url}).then(() => {});
        }
      }else{
        for(let tabInfo of Object.values(syncData.groupsTabs[group])){
          browser.tabs.create({url: tabInfo.url}).then(() => {});
        }
      }
    }
    
  }else if(groupType == GROUP_COMMON_NO_SYNC || groupType == GROUP_COMMON_SYNC || localData.currentGroup == group){
    document.getElementById("js-open-group").setAttribute('style', 'display: none;');

  }else{
    document.getElementById("js-open-group-text").innerHTML = "Load group";
    document.getElementById("js-open-group").onmousedown = () => { // Load Group
      loadGroup(group);
    }
    
  }

  // ACTIONS
  document.getElementById("js-tab-actions-back").onmousedown = () => { // Back
    document.getElementById("mainTag").setAttribute('class', 'unswitched');
  }
  if(groupType == GROUP_COMMON_NO_SYNC){
    document.getElementById("js-tab-actions-clear").onmousedown = () => { // Clear group (commom no sync)
      var sharedNonSyncTabs = localData.sharedNonSyncTabs;
      sharedNonSyncTabs = {};
      getCloseVars((page, sharedNonSyncLength, sharedSyncLength, groupLength, tabs) => {
        reorganizeAndUpdateGroup(sharedNonSyncTabs, GROUP_COMMON_NO_SYNC, null, null, () => {
          var toClose = []; for(let tab of tabs){ if(tab.index < sharedNonSyncLength) toClose.push(tab.id); }
          closeTabs(toClose, sharedNonSyncLength+sharedSyncLength+groupLength, page);
        });
      });
    }
  }else if(groupType == GROUP_COMMON_SYNC){
    document.getElementById("js-tab-actions-clear").onmousedown = () => { // Clear group (common sync)
      var sharedSyncTabs = syncData.sharedSyncTabs;
      sharedSyncTabs = {};
      getCloseVars((page, sharedNonSyncLength, sharedSyncLength, groupLength, tabs) => {
        reorganizeAndUpdateGroup(sharedSyncTabs, GROUP_COMMON_SYNC, null, null, () => {
          var toClose = []; for(let tab of tabs){ if(tab.index >= sharedNonSyncLength && tab.index < (sharedNonSyncLength+sharedSyncLength)) toClose.push(tab.id); }
          closeTabs(toClose, sharedNonSyncLength+sharedSyncLength+groupLength, page);
        });
      });
    }
  }else{
    document.getElementById("js-tab-actions-clear").onmousedown = () => { // Clear group (normal group)
      var groupsTabs = syncData.groupsTabs;
      groupsTabs[group] = {};
      getCloseVars((page, sharedNonSyncLength, sharedSyncLength, groupLength, tabs) => {
        reorganizeAndUpdateGroup(groupsTabs[group], GROUP_NORMAL, group, groupsTabs, () => {
          var toClose = []; for(let tab of tabs){ if(tab.index >= sharedNonSyncLength+sharedSyncLength) toClose.push(tab.id); }
          closeTabs(toClose, sharedNonSyncLength+sharedSyncLength+groupLength, page);
        });
      });
    }
  }

  document.getElementById("js-input-rename").value = group; // set group name into input
  if(isProtectedGroup){
    document.getElementById("js-tab-actions-delete").setAttribute('style', 'display: none;');
    document.getElementById("js-input-rename").setAttribute('style', 'pointer-events: none; cursor: default;');
    document.getElementById("js-tab-actions-rename").setAttribute('style', 'cursor: default;');
  }else{
    document.getElementById("js-tab-actions-delete").setAttribute('style', '');
    document.getElementById("js-input-rename").setAttribute('style', '');
    document.getElementById("js-tab-actions-rename").setAttribute('style', '');

    document.getElementById("js-tab-actions-delete").onmousedown = () => { // Delete group
      
      console.log("Deleting group " + group);
      if(localData.currentGroup == group){
        // switch to default and after delete
      }else{
        var groupsTabs = syncData.groupsTabs;
        delete groupsTabs[group];
        browser.storage.sync.set({groupsTabs}).then(() => {
          browser.storage.sync.get().then((data) => {
            syncData = data;
            reload();
            document.getElementById("mainTag").setAttribute('class', 'unswitched');
          });
        });
      }
    }
    document.getElementById("js-input-rename").addEventListener('change', () => { // Update group name
      var name = document.getElementById("js-input-rename").value;
      if(lastGroup != group) return;

      var groupsTabs = syncData.groupsTabs;
      if(name != '' && groupsTabs[name] == undefined){
        groupsTabs[name] = groupsTabs[group];
        delete groupsTabs[group];
        if(localData.currentGroup == group){
          browser.storage.local.set({currentGroup: name}).then(() => {
            browser.storage.local.get().then((data) => {
              localData = data;
            });
          });
        }
        console.log("Renaming group " + group + " to " + name);
        group = name;
        lastGroup = name;
        browser.storage.sync.set({groupsTabs}).then(() => {
          browser.storage.sync.get().then((data) => {
            syncData = data;
            reload();
          });
        });
        
      }

    });
  }
  document.getElementById("mainTag").setAttribute('class', 'switched');

}

// CLOSE FUNCTIONS

function reorganizeAndUpdateGroup(groupTabs, groupType, groupName, groupData, callBack){
  console.log("Clearing group " + lastGroup);

  var newGroupTabs = {}; var tabsCount = Object.keys(groupTabs).length; var i = 0; var newI = 0;
  while(tabsCount > 0){
    if(groupTabs[i] != undefined){
      newGroupTabs[newI] = groupTabs[i];
      tabsCount--; newI++;
    }
    i++;
  }
  groupTabs = newGroupTabs;

  if(groupType == GROUP_COMMON_NO_SYNC) browser.storage.local.set({sharedNonSyncTabs: groupTabs}).then(() => {
    reload();
    if(localData.currentGroup == lastGroup || lastGroupType == GROUP_COMMON_SYNC || lastGroupType == GROUP_COMMON_NO_SYNC) callBack();
  });
  if(groupType == GROUP_COMMON_SYNC) browser.storage.sync.set({sharedSyncTabs: groupTabs}).then(() => {
    reload();
    if(localData.currentGroup == lastGroup || lastGroupType == GROUP_COMMON_SYNC || lastGroupType == GROUP_COMMON_NO_SYNC) callBack();
  });
  if(groupType == GROUP_NORMAL){
    groupData[groupName] = groupTabs; browser.storage.sync.set({groupsTabs: groupData}).then(() => {
      reload();
      if(localData.currentGroup == lastGroup || lastGroupType == GROUP_COMMON_SYNC || lastGroupType == GROUP_COMMON_NO_SYNC) callBack();
    });
  } 

}
function getCloseVars(callBack, tabIndex, previousGroups){
  browser.runtime.getBackgroundPage().then((page) => {
    page.countListsItems((sharedNonSyncLength, sharedSyncLength, groupLength) => {
      if(tabIndex != null){
        if(previousGroups >= 1) tabIndex += sharedNonSyncLength;
        if(previousGroups >= 2) tabIndex += sharedSyncLength;
        browser.tabs.query({windowId: localData.supportedWindowId, index: tabIndex}).then((tabs) => {
          callBack(page, sharedNonSyncLength, sharedSyncLength, groupLength, tabs);
        });
      }else{
        browser.tabs.query({windowId: localData.supportedWindowId}).then((tabs) => {
          callBack(page, sharedNonSyncLength, sharedSyncLength, groupLength, tabs);
        });
      }
    });
  });
}
function closeTabs(tabIds, groupsLength, page){
  console.log("Clearing tabs of group " + lastGroup);
  page.activateListeners = false;
  if(groupsLength <= tabIds.length){
    browser.tabs.create({}).then(() => {
      browser.tabs.remove(tabIds).then(() => {
        setTimeout(function() {
          page.activateListeners = true;
          page.updateAllSavedTabs();
        }, 2000);
        reload();
      });
    });
  }else{
    browser.tabs.remove(tabIds).then(() => {
      setTimeout(function() {
          page.activateListeners = true;
          page.updateAllSavedTabs();
        }, 2000);
      reload();
    });
  }
}

// CHANGE GROUP FUNCTIONS

function loadGroup(group){

}

// OTHERS FUNCTIONS

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
  browser.storage.sync.get().then((newSyncData) => {
    browser.storage.local.get().then((newLocalData) => {
      browser.tabs.query({active: true, windowId: currentWindowId}).then((currentTabs) => {
        currentTab = currentTabs[0];
        localData = newLocalData;
        syncData = newSyncData;
        updateGroupsListPanel();
        if(document.getElementById("mainTag").getAttribute('class') === 'switched'){
          updateGroupDetailsPanel(lastGroup, lastGroupType, lastIsProtectedGroup);
        }
      });
    });
  });
}
function reloadAll(group, groupType, isProtectedGroup){
  browser.storage.sync.get().then((newSyncData) => {
    browser.storage.local.get().then((newLocalData) => {
      browser.tabs.query({active: true, windowId: currentWindowId}).then((currentTabs) => {
        currentTab = currentTabs[0];
        localData = newLocalData;
        syncData = newSyncData;
        updateGroupsListPanel();
        updateGroupDetailsPanel(group, groupType, isProtectedGroup);
      });
    });
  });
  //window.location.href = window.location.pathname + window.location.search + window.location.hash;
}

function listTabs(tabs){
  var tabsText = "";
  Object.keys(tabs).forEach((tabIndex) => {(tabs[tabIndex] != undefined) ? (tabsText += tabIndex + " - " + tabs[tabIndex].title + "\n") : (tabsText += tabIndex + " - undefined" + "\n")});
  if(tabsText == "") tabsText = "Empty";
  return tabsText;
}

reload();